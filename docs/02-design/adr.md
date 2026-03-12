# Agent 7: Architecture Decision Records

> **Agent**: enterprise-expert
> **Date**: 2026-03-12
> **Scope**: 5 key architecture decisions for SilverVille

---

## ADR-001: Monolith vs Microservices

### Status: Accepted

### Context

SilverVille has 28 API endpoints across 7 domains (Auth, Diet, Walk, Barista, Family, Village, Player). The question is whether to deploy as a single Express server or split into microservices.

### Decision

**Single Express monolith** with modular internal structure (controllers/services/routes per domain).

### Rationale

| Factor | Monolith | Microservices |
|--------|----------|---------------|
| Team size | 1-3 developers | Overhead for small team |
| Deployment complexity | Single Docker image, single ECS service | Multiple services, service mesh, distributed tracing |
| Data consistency | Single PostgreSQL, ACID transactions | Distributed transactions (saga pattern) |
| Latency | In-process function calls | Network hops between services |
| Cost | 1 ECS Fargate task type | Multiple task definitions, ALB rules |
| Development speed | Faster iteration | Slower due to inter-service contracts |

### Consequences

- All 28 endpoints share one Express app
- Internal modular structure (controller -> service -> Prisma) allows future extraction
- If user count exceeds 10,000 DAU, re-evaluate extracting AI Diet analysis to a separate service (CPU-intensive)
- Cron jobs (daily reset) run in the same container via node-cron

### Migration Path

If needed in future:
1. Extract Diet AI service first (most resource-intensive)
2. Use message queue (SQS) for async diet analysis
3. Keep remaining endpoints in monolith

---

## ADR-002: Zustand Store Consolidation Strategy

### Status: Accepted

### Context

Two Zustand stores exist with overlapping state:
- `src/store/gameStore.ts` (useGameStore): 14 state fields + 12 actions + 3 selectors
- `app/store/index.ts` (useAppStore): 3 nested objects + 4 actions

`VillageScreen` imports `useAppStore` while other screens use `useGameStore`, creating inconsistency and potential state conflicts (e.g., both store `fertilizer` count independently).

### Decision

**Consolidate into a single store with domain slices**, using `zustand/persist` middleware for AsyncStorage persistence.

### Approach

1. Create unified store at `src/store/index.ts`
2. Organize state into 5 slices: auth, player, village, mission, family
3. Use `zustand/persist` with `partialize` to persist only auth + player + village (not daily mission state)
4. Migrate screens one-by-one: VillageScreen first (it uses useAppStore), then Walk/Diet/Cafe (they use useGameStore)
5. Delete old stores after all screens migrated
6. Add sync middleware that queues mutations for server sync

### Consequences

- Single source of truth for all state
- Selectors (healthScore, walkProgress) move to `src/store/selectors.ts`
- AsyncStorage persistence enables offline-first
- Server sync happens via middleware, not in components
- Breaking change: all screen imports must be updated

---

## ADR-003: Offline-First Strategy (AsyncStorage + Server Sync)

### Status: Accepted

### Context

Target users are seniors, many living in areas with inconsistent network. The app must function fully when offline and sync data when connectivity returns. Current state: no offline support.

### Decision

**Offline-first with optimistic UI and background sync queue.**

### Architecture

```
Component -> Zustand Store -> AsyncStorage (immediate)
                 |
                 v
          Sync Queue (AsyncStorage)
                 |
            (when online)
                 v
          Server API -> PostgreSQL
```

### Rules

1. **Read**: Always from Zustand store (populated from AsyncStorage on launch; updated from server when online)
2. **Write**: Update Zustand immediately (optimistic); queue API call in sync queue
3. **Conflict resolution**: Server wins (last-write-wins). Client re-fetches state after sync.
4. **Sync trigger**: App foreground event, network restore event, manual pull-to-refresh
5. **Queue persistence**: Sync queue stored in AsyncStorage under key `silverville-sync-queue`
6. **Retry**: 3 attempts with exponential backoff (1s, 4s, 16s); after 3 failures, log to Sentry and skip

### What gets queued

| Action | Queue? | Notes |
|--------|--------|-------|
| Diet analysis | Yes | Base64 image included (large payload) |
| Diet record | Yes | After analysis complete |
| Walk start/update/complete | Yes | Batched: only complete matters |
| Quiz answer | Yes | Batch-submitted on walk complete |
| Barista answer | Yes | Individual rounds |
| Family message | Yes | Voice/text/gift |
| Village name change | Yes | Low priority |

### What does NOT get queued

| Action | Reason |
|--------|--------|
| Login/register | Requires server response (tokens) |
| Token refresh | Must be online |
| Fetch history/stats | Read-only, not critical offline |

### Consequences

- All core gameplay works offline
- Server becomes the system of record once synced
- Client may show stale data briefly after reconnect (acceptable for this use case)
- AsyncStorage size limit (~6MB on Android) must be monitored
- Diet images should be compressed before queuing (max 500KB base64)

---

## ADR-004: AI Diet Analysis Fallback Strategy

### Status: Accepted

### Context

OpenAI Vision API is used for food recognition, but it may fail due to: network errors, rate limits, API outages, or low-confidence results. Seniors should not be blocked from completing the diet mission.

### Decision

**Three-tier fallback strategy:**

| Tier | Trigger | Method | Accuracy |
|------|---------|--------|----------|
| Primary | Normal operation | OpenAI Vision API (GPT-4o) | High (~85%) |
| Fallback 1 | OpenAI error or timeout (>5s) | Local MIND food database + keyword matching | Medium (~50%) |
| Fallback 2 | Both above fail | Manual food entry by user (preset food list) | User-reported |

### Implementation

```typescript
async function analyzeDiet(imageBase64: string): Promise<DietAnalysisResult> {
  // Tier 1: OpenAI Vision API
  try {
    const aiResult = await openAIVisionAnalyze(imageBase64);
    if (aiResult.confidence >= 0.5) return aiResult;
  } catch (error) {
    logger.warn('OpenAI Vision failed, falling back to local DB', { error });
  }

  // Tier 2: Local MIND food database
  // Client already has healthService.ts with calcMindScore()
  // Show user a food selection UI with common Korean foods
  return { fallbackMode: 'local', needsUserInput: true };

  // Tier 3: Manual entry
  // UI shows grid of food icons; user taps what they ate
}
```

### User Experience

- Tier 1: Automatic; user sees result in 3-5 seconds
- Tier 2: Toast "AI 분석이 어려워요. 드신 음식을 직접 선택해주세요."; show food grid
- Tier 3: Same as Tier 2 (seamless to user)

### Consequences

- Diet mission is always completable, regardless of network/API status
- Local DB must be maintained (currently 40+ foods in healthService.ts)
- Log all fallback events to improve prompts and add foods to local DB
- OpenAI costs are per-call; fallback reduces costs during outages

---

## ADR-005: Background Pedometer vs Foreground Only

### Status: Accepted (with opt-in)

### Context

Walk feature requires step counting. Options:
1. Foreground only (expo-sensors Pedometer): works when app is open
2. Background service (expo-task-manager): counts steps when app is closed
3. Health API integration (HealthKit/Google Fit): reads from system pedometer

### Decision

**Foreground pedometer as default; background tracking as opt-in with battery warning.**

### Rationale

| Approach | Battery Impact | Reliability | Complexity |
|----------|---------------|-------------|------------|
| Foreground only | Minimal | Only when app open | Low (current) |
| Background task | Medium-High (varies by device) | Continuous | Medium |
| Health API | None (OS handles) | Best (system-level) | Medium (permissions) |

### Implementation Plan

**Phase 1 (MVP):** Foreground only using current `usePedometer` hook
- Seniors will have app open during walk (screen-on)
- "산책 중" notification keeps app in foreground
- Steps counted via `Pedometer.watchStepCount`

**Phase 2 (Sprint 4+):** Add Health API integration
- Read from HealthKit (iOS) / Google Fit (Android)
- Requires additional permissions
- No battery impact (reads from OS pedometer)
- Most accurate across app open/closed states

**Phase 3 (Optional):** Background task for devices without Health API
- expo-task-manager background task
- Opt-in via settings: "백그라운드 걸음 수 추적 (배터리 사용량이 증가할 수 있어요)"
- Battery warning shown on enable

### Consequences

- MVP users must keep app open during walk (acceptable for 30-60 min sessions)
- Health API integration in Phase 2 gives seamless experience
- Background task is last resort for devices without Health API
- Battery drain < 5%/hour target applies to Phase 2+ only
