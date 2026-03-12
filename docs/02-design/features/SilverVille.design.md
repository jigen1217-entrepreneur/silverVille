# SilverVille: Mind Oasis Design Document

> **Summary**: Complete technical design for a multi-domain dementia prevention healthcare game for active seniors -- village management simulation linked to real-world health activities
>
> **Project**: silverville-mind-oasis
> **Version**: 0.1.0
> **Author**: CTO Lead Agent (8-agent council)
> **Date**: 2026-03-12
> **Status**: Draft
> **PDCA Phase**: Design
> **Planning Doc**: [SilverVille.plan.md](../../01-plan/features/SilverVille.plan.md)

### Design Agent Sources

| Agent | Role | Output Document |
|-------|------|-----------------|
| bkend-expert | Backend/DB design | [prisma-schema.md](../prisma-schema.md), [api-spec.md](../api-spec.md) |
| frontend-architect | Component architecture | [frontend-components.md](../frontend-components.md) |
| security-architect | Security design | [security-design.md](../security-design.md) |
| infra-architect | Infrastructure design | [infra-design.md](../infra-design.md) |
| product-manager | UI/UX wireframes | [wireframes.md](../wireframes.md) |
| qa-strategist | Test strategy | [test-strategy.md](../test-strategy.md) |
| enterprise-expert | Architecture decisions | [adr.md](../adr.md) |
| design-validator | Cross-validation | Integrated into this document (Section 11) |

---

## 1. Design Overview

### 1.1 Design Goals

1. **Complete backend from zero**: Node.js 22 + Express + Prisma + PostgreSQL 16 + Redis 7
2. **Consolidate fragmented frontend state**: Merge two Zustand stores into one unified store with domain slices
3. **Add missing Family tab**: Full implementation of invite/link/mailbox/voice message UI
4. **Secure authentication**: JWT (RS256) with Redis blacklist + KakaoTalk OAuth
5. **Offline-first architecture**: AsyncStorage persistence + sync queue for all core features
6. **Senior accessibility**: 56dp touch targets, 18px button text, TTS at 0.85x, no complex gestures

### 1.2 Design Principles

- **Monolith first**: Single Express server with modular controller/service/route structure (ADR-001)
- **Offline-first**: All core gameplay works without network (ADR-003)
- **Graceful degradation**: AI diet analysis has 3-tier fallback (ADR-004)
- **Senior UX priority**: Every design decision weighted toward accessibility and simplicity
- **Type safety end-to-end**: TypeScript on both client and server, Prisma for DB, Zod for validation

---

## 2. Architecture

### 2.1 System Architecture

```
+-----------------------------------------------------------+
|                    MOBILE CLIENT                           |
|  React Native (Expo SDK 52) + TypeScript + Zustand        |
|                                                           |
|  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌───────┐
|  │ Village  │ │  Walk   │ │  Diet   │ │  Cafe   │ │Family │
|  │   Tab    │ │   Tab   │ │   Tab   │ │   Tab   │ │  Tab  │
|  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬───┘
|       └─────┬─────┴─────┬─────┴─────┬─────┘         │
|        Unified Zustand Store (5 slices)              │
|        ┌──────────────────────────────────┐          │
|        │ auth | player | village |        │          │
|        │ mission | family                 │          │
|        └──────────┬───────────────────────┘          │
|                   │ zustand/persist                   │
|        ┌──────────┴───────────────────────┐          │
|        │ AsyncStorage (offline cache)      │          │
|        └──────────┬───────────────────────┘          │
|                   │                                   │
|        ┌──────────┴───────────────────────┐          │
|        │ Sync Queue (background)           │          │
|        └──────────┬───────────────────────┘          │
+-------------------┼─────────────────────────────────-+
                    │ HTTPS / REST API
+-------------------┼─────────────────────────────────-+
|                   │  BACKEND SERVER                   |
|  Node.js 22 + Express + TypeScript                    |
|                                                       |
|  Middleware Pipeline:                                  |
|  CORS -> Helmet -> Rate Limiter -> JSON Parser        |
|  -> Auth (JWT) -> Zod Validation -> Controller        |
|                                                       |
|  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   |
|  │  Auth   │ │  Diet   │ │  Walk   │ │ Barista │   |
|  ├─────────┤ ├─────────┤ ├─────────┤ ├─────────┤   |
|  │ Family  │ │ Village │ │ Player  │ │  Cron   │   |
|  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   |
|       └─────┬─────┴─────┬─────┘           │         |
|        Prisma ORM       OpenAI Vision   node-cron    |
+--------┬──────────────┬──────────────┬──────────────-+
         │              │              │
   ┌─────┴─────┐ ┌─────┴─────┐ ┌─────┴─────┐
   │ PostgreSQL │ │   Redis   │ │  AWS S3   │
   │    (RDS)   │ │(ElastiCache)│ │ (Images)  │
   │ 10 tables  │ │ Sessions  │ │ Photos    │
   │            │ │ Rate Limit│ │ Voice msgs│
   └────────────┘ └───────────┘ └───────────┘
```

### 2.2 Client Layer Architecture

```
Presentation Layer
  app/(auth)/*.tsx          -- Login, Register screens
  app/(tabs)/*.tsx          -- 5 tab screens (thin delegates)
  src/screens/*.tsx         -- Feature screen implementations
  app/components/ui/*.tsx   -- SeniorButton, LoadingOverlay, EmptyState, etc.
  app/components/family/*.tsx -- InviteCodeDisplay, VoicePlayer, etc.

State Layer
  src/store/index.ts        -- Unified Zustand store
  src/store/slices/         -- authSlice, playerSlice, villageSlice, missionSlice, familySlice
  src/store/selectors.ts    -- healthScore, walkProgress, etc.

Service Layer
  src/services/healthService.ts   -- MIND scoring, rewards (existing)
  src/services/authService.ts     -- Login, register, token management
  src/services/familyService.ts   -- Invite, link, messages
  src/services/syncService.ts     -- Offline sync queue

Infrastructure Layer
  app/api/client.ts         -- HTTP client with JWT + auto-refresh
  app/hooks/usePedometer.ts -- Pedometer hook (existing)
```

### 2.3 Backend Structure

```
server/
  src/
    index.ts                 -- Express app entry, middleware
    routes/
      auth.routes.ts         -- POST /auth/register, login, refresh, logout, kakao, GET /auth/me
      diet.routes.ts         -- POST /diet/analyze, record; GET /diet/history, today
      walk.routes.ts         -- POST /walk/start, complete, answer; PUT /walk/update; GET /walk/quiz, history, today
      barista.routes.ts      -- GET /barista/session, history, today; POST /barista/answer
      family.routes.ts       -- POST /family/invite, link, message; GET /family/members, messages; DELETE, PATCH
      village.routes.ts      -- GET /village, residents, buildings; PATCH /village/name
      player.routes.ts       -- GET /player/profile, missions/today, stats; POST /player/missions/reset
    controllers/             -- Route handlers (parse req -> call service -> send res)
    services/                -- Business logic (auth, diet, walk, barista, family, village, player, dailyReset)
    middleware/
      auth.middleware.ts     -- JWT verification, user extraction
      rateLimiter.ts         -- Redis-backed rate limiting
      errorHandler.ts        -- Global error handler (structured response)
      validate.ts            -- Zod schema validation middleware
    validators/              -- Zod schemas per route
    config/
      database.ts            -- Prisma client singleton
      redis.ts               -- Redis client
      openai.ts              -- OpenAI client config
    utils/
      jwt.ts                 -- Token generation/verification
      inviteCode.ts          -- 6-char code generation
      scoring.ts             -- MIND scoring, rewards
      notifications.ts       -- FCM push helper
    cron/
      dailyReset.ts          -- Midnight KST: streak calc, mission reset, cleanup
  prisma/
    schema.prisma            -- Full schema (10 models, 4 enums)
    seed.ts                  -- Default residents, sample quiz data
  Dockerfile
  package.json
  tsconfig.json
```

---

## 3. Prisma Schema (Complete)

Full Prisma schema with 10 models, 4 enums, and all indexes is defined in [prisma-schema.md](../prisma-schema.md).

### Entity Summary

| Model | Fields | Key Relations | Indexes |
|-------|--------|--------------|---------|
| User | 14 | 1:1 Village, 1:N DietRecord/WalkSession/CafeSession/FamilyLink/FamilyMessage | email, kakao_id, last_active_date |
| Village | 6 | 1:1 User, 1:N Resident/Building | user_id (unique) |
| DietRecord | 8 | N:1 User | user_id, recorded_at, (user_id + recorded_at) |
| WalkSession | 8 | N:1 User, 1:N QuizAnswer | user_id, started_at |
| QuizAnswer | 9 | N:1 WalkSession | walk_session_id |
| CafeSession | 6 | N:1 User, 1:N BaristaAnswer | user_id, played_at |
| BaristaAnswer | 9 | N:1 CafeSession | cafe_session_id |
| FamilyLink | 8 | N:1 User (player), N:1 User (family) | invite_code, player_id, family_member_id |
| FamilyMessage | 9 | N:1 User (sender), N:1 User (receiver) | (receiver_id + is_read), sender_id |
| Resident | 6 | N:1 Village | village_id |
| Building | 6 | N:1 Village | village_id |

### Enums

```
FamilyLinkStatus: PENDING | ACTIVE | REVOKED
MessageType:      VOICE | TEXT | GIFT
BuildingType:     HOUSE | CAFE | FARM | GARDEN | FOUNTAIN
AuthProvider:     EMAIL | KAKAO
```

---

## 4. API Contract

Full API specification with 28 endpoints, request/response JSON examples, and error codes is defined in [api-spec.md](../api-spec.md).

### Endpoint Summary

| Domain | Count | Key Endpoints |
|--------|-------|---------------|
| Auth | 6 | register, login, refresh, logout, kakao, me |
| Diet | 4 | analyze (OpenAI Vision), record, history, today |
| Walk | 7 | start, update, complete, quiz, answer, history, today |
| Barista | 4 | session, answer, history, today |
| Family | 7 | invite, link, members, delete, messages, send, mark-read |
| Village | 4 | state, rename, residents, buildings |
| Player | 4 | profile, missions/today, reset, stats |
| **Total** | **36** | **28 defined in Plan + 8 supporting** |

### Standard Response Format

```json
{
  "success": true,
  "data": { ... }
}
// or
{
  "success": false,
  "error": { "code": "ERROR_CODE", "message": "Korean message" }
}
```

### Error Code Catalog

20 structured error codes defined: AUTH_INVALID_CREDENTIALS, AUTH_TOKEN_EXPIRED, AUTH_RATE_LIMITED, VALIDATION_FAILED, DIET_ANALYSIS_FAILED, WALK_SESSION_ACTIVE, FAMILY_INVITE_EXPIRED, FAMILY_SELF_LINK, etc.

---

## 5. Frontend Component Architecture

Full component design is in [frontend-components.md](../frontend-components.md).

### 5.1 Zustand Store Consolidation

**Problem**: Two overlapping stores (useGameStore + useAppStore) with duplicated state (fertilizer, level, steps).

**Solution**: Single unified store with 5 domain slices.

```
src/store/
  index.ts              -- create() with persist middleware
  slices/
    authSlice.ts        -- isLoggedIn, tokens
    playerSlice.ts      -- id, nickname, level, exp, resources
    villageSlice.ts     -- name, residents, buildings
    missionSlice.ts     -- daily diet/walk/cafe progress
    familySlice.ts      -- links, messages, unreadCount
  selectors.ts          -- healthScore, walkProgress
  middleware/
    persistMiddleware.ts -- AsyncStorage persistence
    syncMiddleware.ts    -- Server sync queue
```

**Persistence**: Only auth + player + village + family persisted to AsyncStorage. Daily mission state fetched fresh from server (or reset on app start).

### 5.2 Navigation Structure Update

Current: 4 tabs (Village, Walk, Diet, Cafe)
Design: 5 tabs (Village, Walk, Diet, Cafe, **Family**)

```typescript
// app/(tabs)/_layout.tsx -- Add Family tab
<Tabs.Screen
  name="family"
  options={{
    title: '가족',
    tabBarIcon: ({ color, focused }) => (
      <Ionicons name={focused ? 'mail' : 'mail-outline'} size={30} color={color} />
    ),
    tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
  }}
/>
```

### 5.3 Auth Flow

```
App Launch -> Check AsyncStorage for tokens -> GET /auth/me
  -> Success: Navigate to (tabs)
  -> Fail: Navigate to (auth)/login

Auth screens: Login (email + Kakao), Register (email/password/nickname)
```

### 5.4 Family Tab (NEW -- Full Design)

Components:
- `FamilyHeader` with unread badge
- `FamilyMemberList` / `FamilyMemberCard`
- `InviteCodeModal` (generate + share via KakaoTalk)
- `CodeInputModal` (enter 6-char code)
- `MessageList` with `VoiceMessageCard`, `TextMessageCard`, `GiftMessageCard`
- `VoicePlayer` / `VoiceRecorder`

### 5.5 New Shared Components

| Component | Purpose |
|-----------|---------|
| ErrorBoundary | Catch React crashes with friendly error UI |
| LoadingOverlay | Full-screen loading with Korean message |
| SkeletonCard | Loading placeholder for data fetch |
| EmptyState | Empty list with icon and message |
| Badge | Notification count on tab icons |
| ConfirmDialog | Large-button confirm for destructive actions |

---

## 6. Security Design

Full security design is in [security-design.md](../security-design.md).

### 6.1 JWT Token Flow

| Token | Algorithm | Expiry | Client Storage | Server Storage |
|-------|-----------|--------|----------------|---------------|
| Access | RS256 | 1 hour | Zustand (memory) | None (stateless) |
| Refresh | RS256 | 7 days | AsyncStorage | Redis (user binding) |

- Token refresh: automatic on 401 response via API client interceptor
- Logout: refresh token added to Redis blacklist
- Token rotation: new refresh token issued on each refresh

### 6.2 KakaoTalk OAuth 2.0

Server-side flow:
1. Client obtains Kakao access token via SDK
2. Client sends token to POST /auth/kakao
3. Server verifies with Kakao API (GET /v2/user/me)
4. Server creates/finds user by kakao_id
5. Server issues JWT pair

Security: KAKAO_CLIENT_SECRET in Secrets Manager; Kakao token NOT persisted.

### 6.3 Rate Limiting

| Route | Limit | Key |
|-------|-------|-----|
| Login | 5/minute | IP |
| Register | 3/minute | IP |
| Diet analyze | 10/minute | userId |
| All other | 100/minute | userId |
| Account lockout | After 10 failures | 30-minute lock |

### 6.4 OWASP Top 10

All 10 categories addressed: Prisma (no raw SQL), Zod (input validation), Helmet (headers), bcrypt (passwords), CORS (restricted origin), S3 SSE (encryption), Redis blacklist (token revocation).

---

## 7. Infrastructure Design

Full infra design is in [infra-design.md](../infra-design.md).

### 7.1 Docker Compose (Local Dev)

```
Services:
  api:       Node.js 22 + Express (port 3000, hot reload)
  postgres:  PostgreSQL 16 Alpine (port 5432)
  redis:     Redis 7 Alpine (port 6379)
```

### 7.2 AWS Production

```
CloudFront -> ALB -> ECS Fargate (2-6 tasks, auto-scale)
                       |
                 RDS PostgreSQL 16 (Multi-AZ)
                 ElastiCache Redis 7
                 S3 (media storage)
                 Secrets Manager (credentials)
```

### 7.3 CI/CD Pipeline

```
Push to feature/* -> GitHub Actions:
  1. TypeScript type check
  2. ESLint
  3. Jest tests (with PostgreSQL + Redis services)
  4. Docker build + push to ECR

Push to staging -> Auto-deploy to ECS Staging
Push to main   -> Manual deploy to ECS Production

Mobile: Expo EAS Build (dev/preview/production profiles)
```

### 7.4 Cost Estimate

- Staging: ~$48/month
- Production: ~$145/month (2 Fargate tasks, RDS Multi-AZ, ElastiCache)

---

## 8. UI/UX Wireframes

Full wireframes are in [wireframes.md](../wireframes.md).

### Key Screens

1. **Login**: Email/password + KakaoTalk button; large inputs (18px)
2. **Register**: Email + password (with strength bar) + optional nickname
3. **Village (Dashboard)**: Level/EXP bar, resources (fertilizer/landscape/residents), 3 mission cards, resident grid
4. **Walk**: Circular progress, step milestones, quiz overlay with TTS + 4 choices
5. **Diet**: Camera preview, analysis loading, result card (MIND score + foods + fertilizer)
6. **Cafe**: Customer order TTS + distractor + 4 menu choices, session summary
7. **Family (NEW)**: Family members list, invite code generate/input, mailbox (voice/text/gift), send buttons

### Senior Accessibility

| Standard | Target | Implementation |
|----------|--------|----------------|
| Touch target | >= 56dp | SeniorButton (minHeight: 56) |
| Font size | >= 16px body, >= 18px buttons | Typography scale defined |
| Contrast | >= 4.5:1 | All color combos verified |
| TTS speed | 0.85x default, adjustable | expo-speech with settings slider |
| No swipe | Single tap only | No swipe-to-delete, no drag gestures |

---

## 9. Test Strategy Summary

Full test strategy is in [test-strategy.md](../test-strategy.md).

### Coverage Targets

| Type | Tool | Target | Key Scenarios |
|------|------|--------|---------------|
| Unit | Jest | 80% | MIND scoring, rewards, JWT auth, password validation, daily reset |
| Integration | Jest + Supertest | 70% | Full auth flow, diet lifecycle, walk session, family invite |
| E2E | Detox | 5 critical paths | Onboarding, diet camera, walk + quiz, barista game, family invite |
| Senior UX | Manual (5 users) | >= 4/5 pass | Registration, diet photo, walk quiz, navigation |

### Battery Testing

- Foreground walk: < 5% drain / 30 min
- Background (phase 2): < 3% drain / 60 min
- Measured on Galaxy A54 and iPhone SE 3

### AI Accuracy

- Food detection recall >= 70% on 100-photo test set
- MIND score MAE within +/- 1.5 of nutritionist ground truth
- 3-tier fallback: OpenAI -> Local DB -> Manual entry

---

## 10. Architecture Decision Records

Full ADRs are in [adr.md](../adr.md).

| ADR | Decision | Rationale |
|-----|----------|-----------|
| ADR-001 | **Monolith** (single Express server) | Small team, ACID transactions, faster development; extract diet service if >10K DAU |
| ADR-002 | **Unified Zustand store** with domain slices | Eliminate state duplication between two stores; persist via AsyncStorage |
| ADR-003 | **Offline-first** with sync queue | Seniors may have unreliable network; optimistic UI + background sync |
| ADR-004 | **3-tier AI fallback** (OpenAI -> Local DB -> Manual) | Diet mission must always be completable |
| ADR-005 | **Foreground pedometer** default; Health API in Phase 2 | Battery safety; seniors keep app open during walks |

---

## 11. Design Validation (Agent 8: Cross-Verification)

### FR Coverage Check

| FR | Description | Covered In | Status |
|----|-------------|-----------|--------|
| FR-01 | AI Food Camera | API: POST /diet/analyze, Frontend: DietScreen, ADR-004 | Covered |
| FR-02 | Magic Fertilizer Reward | API: POST /diet/record, Schema: DietRecord.fertilizerEarned, Store: playerSlice | Covered |
| FR-03 | MIND Food Database | healthService.ts (existing), Fallback Tier 2 in ADR-004 | Covered |
| FR-04 | Pedometer Integration | usePedometer hook, Walk API endpoints, ADR-005 | Covered |
| FR-05 | Landscape Item Reward | API: POST /walk/complete, healthService.calcLandscapeItems | Covered |
| FR-06 | Dual-Task Quiz | API: GET /walk/quiz, POST /walk/answer, QuizOverlay component | Covered |
| FR-07 | Quiz TTS Playback | expo-speech (existing), ttsSpeed in Walk component tree | Covered |
| FR-08 | Barista Working Memory | API: GET /barista/session, POST /barista/answer, BaristaGame component | Covered |
| FR-09 | Distractor Dialogue | BaristaGame component tree (distractor TTS), BaristaAnswer.distractorText | Covered |
| FR-10 | Round Scoring | API: POST /barista/answer -> scoreEarned, CafeSession.totalScore | Covered |
| FR-11 | Mailbox System | API: Family endpoints (7), FamilyLink schema, Family tab design | Covered |
| FR-12 | Voice Message | API: POST /family/message (VOICE type), VoicePlayer/VoiceRecorder components | Covered |
| FR-13 | Item Gifts | API: POST /family/message (GIFT type), GiftMessageCard component | Covered |
| FR-14 | Village Dashboard | VillageScreen component tree, API: GET /village, /player/missions/today | Covered |
| FR-15 | Level & EXP System | Schema: User.level/exp, LEVEL_EXP_THRESHOLDS (existing), API: /player/profile | Covered |
| FR-16 | Animal Residents | Schema: Resident model, ALL_RESIDENTS data, ResidentGrid component | Covered |
| FR-17 | Building System | Schema: Building model + BuildingType enum, API: GET /village/buildings | Covered |
| FR-18 | Auth System | API: 6 auth endpoints, JWT + Redis blacklist, Kakao OAuth, Security design | Covered |
| FR-19 | Daily Reset | Cron: dailyReset.ts, streak calculation, mission flag clear | Covered |
| FR-20 | Data Persistence | AsyncStorage + zustand/persist, Sync queue (ADR-003), PostgreSQL server | Covered |

**Result: 20/20 FR covered (100%)**

### Data Model vs API Consistency

| Check | Status |
|-------|--------|
| All Prisma models have corresponding API endpoints | OK -- All 10 models accessed via 28+ endpoints |
| All API response fields exist in Prisma schema | OK -- Verified JSON examples match schema fields |
| Foreign keys match relation definitions | OK -- All FK constraints defined in Prisma |
| Enum values consistent between schema and API | OK -- PENDING/ACTIVE/REVOKED, VOICE/TEXT/GIFT, etc. |

### Security vs Design Consistency

| Check | Status |
|-------|--------|
| All protected endpoints require Bearer token | OK -- Only /auth/register, /auth/login, /auth/kakao are public |
| Rate limiting configured for auth endpoints | OK -- 5/min login, 3/min register |
| S3 access via pre-signed URLs only | OK -- No direct S3 URLs exposed |
| Password policy enforced at registration | OK -- Zod schema: min 8, letter + number |
| OWASP Top 10 mitigations defined | OK -- All 10 categories addressed |

### Senior UX Compliance

| Check | Status |
|-------|--------|
| All buttons >= 56dp height | OK -- SeniorButton minHeight: 56 |
| All body text >= 16px | OK -- Typography scale defined |
| All button text >= 18px | OK -- SeniorButton label: 18px bold |
| Family tab added to navigation | OK -- 5th tab designed |
| No swipe/drag gestures required | OK -- Single tap only |
| TTS replay available | OK -- Every TTS element has replay button |
| Loading states designed | OK -- LoadingOverlay + SkeletonCard components |

---

## 12. Implementation Checklist

### Sprint 0: Infrastructure + Auth (Week 1)

- [ ] Initialize `server/` directory with TypeScript + Express
- [ ] Create Prisma schema (`prisma/schema.prisma`)
- [ ] Run `prisma migrate dev --name init`
- [ ] Set up Docker Compose (PostgreSQL + Redis)
- [ ] Implement middleware pipeline (CORS, Helmet, rate limiter, error handler)
- [ ] Implement JWT utility (generate, verify, refresh)
- [ ] Implement 6 auth endpoints (register, login, refresh, logout, kakao, me)
- [ ] Implement Redis token blacklist
- [ ] Create `server/.env` template
- [ ] Add health check endpoint (GET /health)
- [ ] Write auth integration tests (IT-01)

### Sprint 1: Core Backend (Week 2-3)

- [ ] Implement Diet controller + service (4 endpoints)
- [ ] Integrate OpenAI Vision API for food analysis
- [ ] Implement local MIND scoring fallback
- [ ] Implement Walk controller + service (7 endpoints)
- [ ] Create quiz bank (50+ questions) and seeder
- [ ] Implement Barista controller + service (4 endpoints)
- [ ] Implement Village controller + service (4 endpoints)
- [ ] Implement Player controller + service (4 endpoints)
- [ ] Implement daily reset cron job
- [ ] Write integration tests (IT-02 through IT-06)
- [ ] Set up Sentry error tracking (server)

### Sprint 2: Client Integration (Week 4-5)

- [ ] Consolidate Zustand stores (unified store with 5 slices)
- [ ] Add zustand/persist middleware for AsyncStorage
- [ ] Update API client with token refresh interceptor
- [ ] Add auth flow (Login/Register screens + AuthGuard)
- [ ] Connect VillageScreen to server API
- [ ] Connect WalkScreen to server API
- [ ] Connect DietScreen to server API
- [ ] Connect CafeScreen to server API
- [ ] Implement sync queue for offline mutations
- [ ] Add ErrorBoundary, LoadingOverlay, SkeletonCard components
- [ ] Add Sentry (client)

### Sprint 3: Family System (Week 6-7)

- [ ] Implement Family controller + service (7 endpoints)
- [ ] Add Family tab to bottom navigation (5th tab)
- [ ] Implement FamilyScreen with full component tree
- [ ] Implement InviteCodeModal (generate + share)
- [ ] Implement CodeInputModal (link accounts)
- [ ] Implement VoicePlayer + VoiceRecorder
- [ ] Implement MessageList with 3 card types
- [ ] Set up S3 for voice message storage
- [ ] Set up FCM push notifications
- [ ] Implement 3-day streak family notification
- [ ] Write E2E-05: Family invite + message

### Sprint 4: Village Enhancement (Week 8-9)

- [ ] Building placement UI
- [ ] Dynamic quiz content from server (difficulty scaling)
- [ ] Barista difficulty progression (4-5 rounds)
- [ ] KakaoTalk OAuth full integration
- [ ] Settings screen (TTS speed, notifications, account)

### Sprint 5: QA & Polish (Week 10-11)

- [ ] Run senior UX test protocol (5 participants)
- [ ] Fix accessibility issues from testing
- [ ] Battery drain testing (Galaxy A54, iPhone SE 3)
- [ ] AI diet accuracy testing (100 photos)
- [ ] Performance optimization (launch time < 3s)
- [ ] Zero Script QA full checklist
- [ ] E2E tests (Detox) all 5 scenarios

### Sprint 6: Launch (Week 12)

- [ ] Set up AWS infrastructure (ECS, RDS, ElastiCache, S3)
- [ ] Configure GitHub Actions CI/CD
- [ ] Deploy to staging
- [ ] Final QA on staging
- [ ] Expo EAS production build
- [ ] App Store / Play Store submission

---

## 13. Known Issues Resolution Plan

Issues identified in Plan (Section 16):

| # | Issue | Resolution | Sprint |
|---|-------|-----------|--------|
| K1 | Two separate Zustand stores | Consolidate into unified store (ADR-002) | Sprint 2 |
| K2 | No token refresh logic | Add 401 interceptor in API client | Sprint 2 |
| K3 | Duplicate tab routes | Delete `app/tabs/` directory (unused) | Sprint 0 |
| K4 | No error boundary | Add ErrorBoundary component | Sprint 2 |
| K5 | Dynamic import in healthService | Convert to static import after store consolidation | Sprint 2 |
| K6 | Family tab missing from navigation | Add 5th tab to _layout.tsx | Sprint 3 |
| K7 | No loading/skeleton states | Add LoadingOverlay + SkeletonCard | Sprint 2 |

---

## 14. File Deliverables Summary

| File | Status | Lines |
|------|--------|-------|
| `docs/02-design/features/SilverVille.design.md` | This document | ~900+ |
| `docs/02-design/prisma-schema.md` | Complete | ~200 |
| `docs/02-design/api-spec.md` | Complete | ~500 |
| `docs/02-design/frontend-components.md` | Complete | ~300 |
| `docs/02-design/security-design.md` | Complete | ~300 |
| `docs/02-design/infra-design.md` | Complete | ~350 |
| `docs/02-design/wireframes.md` | Complete | ~250 |
| `docs/02-design/test-strategy.md` | Complete | ~300 |
| `docs/02-design/adr.md` | Complete | ~250 |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-12 | Initial comprehensive design with 8-agent council | CTO Lead Agent |
