# SilverVille: Mind Oasis -- Technology Decision Record

> Date: 2026-03-12 | Author: enterprise-expert, frontend-architect, security-architect agents

---

## TD-01: Mobile Framework

| Option | Pros | Cons | Selected |
|--------|------|------|:--------:|
| React Native (Expo SDK 52) | Already in codebase; managed workflow; OTA updates; large ecosystem; TypeScript support | Large bundle size; native module limitations in managed workflow | Yes |
| Flutter | High performance; single codebase; good animations | No existing code; Dart learning curve; smaller Korean ecosystem | No |
| Native (Swift/Kotlin) | Best performance; full API access | Two codebases; 2x development cost; team size constraint | No |

**Rationale:** The project already has substantial React Native code (~3,000+ lines) with all 4 core feature screens implemented. Migrating would waste this investment. Expo's managed workflow handles camera, sensors, and speech without ejecting, which simplifies CI/CD for a small team.

---

## TD-02: State Management

| Option | Pros | Cons | Selected |
|--------|------|------|:--------:|
| Zustand 5 | 1.1kB; simple API; already in use; great TypeScript support | No built-in devtools (use middleware); no middleware ecosystem as large as Redux | Yes |
| Redux Toolkit | Battle-tested; devtools; large community | Boilerplate heavy; overkill for this app size | No |
| MobX | Reactive; less boilerplate than Redux | Decorator-based API confusing for junior developers | No |
| Jotai | Atomic; minimal boilerplate | Less established patterns for complex state | No |

**Rationale:** Zustand is already used in both stores. Its simplicity is an advantage for a healthcare app where reliability matters more than advanced state patterns. **Action required:** Consolidate `app/store/index.ts` and `src/store/gameStore.ts` into a single store.

---

## TD-03: Backend Framework

| Option | Pros | Cons | Selected |
|--------|------|------|:--------:|
| Express.js | Existing decision; simple; huge ecosystem; fast to develop | No built-in TypeScript; manual structure needed | Yes |
| Fastify | Faster; built-in schema validation; TypeScript-first | Migration effort from existing Express plan; smaller community | No |
| NestJS | Enterprise patterns (DI, modules); TypeScript-native | Heavy for 28 endpoints; steep learning curve | No |

**Rationale:** Express is the established choice. For this app's scale (~28 endpoints, single service), Express with TypeScript, Zod validation, and Prisma provides sufficient structure without NestJS overhead. If the app grows to require multiple services, NestJS can be considered for v2.

---

## TD-04: Database ORM

| Option | Pros | Cons | Selected |
|--------|------|------|:--------:|
| Prisma | Type-safe; auto-migration; schema-first; excellent DX | Performance overhead for complex queries; limited raw SQL escape hatches | Yes |
| TypeORM | Mature; Active Record + Data Mapper patterns | Decorator-heavy; TypeScript support inconsistent | No |
| Drizzle | Lightweight; SQL-like API; excellent TypeScript | Newer; less documentation; migration tooling less mature | No |
| Knex (raw query builder) | Full SQL control; lightweight | No type safety; no migration generation | No |

**Rationale:** Prisma's schema-first approach aligns with PDCA's document-first principle. Auto-generated types ensure client-server type consistency. The migration system handles schema evolution cleanly.

---

## TD-05: Authentication Strategy

| Option | Pros | Cons | Selected |
|--------|------|------|:--------:|
| JWT (access + refresh) | Stateless verification; mobile-friendly; standard | Revocation requires Redis blacklist; token size | Yes |
| Session-based (express-session) | Simple; easy revocation | Requires sticky sessions with ECS; not mobile-standard | No |
| Firebase Auth | Fully managed; social login built-in | Vendor lock-in; less control over token claims | No |

**Rationale:** JWT is the standard for mobile app authentication. Access tokens (15-min) limit damage from token theft. Refresh tokens (7-day) stored in Redis enable server-side revocation on logout. RS256 signing allows key rotation without re-issuing all tokens.

---

## TD-06: AI Vision API

| Option | Pros | Cons | Selected |
|--------|------|------|:--------:|
| OpenAI GPT-4o Vision | Best food recognition accuracy; Korean language support; structured output | Cost per call (~$0.01-0.03); latency 2-5s; requires internet | Yes |
| Google Cloud Vision | Good object detection; reasonable pricing | Less accurate for Korean food categories; needs custom labels | No |
| On-device ML (TFLite) | No API cost; works offline; low latency | Requires custom model training for Korean food; lower accuracy | No (future) |
| AWS Rekognition | AWS ecosystem integration | No specialized food recognition; general labels only | No |

**Rationale:** GPT-4o Vision provides the best Korean food recognition out-of-the-box. The prompt can specify MIND diet categories directly. Cost is manageable (3 meals/day * 30 days = ~$3/month/user). Local MIND food scoring in `healthService.ts` serves as fallback when offline.

---

## TD-07: Push Notification Service

| Option | Pros | Cons | Selected |
|--------|------|------|:--------:|
| Firebase Cloud Messaging (FCM) | Free; cross-platform; Expo integration via expo-notifications | Google dependency; limited customization | Yes |
| AWS SNS | AWS ecosystem; supports SMS fallback | More complex setup; no built-in Expo integration | No |
| OneSignal | Rich features; analytics | Additional vendor; pricing at scale | No |

**Rationale:** Expo provides first-class FCM integration via `expo-notifications`. FCM is free and handles both Android and iOS. Daily reminder notifications and family streak alerts are the primary use cases.

---

## TD-08: KakaoTalk Integration

| Option | Pros | Cons | Selected |
|--------|------|------|:--------:|
| Kakao SDK (React Native) | Native flow; best UX; in-app login | Requires Kakao Developer registration; SDK maintenance | Yes |
| OAuth 2.0 via WebView | No native SDK dependency; simpler implementation | Worse UX (web redirect); session handling issues | Fallback |

**Rationale:** Korean seniors aged 60+ overwhelmingly use KakaoTalk. Native SDK provides one-tap login. Server-side token exchange ensures client_secret is never exposed. WebView fallback covers edge cases where SDK fails.

---

## TD-09: Image Storage

| Option | Pros | Cons | Selected |
|--------|------|------|:--------:|
| AWS S3 + Pre-signed URLs | Secure; scalable; direct upload from client; lifecycle policies for auto-delete | AWS setup complexity | Yes |
| Firebase Storage | Simpler SDK; Expo integration | Vendor lock-in alongside FCM; less control | No |
| Base64 in PostgreSQL | No additional service | Database bloat; slow queries; bad practice | No |

**Rationale:** S3 with pre-signed URLs allows the client to upload food photos directly without routing through the backend. Server-side encryption (SSE-S3) protects data at rest. Lifecycle policies auto-delete photos after 30 days for privacy compliance.

---

## TD-10: Monitoring Stack

| Option | Pros | Cons | Selected |
|--------|------|------|:--------:|
| Sentry (errors) + Datadog (APM) | Best-in-class error tracking; rich APM dashboards; Expo SDK support | Cost at scale; two vendors | Yes |
| Sentry + CloudWatch | Sentry for errors; CloudWatch for infrastructure; lower cost | CloudWatch APM is limited | Acceptable |
| ELK Stack (self-hosted) | Full control; no per-event cost | Operational overhead; not worth it for this scale | No |

**Rationale:** Sentry's React Native SDK catches JavaScript and native crashes with source maps. Datadog provides API latency monitoring and infrastructure metrics. For cost optimization, CloudWatch can replace Datadog in early stages.

---

## Architecture Decision: Monolith vs Microservices

**Decision: Monolith (single Express server)**

| Factor | Monolith | Microservices |
|--------|----------|---------------|
| Team size | 1-3 developers (fits) | Needs 3+ teams (overkill) |
| Deployment | Single ECS task | Multiple services to orchestrate |
| Data consistency | Single database (simple) | Distributed transactions (complex) |
| Feature count | 28 endpoints (manageable) | Would create 5+ tiny services |
| Communication | In-process function calls | HTTP/gRPC between services |

The app has 4 feature domains (diet, walk, cafe, family) but they share a common user model and village state. Microservices would add latency and complexity without benefit at this scale. Modular monolith (controllers/services per domain) provides clean separation without distributed system overhead.

---

## Architecture Decision: Dual Store Consolidation

**Decision: Merge into single Zustand store**

Current state:
- `app/store/index.ts` -- Used by VillageScreen, DietScreen, WalkScreen, CafeScreen
- `src/store/gameStore.ts` -- Comprehensive but unused by current screens

Action: Keep `app/store/index.ts` as the single source of truth. Migrate useful selectors from `gameStore.ts` (e.g., `selectHealthScore`, `calcVillageLevel`). Delete `gameStore.ts`.

Rationale: Having two stores causes state synchronization bugs and confuses the architecture. The app store pattern (player/village/mission) maps cleanly to the server data model.

---

## Summary of Selected Stack

```
Client:       React Native (Expo SDK 52) + TypeScript + Zustand
Backend:      Node.js 22 + Express + Prisma + PostgreSQL + Redis
AI:           OpenAI GPT-4o Vision API
Auth:         JWT (RS256) + KakaoTalk OAuth
Storage:      AWS S3 (images, voice)
Push:         Firebase Cloud Messaging
Infra:        AWS ECS Fargate + RDS + ElastiCache + CloudFront
CI/CD:        GitHub Actions + Expo EAS Build
Monitoring:   Sentry + Datadog (or CloudWatch)
```
