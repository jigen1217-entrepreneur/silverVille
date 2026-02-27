/**
 * WalkScreen.tsx
 * 이중 과제(Dual-Task) 산책 모드
 *
 * 게임 흐름:
 *  1. [산책 시작] 버튼 → 산책 세션 시작 + 만보기 구독
 *  2. 실시간 걸음 수 표시 + 5,000보 목표 진행 바
 *  3. 동물 주민이 퀴즈를 TTS로 출제 (expo-speech)
 *  4. 4지선다 버튼으로 음성 답변 대신 터치 선택
 *  5. 5,000보 달성 시 조경 아이템 보상 + 완료 화면
 *
 * 논문 근거: 걷기(유산소) + 인지 과제(퀴즈) = 전두엽 자극 이중 과제
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { usePedometer } from '../../app/hooks/usePedometer';
import { useAppStore } from '../../app/store/index';
import { SeniorButton } from '../../app/components/ui/SeniorButton';
import {
  startWalkSession,
  completeWalk,
  getWalkQuiz,
  submitQuizAnswer,
  updateWalkSteps,
  type WalkQuiz,
} from '../services/healthService';

// ─────────────────────────────────────────────
// 로컬 목 퀴즈 (API 미연동 시 사용)
// ─────────────────────────────────────────────
const MOCK_QUIZZES: WalkQuiz[] = [
  {
    id: 'q1',
    question: '대한민국의 수도는 어디인가요?',
    choices: ['서울', '부산', '대구', '인천'],
    answer: '서울',
  },
  {
    id: 'q2',
    question: '사과는 무슨 색인가요?',
    choices: ['파란색', '빨간색', '노란색', '보라색'],
    answer: '빨간색',
  },
  {
    id: 'q3',
    question: '1 더하기 1은 무엇인가요?',
    choices: ['1', '2', '3', '4'],
    answer: '2',
  },
  {
    id: 'q4',
    question: '봄에 피는 꽃은 무엇인가요?',
    choices: ['국화', '코스모스', '벚꽃', '해바라기'],
    answer: '벚꽃',
  },
];

// ─────────────────────────────────────────────
// 산책 상태 타입
// ─────────────────────────────────────────────
type WalkPhase =
  | 'idle'       // 시작 전
  | 'walking'    // 산책 중
  | 'quiz'       // 퀴즈 풀기
  | 'result'     // 퀴즈 결과
  | 'complete';  // 목표 달성

// ─────────────────────────────────────────────
// 퀴즈 카드 컴포넌트
// ─────────────────────────────────────────────
interface QuizCardProps {
  quiz: WalkQuiz;
  onSelect: (choice: string) => void;
  selectedChoice: string | null;
  correct: boolean | null;
}

function QuizCard({ quiz, onSelect, selectedChoice, correct }: QuizCardProps) {
  return (
    <View style={quizStyles.card}>
      <Text style={quizStyles.animalLabel}>🦊 여우댁이 묻습니다!</Text>
      <Text style={quizStyles.question}>{quiz.question}</Text>
      <View style={quizStyles.choices}>
        {quiz.choices.map((choice) => {
          const isSelected = selectedChoice === choice;
          const isCorrect = choice === quiz.answer;
          let bgColor = '#FFFFFF';
          if (selectedChoice !== null) {
            if (isCorrect) bgColor = '#C8E6C9'; // 정답: 초록
            else if (isSelected && !isCorrect) bgColor = '#FFCDD2'; // 오답: 빨강
          }
          return (
            <TouchableOpacity
              key={choice}
              style={[quizStyles.choiceBtn, { backgroundColor: bgColor }]}
              onPress={() => onSelect(choice)}
              disabled={selectedChoice !== null}
              activeOpacity={0.7}
            >
              <Text style={quizStyles.choiceText}>{choice}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const quizStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  animalLabel: {
    fontSize: 16,
    color: '#558B2F',
    marginBottom: 10,
  },
  question: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1B5E20',
    lineHeight: 30,
    marginBottom: 20,
  },
  choices: {
    gap: 10,
  },
  choiceBtn: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E8F5E9',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  choiceText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
});

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────
export default function WalkScreen() {
  const { mission, player, setMission, setPlayer } = useAppStore();

  // 만보기 훅 (expo-sensors Pedometer)
  const { isAvailable, steps, error: pedometerError } = usePedometer();

  // 산책 상태
  const [phase, setPhase] = useState<WalkPhase>('idle');
  const [sessionSteps, setSessionSteps] = useState(0); // 세션 시작 시점 기준 걸음 수
  const [startSteps, setStartSteps] = useState(0);     // 세션 시작 걸음 수 스냅샷
  const [quizList, setQuizList] = useState<WalkQuiz[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [lastQuizCorrect, setLastQuizCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [completionMsg, setCompletionMsg] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 진행 바 애니메이션
  const progressAnim = useRef(new Animated.Value(0)).current;

  // 걸음 수 목표 (store에서)
  const STEP_GOAL = mission.walkGoal;

  // ── 세션 걸음 수 계산 (센서 실시간 - 시작 스냅샷) ──
  useEffect(() => {
    if (phase === 'walking' || phase === 'quiz' || phase === 'result') {
      const current = Math.max(0, steps - startSteps);
      setSessionSteps(current);

      // store 업데이트
      setMission({ walkSteps: current });

      // 진행 바 애니메이션
      const progress = Math.min(1, current / STEP_GOAL);
      Animated.timing(progressAnim, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false,
      }).start();

      // 목표 달성 체크
      if (current >= STEP_GOAL && phase !== 'complete') {
        handleWalkComplete(current);
      }

      // 주기적 서버 업데이트 (100보마다)
      if (current % 100 === 0 && current > 0) {
        updateWalkSteps(current).catch(() => null);
      }
    }
  }, [steps, phase]);

  // ── 산책 시작 ──
  const handleStartWalk = useCallback(async () => {
    try {
      await startWalkSession();
    } catch {
      // 오프라인 모드 허용
    }
    setStartSteps(steps); // 현재 걸음 수를 기준점으로
    setSessionSteps(0);
    setPhase('walking');

    // 퀴즈 목록 로드
    try {
      const quiz = await getWalkQuiz();
      setQuizList([quiz, ...MOCK_QUIZZES]);
    } catch {
      setQuizList(MOCK_QUIZZES); // API 실패 시 목 데이터 사용
    }
  }, [steps]);

  // ── 퀴즈 TTS 재생 ──
  const speakQuiz = useCallback((quiz: WalkQuiz) => {
    const text = `퀴즈입니다! ${quiz.question}`;
    setIsSpeaking(true);
    Speech.speak(text, {
      language: 'ko-KR',
      rate: 0.85,       // 시니어를 위한 느린 속도
      pitch: 1.0,
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, []);

  // ── 퀴즈 출제 (500보마다) ──
  useEffect(() => {
    if (
      phase === 'walking' &&
      quizList.length > 0 &&
      sessionSteps > 0 &&
      sessionSteps % 500 === 0 // 500보마다 퀴즈 출제
    ) {
      const quizIdx = Math.floor(sessionSteps / 500) - 1;
      const quiz = quizList[quizIdx % quizList.length];
      setCurrentQuizIdx(quizIdx % quizList.length);
      setSelectedChoice(null);
      setLastQuizCorrect(null);
      setPhase('quiz');
      speakQuiz(quiz);
    }
  }, [sessionSteps, phase, quizList]);

  // ── 답변 선택 ──
  const handleSelectChoice = useCallback(
    async (choice: string) => {
      if (selectedChoice !== null) return; // 중복 선택 방지

      setSelectedChoice(choice);
      const quiz = quizList[currentQuizIdx];
      const correct = choice === quiz.answer;
      setLastQuizCorrect(correct);

      if (correct) {
        setCorrectCount((n) => n + 1);
        Speech.speak('정답이에요! 훌륭해요!', { language: 'ko-KR', rate: 0.9 });
      } else {
        Speech.speak(`아쉬워요. 정답은 "${quiz.answer}"이에요.`, {
          language: 'ko-KR',
          rate: 0.9,
        });
      }

      // API 제출 (백그라운드)
      submitQuizAnswer(quiz.id, choice).catch(() => null);

      // 결과 표시 후 산책으로 복귀
      setPhase('result');
      setTimeout(() => {
        setPhase('walking');
        setSelectedChoice(null);
        setLastQuizCorrect(null);
      }, 2500);
    },
    [selectedChoice, quizList, currentQuizIdx]
  );

  // ── 산책 완료 ──
  const handleWalkComplete = useCallback(
    async (finalSteps: number) => {
      setPhase('complete');
      Speech.stop();

      let result = { landscapeItems: 1, message: '' };
      try {
        result = await completeWalk(finalSteps);
      } catch {
        result = {
          landscapeItems: 1,
          message: `🎉 ${finalSteps.toLocaleString()}보 달성! 조경 아이템 1개를 획득했어요!`,
        };
      }

      setCompletionMsg(result.message);

      // store 반영
      setPlayer({ landscapeItems: player.landscapeItems + result.landscapeItems });
      setMission({ walkSteps: finalSteps });

      Speech.speak(result.message, { language: 'ko-KR', rate: 0.9 });
    },
    [player.landscapeItems]
  );

  // ── 진행률 (0~100%) ──
  const progressPercent = Math.min(100, Math.round((sessionSteps / STEP_GOAL) * 100));
  const currentQuiz = quizList[currentQuizIdx];

  // ─────────────────────────────────────────────
  // 렌더링
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>🚶 산책 모드</Text>
          <Text style={styles.subtitle}>걸으면서 뇌도 함께 운동해요</Text>
        </View>

        {/* 만보기 미지원 경고 */}
        {pedometerError && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ {pedometerError}</Text>
          </View>
        )}
        {!isAvailable && !pedometerError && phase === 'idle' && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              ⚠️ 이 기기에서 만보기를 지원하지 않아요.{'\n'}걸음 수가 수동으로 집계됩니다.
            </Text>
          </View>
        )}

        {/* ── 걸음 수 대형 표시 ── */}
        <View style={styles.stepsCard}>
          <Text style={styles.stepsNumber}>{sessionSteps.toLocaleString()}</Text>
          <Text style={styles.stepsUnit}>걸음</Text>
          <Text style={styles.stepsGoal}>목표: {STEP_GOAL.toLocaleString()}보</Text>

          {/* 진행 바 */}
          <View style={styles.progressBg}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
                progressPercent >= 100 && styles.progressComplete,
              ]}
            />
          </View>
          <Text style={styles.progressText}>{progressPercent}% 달성</Text>
        </View>

        {/* ── 퀴즈 정답 현황 ── */}
        {(phase === 'walking' || phase === 'quiz' || phase === 'result') && (
          <View style={styles.quizStat}>
            <Text style={styles.quizStatText}>
              퀴즈 정답: {correctCount}개 ✓
            </Text>
          </View>
        )}

        {/* ── 시작 전 화면 ── */}
        {phase === 'idle' && (
          <View style={styles.idleSection}>
            <Text style={styles.idleGuide}>
              {'산책 중 퀴즈로\n전두엽을 자극해요!\n\n500보마다 동물 주민이\n퀴즈를 내드려요 🦊'}
            </Text>
            <SeniorButton
              label="산책 시작하기 🚶"
              onPress={handleStartWalk}
              style={styles.startBtn}
            />
          </View>
        )}

        {/* ── 산책 중 화면 ── */}
        {phase === 'walking' && (
          <View style={styles.walkingSection}>
            <Text style={styles.walkingGuide}>
              열심히 걷고 있어요! 🌿{'\n'}
              곧 퀴즈가 나올 거예요.
            </Text>
            {isSpeaking && (
              <View style={styles.speakingIndicator}>
                <Text style={styles.speakingText}>🔊 음성 재생 중...</Text>
              </View>
            )}
            <SeniorButton
              label="산책 종료"
              onPress={() => handleWalkComplete(sessionSteps)}
              variant="secondary"
              style={styles.endBtn}
            />
          </View>
        )}

        {/* ── 퀴즈 화면 ── */}
        {(phase === 'quiz' || phase === 'result') && currentQuiz && (
          <View>
            {isSpeaking && (
              <View style={[styles.speakingIndicator, { marginHorizontal: 20, marginBottom: 12 }]}>
                <Text style={styles.speakingText}>🔊 퀴즈를 읽고 있어요...</Text>
              </View>
            )}
            <QuizCard
              quiz={currentQuiz}
              onSelect={handleSelectChoice}
              selectedChoice={selectedChoice}
              correct={lastQuizCorrect}
            />
            {/* 퀴즈 결과 메시지 */}
            {phase === 'result' && lastQuizCorrect !== null && (
              <View
                style={[
                  styles.resultBanner,
                  lastQuizCorrect ? styles.resultCorrect : styles.resultWrong,
                ]}
              >
                <Text style={styles.resultText}>
                  {lastQuizCorrect
                    ? '🎉 정답이에요! 훌륭해요!'
                    : `❌ 아쉬워요! 정답: ${currentQuiz.answer}`}
                </Text>
              </View>
            )}
            {/* 다시 듣기 */}
            {phase === 'quiz' && (
              <TouchableOpacity
                style={styles.replayBtn}
                onPress={() => speakQuiz(currentQuiz)}
              >
                <Text style={styles.replayText}>🔊 다시 듣기</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── 완료 화면 ── */}
        {phase === 'complete' && (
          <View style={styles.completeSection}>
            <Text style={styles.completeEmoji}>🎉</Text>
            <Text style={styles.completeTitle}>산책 완료!</Text>
            <Text style={styles.completeMsg}>{completionMsg}</Text>
            <View style={styles.completeStat}>
              <Text style={styles.completeStatText}>총 걸음: {sessionSteps.toLocaleString()}보</Text>
              <Text style={styles.completeStatText}>퀴즈 정답: {correctCount}개</Text>
            </View>
            <SeniorButton
              label="마을로 돌아가기 🏡"
              onPress={() => {
                setPhase('idle');
                setSessionSteps(0);
                setCorrectCount(0);
              }}
              style={styles.homeBtn}
            />
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E8F5E9',
  },

  // 헤더
  header: {
    padding: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  subtitle: {
    fontSize: 18,
    color: '#558B2F',
    marginTop: 4,
  },

  // 경고
  warningBox: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFF9C4',
    borderRadius: 12,
    padding: 14,
  },
  warningText: {
    fontSize: 15,
    color: '#F57F17',
    lineHeight: 22,
  },

  // 걸음 수 카드
  stepsCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepsNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#1B5E20',
    lineHeight: 72,
  },
  stepsUnit: {
    fontSize: 22,
    color: '#558B2F',
    marginTop: -4,
    marginBottom: 8,
  },
  stepsGoal: {
    fontSize: 16,
    color: '#9E9E9E',
    marginBottom: 16,
  },
  progressBg: {
    width: '100%',
    height: 20,
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#66BB6A',
    borderRadius: 10,
  },
  progressComplete: {
    backgroundColor: '#2E7D32',
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#388E3C',
  },

  // 퀴즈 통계
  quizStat: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#C8E6C9',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  quizStatText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1B5E20',
  },

  // 시작 전
  idleSection: {
    marginHorizontal: 20,
    alignItems: 'center',
  },
  idleGuide: {
    fontSize: 20,
    color: '#388E3C',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 24,
  },
  startBtn: {
    width: '100%',
    backgroundColor: '#2E7D32',
  },

  // 산책 중
  walkingSection: {
    marginHorizontal: 20,
    alignItems: 'center',
  },
  walkingGuide: {
    fontSize: 20,
    color: '#1B5E20',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 20,
  },
  speakingIndicator: {
    backgroundColor: '#A5D6A7',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  speakingText: {
    fontSize: 16,
    color: '#1B5E20',
    fontWeight: '600',
  },
  endBtn: {
    width: '100%',
    backgroundColor: '#757575',
  },

  // 결과 배너
  resultBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  resultCorrect: {
    backgroundColor: '#C8E6C9',
  },
  resultWrong: {
    backgroundColor: '#FFCDD2',
  },
  resultText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },

  // 다시 듣기
  replayBtn: {
    marginHorizontal: 20,
    marginTop: 12,
    padding: 14,
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  replayText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2E7D32',
  },

  // 완료 화면
  completeSection: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  completeEmoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginBottom: 12,
  },
  completeMsg: {
    fontSize: 18,
    color: '#388E3C',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
  },
  completeStat: {
    backgroundColor: '#E8F5E9',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    marginBottom: 20,
    gap: 8,
  },
  completeStatText: {
    fontSize: 17,
    color: '#2E7D32',
    fontWeight: '600',
  },
  homeBtn: {
    width: '100%',
    backgroundColor: '#2E7D32',
  },
});
