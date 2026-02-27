/**
 * healthService.ts
 * 헬스케어 서비스 레이어 — 식단 분석, 산책, 바리스타 게임 API 브릿지
 * 로컬 MIND 식단 스코어링 + 보상 계산 로직 포함
 */

// ─────────────────────────────────────────────
// MIND 식단 데이터베이스
// Mediterranean-DASH Intervention for Neurodegenerative Delay
// ─────────────────────────────────────────────

/** MIND 식단 식품 목록 및 점수 (10점 만점 기준) */
const MIND_FOOD_SCORES: Record<string, number> = {
  // 녹황색 채소 (1점 — 가장 높은 뇌 건강 효과)
  시금치: 1.0,
  케일: 1.0,
  브로콜리: 1.0,
  상추: 0.8,
  배추: 0.7,
  미나리: 0.8,
  쑥갓: 0.8,
  // 베리류 (0.8점)
  블루베리: 0.9,
  딸기: 0.8,
  라즈베리: 0.8,
  // 견과류 (0.7점)
  호두: 0.9,
  아몬드: 0.8,
  견과류: 0.7,
  // 생선·해산물 (1점 — 오메가3)
  연어: 1.0,
  고등어: 1.0,
  참치: 0.9,
  생선: 0.9,
  // 콩·두부류 (0.8점)
  두부: 0.9,
  콩: 0.8,
  청국장: 0.9,
  // 통곡물 (0.7점)
  현미: 0.8,
  통밀: 0.7,
  // 올리브오일 (1점)
  올리브오일: 1.0,
  // 가금류 (0.5점)
  닭가슴살: 0.5,
  닭: 0.5,
};

/** 뇌 건강에 해로운 음식 (감점) */
const MIND_PENALTY_FOODS: Record<string, number> = {
  버터: -0.5,
  치즈: -0.3,
  패스트푸드: -1.0,
  튀김: -0.8,
  소시지: -0.7,
  라면: -0.6,
  과자: -0.5,
};

// ─────────────────────────────────────────────
// 보상 계산 함수
// ─────────────────────────────────────────────

/**
 * MIND 식단 스코어 로컬 계산
 * AI 결과의 fallback 또는 프론트 미리보기용
 * @param detectedFoods AI가 인식한 음식 이름 목록
 * @returns 0~10 사이의 MIND 스코어
 */
export function calcMindScore(detectedFoods: string[]): number {
  let score = 0;
  for (const food of detectedFoods) {
    score += MIND_FOOD_SCORES[food] ?? 0;
    score += MIND_PENALTY_FOODS[food] ?? 0;
  }
  // 0~10점 사이로 정규화
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

/**
 * MIND 스코어 → 마법의 비료 보상 변환
 * @param mindScore 0~10 MIND 스코어
 * @returns 비료 개수
 */
export function calcFertilizer(mindScore: number): number {
  if (mindScore >= 8) return 5; // 최우수 식단
  if (mindScore >= 6) return 3; // 우수 식단
  if (mindScore >= 4) return 2; // 보통 식단
  if (mindScore >= 2) return 1; // 기초 식단
  return 0;
}

/**
 * 걸음 수 → 조경 아이템 보상 변환
 * @param steps 오늘 총 걸음 수
 * @returns 조경 아이템 개수
 */
export function calcLandscapeItems(steps: number): number {
  if (steps >= 10000) return 3; // 만보 달성
  if (steps >= 7000) return 2;  // 7천보
  if (steps >= 5000) return 1;  // 5천보 목표 달성
  return 0;
}

/**
 * MIND 스코어 → 사용자 피드백 메시지 생성
 */
export function getMindFeedback(mindScore: number): string {
  if (mindScore >= 8) return '🌟 훌륭해요! 오늘 식단은 뇌 건강 최우수예요!';
  if (mindScore >= 6) return '👍 좋아요! 채소나 생선을 조금 더 드시면 더욱 좋아요.';
  if (mindScore >= 4) return '😊 괜찮아요! 견과류나 블루베리를 추가해보세요.';
  return '💚 오늘은 녹황색 채소, 생선, 견과류를 더 드셔보세요.';
}

// ─────────────────────────────────────────────
// 식단 서비스
// ─────────────────────────────────────────────

/** 식단 분석 결과 타입 */
export interface DietAnalysisResult {
  mindScore: number;
  detectedFoods: string[];
  fertilizer: number;
  feedback: string;
}

/**
 * 식사 사진 AI 분석
 * @param imageBase64 base64 인코딩된 이미지
 */
export async function analyzeFood(
  imageBase64: string
): Promise<DietAnalysisResult> {
  const { dietApi } = await import('../../app/api/client');
  const response = await dietApi.analyze(imageBase64);
  const { mindScore, detectedItems } = response.data as {
    mindScore: number;
    detectedItems: string[];
  };
  const fertilizer = calcFertilizer(mindScore);
  const feedback = getMindFeedback(mindScore);
  return { mindScore, detectedFoods: detectedItems, fertilizer, feedback };
}

/**
 * 식단 분석 결과 서버에 기록
 */
export async function recordDiet(
  mindScore: number,
  items: string[],
  fertilizer: number
): Promise<void> {
  const { dietApi } = await import('../../app/api/client');
  await dietApi.record({ mindScore, items, fertilizer });
}

// ─────────────────────────────────────────────
// 산책 서비스
// ─────────────────────────────────────────────

/** 산책 퀴즈 타입 */
export interface WalkQuiz {
  id: string;
  question: string;       // 음성으로 읽을 퀴즈 질문
  choices: string[];      // 객관식 선택지 (4개)
  answer: string;         // 정답 텍스트
}

/** 퀴즈 답변 결과 타입 */
export interface QuizResult {
  correct: boolean;
  explanation: string;
}

/** 산책 완료 결과 타입 */
export interface WalkCompleteResult {
  landscapeItems: number;
  message: string;
}

/** 산책 세션 시작 */
export async function startWalkSession(): Promise<void> {
  const { walkApi } = await import('../../app/api/client');
  await walkApi.start();
}

/** 걸음 수 업데이트 (주기적으로 호출) */
export async function updateWalkSteps(steps: number): Promise<void> {
  const { walkApi } = await import('../../app/api/client');
  await walkApi.update(steps);
}

/**
 * 산책 완료 처리 및 보상 계산
 */
export async function completeWalk(
  steps: number
): Promise<WalkCompleteResult> {
  const { walkApi } = await import('../../app/api/client');
  await walkApi.complete(steps);
  const landscapeItems = calcLandscapeItems(steps);
  const message =
    landscapeItems > 0
      ? `🎉 ${steps.toLocaleString()}보 달성! 조경 아이템 ${landscapeItems}개를 획득했어요!`
      : `오늘 ${steps.toLocaleString()}보 걸었어요. 5,000보를 채워 조경 아이템을 받아보세요!`;
  return { landscapeItems, message };
}

/**
 * 이중 과제 퀴즈 가져오기
 */
export async function getWalkQuiz(): Promise<WalkQuiz> {
  const { walkApi } = await import('../../app/api/client');
  const response = await walkApi.getQuiz();
  return response.data as WalkQuiz;
}

/**
 * 퀴즈 답변 제출
 */
export async function submitQuizAnswer(
  quizId: string,
  answer: string
): Promise<QuizResult> {
  const { walkApi } = await import('../../app/api/client');
  const response = await walkApi.submitAnswer(quizId, answer);
  return response.data as QuizResult;
}

// ─────────────────────────────────────────────
// 바리스타 게임 서비스
// ─────────────────────────────────────────────

/** 바리스타 세션 타입 */
export interface BaristaSession {
  sessionId: string;
  customer: {
    name: string;
    emoji: string;
  };
  order: string;        // TTS로 읽을 주문 텍스트
  menu: MenuItem[];     // 선택 가능한 메뉴 목록
  distractor: string;   // 방해 대화 텍스트
}

/** 메뉴 아이템 타입 */
export interface MenuItem {
  id: string;
  name: string;
  emoji: string;
}

/** 바리스타 답변 결과 타입 */
export interface BaristaResult {
  correct: boolean;
  score: number;
  message: string;
}

/**
 * 바리스타 게임 세션 가져오기
 */
export async function getBaristaSession(): Promise<BaristaSession> {
  const { baristaApi } = await import('../../app/api/client');
  const response = await baristaApi.getSession();
  return response.data as BaristaSession;
}

/**
 * 바리스타 메뉴 선택 제출
 */
export async function submitBaristaAnswer(
  sessionId: string,
  menuId: string
): Promise<BaristaResult> {
  const { baristaApi } = await import('../../app/api/client');
  const response = await baristaApi.submitAnswer(sessionId, menuId);
  return response.data as BaristaResult;
}
