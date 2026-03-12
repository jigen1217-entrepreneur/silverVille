# SilverVille: Mind Oasis Planning Document

> **Summary**: Multi-domain dementia prevention healthcare game for active seniors -- village management simulation linked to real-world health activities
>
> **Project**: SilverVille: Mind Oasis (silverville-mind-oasis)
> **Version**: 0.1.0
> **Author**: CTO Lead Agent (8-agent council)
> **Date**: 2026-03-12
> **Status**: Draft
> **PDCA Phase**: Plan

---

## 1. Overview

### 1.1 Purpose

SilverVille: Mind Oasis is a healthcare-linked village management simulation game for active seniors (60+). It translates real-world health activities -- walking, healthy eating, cognitive training, and social interaction -- into virtual village growth. The game implements the latest multi-domain intervention research for dementia prevention, as endorsed by The Lancet Commission reports.

### 1.2 Background

- **Medical basis**: Multi-domain interventions (physical activity + cognitive training + diet + social engagement) reduce cognitive decline risk by up to 25-30% (FINGER study, Lancet 2024 report).
- **Market gap**: Existing pedometer/health apps lack gamification depth for senior engagement. Dementia prevention apps lack social and emotional components.
- **Target pain point**: Seniors often lack motivation for sustained health routines. Family disconnection amplifies depression and cognitive decline risk.

### 1.3 Related Documents

- Original design: `SilverVille_Mind_Oasis.md`
- Game design: `GAME_DESIGN.md`
- Existing plan: `docs/01-plan/PDCA_PLAN.md` (superseded by this document)

---

## 2. Target User Personas

### Persona 1: Primary Player -- Active Senior

| Attribute | Detail |
|-----------|--------|
| Age | 60-80 |
| Tech literacy | Can use smartphone apps (KakaoTalk, YouTube) |
| Physical ability | Can walk 3,000-10,000 steps daily |
| Motivation | Wants to stay mentally sharp, fears cognitive decline |
| Social | Lives alone or with spouse; children live separately |
| Device | Mid-range Android (Galaxy A series) or iPhone SE/12+ |

### Persona 2: Family Member (Secondary User)

| Attribute | Detail |
|-----------|--------|
| Age | 30-50 |
| Role | Son/daughter/grandchild of primary player |
| Interaction | Receives health progress notifications, sends voice encouragement |
| Device | Any modern smartphone with KakaoTalk |

### Persona 3: Health Professional (Future)

| Attribute | Detail |
|-----------|--------|
| Role | Geriatric specialist or caregiver |
| Need | Aggregated health activity dashboards for patients |
| Priority | Post-MVP (Phase 2+) |

---

## 3. Core Feature Requirements (4 Pillars)

### 3.1 Functional Requirements

| ID | Feature | Description | Priority | Status |
|----|---------|-------------|----------|--------|
| **FR-01** | **[Diet] AI Food Camera** | Photograph meals, AI detects MIND diet foods (greens, fish, nuts), assigns 0-10 score | High | Partial (UI done, API stub) |
| FR-02 | [Diet] Magic Fertilizer Reward | MIND score converts to fertilizer currency for village farm | High | Partial (logic done, no server sync) |
| FR-03 | [Diet] MIND Food Database | Local scoring of 40+ brain-healthy and 10+ penalty foods | High | Done (healthService.ts) |
| **FR-04** | **[Walk] Pedometer Integration** | expo-sensors Pedometer tracks steps in real-time, goal: 5,000/day | High | Partial (hook done, background tracking missing) |
| FR-05 | [Walk] Landscape Item Reward | Step milestones (5k/7k/10k) yield village decoration items | High | Partial (logic done) |
| **FR-06** | **[Walk] Dual-Task Quiz** | TTS reads quiz questions during walk; 4-choice tap answers every 500 steps | High | Partial (UI done, quiz content hardcoded) |
| FR-07 | [Walk] Quiz TTS Playback | Korean TTS via expo-speech at 0.85x speed for senior accessibility | High | Done |
| **FR-08** | **[Cafe] Barista Working Memory Game** | Listen to animal customer orders via TTS, ignore distractor dialogue, select correct menu | High | Partial (UI done, 3 rounds hardcoded) |
| FR-09 | [Cafe] Distractor Dialogue | Animated interruption speech bubbles with TTS -- trains selective attention | High | Done (animation + TTS) |
| FR-10 | [Cafe] Round Scoring | 10 pts per correct + speed bonus; 3 rounds per session | High | Done |
| **FR-11** | **[Family] Mailbox System** | KakaoTalk account linking; 3-day streak triggers family notification | High | Stub only (API endpoints defined, no implementation) |
| FR-12 | [Family] Voice Message | Family members send voice praise messages viewable in-game mailbox | High | Not started |
| FR-13 | [Family] Item Gifts | Family can send in-game items to the player | Medium | Not started |
| **FR-14** | **[Village] Main Dashboard** | Shows level, EXP, resources, mission status, animal residents, streak badge | High | Done (VillageScreen) |
| FR-15 | [Village] Level & EXP System | Health activities grant EXP; level 1-10 unlocks buildings and residents | High | Done (gameStore.ts) |
| FR-16 | [Village] Animal Residents | 8 unique animal characters unlock at increasing levels | High | Done (VillageScreen) |
| FR-17 | [Village] Building System | 5 building types (house, cafe, farm, garden, fountain) unlock by level | Medium | Partial (types defined, no placement UI) |
| **FR-18** | **Auth System** | User registration, login, JWT tokens, session management | Critical | Not started |
| FR-19 | Daily Reset | Midnight reset of steps, diet score, cafe score; streak calculation | High | Partial (resetDailyStats in gameStore) |
| FR-20 | Data Persistence | AsyncStorage for offline + server sync when online | High | Not started |

### 3.2 Non-Functional Requirements

| Category | Criteria | Measurement Method |
|----------|----------|-------------------|
| Performance | App launch < 3s on mid-range Android | Manual profiling on Galaxy A54 |
| Performance | Camera capture-to-analysis < 5s (including network) | API latency monitoring |
| Performance | Pedometer battery drain < 5%/hour in background | Battery profiler |
| Security | JWT token rotation; no plaintext credential storage | Code review + OWASP checklist |
| Security | Image data encrypted in transit (HTTPS only) | SSL certificate verification |
| Security | KakaoTalk OAuth token isolated from game data | Security audit |
| Accessibility | Minimum touch target 56x56dp (WCAG 2.1 AA) | Already implemented in SeniorButton |
| Accessibility | Minimum font 16px body, 18px buttons | Style audit |
| Accessibility | High contrast ratio >= 4.5:1 for all text | Contrast checker |
| Accessibility | TTS speed configurable (0.7x-1.0x) | Settings screen |
| Reliability | Offline mode for all core features | Network disconnect testing |
| Reliability | Graceful degradation when pedometer unavailable | Already implemented |
| Localization | Korean (primary), English (future) | i18n framework |

---

## 4. Scope

### 4.1 MVP Scope (Sprint 1-3, 6 weeks)

- [x] Village main dashboard with missions
- [x] Pedometer step tracking (foreground)
- [x] Dual-task quiz during walk (local quiz bank)
- [x] AI diet camera with MIND scoring
- [x] Barista working memory game (3 rounds)
- [ ] User authentication (email + password)
- [ ] Server-side data persistence (PostgreSQL)
- [ ] Daily reset automation
- [ ] Basic family invite/link flow
- [ ] Background pedometer tracking
- [ ] Push notifications for daily reminders

### 4.2 Full Scope (Sprint 4-6, additional 6 weeks)

- [ ] KakaoTalk OAuth integration
- [ ] Voice message recording & playback (family mailbox)
- [ ] Family gift item system
- [ ] Dynamic quiz content from server (difficulty scaling)
- [ ] Barista difficulty progression (4-5 rounds, harder distractors)
- [ ] Building placement UI (farm, garden, fountain)
- [ ] Achievement system & badges
- [ ] Leaderboard (opt-in, age-appropriate)
- [ ] Health professional dashboard (web admin)
- [ ] Multi-language support

### 4.3 Out of Scope

- Real-time multiplayer features
- In-app purchases or monetization
- Medical diagnosis or prescription
- Integration with wearable devices (Apple Watch, Galaxy Watch)
- Video calling between family members

---

## 5. User Stories

### 5.1 Authentication & Onboarding

| ID | Story | Acceptance Criteria | Priority |
|----|-------|--------------------|----------|
| US-01 | As a senior, I want to create an account with minimal friction so that I can start playing quickly | Email/password registration; optional nickname; auto-generate village name | High |
| US-02 | As a senior, I want to log in with KakaoTalk so that I don't need to remember a password | KakaoTalk OAuth flow; auto-create account on first login | High |
| US-03 | As a returning player, I want my progress saved so that I don't lose my village | Server-side persistence; last sync timestamp shown | High |

### 5.2 Diet System

| ID | Story | Acceptance Criteria | Priority |
|----|-------|--------------------|----------|
| US-04 | As a senior, I want to photograph my meal and see what brain-healthy foods I ate | Camera opens, photo captured, AI returns food list with MIND labels | High |
| US-05 | As a senior, I want to receive fertilizer rewards based on my diet score | MIND score 0-10 mapped to 0-5 fertilizer; animation on reward | High |
| US-06 | As a senior, I want simple feedback on how to improve my diet | Text feedback like "Add more green vegetables next time" | High |

### 5.3 Walk System

| ID | Story | Acceptance Criteria | Priority |
|----|-------|--------------------|----------|
| US-07 | As a senior, I want to see my step count grow toward a daily goal | Large step counter, animated progress bar, goal: 5,000 steps | High |
| US-08 | As a senior, I want animal characters to quiz me while I walk | TTS reads question at 0.85x speed; 4-choice buttons; every 500 steps | High |
| US-09 | As a senior, I want to earn decoration items when I reach my walking goal | Landscape items awarded at 5k/7k/10k thresholds | High |
| US-10 | As a senior, I want my steps counted even when the app is in the background | Background pedometer service; notification showing progress | Medium |

### 5.4 Barista Game

| ID | Story | Acceptance Criteria | Priority |
|----|-------|--------------------|----------|
| US-11 | As a senior, I want to listen to a customer order and remember it despite distractions | TTS order -> 0.8s delay -> distractor TTS -> menu selection | High |
| US-12 | As a senior, I want to see my score and round results after the cafe game | 3-round summary, total score, per-round correct/wrong, encouraging message | High |

### 5.5 Family System

| ID | Story | Acceptance Criteria | Priority |
|----|-------|--------------------|----------|
| US-13 | As a senior, I want my children notified when I complete 3 consecutive days of health missions | Push notification to linked family member after 3-day streak | High |
| US-14 | As a family member, I want to send voice encouragement to my parent | Record voice message in app; appears in parent's in-game mailbox | High |
| US-15 | As a family member, I want to send gift items to my parent's village | Select item from shop; deducted from family member's allowance; appears in parent's inventory | Medium |

### 5.6 Village & Progression

| ID | Story | Acceptance Criteria | Priority |
|----|-------|--------------------|----------|
| US-16 | As a senior, I want to see my village grow as I stay healthy | New residents at level-ups; buildings unlock; visual progression | High |
| US-17 | As a senior, I want to see my daily health missions in one place | Dashboard shows diet/walk/cafe status with completion badges | High |
| US-18 | As a senior, I want to see my streak and feel motivated to continue | Fire emoji badge with day count; color changes at 3/7 day milestones | High |

### 5.7 Accessibility

| ID | Story | Acceptance Criteria | Priority |
|----|-------|--------------------|----------|
| US-19 | As a senior with reduced vision, I want large text and high-contrast buttons | Minimum 16px body, 18px buttons, contrast >= 4.5:1 | High |
| US-20 | As a senior with hearing concerns, I want adjustable TTS speed | Settings slider: 0.7x to 1.0x speech rate | Medium |

---

## 6. Technology Stack

### 6.1 Client (Mobile App)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Framework | React Native (Expo SDK 52) | Already in codebase; managed workflow simplifies native module access; OTA updates for senior users who rarely update apps manually |
| Language | TypeScript 5.6 | Type safety reduces runtime errors; already configured |
| State Management | Zustand 5.0 | Lightweight (1.1kB); simpler than Redux for senior-focused app; already in use |
| Navigation | Expo Router 4.0 | File-based routing; deep linking support; already in use |
| Sensors | expo-sensors (Pedometer) | Native pedometer access; permission handling built-in |
| Camera | expo-camera 16.0 | Camera access with base64 capture for AI analysis |
| TTS | expo-speech 13.0 | Korean TTS for quiz and barista game |
| Storage | @react-native-async-storage 1.23.1 | Offline-first data persistence |
| Animation | react-native-reanimated 3.16 | Smooth UI animations for senior-friendly transitions |
| Icons | @expo/vector-icons (Ionicons) | Consistent icon set; already in use |

### 6.2 Server (Backend API)

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Runtime | Node.js 22 LTS | JavaScript ecosystem consistency with frontend; npm package sharing |
| Framework | Express.js | Lightweight; sufficient for REST API; existing decision |
| ORM | Prisma | Type-safe database access; auto-migration; schema-first design |
| Database | PostgreSQL 16 | ACID compliance for health data integrity; JSON support for flexible schemas |
| Cache | Redis 7 | Session storage; rate limiting; quiz content caching |
| AI | OpenAI Vision API (GPT-4o) | Food image recognition; MIND diet scoring; Korean language support |
| Auth | JWT (access + refresh tokens) | Stateless auth; mobile-friendly; Redis blacklist for revocation |
| Push | Firebase Cloud Messaging (FCM) | Cross-platform push notifications for daily reminders and family alerts |

### 6.3 Infrastructure

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Cloud | AWS | Existing decision; mature ecosystem |
| Compute | AWS ECS (Fargate) | Serverless container orchestration; auto-scaling |
| Database | AWS RDS (PostgreSQL) | Managed database; automated backups; Multi-AZ for reliability |
| Object Storage | AWS S3 | Food photo storage; voice message files |
| Cache | AWS ElastiCache (Redis) | Managed Redis; session store |
| CDN | AWS CloudFront | Static asset delivery; low-latency image access |
| CI/CD | GitHub Actions | Integrated with GitHub repo; Expo EAS Build for mobile |
| Monitoring | Sentry (error tracking) + Datadog (APM) | Real-time error alerting; performance dashboards |

---

## 7. Architecture

### 7.1 System Architecture Diagram

```
+-----------------------------------------------------------+
|                    MOBILE CLIENT                           |
|  React Native (Expo SDK 52) + TypeScript                  |
|                                                           |
|  +-------------+  +-------------+  +-------------+       |
|  | Village Tab  |  | Walk Tab    |  | Diet Tab    |       |
|  | (Dashboard)  |  | (Pedometer  |  | (Camera +   |       |
|  |              |  |  + Quiz)    |  |  AI Vision) |       |
|  +-------------+  +-------------+  +-------------+       |
|  +-------------+  +-----------------------------------+   |
|  | Cafe Tab    |  | Family Tab (Mailbox + Messaging)  |   |
|  | (Barista    |  |                                   |   |
|  |  Game)      |  |                                   |   |
|  +-------------+  +-----------------------------------+   |
|                                                           |
|  +-------------------+  +-----------------------------+   |
|  | Zustand Store      |  | Service Layer              |   |
|  | (State Management) |  | (healthService,            |   |
|  |                    |  |  pedometerService,          |   |
|  |                    |  |  familyService)             |   |
|  +-------------------+  +-----------------------------+   |
|                            |                              |
|  +-------------------+     |  API Client (fetch)          |
|  | AsyncStorage      |     |  Bearer JWT Auth             |
|  | (Offline Cache)   |     |                              |
|  +-------------------+     |                              |
+----------------------------+------------------------------+
                             |
                      HTTPS / REST API
                             |
+-----------------------------------------------------------+
|                    BACKEND SERVER                           |
|  Node.js 22 + Express + TypeScript                        |
|                                                           |
|  +------------------+  +------------------------------+   |
|  | Auth Middleware   |  | Rate Limiter (Redis-backed)  |   |
|  | (JWT verify)     |  |                              |   |
|  +------------------+  +------------------------------+   |
|                                                           |
|  +------------------+  +------------------+               |
|  | Auth Controller  |  | Diet Controller  |               |
|  | POST /auth/*     |  | POST /diet/*     |               |
|  +------------------+  +------------------+               |
|  +------------------+  +------------------+               |
|  | Walk Controller  |  | Barista Controller|              |
|  | /walk/*          |  | /barista/*       |               |
|  +------------------+  +------------------+               |
|  +------------------+  +------------------+               |
|  | Family Controller|  | Village Controller|              |
|  | /family/*        |  | /village/*       |               |
|  +------------------+  +------------------+               |
|                                                           |
|  +------------------+  +------------------+               |
|  | Prisma ORM       |  | OpenAI Vision    |               |
|  | (Data Layer)     |  | (AI Service)     |               |
|  +------------------+  +------------------+               |
+-----------------------------------------------------------+
           |                    |                |
    +------+------+    +-------+------+   +-----+-----+
    | PostgreSQL  |    | Redis        |   | AWS S3    |
    | (RDS)       |    | (ElastiCache)|   | (Images)  |
    | - Users     |    | - Sessions   |   | - Food    |
    | - Villages  |    | - Rate Limit |   |   photos  |
    | - Missions  |    | - Quiz Cache |   | - Voice   |
    | - Families  |    |              |   |   msgs    |
    +-------------+    +--------------+   +-----------+
```

### 7.2 Client Architecture (Layered)

```
Presentation Layer
  app/(tabs)/*.tsx          -- Tab screens (thin, delegate to src/screens)
  src/screens/*.tsx         -- Feature screens (UI + interaction logic)
  app/components/ui/*.tsx   -- Reusable UI components (SeniorButton, etc.)

State Layer
  app/store/index.ts        -- App-level state (Zustand)
  src/store/gameStore.ts    -- Game-specific state (Zustand) [to be consolidated]

Service Layer
  src/services/*.ts         -- Business logic + API bridge
  app/api/client.ts         -- HTTP client with JWT auth

Hook Layer
  app/hooks/*.ts            -- Custom hooks (usePedometer, etc.)
```

### 7.3 Backend Architecture (Express Modular)

```
src/
  controllers/              -- Route handlers (req/res)
  services/                 -- Business logic
  models/                   -- Prisma schema + types
  middleware/                -- Auth, rate-limit, error-handler
  config/                   -- Environment, database, external APIs
  utils/                    -- Helpers (scoring, notifications)
  routes/                   -- Express router definitions
  prisma/
    schema.prisma           -- Database schema
    migrations/             -- Prisma migration files
```

---

## 8. Data Model

### 8.1 Entity Relationship Diagram (Text)

```
User (1) ----< (N) DietRecord
User (1) ----< (N) WalkSession
User (1) ----< (N) CafeSession
User (1) ----  (1) Village
User (1) ----< (N) FamilyLink
User (1) ----< (N) FamilyMessage
Village (1) --< (N) Resident
Village (1) --< (N) Building
WalkSession (1) --< (N) QuizAnswer
CafeSession (1) --< (N) BaristaAnswer
```

### 8.2 Core Entities

#### User

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| email | VARCHAR(255) | Login email (unique) |
| password_hash | VARCHAR(255) | bcrypt hashed password |
| nickname | VARCHAR(50) | Display name (default: "Mayor") |
| kakao_id | VARCHAR(100) | KakaoTalk OAuth ID (nullable) |
| level | INT | Current level (1-10) |
| exp | INT | Current experience points |
| fertilizer | INT | Magic fertilizer count |
| landscape_items | INT | Landscape decoration count |
| streak_days | INT | Consecutive mission completion days |
| last_active_date | DATE | Last daily activity date |
| push_token | TEXT | FCM push notification token |
| created_at | TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | Last update |

#### Village

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK) | Owner reference |
| name | VARCHAR(100) | Village name |
| population | INT | Current resident count |

#### DietRecord

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK) | Player reference |
| mind_score | DECIMAL(3,1) | MIND diet score (0.0-10.0) |
| detected_foods | JSONB | Array of detected food names |
| fertilizer_earned | INT | Fertilizer awarded |
| image_url | TEXT | S3 URL of food photo |
| recorded_at | TIMESTAMP | Meal timestamp |

#### WalkSession

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK) | Player reference |
| start_steps | INT | Step count at session start |
| end_steps | INT | Step count at session end |
| total_steps | INT | Computed: end - start |
| landscape_earned | INT | Landscape items awarded |
| started_at | TIMESTAMP | Session start |
| completed_at | TIMESTAMP | Session end |

#### QuizAnswer

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| walk_session_id | UUID (FK) | Parent walk session |
| quiz_id | VARCHAR(50) | Quiz identifier |
| question | TEXT | Quiz question text |
| selected_answer | VARCHAR(200) | Player's answer |
| correct_answer | VARCHAR(200) | Correct answer |
| is_correct | BOOLEAN | Whether answer was correct |
| step_milestone | INT | Step count when quiz was triggered |
| answered_at | TIMESTAMP | Answer timestamp |

#### CafeSession

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| user_id | UUID (FK) | Player reference |
| total_score | INT | Final session score |
| rounds_played | INT | Number of rounds (typically 3) |
| correct_count | INT | Number of correct answers |
| played_at | TIMESTAMP | Session timestamp |

#### BaristaAnswer

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| cafe_session_id | UUID (FK) | Parent cafe session |
| round_number | INT | Round index (1-3) |
| order_text | TEXT | The customer's order |
| distractor_text | TEXT | The distractor dialogue |
| selected_menu_id | VARCHAR(50) | Player's selected menu |
| correct_menu_id | VARCHAR(50) | Correct menu |
| is_correct | BOOLEAN | Whether answer was correct |
| score_earned | INT | Points earned this round |

#### FamilyLink

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| player_id | UUID (FK) | Senior player |
| family_member_id | UUID (FK) | Family member user |
| invite_code | VARCHAR(20) | 6-digit invite code |
| status | ENUM | pending / active / revoked |
| linked_at | TIMESTAMP | When link was activated |

#### FamilyMessage

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| sender_id | UUID (FK) | Message sender |
| receiver_id | UUID (FK) | Message receiver |
| message_type | ENUM | voice / text / gift |
| content_url | TEXT | S3 URL for voice messages |
| gift_item_type | VARCHAR(50) | Item type if gift |
| is_read | BOOLEAN | Whether recipient has read |
| sent_at | TIMESTAMP | Send timestamp |

#### Resident (Village Animal)

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(50) (PK) | Resident identifier |
| village_id | UUID (FK) | Village reference |
| name | VARCHAR(50) | Animal name |
| emoji | VARCHAR(10) | Animal emoji |
| unlock_level | INT | Level required to unlock |
| arrived_at | TIMESTAMP | When the resident joined |

#### Building

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Primary key |
| village_id | UUID (FK) | Village reference |
| type | ENUM | house / cafe / farm / garden / fountain |
| name | VARCHAR(100) | Building display name |
| unlock_level | INT | Level required |
| placed_at | TIMESTAMP | When placed in village |

---

## 9. API Endpoint Design

### 9.1 Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Create account (email + password) | Public |
| POST | `/api/auth/login` | Login, returns JWT access + refresh token | Public |
| POST | `/api/auth/refresh` | Refresh expired access token | Refresh token |
| POST | `/api/auth/logout` | Revoke refresh token (Redis blacklist) | Bearer |
| POST | `/api/auth/kakao` | KakaoTalk OAuth login/register | Public |
| GET | `/api/auth/me` | Get current user profile | Bearer |

### 9.2 Diet System

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/diet/analyze` | Upload food image for AI analysis | Bearer |
| POST | `/api/diet/record` | Record diet result (score, foods, fertilizer) | Bearer |
| GET | `/api/diet/history` | Get diet history (paginated) | Bearer |
| GET | `/api/diet/today` | Get today's diet record | Bearer |

### 9.3 Walk System

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/walk/start` | Start walk session | Bearer |
| PUT | `/api/walk/update` | Update step count (periodic sync) | Bearer |
| POST | `/api/walk/complete` | Complete walk session, calculate rewards | Bearer |
| GET | `/api/walk/quiz` | Get next quiz question | Bearer |
| POST | `/api/walk/answer` | Submit quiz answer | Bearer |
| GET | `/api/walk/history` | Get walk session history | Bearer |
| GET | `/api/walk/today` | Get today's walk data | Bearer |

### 9.4 Barista Game

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/barista/session` | Get new barista game session (customer + order + distractor) | Bearer |
| POST | `/api/barista/answer` | Submit menu selection for a round | Bearer |
| GET | `/api/barista/history` | Get cafe game history | Bearer |
| GET | `/api/barista/today` | Get today's best score | Bearer |

### 9.5 Family System

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/family/invite` | Generate invite code for family linking | Bearer |
| POST | `/api/family/link` | Link accounts using invite code | Bearer |
| GET | `/api/family/members` | List linked family members | Bearer |
| DELETE | `/api/family/members/:id` | Remove family link | Bearer |
| GET | `/api/family/messages` | Get mailbox messages (paginated) | Bearer |
| POST | `/api/family/message` | Send message (voice/text/gift) | Bearer |
| PATCH | `/api/family/messages/:id/read` | Mark message as read | Bearer |

### 9.6 Village System

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/village` | Get village state (name, residents, buildings) | Bearer |
| PATCH | `/api/village/name` | Update village name | Bearer |
| GET | `/api/village/residents` | List current residents | Bearer |
| GET | `/api/village/buildings` | List unlocked buildings | Bearer |

### 9.7 Player / Mission

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/player/profile` | Get player profile with stats | Bearer |
| GET | `/api/player/missions/today` | Get today's mission progress | Bearer |
| POST | `/api/player/missions/reset` | Force daily reset (admin/debug) | Bearer |
| GET | `/api/player/stats` | Get aggregate stats (weekly/monthly) | Bearer |

**Total: 28 endpoints**

---

## 10. Security Requirements

### 10.1 Authentication & Authorization

| Requirement | Implementation |
|-------------|---------------|
| Password hashing | bcrypt with cost factor 12 |
| JWT access token | 15-minute expiry; signed with RS256 |
| JWT refresh token | 7-day expiry; stored in Redis with user binding |
| Token revocation | Redis blacklist for logged-out refresh tokens |
| KakaoTalk OAuth | OAuth 2.0 Authorization Code flow; server-side token exchange |
| Rate limiting | 5 login attempts per minute per IP; exponential backoff |
| Password policy | Minimum 8 characters; at least 1 letter + 1 number |

### 10.2 Data Protection

| Requirement | Implementation |
|-------------|---------------|
| Transport encryption | TLS 1.3 only; HSTS headers |
| Food photo storage | S3 with server-side encryption (SSE-S3); pre-signed URLs for access |
| Voice message storage | S3 encrypted; access via pre-signed URLs with 1-hour expiry |
| Personal data | Email and kakao_id encrypted at rest in RDS |
| Database access | Prisma connection via RDS IAM authentication; no hardcoded credentials |
| API keys | OpenAI key stored in AWS Secrets Manager; never exposed to client |

### 10.3 OWASP Top 10 Coverage

| Risk | Mitigation |
|------|-----------|
| A01 Broken Access Control | JWT middleware on all protected routes; role-based checks for family data |
| A02 Cryptographic Failures | bcrypt passwords; TLS everywhere; encrypted S3 |
| A03 Injection | Prisma parameterized queries; input validation with Zod |
| A04 Insecure Design | Threat modeling for family link flow; invite codes expire in 24h |
| A05 Security Misconfiguration | Helmet.js for headers; CORS restricted to app origin |
| A06 Vulnerable Components | npm audit in CI; Dependabot enabled |
| A07 Auth Failures | Rate limiting; account lockout after 10 failed attempts |
| A08 Data Integrity | Request validation (Zod schemas); HMAC for webhook verification |
| A09 Logging Failures | Structured logging (Winston); security events logged to CloudWatch |
| A10 SSRF | OpenAI API calls via allowlisted URLs; no user-controlled URL parameters |

---

## 11. Infrastructure Design

### 11.1 AWS Architecture

```
Internet
    |
CloudFront (CDN)
    |
ALB (Application Load Balancer)
    |
+---+---+
|  ECS  | (Fargate)
| Task  | x 2 (min)
+---+---+
    |
+---+---+---+---+
|   |       |   |
RDS Redis  S3  Secrets
(PG) (Cache)    Manager
```

### 11.2 Environment Configuration

| Environment | Compute | Database | Notes |
|-------------|---------|----------|-------|
| Local | Docker Compose | PostgreSQL 16 + Redis 7 | Full stack on localhost |
| Staging | ECS Fargate (1 task) | RDS db.t3.micro | Preview builds via Expo EAS |
| Production | ECS Fargate (2+ tasks, auto-scale) | RDS db.t3.small (Multi-AZ) | App Store / Play Store |

### 11.3 CI/CD Pipeline

```
Push to feature/*
    |
GitHub Actions CI:
    1. TypeScript type check (tsc --noEmit)
    2. ESLint + Prettier
    3. Jest unit tests
    4. Build Docker image
    5. Push to ECR
    |
PR to staging
    |
Auto-deploy to ECS Staging
    |
Expo EAS Build (preview)
    |
PR to main (after QA approval)
    |
Manual deploy to ECS Production
    |
Expo EAS Build (production) -> App Store / Play Store submission
```

### 11.4 Monitoring & Alerting

| Tool | Purpose | Alerts |
|------|---------|--------|
| Sentry | Error tracking (client + server) | New error spike > 10/min |
| Datadog | APM, infrastructure metrics | API latency p95 > 2s; CPU > 80% |
| CloudWatch | ECS/RDS metrics, logs | Database connections > 80% |
| Firebase Analytics | User engagement metrics | Daily active users drop > 20% |

---

## 12. Test Strategy

### 12.1 Test Pyramid

| Level | Tool | Coverage Target | Scope |
|-------|------|----------------|-------|
| Unit Tests | Jest + React Native Testing Library | 80% | Business logic (scoring, rewards); Store actions; Service functions |
| Integration Tests | Jest + Supertest | 70% | API endpoints with test database; Auth flow; Family linking |
| E2E Tests | Detox | Critical paths | Onboarding; Diet camera flow; Walk + quiz flow; Barista game flow |
| Manual QA | Real senior users | 5 users minimum | Usability, readability, physical comfort |

### 12.2 Senior UX Test Protocol

| Test | Method | Pass Criteria |
|------|--------|---------------|
| First-time onboarding | 5 seniors complete registration unaided | > 4/5 complete within 3 minutes |
| Diet camera | 5 seniors photograph a meal and read results | > 4/5 understand MIND score meaning |
| Walk + quiz | 3 seniors walk 500+ steps and answer quiz | > 2/3 can hear TTS and tap answer while walking |
| Barista game | 5 seniors play 1 full session (3 rounds) | > 3/5 score at least 10/30 points |
| Button readability | 5 seniors read all button labels | > 4/5 can read without squinting |
| Navigation | 5 seniors switch between all tabs | > 4/5 find correct tab within 5 seconds |

### 12.3 Accessibility Testing

| Check | Tool | Standard |
|-------|------|----------|
| Contrast ratio | react-native-a11y or manual check | WCAG 2.1 AA (>= 4.5:1) |
| Touch targets | Layout inspector | >= 48dp (current: 56dp) |
| Screen reader | TalkBack (Android) / VoiceOver (iOS) | All interactive elements have labels |
| Font scaling | System font size "Largest" | No text truncation or overflow |

---

## 13. Development Schedule

### Sprint Plan (2-week sprints)

| Sprint | Duration | Focus | Deliverables |
|--------|----------|-------|-------------|
| **Sprint 0** | Week 1 | Setup & Auth | Monorepo restructure; Prisma schema; Docker Compose; Auth API (register/login/JWT) |
| **Sprint 1** | Week 2-3 | Core Backend | Diet/Walk/Barista API endpoints; Daily reset cron; OpenAI Vision integration |
| **Sprint 2** | Week 4-5 | Client Integration | Connect all screens to real API; AsyncStorage offline sync; Background pedometer |
| **Sprint 3** | Week 6-7 | Family System | KakaoTalk OAuth; Family invite/link; Voice message upload/playback; Push notifications |
| **Sprint 4** | Week 8-9 | Village Enhancement | Building placement UI; Dynamic quiz from server; Barista difficulty scaling |
| **Sprint 5** | Week 10-11 | QA & Polish | Senior UX testing; Accessibility fixes; Performance optimization; Battery optimization |
| **Sprint 6** | Week 12 | Launch Prep | Staging deployment; Final QA; App Store/Play Store submission; Documentation |

### Milestone Summary

```
Week 1:      [Sprint 0] Auth + Infrastructure setup
Week 2-3:    [Sprint 1] Backend API complete
Week 4-5:    [Sprint 2] Client-server integration
Week 6-7:    [Sprint 3] Family features
Week 8-9:    [Sprint 4] Village enhancement
Week 10-11:  [Sprint 5] QA + Senior UX testing
Week 12:     [Sprint 6] Launch
```

---

## 14. Risk Analysis

| # | Risk | Impact | Likelihood | Mitigation |
|---|------|--------|------------|------------|
| R1 | OpenAI Vision API inaccurate for Korean food recognition | High | Medium | Build local MIND food DB as fallback scoring; fine-tune prompts with Korean food examples |
| R2 | Background pedometer drains battery excessively on older Android devices | High | High | Use expo-sensors foreground tracking as primary; background tracking as opt-in with clear battery warning |
| R3 | Seniors unable to complete onboarding (too complex) | High | Medium | Minimal registration fields; KakaoTalk one-tap login; family member assisted setup flow |
| R4 | KakaoTalk API integration delays or policy changes | Medium | Medium | Email login as primary auth; Kakao as optional; abstract OAuth provider |
| R5 | TTS quality varies across Android devices | Medium | High | Provide "replay" button on every TTS; visual fallback text always shown; test on 5+ device models |
| R6 | MIND diet scoring disputed by healthcare professionals | Medium | Low | Cite published FINGER/MIND diet studies; add disclaimer "not medical advice"; allow score weight adjustments |
| R7 | Family members lose interest in sending messages | Medium | High | Automated nudge notifications; pre-written message templates; minimal effort interactions (emoji reactions) |
| R8 | Data privacy concerns with food photos and health data | High | Medium | Clear consent UI; data deletion endpoint; minimize data retention (photos auto-delete after 30 days) |
| R9 | Network connectivity poor for rural senior users | Medium | Medium | Offline-first architecture; queue API calls; sync when connected |
| R10 | Expo SDK version incompatibility with native modules | Low | Low | Pin SDK version (52); test all expo-* packages in CI |

---

## 15. Code Quality & Conventions

### 15.1 Existing Conventions (from codebase analysis)

- [x] TypeScript strict mode enabled
- [x] Path aliases configured (`@/*`)
- [x] SeniorButton component follows WCAG touch target guidelines
- [x] Korean TTS rate standardized at 0.85x
- [x] Zustand stores use functional updates
- [ ] No ESLint configuration file present (script exists in package.json)
- [ ] No Prettier configuration
- [ ] No commit message convention

### 15.2 Conventions to Establish

| Category | Convention |
|----------|-----------|
| Naming (files) | PascalCase for components, camelCase for services/hooks/utils |
| Naming (variables) | camelCase for variables/functions, UPPER_SNAKE for constants |
| Folder structure | app/ for routing, src/ for feature code, consolidate stores |
| Import order | React -> RN -> expo -> 3rd party -> app -> relative |
| Error handling | Try/catch with fallback to mock data; Alert.alert for user-facing errors |
| API responses | `{ success: boolean, data?: T, error?: { code: string, message: string } }` |
| Colors | Centralized theme constants (not inline hex) |
| Component size | Max 200 lines per component file; extract sub-components |

### 15.3 Environment Variables

| Variable | Purpose | Scope | Status |
|----------|---------|-------|--------|
| `EXPO_PUBLIC_API_URL` | Backend API base URL | Client | Exists (defaults to localhost) |
| `DATABASE_URL` | PostgreSQL connection string | Server | To create |
| `REDIS_URL` | Redis connection string | Server | To create |
| `JWT_SECRET` | JWT signing key | Server | To create |
| `JWT_REFRESH_SECRET` | Refresh token signing key | Server | To create |
| `OPENAI_API_KEY` | OpenAI Vision API key | Server | To create |
| `KAKAO_CLIENT_ID` | KakaoTalk OAuth app ID | Server | To create |
| `KAKAO_CLIENT_SECRET` | KakaoTalk OAuth secret | Server | To create |
| `AWS_S3_BUCKET` | S3 bucket name for uploads | Server | To create |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging key | Server | To create |
| `SENTRY_DSN` | Sentry error tracking DSN | Both | To create |

---

## 16. Known Issues in Current Codebase

| # | Issue | Location | Severity |
|---|-------|----------|----------|
| K1 | Two separate Zustand stores with overlapping state (app/store vs src/store) | `app/store/index.ts`, `src/store/gameStore.ts` | Medium -- must consolidate before backend integration |
| K2 | API client has no token refresh logic (TODO comment) | `app/api/client.ts:8` | High -- auth will fail after token expiry |
| K3 | Duplicate tab routes (app/(tabs) and app/tabs) | Both directories | Low -- app/tabs appears unused |
| K4 | No error boundary for React Native crashes | Root layout | Medium |
| K5 | healthService uses dynamic import for API client (may cause bundling issues) | `src/services/healthService.ts` | Low |
| K6 | Family tab missing from bottom navigation | `app/(tabs)/_layout.tsx` | High -- core feature has no UI entry point |
| K7 | No loading/skeleton states for data fetching | All screens | Medium -- seniors need visual feedback |

---

## 17. Agent Analysis Summary

This plan integrates analysis from 8 specialized agents:

| Agent | Key Findings |
|-------|-------------|
| **product-manager** | 20 user stories covering all 4 pillars + auth + accessibility; MVP scope is achievable in 6 weeks with existing UI work |
| **enterprise-expert** | Express + Prisma is appropriate for this scale (not microservices); recommend consolidating to single Zustand store; add structured API response format |
| **frontend-architect** | SeniorButton (56dp targets) and TTS (0.85x) already follow senior UX best practices; need to add Family tab to navigation; consolidate dual store pattern |
| **bkend-expert** | 10 entities, 28 API endpoints; Prisma schema should use JSONB for detected_foods; daily reset via node-cron; S3 pre-signed URLs for uploads |
| **security-architect** | JWT with Redis revocation is solid; must add rate limiting before production; KakaoTalk OAuth needs server-side token exchange (never expose client_secret); OWASP Top 10 coverage mapped |
| **infra-architect** | ECS Fargate + RDS + ElastiCache is right-sized; start with db.t3.micro staging; Docker Compose for local dev; GitHub Actions CI with Expo EAS Build |
| **qa-strategist** | Senior UX test protocol with 5 real users; Detox E2E for critical paths; accessibility audit with TalkBack/VoiceOver; battery drain testing for pedometer |
| **design-validator** | All 4 original design features have corresponding implementation stubs; Family mailbox is the largest gap; village building placement UI needed |

---

## 18. Success Criteria

### 18.1 Definition of Done

- [ ] All 20 functional requirements implemented
- [ ] All 28 API endpoints operational
- [ ] Unit test coverage >= 80%
- [ ] E2E tests pass for 5 critical flows
- [ ] Senior UX test: >= 4/5 users complete onboarding unaided
- [ ] No Critical security issues
- [ ] Lighthouse accessibility score >= 90 (web) / manual a11y audit pass (native)
- [ ] App runs on Android 10+ and iOS 15+

### 18.2 Quality Criteria

- [ ] API response time p95 < 500ms
- [ ] App launch time < 3s on mid-range device
- [ ] Battery drain < 5%/hour during walk mode
- [ ] Zero data loss during offline-to-online sync
- [ ] All text readable at system "Largest" font size

---

## 19. Next Steps

1. [ ] Review and approve this Plan document
2. [ ] Write Design document (`SilverVille.design.md`) with detailed component specs
3. [ ] Execute Sprint 0: Infrastructure + Auth
4. [ ] Team review after Sprint 0 to adjust scope

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-12 | Initial comprehensive plan with 8-agent analysis | CTO Lead Agent |
