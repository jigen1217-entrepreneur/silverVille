# 🏡 SilverVille: Mind Oasis — PDCA 개발 계획서

> CTO Lead Agent 작성 | 2026-02-27

---

## 📋 프로젝트 개요

**SilverVille: Mind Oasis**는 60대 이상 액티브 시니어를 위한 치매 예방 헬스케어 게임입니다.
현실의 건강 활동(걷기, 식단, 인지훈련)이 가상 마을의 성장으로 이어지는 경영 시뮬레이션.

---

## 🏗️ 아키텍처

```
┌─────────────────────────────────────────────┐
│                 클라이언트                      │
│  React Native (Expo) + TypeScript            │
│  ┌──────────┬──────────┬──────────┐          │
│  │ 만보기    │ AI카메라  │ 음성인식  │          │
│  │ 모듈     │ 모듈     │ 모듈     │           │
│  └──────────┴──────────┴──────────┘          │
└──────────────┬──────────────────────┘        │
               │ REST API / WebSocket           │
┌──────────────▼──────────────────────┐        │
│              서버                      │
│  Node.js + Express + TypeScript      │
│  ┌──────────┬──────────┬──────────┐  │
│  │ Auth     │ Game     │ Health   │  │
│  │ Service  │ Engine   │ Tracker  │  │
│  └──────────┴──────────┴──────────┘  │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│            데이터베이스                  │
│  PostgreSQL + Redis (캐시/세션)        │
│  S3 (이미지 저장)                      │
└──────────────────────────────────────┘
```

---

## 👥 팀 구성 (CTO-Led Agent Teams)

| 역할 | Agent | 담당 |
|------|-------|------|
| **CTO Lead** | `cto-lead` | 전체 아키텍처, 팀 조율, 기술 결정 |
| **Product Manager** | `product-manager` | 요구사항 정의, 유저 스토리, 우선순위 |
| **Frontend Architect** | `frontend-architect` | React Native UI/UX, 센서 연동 |
| **Backend Expert** | `bkend-expert` | API 설계, DB 스키마, 서버 로직 |
| **QA Strategist** | `qa-strategist` | 테스트 전략, 품질 보증, 시니어 UX 검증 |

---

## 🔧 기술 스택

### 클라이언트
- **Framework:** React Native (Expo SDK 52)
- **Language:** TypeScript
- **State:** Zustand
- **Navigation:** Expo Router
- **센서:** expo-sensors (만보기), expo-camera (AI 식단), expo-speech (음성)

### 서버
- **Runtime:** Node.js 22
- **Framework:** Express.js
- **ORM:** Prisma
- **DB:** PostgreSQL 16
- **Cache:** Redis
- **AI:** OpenAI Vision API (식단 분석)

### 인프라
- **Cloud:** AWS (ECS + RDS + S3 + ElastiCache)
- **CI/CD:** GitHub Actions
- **Monitoring:** Sentry + Datadog

---

## 🔄 PDCA 4단계 개발 계획

### Phase 1: PLAN (계획) — 2주
| 항목 | 산출물 |
|------|--------|
| 요구사항 분석 | `docs/01-plan/requirements.md` |
| 유저 스토리 맵 | `docs/01-plan/user-stories.md` |
| DB 스키마 설계 | `docs/02-design/db-schema.md` |
| API 설계 | `docs/02-design/api-spec.md` |
| UI 와이어프레임 | `docs/02-design/wireframes.md` |
| 테스트 전략 | `docs/01-plan/test-strategy.md` |

### Phase 2: DO (실행) — 6주
| 스프린트 | 내용 |
|----------|------|
| Sprint 1 (2주) | 프로젝트 셋업, Auth, 마을 기본 화면 |
| Sprint 2 (2주) | 만보기 연동, 산책 모드, 퀴즈 시스템 |
| Sprint 3 (2주) | AI 식단 카메라, 카페 미니게임, 가족 연동 |

### Phase 3: CHECK (검증) — 2주
| 항목 | 내용 |
|------|------|
| 유닛 테스트 | Jest + React Native Testing Library |
| E2E 테스트 | Detox |
| 시니어 UX 테스트 | 실제 타겟 유저 5명 대상 |
| 성능 테스트 | 배터리 소모, 메모리 사용량 |
| 접근성 검증 | 큰 글씨, 고대비, 음성 안내 |

### Phase 4: ACT (개선) — 2주
| 항목 | 내용 |
|------|------|
| 피드백 반영 | 시니어 UX 테스트 결과 반영 |
| 성능 최적화 | 만보기 백그라운드 배터리 최적화 |
| 론칭 준비 | App Store / Play Store 제출 |
| 문서화 | 운영 가이드, API 문서 최종 정리 |

---

## 📅 전체 일정 (12주)

```
Week 1-2:   [PLAN]    요구사항 + 설계
Week 3-4:   [DO]      Sprint 1 - 기본 구조
Week 5-6:   [DO]      Sprint 2 - 헬스케어 연동
Week 7-8:   [DO]      Sprint 3 - AI + 소셜
Week 9-10:  [CHECK]   테스트 + 검증
Week 11-12: [ACT]     개선 + 론칭
```

---

## 🚀 즉시 실행 항목

1. Expo 프로젝트 초기화
2. DB 스키마 설계
3. API 엔드포인트 정의
4. UI 컴포넌트 라이브러리 구성
5. CI/CD 파이프라인 구축
