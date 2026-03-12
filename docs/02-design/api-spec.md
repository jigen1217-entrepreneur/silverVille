# Agent 1: Backend/DB Design -- API Specification

> **Agent**: bkend-expert
> **Date**: 2026-03-12
> **Scope**: 28 API endpoints with request/response JSON, error codes

---

## Base URL

```
Production: https://api.silverville.app/api
Staging:    https://staging-api.silverville.app/api
Local:      http://localhost:3000/api
```

## Standard Response Envelope

```json
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message in Korean"
  }
}
```

## Error Code Catalog

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `AUTH_INVALID_CREDENTIALS` | 401 | Email/password mismatch |
| `AUTH_TOKEN_EXPIRED` | 401 | Access token expired |
| `AUTH_TOKEN_INVALID` | 401 | Malformed or revoked token |
| `AUTH_REFRESH_EXPIRED` | 401 | Refresh token expired |
| `AUTH_RATE_LIMITED` | 429 | Too many login attempts |
| `AUTH_EMAIL_EXISTS` | 409 | Email already registered |
| `AUTH_KAKAO_FAILED` | 401 | KakaoTalk OAuth token invalid |
| `AUTH_WEAK_PASSWORD` | 400 | Password does not meet policy |
| `VALIDATION_FAILED` | 400 | Request body validation error |
| `RESOURCE_NOT_FOUND` | 404 | Requested resource not found |
| `DIET_ANALYSIS_FAILED` | 502 | OpenAI Vision API failure |
| `DIET_IMAGE_TOO_LARGE` | 413 | Image exceeds 10MB limit |
| `WALK_SESSION_ACTIVE` | 409 | Walk session already in progress |
| `WALK_NO_ACTIVE_SESSION` | 404 | No active walk session |
| `FAMILY_INVITE_EXPIRED` | 410 | Invite code has expired |
| `FAMILY_SELF_LINK` | 400 | Cannot link to yourself |
| `FAMILY_ALREADY_LINKED` | 409 | Already linked to this user |
| `FAMILY_MAX_LINKS` | 400 | Maximum family links reached (10) |
| `UPLOAD_FAILED` | 500 | S3 upload failure |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## 1. Authentication (6 endpoints)

### POST `/api/auth/register`

**Auth**: Public

**Request:**
```json
{
  "email": "grandma@example.com",
  "password": "secure1234",
  "nickname": "김할머니"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "email": "grandma@example.com",
      "nickname": "김할머니",
      "level": 1
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 3600
  }
}
```

**Validation (Zod):**
- email: valid email format
- password: min 8 chars, at least 1 letter + 1 number
- nickname: optional, max 50 chars, default "이장님"

---

### POST `/api/auth/login`

**Auth**: Public

**Request:**
```json
{
  "email": "grandma@example.com",
  "password": "secure1234"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "a1b2c3d4-...",
      "email": "grandma@example.com",
      "nickname": "김할머니",
      "level": 3,
      "exp": 450,
      "fertilizer": 12,
      "landscapeItems": 8,
      "streakDays": 5
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 3600
  }
}
```

**Rate Limit**: 5 attempts/minute per IP

---

### POST `/api/auth/refresh`

**Auth**: Refresh token in body

**Request:**
```json
{
  "refreshToken": "eyJhbGciOi..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "expiresIn": 3600
  }
}
```

---

### POST `/api/auth/logout`

**Auth**: Bearer token

**Request:** (empty body)

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Successfully logged out" }
}
```

**Side effect**: Refresh token added to Redis blacklist

---

### POST `/api/auth/kakao`

**Auth**: Public

**Request:**
```json
{
  "kakaoAccessToken": "Yq3k9s..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "nickname": "카카오닉네임", "level": 1 },
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "expiresIn": 3600,
    "isNewUser": true
  }
}
```

**Server-side flow**: Verify kakaoAccessToken with Kakao API -> extract kakao_id -> find or create user

---

### GET `/api/auth/me`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "email": "grandma@example.com",
    "nickname": "김할머니",
    "level": 3,
    "exp": 450,
    "fertilizer": 12,
    "landscapeItems": 8,
    "streakDays": 5,
    "lastActiveDate": "2026-03-12",
    "authProvider": "EMAIL",
    "createdAt": "2026-01-15T10:00:00Z"
  }
}
```

---

## 2. Diet System (4 endpoints)

### POST `/api/diet/analyze`

**Auth**: Bearer token

**Request:**
```json
{
  "image": "data:image/jpeg;base64,/9j/4AAQ..."
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "mindScore": 7.5,
    "detectedFoods": ["시금치", "두부", "현미", "고등어"],
    "fertilizerEarned": 3,
    "feedback": "좋아요! 채소나 생선을 조금 더 드시면 더욱 좋아요.",
    "categories": {
      "greens": ["시금치"],
      "fish": ["고등어"],
      "beans": ["두부"],
      "grains": ["현미"],
      "penalties": []
    }
  }
}
```

**Notes**: Image sent as base64; server forwards to OpenAI Vision API; fallback to local MIND DB scoring if OpenAI fails. Max image size: 10MB.

---

### POST `/api/diet/record`

**Auth**: Bearer token

**Request:**
```json
{
  "mindScore": 7.5,
  "detectedFoods": ["시금치", "두부", "현미", "고등어"],
  "fertilizerEarned": 3,
  "imageUrl": "https://s3.../food-123.jpg"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "id": "diet-uuid-...",
    "mindScore": 7.5,
    "fertilizerEarned": 3,
    "totalFertilizer": 15,
    "recordedAt": "2026-03-12T12:30:00Z"
  }
}
```

---

### GET `/api/diet/history?page=1&limit=10`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "records": [
      {
        "id": "diet-uuid-...",
        "mindScore": 7.5,
        "detectedFoods": ["시금치", "두부"],
        "fertilizerEarned": 3,
        "imageUrl": "https://s3.../food-123.jpg",
        "recordedAt": "2026-03-12T12:30:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 45, "totalPages": 5 }
  }
}
```

---

### GET `/api/diet/today`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "record": {
      "id": "diet-uuid-...",
      "mindScore": 7.5,
      "detectedFoods": ["시금치", "두부", "현미", "고등어"],
      "fertilizerEarned": 3,
      "feedback": "좋아요!",
      "recordedAt": "2026-03-12T12:30:00Z"
    },
    "hasDietToday": true
  }
}
```

---

## 3. Walk System (7 endpoints)

### POST `/api/walk/start`

**Auth**: Bearer token

**Request:** (empty body)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "sessionId": "walk-uuid-...",
    "startSteps": 0,
    "startedAt": "2026-03-12T09:00:00Z"
  }
}
```

---

### PUT `/api/walk/update`

**Auth**: Bearer token

**Request:**
```json
{
  "steps": 2350
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "currentSteps": 2350,
    "nextQuizAt": 2500,
    "progress": 47
  }
}
```

---

### POST `/api/walk/complete`

**Auth**: Bearer token

**Request:**
```json
{
  "steps": 5200
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalSteps": 5200,
    "landscapeEarned": 1,
    "totalLandscapeItems": 9,
    "expEarned": 50,
    "message": "5,200보 달성! 조경 아이템 1개를 획득했어요!"
  }
}
```

---

### GET `/api/walk/quiz`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "quiz-042",
    "question": "대한민국의 수도는 어디인가요?",
    "choices": ["서울", "부산", "대구", "인천"],
    "category": "general_knowledge",
    "difficulty": 1
  }
}
```

---

### POST `/api/walk/answer`

**Auth**: Bearer token

**Request:**
```json
{
  "quizId": "quiz-042",
  "answer": "서울"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "correct": true,
    "correctAnswer": "서울",
    "explanation": "서울은 대한민국의 수도입니다.",
    "expEarned": 10
  }
}
```

---

### GET `/api/walk/history?page=1&limit=10`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "walk-uuid-...",
        "totalSteps": 5200,
        "landscapeEarned": 1,
        "quizCount": 10,
        "quizCorrect": 8,
        "startedAt": "2026-03-12T09:00:00Z",
        "completedAt": "2026-03-12T10:30:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 30, "totalPages": 3 }
  }
}
```

---

### GET `/api/walk/today`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "totalSteps": 5200,
    "goal": 5000,
    "progress": 100,
    "landscapeEarned": 1,
    "quizAnswered": 10,
    "quizCorrect": 8,
    "hasActiveSession": false
  }
}
```

---

## 4. Barista Game (4 endpoints)

### GET `/api/barista/session`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessionId": "cafe-uuid-...",
    "rounds": [
      {
        "roundNumber": 1,
        "customer": { "name": "곰돌이", "emoji": "bear" },
        "order": "따뜻한 카페라떼 한 잔이요. 설탕은 빼주세요.",
        "distractor": "오늘 날씨가 정말 좋죠? 산책 다녀오셨어요?",
        "menu": [
          { "id": "latte-hot", "name": "따뜻한 카페라떼", "emoji": "coffee" },
          { "id": "americano", "name": "아메리카노", "emoji": "coffee" },
          { "id": "juice", "name": "오렌지주스", "emoji": "juice" },
          { "id": "tea", "name": "녹차", "emoji": "tea" }
        ]
      },
      { "roundNumber": 2, "..." : "..." },
      { "roundNumber": 3, "..." : "..." }
    ]
  }
}
```

---

### POST `/api/barista/answer`

**Auth**: Bearer token

**Request:**
```json
{
  "sessionId": "cafe-uuid-...",
  "roundNumber": 1,
  "selectedMenuId": "latte-hot"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "correct": true,
    "correctMenuId": "latte-hot",
    "scoreEarned": 13,
    "message": "정답! 곰돌이가 기뻐해요!",
    "roundsRemaining": 2
  }
}
```

---

### GET `/api/barista/history?page=1&limit=10`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "id": "cafe-uuid-...",
        "totalScore": 28,
        "roundsPlayed": 3,
        "correctCount": 2,
        "playedAt": "2026-03-12T14:00:00Z"
      }
    ],
    "pagination": { "page": 1, "limit": 10, "total": 20, "totalPages": 2 }
  }
}
```

---

### GET `/api/barista/today`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "bestScore": 28,
    "sessionsPlayed": 2,
    "totalCorrect": 5,
    "hasPlayedToday": true
  }
}
```

---

## 5. Family System (7 endpoints)

### POST `/api/family/invite`

**Auth**: Bearer token

**Request:** (empty body)

**Response (201):**
```json
{
  "success": true,
  "data": {
    "inviteCode": "SV8K2M",
    "expiresAt": "2026-03-13T15:00:00Z",
    "shareMessage": "우리 마을에 놀러오세요! 초대코드: SV8K2M"
  }
}
```

---

### POST `/api/family/link`

**Auth**: Bearer token

**Request:**
```json
{
  "inviteCode": "SV8K2M"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "linkId": "link-uuid-...",
    "playerNickname": "김할머니",
    "message": "김할머니님과 가족 연동되었습니다!"
  }
}
```

---

### GET `/api/family/members`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "members": [
      {
        "linkId": "link-uuid-...",
        "userId": "user-uuid-...",
        "nickname": "김영희",
        "role": "family_member",
        "linkedAt": "2026-03-01T10:00:00Z"
      }
    ]
  }
}
```

---

### DELETE `/api/family/members/:id`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "가족 연동이 해제되었습니다." }
}
```

---

### GET `/api/family/messages?page=1&limit=20`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "msg-uuid-...",
        "senderId": "user-uuid-...",
        "senderNickname": "김영희",
        "messageType": "VOICE",
        "contentUrl": "https://s3.../voice-msg-123.m4a",
        "isRead": false,
        "sentAt": "2026-03-12T08:00:00Z"
      },
      {
        "id": "msg-uuid-2-...",
        "senderId": "user-uuid-...",
        "senderNickname": "김영희",
        "messageType": "GIFT",
        "giftItemType": "fertilizer",
        "isRead": true,
        "sentAt": "2026-03-11T15:00:00Z"
      }
    ],
    "unreadCount": 1,
    "pagination": { "page": 1, "limit": 20, "total": 8, "totalPages": 1 }
  }
}
```

---

### POST `/api/family/message`

**Auth**: Bearer token

**Request (voice message):**
```json
{
  "receiverId": "user-uuid-...",
  "messageType": "VOICE",
  "contentUrl": "https://s3.../voice-msg-456.m4a"
}
```

**Request (text message):**
```json
{
  "receiverId": "user-uuid-...",
  "messageType": "TEXT",
  "textContent": "오늘도 건강하게 지내세요! 사랑해요!"
}
```

**Request (gift):**
```json
{
  "receiverId": "user-uuid-...",
  "messageType": "GIFT",
  "giftItemType": "fertilizer"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "messageId": "msg-uuid-...",
    "sentAt": "2026-03-12T15:30:00Z"
  }
}
```

---

### PATCH `/api/family/messages/:id/read`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "읽음 처리되었습니다." }
}
```

---

## 6. Village System (4 endpoints)

### GET `/api/village`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "village-uuid-...",
    "name": "나의 실버빌",
    "population": 4,
    "residents": [
      { "id": "bear", "name": "곰돌이", "emoji": "bear", "unlockLevel": 1 },
      { "id": "rabbit", "name": "토순이", "emoji": "rabbit", "unlockLevel": 1 }
    ],
    "buildings": [
      { "id": "bldg-uuid-...", "type": "HOUSE", "name": "이장님 집", "unlockLevel": 1 }
    ]
  }
}
```

---

### PATCH `/api/village/name`

**Auth**: Bearer token

**Request:**
```json
{
  "name": "행복한 마을"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": { "name": "행복한 마을" }
}
```

---

### GET `/api/village/residents`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "residents": [
      { "id": "bear", "name": "곰돌이", "emoji": "bear", "unlockLevel": 1, "arrivedAt": "2026-01-15T10:00:00Z" },
      { "id": "rabbit", "name": "토순이", "emoji": "rabbit", "unlockLevel": 1, "arrivedAt": "2026-01-15T10:00:00Z" }
    ],
    "locked": [
      { "id": "fox", "name": "여우댁", "emoji": "fox", "unlockLevel": 2 }
    ]
  }
}
```

---

### GET `/api/village/buildings`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "buildings": [
      { "id": "bldg-uuid-...", "type": "HOUSE", "name": "이장님 집", "unlockLevel": 1, "placedAt": "2026-01-15T10:00:00Z" }
    ],
    "available": [
      { "type": "CAFE", "name": "동물 카페", "unlockLevel": 2 }
    ]
  }
}
```

---

## 7. Player / Mission (4 endpoints)

### GET `/api/player/profile`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": "user-uuid-...",
    "nickname": "김할머니",
    "level": 3,
    "exp": 450,
    "expToNextLevel": 500,
    "fertilizer": 12,
    "landscapeItems": 8,
    "streakDays": 5,
    "villageName": "나의 실버빌",
    "residentCount": 4,
    "joinedDaysAgo": 56
  }
}
```

---

### GET `/api/player/missions/today`

**Auth**: Bearer token

**Response (200):**
```json
{
  "success": true,
  "data": {
    "date": "2026-03-12",
    "diet": { "done": true, "mindScore": 7.5 },
    "walk": { "done": true, "steps": 5200, "goal": 5000 },
    "barista": { "done": true, "bestScore": 28 },
    "allComplete": true,
    "streakDays": 6,
    "expEarned": 100
  }
}
```

---

### POST `/api/player/missions/reset`

**Auth**: Bearer token (admin/debug only)

**Request:** (empty body)

**Response (200):**
```json
{
  "success": true,
  "data": { "message": "Daily stats reset successfully", "date": "2026-03-12" }
}
```

---

### GET `/api/player/stats?period=weekly`

**Auth**: Bearer token

**Query params**: `period` = `weekly` | `monthly`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "period": "weekly",
    "startDate": "2026-03-06",
    "endDate": "2026-03-12",
    "diet": { "avgScore": 6.8, "daysCompleted": 5 },
    "walk": { "avgSteps": 4800, "totalSteps": 33600, "daysGoalMet": 4 },
    "barista": { "avgScore": 22, "sessionsPlayed": 6 },
    "streak": { "current": 5, "longest": 12 }
  }
}
```

---

## Middleware Pipeline

```
Request
  -> CORS (app origin only)
  -> Helmet (security headers)
  -> Rate Limiter (Redis-backed, per route)
  -> Body Parser (JSON, 15MB limit for images)
  -> Auth Middleware (JWT verify, skip for public routes)
  -> Zod Validation (per-route schema)
  -> Controller Handler
  -> Error Handler (structured error response)
```

## Daily Reset Cron Job

- Schedule: `0 0 * * *` (midnight KST, UTC+9)
- Actions:
  1. Calculate streak for all users (compare lastActiveDate with yesterday)
  2. Reset daily mission states
  3. Send push notifications for new day
  4. Cleanup expired invite codes (expiresAt < now)
  5. Auto-delete food photos older than 30 days from S3
