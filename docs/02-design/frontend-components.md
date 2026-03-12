# Agent 2: Frontend Component Architecture

> **Agent**: frontend-architect
> **Date**: 2026-03-12
> **Scope**: React Native component tree, Zustand store consolidation, senior UX patterns, offline-first flow, Family tab design

---

## 1. Zustand Store Consolidation

### Problem

Two overlapping stores exist:
- `src/store/gameStore.ts` (useGameStore): Detailed game mechanics (steps, diet, cafe, residents, buildings)
- `app/store/index.ts` (useAppStore): App-level state (player, village, mission, auth)

### Solution: Single Unified Store with Slices

```
src/store/
  index.ts              -- Re-exports all hooks
  slices/
    authSlice.ts        -- Auth state (isLoggedIn, tokens)
    playerSlice.ts      -- Player state (id, nickname, level, exp, resources)
    villageSlice.ts     -- Village state (name, residents, buildings)
    missionSlice.ts     -- Daily mission state (diet, walk, cafe progress)
    familySlice.ts      -- Family state (links, messages, unreadCount)
  selectors.ts          -- Derived selectors (healthScore, walkProgress, etc.)
  middleware/
    persistMiddleware.ts -- AsyncStorage persistence via zustand/persist
    syncMiddleware.ts    -- Server sync queue
```

**Migration path**: Keep both stores temporarily, add a unified `useStore` that imports slices, then migrate screen-by-screen.

### Unified Store Interface

```typescript
interface StoreState {
  // Auth
  isLoggedIn: boolean;
  accessToken: string | null;
  refreshToken: string | null;

  // Player
  player: {
    id: string | null;
    email: string;
    nickname: string;
    level: number;
    exp: number;
    fertilizer: number;
    landscapeItems: number;
    streakDays: number;
    lastActiveDate: string | null;
  };

  // Village
  village: {
    id: string | null;
    name: string;
    population: number;
    residents: Resident[];
    buildings: Building[];
  };

  // Daily Mission
  mission: {
    dietDone: boolean;
    dietScore: number;
    walkSteps: number;
    walkGoal: number;
    walkSessionActive: boolean;
    cafeScore: number;
    cafePlayed: boolean;
    quizHistory: QuizRecord[];
  };

  // Family
  family: {
    links: FamilyMember[];
    messages: FamilyMessage[];
    unreadCount: number;
    inviteCode: string | null;
  };

  // Actions (one per domain slice)
  login: (tokens: TokenPair, user: UserData) => void;
  logout: () => void;
  updatePlayer: (data: Partial<PlayerState>) => void;
  updateVillage: (data: Partial<VillageState>) => void;
  updateMission: (data: Partial<MissionState>) => void;
  setDietResult: (score: number, foods: string[], fertilizer: number) => void;
  setWalkSteps: (steps: number) => void;
  addCafeScore: (points: number) => void;
  addFamilyMessage: (msg: FamilyMessage) => void;
  markMessageRead: (id: string) => void;
  resetDaily: () => void;
}
```

### Persistence Strategy (zustand/persist)

```typescript
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({ /* slices */ }),
    {
      name: 'silverville-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Persist only: auth tokens, player, village, family
        // Do NOT persist: daily mission state (fetched fresh from server)
        isLoggedIn: state.isLoggedIn,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        player: state.player,
        village: state.village,
        family: state.family,
      }),
    }
  )
);
```

---

## 2. Component Tree by Tab

### Navigation Structure

```
app/
  _layout.tsx                    -- Root layout (ErrorBoundary + AuthGuard)
  (auth)/
    login.tsx                    -- Login screen
    register.tsx                 -- Register screen
    kakao-callback.tsx           -- KakaoTalk OAuth callback
  (tabs)/
    _layout.tsx                  -- Tab bar (5 tabs: Village/Walk/Diet/Cafe/Family)
    village.tsx                  -- -> <VillageScreen />
    walk.tsx                     -- -> <WalkScreen />
    diet.tsx                     -- -> <DietScreen />
    cafe.tsx                     -- -> <CafeScreen />
    family.tsx                   -- -> <FamilyScreen /> [NEW]
```

### 2.1 Village Tab Component Tree

```
<VillageScreen>
  <SafeAreaView>
    <ScrollView>
      <VillageHeader
        villageName={string}
        nickname={string}
        greeting={string}
        streakDays={number} />
      <LevelCard
        level={number}
        exp={number}
        expToNext={number} />
      <ResourceBar
        fertilizer={number}
        landscapeItems={number}
        residentCount={number} />
      <SectionTitle title="오늘 미션" />
      <MissionCard icon="diet" done={bool} subtitle={string} />
      <MissionCard icon="walk" done={bool} subtitle={string} />
      <MissionCard icon="cafe" done={bool} subtitle={string} />
      <WalkProgressBar steps={number} goal={number} />
      <SectionTitle title="마을 주민들" />
      <ResidentGrid residents={Resident[]} playerLevel={number} />
    </ScrollView>
  </SafeAreaView>
</VillageScreen>
```

### 2.2 Walk Tab Component Tree

```
<WalkScreen>
  <SafeAreaView>
    <WalkHeader steps={number} goal={number} />
    <CircularProgress progress={0-100} />
    <StepMilestones steps={number} thresholds={[5000,7000,10000]} />
    {!sessionActive && <SeniorButton label="산책 시작" onPress={startWalk} />}
    {sessionActive && (
      <>
        <ActiveWalkView steps={number} duration={string} />
        {quizVisible && (
          <QuizOverlay
            question={string}
            choices={string[]}
            onAnswer={handleAnswer}
            ttsSpeed={number} />
        )}
        <SeniorButton label="산책 완료" onPress={completeWalk} variant="secondary" />
      </>
    )}
    <RewardNotification visible={bool} items={number} />
  </SafeAreaView>
</WalkScreen>
```

### 2.3 Diet Tab Component Tree

```
<DietScreen>
  <SafeAreaView>
    <DietHeader score={number} hasDoneToday={bool} />
    {!hasDoneToday && (
      <CameraSection>
        <SeniorButton label="식사 촬영하기" onPress={openCamera} />
        <CameraPreview ref={cameraRef} />
      </CameraSection>
    )}
    {analyzing && <LoadingOverlay message="AI가 분석 중이에요..." />}
    {result && (
      <DietResultCard
        mindScore={number}
        detectedFoods={string[]}
        fertilizerEarned={number}
        feedback={string} />
    )}
    <MindFoodGuide categories={FoodCategory[]} />
  </SafeAreaView>
</DietScreen>
```

### 2.4 Cafe Tab Component Tree

```
<CafeScreen>
  <SafeAreaView>
    <CafeHeader todayBest={number} />
    {!gameActive && (
      <CafeIntro>
        <AnimalCustomer emoji={string} name={string} />
        <SeniorButton label="주문 받기 시작" onPress={startGame} />
      </CafeIntro>
    )}
    {gameActive && (
      <BaristaGame
        round={number}
        order={string}
        distractor={string}
        menu={MenuItem[]}
        onSelect={handleMenuSelect}
        ttsSpeed={number} />
    )}
    {roundResult && (
      <RoundResult correct={bool} score={number} message={string} />
    )}
    {sessionComplete && (
      <SessionSummary
        totalScore={number}
        correctCount={number}
        rounds={RoundResult[]} />
    )}
  </SafeAreaView>
</CafeScreen>
```

### 2.5 Family Tab Component Tree (NEW -- Full Design)

```
<FamilyScreen>
  <SafeAreaView>
    <FamilyHeader unreadCount={number} />

    {/* Linked family members section */}
    <SectionTitle title="연동된 가족" />
    {links.length === 0 && (
      <EmptyFamilyCard>
        <Text>아직 연동된 가족이 없어요</Text>
        <SeniorButton label="초대 코드 만들기" onPress={generateInvite} />
        <SeniorButton label="초대 코드 입력" onPress={openCodeInput} variant="secondary" />
      </EmptyFamilyCard>
    )}
    {links.length > 0 && (
      <FamilyMemberList>
        <FamilyMemberCard nickname={string} linkedAt={string} onRemove={handleRemove} />
      </FamilyMemberList>
    )}

    {/* Invite code display modal */}
    <InviteCodeModal
      visible={bool}
      code={string}
      expiresAt={string}
      onShare={shareViaKakao}
      onClose={closeModal} />

    {/* Invite code input modal */}
    <CodeInputModal
      visible={bool}
      onSubmit={linkFamily}
      onClose={closeModal} />

    {/* Mailbox section */}
    <SectionTitle title="받은 우편" badge={unreadCount} />
    <MessageList>
      <VoiceMessageCard
        senderName={string}
        sentAt={string}
        isRead={bool}
        onPlay={playVoice}
        onMarkRead={markRead} />
      <TextMessageCard
        senderName={string}
        content={string}
        sentAt={string}
        isRead={bool} />
      <GiftMessageCard
        senderName={string}
        giftType={string}
        sentAt={string}
        onClaim={claimGift} />
    </MessageList>

    {/* Send message to family */}
    <SendMessageSection>
      <SeniorButton label="음성 메시지 보내기" onPress={recordVoice} />
      <SeniorButton label="선물 보내기" onPress={openGiftPicker} variant="secondary" />
    </SendMessageSection>
  </SafeAreaView>
</FamilyScreen>
```

---

## 3. Senior UX Patterns

### 3.1 Touch Targets

| Component | Min Size | Implementation |
|-----------|----------|----------------|
| SeniorButton | 56 x 56 dp | Already implemented (minHeight: 56) |
| Tab bar icons | 30px icon + 70px total tab height | Already implemented |
| List items | 56dp min-height | Apply to all FlatList items |
| Modal close | 48 x 48 dp | X button in top-right corner |

### 3.2 Typography Scale

| Context | Size | Weight | Color |
|---------|------|--------|-------|
| Screen title | 26-28px | Bold | #1B5E20 or domain color |
| Section title | 20px | Bold | #1B5E20 |
| Body text | 17-18px | Regular/600 | #212121 |
| Button label | 18px | Bold | #FFFFFF |
| Caption / metadata | 14-16px | Regular | #757575 |
| Tab label | 13px | 700 | Active: #2E7D32 |

### 3.3 Color System

```typescript
export const COLORS = {
  // Primary (nature green)
  primary: '#2E7D32',
  primaryLight: '#4CAF50',
  primaryBg: '#F1F8E9',

  // Domain accents
  village: '#2E7D32',   // Green
  walk: '#FF8F00',      // Amber
  diet: '#2E7D32',      // Green
  cafe: '#5D4037',      // Brown
  family: '#283593',    // Indigo

  // Neutral
  text: '#212121',
  textSecondary: '#757575',
  border: '#E0E0E0',
  background: '#FFFFFF',
  surface: '#F5F5F5',

  // Semantic
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Accessibility: all text/background combos meet WCAG 4.5:1 contrast
};
```

### 3.4 Animation Guidelines

- All transitions: 300ms max (seniors perceive fast animations as confusing)
- Use `withTiming` from reanimated, not `withSpring` (no bouncing)
- Loading states: pulsing skeleton, not spinning loaders
- Reward animations: slow confetti (1.5s), large emoji scaling
- No auto-scrolling or auto-dismissing toasts (user controls dismissal)

---

## 4. Offline-First Data Flow

### Architecture

```
    Screen (UI)
        |
    Zustand Store (in-memory, persisted to AsyncStorage)
        |
    Sync Manager (checks network, queues mutations)
        |
    API Client (fetch with JWT)
        |
    Backend Server
```

### Sync Queue Design

```typescript
// src/store/middleware/syncMiddleware.ts

interface SyncItem {
  id: string;
  action: string;        // e.g. "diet/record", "walk/complete"
  payload: unknown;
  createdAt: number;
  retryCount: number;
}

// Queue stored in AsyncStorage under key "silverville-sync-queue"
// On app foreground or network restore:
//   1. Read queue
//   2. Execute each item in order (FIFO)
//   3. On success: remove from queue, update store with server response
//   4. On 401: trigger token refresh, retry
//   5. On 5xx: exponential backoff (max 3 retries)
//   6. On success of all: fetch fresh state from server (GET /auth/me + /player/missions/today)
```

### Offline Behavior per Feature

| Feature | Offline Behavior | Sync on Reconnect |
|---------|-----------------|-------------------|
| Village view | Shows cached data from last sync | Fetch fresh state |
| Walk pedometer | Counts steps locally (expo-sensors) | POST /walk/complete with accumulated steps |
| Walk quiz | Uses cached quiz bank (50 questions in AsyncStorage) | Submit answers in batch |
| Diet camera | Camera works; analysis queued | POST /diet/analyze when online |
| Cafe game | Plays from cached round data | POST /barista/answer for each round |
| Family mailbox | Shows cached messages | Fetch new messages |
| Family send | Queued in sync queue | POST when online |

---

## 5. Shared UI Components

### New Components to Create

| Component | Purpose | Location |
|-----------|---------|----------|
| `ErrorBoundary` | Catch React crashes; show friendly error screen | `app/components/ErrorBoundary.tsx` |
| `LoadingOverlay` | Full-screen loading with message | `app/components/ui/LoadingOverlay.tsx` |
| `SkeletonCard` | Skeleton loading placeholder | `app/components/ui/SkeletonCard.tsx` |
| `SectionTitle` | Consistent section headers | `app/components/ui/SectionTitle.tsx` |
| `EmptyState` | Empty list placeholder with icon + message | `app/components/ui/EmptyState.tsx` |
| `Badge` | Notification count badge | `app/components/ui/Badge.tsx` |
| `ConfirmDialog` | Large-button confirmation for destructive actions | `app/components/ui/ConfirmDialog.tsx` |
| `VoicePlayer` | Audio playback for family voice messages | `app/components/ui/VoicePlayer.tsx` |
| `VoiceRecorder` | Audio recording for sending voice messages | `app/components/ui/VoiceRecorder.tsx` |
| `InviteCodeDisplay` | Large, readable invite code with share button | `app/components/family/InviteCodeDisplay.tsx` |

### Existing Components (Keep)

| Component | Location | Status |
|-----------|----------|--------|
| `SeniorButton` | `app/components/ui/SeniorButton.tsx` | Good -- no changes needed |
| `MissionCard` | Inline in `VillageScreen.tsx` | Extract to `app/components/village/MissionCard.tsx` |
| `ResidentCard` | Inline in `VillageScreen.tsx` | Extract to `app/components/village/ResidentCard.tsx` |

---

## 6. Tab Bar Update (Add Family Tab)

The current `_layout.tsx` has 4 tabs. Design adds the 5th tab:

```
Tab Order: Village | Walk | Diet | Cafe | Family
Icons:     home    | walk | restaurant | cafe | mail
Labels:    마을    | 산책  | 식단        | 카페  | 가족
```

Family tab icon: `mail` / `mail-outline` (Ionicons)
Family tab color: `#283593` (Indigo) for header, standard green for tab tint
Family tab badge: Show unread message count on the tab icon

---

## 7. Auth Flow Component Design

```
App Launch
  -> Check AsyncStorage for tokens
  -> If tokens exist: verify with GET /auth/me
    -> Success: Navigate to (tabs)
    -> Fail (401): Navigate to (auth)/login
  -> If no tokens: Navigate to (auth)/login

Login Screen:
  - Email input (large, 18px)
  - Password input (large, with show/hide toggle)
  - SeniorButton "로그인"
  - Divider "또는"
  - SeniorButton "카카오로 시작하기" (yellow, Kakao brand)
  - Link "계정이 없으신가요? 회원가입"

Register Screen:
  - Email input
  - Password input (with strength indicator)
  - Nickname input (optional, placeholder "이장님")
  - SeniorButton "가입하기"
  - Link "이미 계정이 있으신가요? 로그인"
```
