/**
 * API 클라이언트 — axios 대신 fetch 사용 (React Native 호환)
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

// TODO: AsyncStorage에서 토큰 읽기
let authToken: string | null = null;

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    // TODO: 토큰 갱신 또는 로그아웃 처리
    throw new Error('Unauthorized');
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

export const dietApi = {
  analyze: (imageBase64: string) =>
    request('POST', '/diet/analyze', { image: imageBase64 }),
  record: (data: { mindScore: number; items: string[]; fertilizer: number }) =>
    request('POST', '/diet/record', data),
};

export const walkApi = {
  start: () => request('POST', '/walk/start'),
  update: (steps: number) => request('PUT', '/walk/update', { steps }),
  complete: (steps: number) => request('POST', '/walk/complete', { steps }),
  getQuiz: () => request('GET', '/walk/quiz'),
  submitAnswer: (quizId: string, answer: string) =>
    request('POST', '/walk/answer', { quizId, answer }),
};

export const baristaApi = {
  getSession: () => request('GET', '/barista/session'),
  submitAnswer: (sessionId: string, menuId: string) =>
    request('POST', '/barista/answer', { sessionId, menuId }),
};

export const familyApi = {
  invite: () => request('POST', '/family/invite'),
  link: (inviteCode: string) => request('POST', '/family/link', { inviteCode }),
  getMessages: () => request('GET', '/family/messages'),
  sendMessage: (audioUri: string) =>
    request('POST', '/family/message', { audioUri }),
};
