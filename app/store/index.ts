import { create } from 'zustand';

/** 플레이어 상태 */
interface PlayerState {
  id: string | null;
  nickname: string;
  level: number;
  exp: number;
  fertilizer: number; // 마법의 비료 (식단 보상)
  landscapeItems: number; // 조경 아이템 (산책 보상)
}

/** 마을 상태 */
interface VillageState {
  name: string;
  populationCount: number;
  buildings: string[];
  residents: string[];
}

/** 오늘 미션 진행 현황 */
interface MissionState {
  dietDone: boolean;
  walkSteps: number;
  walkGoal: number;
  baristaScore: number | null;
  streakDays: number; // 연속 달성 일수
}

interface AppState {
  player: PlayerState;
  village: VillageState;
  mission: MissionState;
  isLoggedIn: boolean;
  setPlayer: (player: Partial<PlayerState>) => void;
  setVillage: (village: Partial<VillageState>) => void;
  setMission: (mission: Partial<MissionState>) => void;
  setLoggedIn: (value: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  player: {
    id: null,
    nickname: '이장님',
    level: 1,
    exp: 0,
    fertilizer: 0,
    landscapeItems: 0,
  },
  village: {
    name: '나의 실버빌',
    populationCount: 0,
    buildings: [],
    residents: [],
  },
  mission: {
    dietDone: false,
    walkSteps: 0,
    walkGoal: 5000,
    baristaScore: null,
    streakDays: 0,
  },
  isLoggedIn: false,
  setPlayer: (player) =>
    set((state) => ({ player: { ...state.player, ...player } })),
  setVillage: (village) =>
    set((state) => ({ village: { ...state.village, ...village } })),
  setMission: (mission) =>
    set((state) => ({ mission: { ...state.mission, ...mission } })),
  setLoggedIn: (value) => set({ isLoggedIn: value }),
}));
