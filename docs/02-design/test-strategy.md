# Agent 6: Test Strategy

> **Agent**: qa-strategist
> **Date**: 2026-03-12
> **Scope**: Unit tests, E2E tests, senior UX testing, battery testing, AI accuracy, QA checklist

---

## 1. Unit Tests (Jest)

### Coverage Target: 80%

### Priority Test Suites

| Suite | Location | Key Test Cases |
|-------|----------|----------------|
| **MIND Scoring** | `server/src/services/__tests__/diet.test.ts` | Score calculation for various food combos; penalty foods reduce score; empty list returns 0; score capped at 0-10 |
| **Fertilizer Reward** | `server/src/services/__tests__/reward.test.ts` | Score 8+ -> 5 fertilizer; Score 6-7 -> 3; Score 4-5 -> 2; Score 2-3 -> 1; Score 0-1 -> 0 |
| **Landscape Items** | `server/src/services/__tests__/reward.test.ts` | 10k+ steps -> 3 items; 7k-9999 -> 2; 5k-6999 -> 1; <5k -> 0 |
| **JWT Auth** | `server/src/middleware/__tests__/auth.test.ts` | Valid token passes; expired token rejects; malformed token rejects; blacklisted token rejects |
| **Rate Limiter** | `server/src/middleware/__tests__/rateLimit.test.ts` | Under limit passes; at limit blocks; window reset allows new requests |
| **Password Validation** | `server/src/validators/__tests__/auth.test.ts` | Min 8 chars; requires letter; requires number; max 72 chars |
| **Daily Reset** | `server/src/services/__tests__/dailyReset.test.ts` | Streak incremented if yesterday was active; streak reset if gap; mission flags cleared |
| **Invite Code** | `server/src/services/__tests__/family.test.ts` | Code generation is 6-char alphanumeric; expired code rejected; self-link rejected; duplicate link rejected |
| **Village Level** | `client/src/store/__tests__/gameStore.test.ts` | EXP accumulation; level-up thresholds; max level 10 cap |
| **Zustand Store** | `client/src/store/__tests__/store.test.ts` | Login sets tokens; logout clears state; daily reset clears mission; offline queue persists |

### Client-Side Unit Tests

```typescript
// Example: MIND scoring test
describe('calcMindScore', () => {
  it('returns 0 for empty food list', () => {
    expect(calcMindScore([])).toBe(0);
  });

  it('scores greens correctly', () => {
    const score = calcMindScore(['시금치', '브로콜리']);
    expect(score).toBe(2.0);
  });

  it('applies penalties for unhealthy foods', () => {
    const score = calcMindScore(['시금치', '튀김']);
    expect(score).toBe(0.2); // 1.0 - 0.8
  });

  it('caps score at 10', () => {
    const manyFoods = ['시금치', '케일', '브로콜리', '연어', '고등어', '호두',
                       '블루베리', '두부', '현미', '올리브오일', '청국장', '아몬드'];
    expect(calcMindScore(manyFoods)).toBeLessThanOrEqual(10);
  });
});
```

---

## 2. Integration Tests (Jest + Supertest)

### Coverage Target: 70%

### Test Database

- Separate PostgreSQL instance (or Docker container in CI)
- Prisma migrate before each test suite
- Transaction rollback between tests (or truncate tables)

### Key Integration Scenarios

| # | Scenario | Endpoints Tested | Assertions |
|---|----------|-----------------|------------|
| IT-01 | Full auth flow | register -> login -> refresh -> me -> logout | Tokens valid; refresh rotates; logout blacklists |
| IT-02 | Diet analysis + record | analyze -> record -> today -> history | Score persisted; fertilizer updated; today returns latest |
| IT-03 | Walk session lifecycle | start -> update -> quiz -> answer -> complete -> today | Session created; steps accumulated; rewards calculated; quiz recorded |
| IT-04 | Barista game flow | session -> answer x3 -> history -> today | 3 rounds; scores accumulated; correctCount accurate |
| IT-05 | Family invite + link | invite -> link -> members -> message -> messages | Code generated; link established; messages delivered; unread counted |
| IT-06 | Daily reset | Complete missions -> trigger reset -> check state | Streak incremented; daily stats zeroed; resources preserved |
| IT-07 | Rate limiting | 6 login attempts in 1 minute | First 5 succeed; 6th returns 429 |
| IT-08 | Token expiry | Use expired access token -> refresh -> retry | 401 on expired; new token after refresh; retry succeeds |

---

## 3. E2E Tests (Detox)

### Environment

- Platform: Android Emulator (Pixel 6, API 33) + iOS Simulator (iPhone 15)
- Backend: Docker Compose (test environment)
- Test runner: Detox 20 + Jest

### Scenarios (5 critical paths)

#### E2E-01: Onboarding (Register -> Village)

```
1. Launch app
2. Tap "회원가입"
3. Enter email, password, nickname
4. Tap "가입하기"
5. Assert: Village tab is visible
6. Assert: Village name "나의 실버빌" shown
7. Assert: Level shows "Lv.1"
8. Assert: All 5 tabs visible in bottom bar
```

#### E2E-02: Diet Camera Flow

```
1. Navigate to Diet tab
2. Tap "식사 촬영하기"
3. (Mock camera with test image)
4. Tap "분석하기"
5. Wait for loading overlay
6. Assert: MIND score displayed (0-10)
7. Assert: Detected foods shown
8. Assert: Fertilizer reward shown
9. Navigate to Village tab
10. Assert: Fertilizer count increased
11. Assert: Diet mission shows "완료"
```

#### E2E-03: Walk + Quiz

```
1. Navigate to Walk tab
2. Tap "산책 시작하기"
3. (Simulate 500 steps via mock pedometer)
4. Assert: Quiz overlay appears
5. Tap an answer choice
6. Assert: Correct/wrong feedback shown
7. (Simulate total 5000 steps)
8. Tap "산책 완료하기"
9. Assert: Reward notification (landscape items)
10. Navigate to Village tab
11. Assert: Walk mission shows "완료"
```

#### E2E-04: Barista Game (Full Session)

```
1. Navigate to Cafe tab
2. Tap "주문 받기 시작"
3. Wait for TTS order playback
4. Wait for distractor playback
5. Tap menu choice
6. Assert: Round result shown
7. Repeat for 3 rounds
8. Assert: Session summary visible
9. Assert: Total score shown
10. Navigate to Village tab
11. Assert: Barista mission shows score
```

#### E2E-05: Family Invite + Message

```
1. (Login as Player A)
2. Navigate to Family tab
3. Tap "초대코드 만들기"
4. Assert: 6-character code displayed
5. Copy code
6. (Login as Player B in second instance)
7. Navigate to Family tab
8. Tap "코드 입력"
9. Enter code, tap "연동"
10. Assert: Success message
11. (As Player B) Tap "음성 메시지 보내기"
12. (Mock audio recording)
13. (Switch to Player A)
14. Assert: Unread badge "1" on Family tab
15. Navigate to Family tab
16. Assert: Voice message from Player B visible
```

---

## 4. Senior UX Test Protocol

### Participants

- **Count**: 5 participants minimum
- **Age**: 60-80 years old
- **Criteria**: Can use KakaoTalk and YouTube independently
- **Compensation**: Gift card (50,000 KRW)

### Test Environment

- Device: Galaxy A54 (Android) or iPhone SE 3 (iOS)
- Setting: Quiet room, large table, facilitator + note-taker
- Duration: 60 minutes per participant

### Tasks & Pass Criteria

| # | Task | Time Limit | Pass Criteria | Pass Rate Required |
|---|------|-----------|---------------|-------------------|
| SU-01 | Complete registration (email/password) | 3 min | Complete without assistance | >= 4/5 |
| SU-02 | Find and read village dashboard | 1 min | Identify level, resources, missions | >= 4/5 |
| SU-03 | Take a diet photo and read results | 3 min | Capture photo + understand MIND score | >= 4/5 |
| SU-04 | Start walk and answer one quiz | 3 min | Start session + hear TTS + tap answer | >= 3/5 |
| SU-05 | Play one barista round | 3 min | Listen to order + ignore distractor + select menu | >= 3/5 |
| SU-06 | Read all button labels | 2 min | Read every button without squinting | >= 4/5 |
| SU-07 | Navigate between all 5 tabs | 1 min | Find correct tab within 5 seconds each | >= 4/5 |
| SU-08 | Share family invite code | 3 min | Generate code + share via KakaoTalk | >= 3/5 |

### Qualitative Observations

- Note: confusion points, hesitation, accidental taps
- Note: text readability at arm's length
- Note: TTS comprehension while walking (outdoor test)
- Note: emotional response to village growth/rewards

---

## 5. Battery Drain Test

### Method

| Test | Setup | Duration | Acceptable Drain |
|------|-------|----------|-----------------|
| Foreground walk | Walk tab active, pedometer counting, screen on | 30 min | < 5% |
| Background walk | App minimized, pedometer counting | 60 min | < 3% |
| Idle (village tab) | Village tab visible, no activity | 30 min | < 2% |

### Devices

- Galaxy A54 (mid-range Android, target device)
- Galaxy A14 (budget Android, worst-case)
- iPhone SE 3 (iOS baseline)

### Measurement

- Android: `adb shell dumpsys battery` before/after
- iOS: Xcode Energy Impact instrument
- Record: CPU usage, GPS usage (should be 0), sensor polling frequency

---

## 6. AI Diet Recognition Accuracy

### Test Dataset

- 100 Korean meal photos (diverse: home-cooked, restaurant, convenience store)
- Ground truth labels annotated by nutritionist

### Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Food detection recall | >= 70% | (correctly detected foods) / (total foods in photo) |
| False positive rate | <= 20% | (incorrectly detected) / (total detections) |
| MIND score accuracy | within +/- 1.5 of ground truth | MAE across test set |
| Latency | < 5 seconds (p95) | API response time |

### Fallback Behavior

- If OpenAI returns error: use local MIND food database
- If OpenAI returns empty/low-confidence: prompt user "음식을 더 가까이에서 촬영해주세요"
- Log all AI responses for continuous improvement

---

## 7. Zero Script QA Checklist

### Authentication

- [ ] Register with valid email/password
- [ ] Register with duplicate email shows error
- [ ] Login with correct credentials
- [ ] Login with wrong password shows error
- [ ] Login 6 times in 1 minute triggers rate limit
- [ ] Token refresh works after access token expires
- [ ] Logout invalidates refresh token
- [ ] KakaoTalk login creates new user if first time
- [ ] KakaoTalk login returns existing user if account exists

### Diet

- [ ] Camera permission requested on first use
- [ ] Photo captured in landscape and portrait
- [ ] Analysis returns results within 5 seconds
- [ ] Score displayed correctly (0-10)
- [ ] Fertilizer added to player resources
- [ ] Diet mission marked complete on village screen
- [ ] Second analysis in same day updates (not duplicates)

### Walk

- [ ] Pedometer permission requested
- [ ] Step count increases in real-time
- [ ] Quiz appears at 500-step intervals
- [ ] TTS plays quiz question in Korean
- [ ] Replay button works for TTS
- [ ] Answer buttons respond to single tap
- [ ] Walk complete calculates correct landscape items
- [ ] Walk mission updates on village screen
- [ ] Background step counting works (Android)

### Barista

- [ ] Game loads with customer and order
- [ ] TTS plays order text
- [ ] Distractor appears after delay
- [ ] Menu selection registers tap
- [ ] Correct/wrong feedback shown
- [ ] 3 rounds complete session
- [ ] Session summary shows total score
- [ ] Cafe mission updates on village screen

### Family

- [ ] Invite code generated (6 characters)
- [ ] Invite code shared via KakaoTalk
- [ ] Code expires after 24 hours
- [ ] Family link established with valid code
- [ ] Self-link rejected
- [ ] Voice message sent and received
- [ ] Text message sent and received
- [ ] Gift item delivered
- [ ] Unread badge shows correct count
- [ ] Mark as read works

### Village

- [ ] Dashboard shows current level, EXP, resources
- [ ] Residents unlock at correct levels
- [ ] Buildings list shows available/locked
- [ ] Village name editable
- [ ] Streak badge shows and colors change (3-day, 7-day)

### Offline

- [ ] App opens without network connection
- [ ] Cached village data displayed
- [ ] Walk pedometer works offline
- [ ] Diet photo queued for later analysis
- [ ] Sync completes on network restore
- [ ] No data loss after offline period

### Performance

- [ ] App launches in < 3 seconds
- [ ] Tab switching is instant (< 300ms)
- [ ] Scroll performance smooth (60fps)
- [ ] No memory leaks after extended use (30 min)
