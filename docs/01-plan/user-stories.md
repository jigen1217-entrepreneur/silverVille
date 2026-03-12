# SilverVille: Mind Oasis -- User Story Map

> Date: 2026-03-12 | Author: product-manager agent

---

## Story Map Overview

```
                          User Journey (Horizontal)
  +-----------+-----------+-----------+-----------+-----------+
  | Onboard   | Daily     | Walk +    | Eat +     | Family    |
  |           | Village   | Quiz      | Analyze   | Connect   |
  +-----------+-----------+-----------+-----------+-----------+

  MVP -------- US-01~03 --- US-07~10 -- US-04~06 -- US-13 ----

  Full ------- US-02 ----- US-10 ----- ---------- -- US-14~15 -

  Future ----- ---------- -- ---------- ---------- -- Health Pro
```

---

## Epic 1: Authentication & Onboarding

### US-01: Email Registration
**As a** senior who wants to start playing,
**I want to** create an account with my email and a simple password,
**So that** I can save my progress and come back tomorrow.

**Acceptance Criteria:**
- Registration form: email, password, nickname (optional, defaults to "Mayor")
- Password minimum 8 characters
- Email uniqueness check with clear error message ("This email is already registered")
- Auto-create village named "My SilverVille" on registration
- Large form fields (minimum 56dp height) with Korean labels
- Success: redirect to Village tab

**Priority:** High | **Sprint:** 0

---

### US-02: KakaoTalk Login
**As a** senior who uses KakaoTalk daily,
**I want to** log in with one tap using my KakaoTalk account,
**So that** I don't have to remember another password.

**Acceptance Criteria:**
- "KakaoTalk Login" button on login screen
- OAuth 2.0 Authorization Code flow
- Auto-create account on first login
- Link existing account if email matches
- Fallback to email login if KakaoTalk is not installed

**Priority:** High | **Sprint:** 3

---

### US-03: Progress Persistence
**As a** returning player,
**I want to** see my village exactly as I left it,
**So that** I don't lose my progress or feel confused.

**Acceptance Criteria:**
- Server-side persistence on every state change (debounced)
- AsyncStorage as offline cache
- Sync indicator: "Last saved: 2 minutes ago"
- Conflict resolution: server wins (most recent timestamp)
- Loading screen with village preview during sync

**Priority:** High | **Sprint:** 2

---

## Epic 2: Diet System

### US-04: Photograph Meal
**As a** senior,
**I want to** take a picture of my meal before eating,
**So that** AI can tell me what brain-healthy foods I have.

**Acceptance Criteria:**
- Camera opens with guide overlay ("Frame your entire meal")
- Flash toggle button
- Capture button (large, center, 76dp circle)
- Photo preview before analysis
- "Retake" and "Analyze" buttons side by side
- Camera permission request with friendly explanation

**Priority:** High | **Sprint:** 1 | **Status:** UI Complete

---

### US-05: Receive Fertilizer Reward
**As a** senior,
**I want to** receive magic fertilizer based on my diet score,
**So that** I can grow my village farm.

**Acceptance Criteria:**
- MIND score 0-10 displayed with color coding (green/yellow/red)
- Fertilizer reward: 0-5 based on score thresholds
- Reward card with animation
- "Apply to Farm" button to redeem
- Server records diet result

**Priority:** High | **Sprint:** 1 | **Status:** UI Complete

---

### US-06: Diet Improvement Feedback
**As a** senior,
**I want to** know how to improve my diet,
**So that** I can get a better score tomorrow.

**Acceptance Criteria:**
- Personalized text feedback based on score range
- Detected foods shown as chips (green = MIND food, gray = other)
- Score >= 8: "Excellent! Your brain thanks you!"
- Score 4-7: "Good! Try adding more fish or nuts."
- Score < 4: "How about green vegetables, fish, or nuts tomorrow?"

**Priority:** High | **Sprint:** 1 | **Status:** Complete

---

## Epic 3: Walk System

### US-07: Track Steps
**As a** senior,
**I want to** see my step count growing toward 5,000 steps,
**So that** I feel motivated to keep walking.

**Acceptance Criteria:**
- Large step counter (64px font)
- Animated progress bar toward goal
- Percentage display
- "Start Walking" button to begin session
- Step count updates in real-time via pedometer
- Graceful fallback if pedometer unavailable

**Priority:** High | **Sprint:** 1 | **Status:** UI Complete

---

### US-08: Walk Quiz
**As a** senior,
**I want to** be quizzed by animal characters while I walk,
**So that** I exercise my brain and body at the same time.

**Acceptance Criteria:**
- Quiz triggers every 500 steps
- TTS reads question in Korean at 0.85x speed
- 4-choice buttons (large, touch-friendly)
- Correct: green highlight + praise TTS
- Wrong: red highlight + correct answer TTS
- "Replay Question" button available
- Auto-return to walking mode after 2.5s

**Priority:** High | **Sprint:** 1 | **Status:** UI Complete

---

### US-09: Walking Reward
**As a** senior,
**I want to** earn decoration items when I reach my step goal,
**So that** I can make my village beautiful.

**Acceptance Criteria:**
- 5,000 steps: 1 landscape item
- 7,000 steps: 2 landscape items
- 10,000 steps: 3 landscape items
- Completion screen with stats (total steps, quiz correct count)
- Items added to inventory

**Priority:** High | **Sprint:** 1 | **Status:** Logic Complete

---

### US-10: Background Step Tracking
**As a** senior,
**I want to** have my steps counted even when the app is closed,
**So that** I don't have to keep the app open during my walk.

**Acceptance Criteria:**
- Background location/pedometer service
- Persistent notification showing step count
- Steps sync to server periodically
- Battery usage warning in settings
- Opt-in with clear explanation

**Priority:** Medium | **Sprint:** 2

---

## Epic 4: Barista Game

### US-11: Listen and Remember Order
**As a** senior,
**I want to** hear an animal customer's order and select the right drink,
**So that** I train my listening memory.

**Acceptance Criteria:**
- Animal character appears with emoji and name
- "Listen to Order" button
- TTS plays order at 0.85x speed
- 0.8s pause after order
- Distractor character slides in with different topic
- Distractor TTS plays at 0.9x speed
- 4 menu cards appear for selection
- Correct: green card + praise TTS
- Wrong: red card + correct answer shown

**Priority:** High | **Sprint:** 1 | **Status:** UI Complete

---

### US-12: Cafe Game Results
**As a** senior,
**I want to** see my cafe game score after finishing,
**So that** I know how well I did and want to try again.

**Acceptance Criteria:**
- 3-round summary with per-round result
- Total score out of 30 (10 per round)
- Encouraging messages:
  - 30/30: "Perfect! Your memory is outstanding!"
  - 20-29: "Great job! You ignored the distractions well!"
  - < 20: "Keep practicing, you'll get better!"
- "Play Again" button

**Priority:** High | **Sprint:** 1 | **Status:** Complete

---

## Epic 5: Family System

### US-13: Family Health Notification
**As a** senior,
**I want to** have my children notified when I maintain healthy habits,
**So that** they feel reassured about my health.

**Acceptance Criteria:**
- 3 consecutive days of completing all daily missions
- Push notification to linked family members
- Message: "[Nickname] has stayed healthy for 3 days in a row!"
- Family member can view streak details in app
- Notification frequency cap: 1 per 3 days

**Priority:** High | **Sprint:** 3

---

### US-14: Send Voice Encouragement
**As a** family member,
**I want to** send a voice message to my parent's in-game mailbox,
**So that** they feel loved and motivated.

**Acceptance Criteria:**
- Record button (hold to record, release to preview)
- Maximum 30 seconds
- Preview before sending
- Message appears in parent's mailbox with play button
- TTS fallback if microphone unavailable: pre-written templates

**Priority:** High | **Sprint:** 3

---

### US-15: Send Gift Items
**As a** family member,
**I want to** send decoration items to my parent's village,
**So that** I can participate in their game experience.

**Acceptance Criteria:**
- Gift shop with 5 item types (flowers, trees, bench, lantern, fountain)
- Select item -> confirm -> item appears in parent's inventory
- Notification to parent: "[Family Name] sent you a gift!"
- Daily limit: 3 gifts per family member

**Priority:** Medium | **Sprint:** 4

---

## Epic 6: Village & Progression

### US-16: Village Growth
**As a** senior,
**I want to** see my village become more beautiful as I stay healthy,
**So that** I have a visual reward for my efforts.

**Acceptance Criteria:**
- Level 1-10 progression via EXP
- EXP sources: diet (40%), walk (40%), cafe (20%)
- New animal residents arrive at each level
- Buildings unlock at specific levels
- Visual changes noticeable per level

**Priority:** High | **Sprint:** 2 | **Status:** Logic Complete

---

### US-17: Daily Mission Dashboard
**As a** senior,
**I want to** see all my daily missions in one place,
**So that** I know what to do today.

**Acceptance Criteria:**
- Dashboard on Village tab (home screen)
- Three mission cards: Diet, Walk, Cafe
- Completion badge per mission
- Streak badge in header
- Time-appropriate greeting

**Priority:** High | **Sprint:** 1 | **Status:** Complete

---

### US-18: Streak Motivation
**As a** senior,
**I want to** see my consecutive health days growing,
**So that** I don't want to break my streak.

**Acceptance Criteria:**
- Fire badge with day count
- Color progression: gray (0), green (3+), gold (7+)
- "Don't break your streak!" reminder notification at 8 PM if missions incomplete

**Priority:** High | **Sprint:** 2 | **Status:** UI Complete

---

## Epic 7: Accessibility

### US-19: Large Text & High Contrast
**As a** senior with reduced vision,
**I want to** read all text comfortably without squinting,
**So that** I can enjoy the game independently.

**Acceptance Criteria:**
- Body text >= 16px, button text >= 18px, headers >= 22px
- Contrast ratio >= 4.5:1 for all text on backgrounds
- No information conveyed by color alone (always paired with text/icon)
- System font scaling respected (no fixed pixel sizes for critical text)

**Priority:** High | **Sprint:** 0 (ongoing) | **Status:** Partially implemented

---

### US-20: Adjustable TTS Speed
**As a** senior with varying hearing ability,
**I want to** control how fast the game speaks to me,
**So that** I can understand every word.

**Acceptance Criteria:**
- Settings screen with TTS speed slider (0.7x, 0.8x, 0.85x, 0.9x, 1.0x)
- Default: 0.85x
- Setting persists in AsyncStorage
- Applied to all TTS: quiz, barista orders, distractors, feedback

**Priority:** Medium | **Sprint:** 4

---

## Priority Matrix

| Priority | Stories | Count |
|----------|---------|-------|
| **High** | US-01, US-03~09, US-11~14, US-16~19 | 17 |
| **Medium** | US-02, US-10, US-15, US-20 | 4 |
| **Total** | | **20** |
