/**
 * pedometerService.ts
 * Expo Pedometer 래핑 서비스
 * - 하루 걸음 수 실시간 추적
 * - 1000보마다 퀴즈 트리거
 * - 5000보 달성 시 조경 아이템 보상
 */

import { Pedometer } from 'expo-sensors';
import * as Speech from 'expo-speech';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

export interface PedometerStatus {
  isAvailable: boolean;
  hasPermission: boolean;
  error: string | null;
}

export interface StepUpdatePayload {
  steps: number;
  progress: number;          // 0~100 퍼센트
  goalReached: boolean;
  quizTrigger: boolean;      // 이 업데이트에서 퀴즈 트리거 여부
}

type StepCallback = (payload: StepUpdatePayload) => void;
type QuizTriggerCallback = (stepMilestone: number) => void;

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

/** 걷기 일일 목표 걸음 수 */
const WALK_GOAL = 5000;

/** 퀴즈 트리거 걸음 수 간격 */
const QUIZ_INTERVAL = 1000;

/** 리워드 마일스톤 걸음 수 */
const REWARD_MILESTONE = 5000;

// ─────────────────────────────────────────────
// 내장 퀴즈 데이터 (네트워크 없을 때 fallback)
// ─────────────────────────────────────────────

export interface WalkQuiz {
  id: string;
  question: string;       // TTS로 읽을 질문
  choices: string[];      // 4개 선택지
  answer: string;         // 정답 텍스트
  hint?: string;          // 정답 설명
}

const FALLBACK_QUIZZES: WalkQuiz[] = [
  {
    id: 'q1',
    question: '대한민국의 수도는 어디일까요?',
    choices: ['부산', '서울', '대구', '인천'],
    answer: '서울',
    hint: '서울은 조선 시대부터 600년 넘게 수도였어요.',
  },
  {
    id: 'q2',
    question: '사과가 영어로 무엇인가요?',
    choices: ['Banana', 'Orange', 'Apple', 'Grape'],
    answer: 'Apple',
    hint: 'A for Apple! 사과는 Apple이에요.',
  },
  {
    id: 'q3',
    question: '봄, 여름, 가을 다음은 무슨 계절인가요?',
    choices: ['봄', '여름', '가을', '겨울'],
    answer: '겨울',
    hint: '한 해는 봄, 여름, 가을, 겨울 순서로 이어져요.',
  },
  {
    id: 'q4',
    question: '5 곱하기 7은 얼마인가요?',
    choices: ['30', '35', '40', '45'],
    answer: '35',
    hint: '5 × 7 = 35예요. 구구단 5단이에요!',
  },
  {
    id: 'q5',
    question: '하늘은 무슨 색인가요?',
    choices: ['빨간색', '노란색', '파란색', '초록색'],
    answer: '파란색',
    hint: '맑은 날 하늘은 파란색이에요.',
  },
  {
    id: 'q6',
    question: '1년은 몇 개월인가요?',
    choices: ['10개월', '11개월', '12개월', '13개월'],
    answer: '12개월',
    hint: '1월부터 12월까지 1년은 12개월이에요.',
  },
  {
    id: 'q7',
    question: '강아지 소리는 무엇인가요?',
    choices: ['야옹', '멍멍', '음메', '꼬끼오'],
    answer: '멍멍',
    hint: '강아지는 멍멍, 고양이는 야옹이에요.',
  },
  {
    id: 'q8',
    question: '무지개의 색은 몇 가지인가요?',
    choices: ['5가지', '6가지', '7가지', '8가지'],
    answer: '7가지',
    hint: '빨주노초파남보! 무지개는 7가지 색이에요.',
  },
];

// ─────────────────────────────────────────────
// PedometerService 클래스
// ─────────────────────────────────────────────

class PedometerService {
  private subscription: ReturnType<typeof Pedometer.watchStepCount> | null = null;
  private currentSteps = 0;
  private lastQuizMilestone = 0; // 마지막으로 퀴즈를 낸 걸음 수 마일스톤
  private stepCallback: StepCallback | null = null;
  private quizCallback: QuizTriggerCallback | null = null;
  private usedQuizIds = new Set<string>();

  /** 만보기 권한 요청 및 가용 여부 확인 */
  async initialize(): Promise<PedometerStatus> {
    try {
      const { granted } = await Pedometer.requestPermissionsAsync();
      if (!granted) {
        return {
          isAvailable: false,
          hasPermission: false,
          error: '만보기 권한이 거부되었습니다. 설정에서 허용해주세요.',
        };
      }

      const isAvailable = await Pedometer.isAvailableAsync();
      return {
        isAvailable,
        hasPermission: true,
        error: isAvailable ? null : '이 기기는 만보기를 지원하지 않습니다.',
      };
    } catch (err) {
      return {
        isAvailable: false,
        hasPermission: false,
        error: `만보기 초기화 오류: ${String(err)}`,
      };
    }
  }

  /** 실시간 걸음 수 구독 시작 */
  startTracking(
    onStep: StepCallback,
    onQuizTrigger?: QuizTriggerCallback,
  ): void {
    this.stopTracking(); // 기존 구독 해제
    this.stepCallback = onStep;
    this.quizCallback = onQuizTrigger ?? null;

    this.subscription = Pedometer.watchStepCount((result) => {
      this.currentSteps = result.steps;
      this._handleStepUpdate(result.steps);
    });
  }

  /** 실시간 걸음 수 구독 해제 */
  stopTracking(): void {
    this.subscription?.remove();
    this.subscription = null;
  }

  /** 오늘 시작 시각부터 현재까지의 누적 걸음 수 조회 */
  async getTodaySteps(): Promise<number> {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(0, 0, 0, 0);

    const result = await Pedometer.getStepCountAsync(midnight, now);
    return result.steps;
  }

  /** 랜덤 퀴즈 하나 반환 (사용한 퀴즈 제외, 전부 소진 시 리셋) */
  getRandomQuiz(): WalkQuiz {
    const available = FALLBACK_QUIZZES.filter(
      (q) => !this.usedQuizIds.has(q.id),
    );
    // 모두 사용했으면 리셋
    if (available.length === 0) {
      this.usedQuizIds.clear();
      return FALLBACK_QUIZZES[0];
    }
    const quiz = available[Math.floor(Math.random() * available.length)];
    this.usedQuizIds.add(quiz.id);
    return quiz;
  }

  /**
   * TTS로 퀴즈 질문 읽기
   * @param text 읽을 텍스트
   */
  speakQuiz(text: string): void {
    // 이미 말하는 중이면 중지 후 재시작
    Speech.stop();
    Speech.speak(text, {
      language: 'ko-KR',
      pitch: 1.0,
      rate: 0.85, // 시니어를 위해 약간 느리게
    });
  }

  /** TTS 중지 */
  stopSpeaking(): void {
    Speech.stop();
  }

  /** 현재 걸음 수 반환 */
  getCurrentSteps(): number {
    return this.currentSteps;
  }

  /** 데일리 리셋 (자정 호출) */
  resetDaily(): void {
    this.currentSteps = 0;
    this.lastQuizMilestone = 0;
    this.usedQuizIds.clear();
  }

  // ── 내부 메서드 ────────────────────────────

  private _handleStepUpdate(steps: number): void {
    const progress = Math.min(Math.round((steps / WALK_GOAL) * 100), 100);
    const goalReached = steps >= REWARD_MILESTONE;

    // 1000보 간격마다 퀴즈 트리거
    const currentMilestone =
      Math.floor(steps / QUIZ_INTERVAL) * QUIZ_INTERVAL;
    const quizTrigger =
      currentMilestone > this.lastQuizMilestone && currentMilestone > 0;

    if (quizTrigger) {
      this.lastQuizMilestone = currentMilestone;
      this.quizCallback?.(currentMilestone);
    }

    this.stepCallback?.({
      steps,
      progress,
      goalReached,
      quizTrigger,
    });
  }
}

// ─────────────────────────────────────────────
// 싱글톤 익스포트
// ─────────────────────────────────────────────

/** 앱 전체에서 공유하는 단일 PedometerService 인스턴스 */
export const pedometerService = new PedometerService();
