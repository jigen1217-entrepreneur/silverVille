# Agent 3: Security Design

> **Agent**: security-architect
> **Date**: 2026-03-12
> **Scope**: JWT flow, KakaoTalk OAuth, Redis blacklist, rate limiting, S3 security, FCM, OWASP

---

## 1. JWT Token Flow

### Token Specifications

| Token | Algorithm | Expiry | Storage (Client) | Storage (Server) |
|-------|-----------|--------|-------------------|-----------------|
| Access Token | RS256 | 1 hour | In-memory (Zustand) | None (stateless) |
| Refresh Token | RS256 | 7 days | AsyncStorage (encrypted) | Redis (user binding) |

### Token Payload

```json
// Access Token
{
  "sub": "user-uuid",
  "email": "user@example.com",
  "iat": 1710230400,
  "exp": 1710234000,
  "type": "access"
}

// Refresh Token
{
  "sub": "user-uuid",
  "jti": "random-uuid-for-revocation",
  "iat": 1710230400,
  "exp": 1710835200,
  "type": "refresh"
}
```

### Token Flow Diagram

```
[Client]                    [Server]                    [Redis]
   |                           |                           |
   |-- POST /auth/login ------>|                           |
   |   {email, password}       |                           |
   |                           |-- Verify bcrypt hash      |
   |                           |-- Generate access token   |
   |                           |-- Generate refresh token  |
   |                           |-- SET refresh:{jti} -------->|
   |                           |   (TTL: 7 days)           |
   |<-- {accessToken, --------|                           |
   |     refreshToken}         |                           |
   |                           |                           |
   |-- GET /api/resource ----->|                           |
   |   Authorization: Bearer   |                           |
   |                           |-- Verify JWT signature    |
   |                           |-- Check exp               |
   |<-- 200 {data} -----------|                           |
   |                           |                           |
   |-- POST /auth/refresh ---->|                           |
   |   {refreshToken}          |                           |
   |                           |-- Verify JWT              |
   |                           |-- GET refresh:{jti} -------->|
   |                           |<-- exists? ------------------|
   |                           |-- DEL refresh:{old-jti} ---->|
   |                           |-- Generate new pair       |
   |                           |-- SET refresh:{new-jti} ---->|
   |<-- {new accessToken, ----|                           |
   |     new refreshToken}     |                           |
   |                           |                           |
   |-- POST /auth/logout ----->|                           |
   |   Authorization: Bearer   |                           |
   |                           |-- DEL refresh:{jti} -------->|
   |                           |-- SET blacklist:{jti} ------>|
   |                           |   (TTL: remaining expiry) |
   |<-- 200 OK ---------------|                           |
```

### Client Token Refresh Logic

```typescript
// Intercept 401 in API client
async function requestWithRefresh<T>(method: string, path: string, body?: unknown): Promise<T> {
  try {
    return await request<T>(method, path, body);
  } catch (error) {
    if (error.status === 401 && store.getState().refreshToken) {
      // Attempt refresh
      const { accessToken, refreshToken } = await refreshTokens();
      store.getState().login({ accessToken, refreshToken });
      // Retry original request
      return await request<T>(method, path, body);
    }
    throw error;
  }
}
```

---

## 2. KakaoTalk OAuth 2.0 Flow (Server-Side)

```
[Mobile App]              [Server]                [Kakao API]
   |                         |                         |
   |-- Open Kakao Login ---->|                         |
   |   (WebView/SDK)         |                         |
   |                         |                         |
   |<-- Redirect with -------|                         |
   |    authorization_code   |                         |
   |                         |                         |
   |-- POST /auth/kakao ---->|                         |
   |   {kakaoAccessToken}    |                         |
   |                         |-- GET /v2/user/me ------>|
   |                         |   Authorization: Bearer  |
   |                         |<-- {id, nickname} -------|
   |                         |                         |
   |                         |-- Find or create user    |
   |                         |-- Generate JWT pair      |
   |                         |                         |
   |<-- {user, tokens} ------|                         |
```

**Security rules for Kakao OAuth:**
- `KAKAO_CLIENT_SECRET` stored in AWS Secrets Manager, never exposed to client
- Server validates Kakao access token by calling Kakao API directly
- If kakao_id exists in DB: login; if not: auto-create account
- Kakao access token is NOT stored; only `kakao_id` is persisted

---

## 3. Redis Token Blacklist

### Key Schema

```
refresh:{jti}         -> "user-uuid"       TTL: 7 days (matches token expiry)
blacklist:{jti}       -> "1"               TTL: remaining token lifetime
rate:login:{ip}       -> count             TTL: 60 seconds
rate:api:{userId}     -> count             TTL: 60 seconds
session:{userId}      -> "{deviceInfo}"    TTL: 7 days
quiz:cache            -> "[quiz data]"     TTL: 24 hours
```

### Blacklist Check Middleware

```typescript
// Runs on every authenticated request
async function checkBlacklist(req: Request, res: Response, next: NextFunction) {
  const token = extractToken(req);
  const decoded = jwt.decode(token) as JwtPayload;

  if (decoded.type === 'refresh') {
    const isBlacklisted = await redis.exists(`blacklist:${decoded.jti}`);
    if (isBlacklisted) {
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_TOKEN_INVALID', message: 'Token has been revoked' }
      });
    }
  }

  next();
}
```

---

## 4. Rate Limiting Strategy

### Per-Route Limits

| Route | Limit | Window | Key | Response |
|-------|-------|--------|-----|----------|
| POST /auth/login | 5 | 1 minute | IP | 429 + Retry-After header |
| POST /auth/register | 3 | 1 minute | IP | 429 |
| POST /auth/kakao | 5 | 1 minute | IP | 429 |
| POST /diet/analyze | 10 | 1 minute | userId | 429 |
| All other API | 100 | 1 minute | userId | 429 |

### Implementation (Redis-backed sliding window)

```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';

const loginLimiter = rateLimit({
  store: new RedisStore({ sendCommand: (...args) => redis.call(...args) }),
  windowMs: 60_000,
  max: 5,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMITED',
        message: '로그인 시도가 너무 많습니다. 1분 후 다시 시도해주세요.'
      }
    });
  },
});
```

### Account Lockout

- After 10 consecutive failed login attempts: account locked for 30 minutes
- Tracked via Redis key: `lockout:{email}` with TTL 1800
- Unlock: automatic after TTL; or manual via admin endpoint

---

## 5. S3 Image Security

### Pre-signed URL Flow

```
[Client]                  [Server]              [S3]
   |                         |                     |
   |-- POST /upload/url ---->|                     |
   |   {fileType: "image/jpeg", purpose: "diet"}   |
   |                         |                     |
   |                         |-- createPresignedPost ->|
   |                         |   (expires: 5 min)  |
   |<-- {uploadUrl, fields,  |                     |
   |     publicUrl} ---------|                     |
   |                         |                     |
   |-- PUT to uploadUrl --------------------------->|
   |   (direct upload)       |                     |
   |                         |                     |
   |<-- 200 ----------------------------------------|
```

### S3 Bucket Policy

- Block all public access
- Server-side encryption (SSE-S3) enabled
- Object lifecycle: food photos auto-delete after 30 days
- Voice messages: auto-delete after 90 days
- Pre-signed download URLs: 1-hour expiry
- Bucket name never exposed to client (only pre-signed URLs)

### File Validation

- Max file size: 10MB (images), 5MB (voice)
- Allowed MIME types: `image/jpeg`, `image/png`, `audio/m4a`, `audio/mp4`
- Server validates Content-Type header on pre-signed URL generation

---

## 6. FCM Push Notification Security

### Token Management

- FCM token stored in User.pushToken (server-side)
- Token registered on login, updated on app foreground
- Token cleared on logout
- Invalid tokens cleaned up when FCM returns `messaging/invalid-registration-token`

### Notification Types

| Type | Trigger | Target | Content |
|------|---------|--------|---------|
| Daily reminder | Cron (9 AM KST) | All users with pushToken | "오늘의 건강 미션이 기다리고 있어요!" |
| Streak alert | 3-day streak reached | Linked family members | "{nickname}님이 3일 연속 건강 미션 달성!" |
| Family message | New message sent | Receiver | "{sender}님이 메시지를 보냈어요" |
| Level up | Level increase | User | "축하해요! 마을이 레벨 {n}으로 성장했어요!" |

### Security Controls

- FCM server key stored in AWS Secrets Manager
- Notification payload: no sensitive data (only notification title/body + action type)
- Data messages: encrypted channel (FCM default HTTPS)
- Topic-based messaging NOT used (individual tokens only)

---

## 7. OWASP Top 10 Checklist

| # | Risk | Status | Implementation |
|---|------|--------|----------------|
| A01 | Broken Access Control | Planned | JWT middleware on all protected routes; user can only access own data; family data scoped by FamilyLink |
| A02 | Cryptographic Failures | Planned | bcrypt (cost 12) for passwords; RS256 for JWT; TLS 1.3; S3 SSE |
| A03 | Injection | Planned | Prisma parameterized queries (zero raw SQL); Zod input validation on all endpoints |
| A04 | Insecure Design | Planned | Invite codes expire in 24h; 6-char alphanumeric (no dictionary words); rate-limited generation |
| A05 | Security Misconfiguration | Planned | Helmet.js headers; CORS restricted to app origin; debug endpoints disabled in production; no stack traces in errors |
| A06 | Vulnerable Components | Planned | npm audit in CI pipeline; Dependabot for automated PRs; pin major versions |
| A07 | Auth Failures | Planned | Rate limiting; account lockout; password policy (8+ chars, letter+number); no credential stuffing via Kakao-only path |
| A08 | Data Integrity | Planned | Zod request validation; HMAC for webhook verification (Kakao callbacks); CSRF not needed (no cookies, JWT auth) |
| A09 | Logging Failures | Planned | Winston structured logging; security events (login, failed auth, token revocation) logged to CloudWatch; no PII in logs |
| A10 | SSRF | Planned | OpenAI API calls via hardcoded base URL; no user-controlled URL parameters; S3 URLs generated server-side |

---

## 8. Password Policy

```typescript
const PASSWORD_RULES = {
  minLength: 8,
  maxLength: 72,  // bcrypt limit
  requireLetter: true,
  requireNumber: true,
  requireSpecial: false,  // Keep simple for seniors
};

// Zod schema
const passwordSchema = z.string()
  .min(8, '비밀번호는 8자 이상이어야 합니다')
  .max(72)
  .regex(/[a-zA-Z]/, '영문자를 1개 이상 포함해야 합니다')
  .regex(/[0-9]/, '숫자를 1개 이상 포함해야 합니다');
```

---

## 9. Input Validation (Zod Schemas)

All API endpoints validate request bodies with Zod. Examples:

```typescript
// Auth register
const registerSchema = z.object({
  email: z.string().email('올바른 이메일 형식이 아닙니다'),
  password: passwordSchema,
  nickname: z.string().max(50).optional(),
});

// Diet analyze
const dietAnalyzeSchema = z.object({
  image: z.string().min(1, '이미지가 필요합니다'),
});

// Family invite code
const familyLinkSchema = z.object({
  inviteCode: z.string().length(6, '초대 코드는 6자리입니다').regex(/^[A-Z0-9]+$/),
});
```

---

## 10. Security Headers (Helmet.js)

```typescript
app.use(helmet({
  contentSecurityPolicy: false,  // Not needed for API-only server
  crossOriginEmbedderPolicy: false,
  hsts: { maxAge: 31536000, includeSubDomains: true },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'no-referrer' },
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:8081'],
  credentials: false,  // No cookies used
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```
