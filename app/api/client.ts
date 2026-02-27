import axios from 'axios';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

/** 요청 인터셉터 — JWT 자동 첨부 */
apiClient.interceptors.request.use((config) => {
  // TODO: AsyncStorage에서 토큰 읽어 헤더에 추가
  return config;
});

/** 응답 인터셉터 — 401 처리 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO: 토큰 갱신 또는 로그아웃 처리
    }
    return Promise.reject(error);
  }
);

export const dietApi = {
  analyze: (imageBase64: string) =>
    apiClient.post('/diet/analyze', { image: imageBase64 }),
  record: (data: { mindScore: number; items: string[]; fertilizer: number }) =>
    apiClient.post('/diet/record', data),
};

export const walkApi = {
  start: () => apiClient.post('/walk/start'),
  update: (steps: number) => apiClient.put('/walk/update', { steps }),
  complete: (steps: number) => apiClient.post('/walk/complete', { steps }),
  getQuiz: () => apiClient.get('/walk/quiz'),
  submitAnswer: (quizId: string, answer: string) =>
    apiClient.post('/walk/answer', { quizId, answer }),
};

export const baristaApi = {
  getSession: () => apiClient.get('/barista/session'),
  submitAnswer: (sessionId: string, menuId: string) =>
    apiClient.post('/barista/answer', { sessionId, menuId }),
};

export const familyApi = {
  invite: () => apiClient.post('/family/invite'),
  link: (inviteCode: string) => apiClient.post('/family/link', { inviteCode }),
  getMessages: () => apiClient.get('/family/messages'),
  sendMessage: (audioUri: string) =>
    apiClient.post('/family/message', { audioUri }),
};
