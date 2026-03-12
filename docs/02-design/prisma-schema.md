# Agent 1: Backend/DB Design -- Prisma Schema

> **Agent**: bkend-expert
> **Date**: 2026-03-12
> **Scope**: Complete Prisma schema for 10 entities + enums + indexes + relations

---

## Prisma Schema (Complete)

```prisma
// prisma/schema.prisma
// SilverVille: Mind Oasis -- PostgreSQL 16

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ──────────────────────────────────────────
// Enums
// ──────────────────────────────────────────

enum FamilyLinkStatus {
  PENDING
  ACTIVE
  REVOKED
}

enum MessageType {
  VOICE
  TEXT
  GIFT
}

enum BuildingType {
  HOUSE
  CAFE
  FARM
  GARDEN
  FOUNTAIN
}

enum AuthProvider {
  EMAIL
  KAKAO
}

// ──────────────────────────────────────────
// User
// ──────────────────────────────────────────

model User {
  id            String    @id @default(uuid()) @db.Uuid
  email         String    @unique @db.VarChar(255)
  passwordHash  String?   @map("password_hash") @db.VarChar(255)
  nickname      String    @default("이장님") @db.VarChar(50)
  kakaoId       String?   @unique @map("kakao_id") @db.VarChar(100)
  authProvider  AuthProvider @default(EMAIL) @map("auth_provider")
  level         Int       @default(1)
  exp           Int       @default(0)
  fertilizer    Int       @default(0)
  landscapeItems Int      @default(0) @map("landscape_items")
  streakDays    Int       @default(0) @map("streak_days")
  lastActiveDate DateTime? @map("last_active_date") @db.Date
  pushToken     String?   @map("push_token") @db.Text
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  // Relations
  village        Village?
  dietRecords    DietRecord[]
  walkSessions   WalkSession[]
  cafeSessions   CafeSession[]
  playerLinks    FamilyLink[]  @relation("PlayerLinks")
  familyLinks    FamilyLink[]  @relation("FamilyMemberLinks")
  sentMessages   FamilyMessage[] @relation("SentMessages")
  receivedMessages FamilyMessage[] @relation("ReceivedMessages")

  @@index([email])
  @@index([kakaoId])
  @@index([lastActiveDate])
  @@map("users")
}

// ──────────────────────────────────────────
// Village
// ──────────────────────────────────────────

model Village {
  id         String   @id @default(uuid()) @db.Uuid
  userId     String   @unique @map("user_id") @db.Uuid
  name       String   @default("나의 실버빌") @db.VarChar(100)
  population Int      @default(0)
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  // Relations
  user       User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  residents  Resident[]
  buildings  Building[]

  @@map("villages")
}

// ──────────────────────────────────────────
// DietRecord
// ──────────────────────────────────────────

model DietRecord {
  id              String   @id @default(uuid()) @db.Uuid
  userId          String   @map("user_id") @db.Uuid
  mindScore       Decimal  @map("mind_score") @db.Decimal(3, 1)
  detectedFoods   Json     @default("[]") @map("detected_foods") @db.JsonB
  fertilizerEarned Int     @default(0) @map("fertilizer_earned")
  imageUrl        String?  @map("image_url") @db.Text
  feedback        String?  @db.Text
  recordedAt      DateTime @default(now()) @map("recorded_at")

  // Relations
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([recordedAt])
  @@index([userId, recordedAt])
  @@map("diet_records")
}

// ──────────────────────────────────────────
// WalkSession
// ──────────────────────────────────────────

model WalkSession {
  id             String    @id @default(uuid()) @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  startSteps     Int       @default(0) @map("start_steps")
  endSteps       Int       @default(0) @map("end_steps")
  totalSteps     Int       @default(0) @map("total_steps")
  landscapeEarned Int      @default(0) @map("landscape_earned")
  startedAt      DateTime  @default(now()) @map("started_at")
  completedAt    DateTime? @map("completed_at")

  // Relations
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  quizAnswers QuizAnswer[]

  @@index([userId])
  @@index([startedAt])
  @@index([userId, startedAt])
  @@map("walk_sessions")
}

// ──────────────────────────────────────────
// QuizAnswer
// ──────────────────────────────────────────

model QuizAnswer {
  id             String   @id @default(uuid()) @db.Uuid
  walkSessionId  String   @map("walk_session_id") @db.Uuid
  quizId         String   @map("quiz_id") @db.VarChar(50)
  question       String   @db.Text
  selectedAnswer String   @map("selected_answer") @db.VarChar(200)
  correctAnswer  String   @map("correct_answer") @db.VarChar(200)
  isCorrect      Boolean  @default(false) @map("is_correct")
  stepMilestone  Int      @map("step_milestone")
  answeredAt     DateTime @default(now()) @map("answered_at")

  // Relations
  walkSession WalkSession @relation(fields: [walkSessionId], references: [id], onDelete: Cascade)

  @@index([walkSessionId])
  @@map("quiz_answers")
}

// ──────────────────────────────────────────
// CafeSession
// ──────────────────────────────────────────

model CafeSession {
  id           String   @id @default(uuid()) @db.Uuid
  userId       String   @map("user_id") @db.Uuid
  totalScore   Int      @default(0) @map("total_score")
  roundsPlayed Int      @default(0) @map("rounds_played")
  correctCount Int      @default(0) @map("correct_count")
  playedAt     DateTime @default(now()) @map("played_at")

  // Relations
  user           User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  baristaAnswers BaristaAnswer[]

  @@index([userId])
  @@index([playedAt])
  @@index([userId, playedAt])
  @@map("cafe_sessions")
}

// ──────────────────────────────────────────
// BaristaAnswer
// ──────────────────────────────────────────

model BaristaAnswer {
  id             String @id @default(uuid()) @db.Uuid
  cafeSessionId  String @map("cafe_session_id") @db.Uuid
  roundNumber    Int    @map("round_number")
  orderText      String @map("order_text") @db.Text
  distractorText String @map("distractor_text") @db.Text
  selectedMenuId String @map("selected_menu_id") @db.VarChar(50)
  correctMenuId  String @map("correct_menu_id") @db.VarChar(50)
  isCorrect      Boolean @default(false) @map("is_correct")
  scoreEarned    Int     @default(0) @map("score_earned")

  // Relations
  cafeSession CafeSession @relation(fields: [cafeSessionId], references: [id], onDelete: Cascade)

  @@index([cafeSessionId])
  @@map("barista_answers")
}

// ──────────────────────────────────────────
// FamilyLink
// ──────────────────────────────────────────

model FamilyLink {
  id             String           @id @default(uuid()) @db.Uuid
  playerId       String           @map("player_id") @db.Uuid
  familyMemberId String?          @map("family_member_id") @db.Uuid
  inviteCode     String           @unique @map("invite_code") @db.VarChar(20)
  status         FamilyLinkStatus @default(PENDING)
  expiresAt      DateTime         @map("expires_at")
  linkedAt       DateTime?        @map("linked_at")
  createdAt      DateTime         @default(now()) @map("created_at")

  // Relations
  player       User  @relation("PlayerLinks", fields: [playerId], references: [id], onDelete: Cascade)
  familyMember User? @relation("FamilyMemberLinks", fields: [familyMemberId], references: [id], onDelete: SetNull)

  @@index([inviteCode])
  @@index([playerId])
  @@index([familyMemberId])
  @@index([expiresAt])
  @@map("family_links")
}

// ──────────────────────────────────────────
// FamilyMessage
// ──────────────────────────────────────────

model FamilyMessage {
  id           String      @id @default(uuid()) @db.Uuid
  senderId     String      @map("sender_id") @db.Uuid
  receiverId   String      @map("receiver_id") @db.Uuid
  messageType  MessageType @map("message_type")
  contentUrl   String?     @map("content_url") @db.Text
  textContent  String?     @map("text_content") @db.Text
  giftItemType String?     @map("gift_item_type") @db.VarChar(50)
  isRead       Boolean     @default(false) @map("is_read")
  sentAt       DateTime    @default(now()) @map("sent_at")

  // Relations
  sender   User @relation("SentMessages", fields: [senderId], references: [id], onDelete: Cascade)
  receiver User @relation("ReceivedMessages", fields: [receiverId], references: [id], onDelete: Cascade)

  @@index([receiverId, isRead])
  @@index([senderId])
  @@index([sentAt])
  @@map("family_messages")
}

// ──────────────────────────────────────────
// Resident (Village Animal)
// ──────────────────────────────────────────

model Resident {
  id          String   @id @db.VarChar(50)
  villageId   String   @map("village_id") @db.Uuid
  name        String   @db.VarChar(50)
  emoji       String   @db.VarChar(10)
  unlockLevel Int      @map("unlock_level")
  arrivedAt   DateTime @default(now()) @map("arrived_at")

  // Relations
  village Village @relation(fields: [villageId], references: [id], onDelete: Cascade)

  @@index([villageId])
  @@map("residents")
}

// ──────────────────────────────────────────
// Building
// ──────────────────────────────────────────

model Building {
  id          String       @id @default(uuid()) @db.Uuid
  villageId   String       @map("village_id") @db.Uuid
  type        BuildingType
  name        String       @db.VarChar(100)
  unlockLevel Int          @map("unlock_level")
  placedAt    DateTime     @default(now()) @map("placed_at")

  // Relations
  village Village @relation(fields: [villageId], references: [id], onDelete: Cascade)

  @@index([villageId])
  @@map("buildings")
}
```

## Index Strategy Summary

| Table | Indexes | Purpose |
|-------|---------|---------|
| users | email, kakao_id, last_active_date | Login lookup, OAuth lookup, streak calculation |
| diet_records | user_id, recorded_at, (user_id + recorded_at) | User history, date-range queries, today's record |
| walk_sessions | user_id, started_at, (user_id + started_at) | User history, date queries |
| cafe_sessions | user_id, played_at, (user_id + played_at) | User history, today's best score |
| family_links | invite_code, player_id, family_member_id, expires_at | Code lookup, user links, expiry cleanup |
| family_messages | (receiver_id + is_read), sender_id, sent_at | Unread mailbox, sent messages, pagination |

## Migration Notes

- Initial migration: `npx prisma migrate dev --name init`
- Seed script should create the 8 default animal residents per village
- Use `@db.JsonB` for detected_foods to enable PostgreSQL JSONB indexing if needed
- `expiresAt` on FamilyLink enables automatic cleanup of expired invite codes via cron
