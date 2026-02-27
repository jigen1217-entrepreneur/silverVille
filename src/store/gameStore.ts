/**
 * gameStore.ts
 * SilverVille 핵심 게임 상태 관리 (Zustand v5)
 * 걸음 수, 식단 점수, 마을 레벨, 주민, 비료, 카페 점수 포함
 */

import { create } from 'zustand';

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

/** 동물 주민 정보 */
export interface Resident {
  id: string;
  name: string;       // 예: "솜이", "두부"
  emoji: string;      // 예: "🐰", "🐻"
  arrivalDate: string; // ISO 날짜 문자열
}

/** 마을 건물 정보 */
export interface Building {
  id: string;
  type: 'house' | 'cafe' | 'farm' | 'garden' | 'fountain';
  name: string;
  emoji: string;
  unlockLevel: number; // 이 건물이 해금되는 마을 레벨
}

/** 오늘 걷기 퀴즈 기록 */
export interface QuizRecord {
  question: string;
  answer: string;
  correct: boolean;
  timestamp: number;
}

/** 게임 전체 상태 */
interface GameState {
  // 걷기 / 만보기
  steps: number;              // 오늘 걸음 수
  walkGoal: number;           // 걷기 목표 (기본 5000보)
  quizHistory: QuizRecord[];  // 오늘 퀴즈 기록

  // 식단
  dietScore: number;          // 오늘 MIND 식단 점수 (0~10)
  lastAnalyzedFoods: string[]; // 마지막으로 인식된 음식 목록

  // 마을
  villageLevel: number;       // 마을 레벨 (1~10)
  villageExp: number;         // 마을 경험치
  residents: Resident[];      // 현재 마을 동물 주민 목록
  buildings: Building[];      // 해금된 건물 목록

  // 재화
  fertilizer: number;         // 마법의 비료 개수 (식단 보상)
  landscapeItems: number;     // 조경 아이템 개수 (산책 보상)

  // 카페 미니게임
  cafeScore: number;          // 오늘 카페 총점
  cafeStreak: number;         // 연속 정답 수

  // 전체 스트릭
  streakDays: number;         // 연속 미션 달성 일수

  // 액션
  setSteps: (steps: number) => void;
  addQuizRecord: (record: QuizRecord) => void;
  setDietScore: (score: number, foods: string[]) => void;
  addFertilizer: (amount: number) => void;
  useFertilizer: (amount: number) => void;
  addLandscapeItems: (amount: number) => void;
  addResident: (resident: Resident) => void;
  unlockBuilding: (building: Building) => void;
  addVillageExp: (exp: number) => void;
  addCafeScore: (points: number) => void;
  resetCafeSession: () => void;
  incrementStreak: () => void;
  resetDailyStats: () => void;
}

// ─────────────────────────────────────────────
// 마을 레벨업 기준 경험치
// ─────────────────────────────────────────────
const LEVEL_EXP_THRESHOLDS: Record<number, number> = {
  1: 100,
  2: 250,
  3: 500,
  4: 900,
  5: 1500,
  6: 2400,
  7: 3700,
  8: 5500,
  9: 8000,
  10: Infinity,
};

/** 현재 경험치로 레벨 계산 */
function calcVillageLevel(exp: number): number {
  let level = 1;
  for (let lv = 1; lv <= 10; lv++) {
    if (exp >= (LEVEL_EXP_THRESHOLDS[lv - 1] ?? 0)) {
      level = lv;
    } else {
      break;
    }
  }
  return Math.min(level, 10);
}

// ─────────────────────────────────────────────
// 스토어 생성
// ─────────────────────────────────────────────
export const useGameStore = create<GameState>((set, get) => ({
  // 초기 상태
  steps: 0,
  walkGoal: 5000,
  quizHistory: [],

  dietScore: 0,
  lastAnalyzedFoods: [],

  villageLevel: 1,
  villageExp: 0,
  residents: [],
  buildings: [],

  fertilizer: 0,
  landscapeItems: 0,

  cafeScore: 0,
  cafeStreak: 0,

  streakDays: 0,

  // ── 걷기 액션 ──────────────────────────────

  /** 오늘 걸음 수 업데이트 */
  setSteps: (steps) => set({ steps }),

  /** 퀴즈 기록 추가 */
  addQuizRecord: (record) =>
    set((state) => ({
      quizHistory: [...state.quizHistory, record],
    })),

  // ── 식단 액션 ──────────────────────────────

  /** MIND 식단 점수 및 인식 음식 목록 업데이트 */
  setDietScore: (score, foods) =>
    set({ dietScore: score, lastAnalyzedFoods: foods }),

  // ── 재화 액션 ──────────────────────────────

  /** 비료 추가 */
  addFertilizer: (amount) =>
    set((state) => ({ fertilizer: state.fertilizer + amount })),

  /** 비료 사용 (마이너스 방지) */
  useFertilizer: (amount) =>
    set((state) => ({
      fertilizer: Math.max(0, state.fertilizer - amount),
    })),

  /** 조경 아이템 추가 */
  addLandscapeItems: (amount) =>
    set((state) => ({ landscapeItems: state.landscapeItems + amount })),

  // ── 마을 액션 ──────────────────────────────

  /** 동물 주민 이사 */
  addResident: (resident) =>
    set((state) => ({
      residents: [...state.residents, resident],
    })),

  /** 건물 해금 (중복 방지) */
  unlockBuilding: (building) =>
    set((state) => {
      if (state.buildings.find((b) => b.id === building.id)) return state;
      return { buildings: [...state.buildings, building] };
    }),

  /** 마을 경험치 추가 및 레벨업 처리 */
  addVillageExp: (exp) =>
    set((state) => {
      const newExp = state.villageExp + exp;
      const newLevel = calcVillageLevel(newExp);
      return { villageExp: newExp, villageLevel: newLevel };
    }),

  // ── 카페 액션 ──────────────────────────────

  /** 카페 점수 추가 */
  addCafeScore: (points) =>
    set((state) => ({
      cafeScore: state.cafeScore + points,
      cafeStreak: state.cafeStreak + 1,
    })),

  /** 카페 세션 리셋 (오답 시) */
  resetCafeSession: () => set({ cafeStreak: 0 }),

  // ── 공통 액션 ──────────────────────────────

  /** 연속 달성일 증가 */
  incrementStreak: () =>
    set((state) => ({ streakDays: state.streakDays + 1 })),

  /** 하루 시작 시 일일 스탯 초기화 */
  resetDailyStats: () =>
    set({
      steps: 0,
      quizHistory: [],
      dietScore: 0,
      lastAnalyzedFoods: [],
      cafeScore: 0,
      cafeStreak: 0,
    }),
}));

// ─────────────────────────────────────────────
// 셀렉터 헬퍼 (불필요한 리렌더 방지)
// ─────────────────────────────────────────────

/** 걷기 목표 달성 여부 */
export const selectWalkGoalReached = (state: GameState): boolean =>
  state.steps >= state.walkGoal;

/** 오늘 건강 종합 점수 (0~100) */
export const selectHealthScore = (state: GameState): number => {
  const walkRatio = Math.min(state.steps / state.walkGoal, 1); // 0~1
  const dietRatio = state.dietScore / 10;                       // 0~1
  const cafeRatio = Math.min(state.cafeScore / 30, 1);          // 0~1 (30점 만점 기준)
  return Math.round((walkRatio * 40 + dietRatio * 40 + cafeRatio * 20));
};

/** 걷기 진행률 퍼센트 */
export const selectWalkProgress = (state: GameState): number =>
  Math.min(Math.round((state.steps / state.walkGoal) * 100), 100);
