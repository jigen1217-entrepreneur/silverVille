/**
 * CafeScreen.tsx
 * 귀 밝은 바리스타 — 작업 기억력(Working Memory) 훈련 미니게임
 *
 * 게임 흐름:
 *  1. 동물 손님이 등장
 *  2. [주문 듣기] 버튼 → TTS로 주문 낭독
 *  3. 1.5초 후 다른 동물이 방해 대화 끼어듦 (청각 집중력 훈련)
 *  4. 메뉴 카드 4개 중 올바른 것 선택
 *  5. 정답/오답 피드백 → 점수 업데이트
 *  6. 3라운드 후 최종 점수 및 결과 화면
 *
 * 논문 근거:
 *  - 란셋(The Lancet) 2024: 청각 자극 유지 + 작업 기억력 훈련 → 인지 저하 예방
 *  - 방해 자극(distractors) 속에서 목표 정보 유지 = Working Memory 핵심 훈련
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { useAppStore } from '../../app/store/index';
import { SeniorButton } from '../../app/components/ui/SeniorButton';
import {
  getBaristaSession,
  submitBaristaAnswer,
  type BaristaSession,
  type MenuItem,
} from '../services/healthService';

// ─────────────────────────────────────────────
// 메뉴 목록 (전체)
// ─────────────────────────────────────────────
const ALL_MENUS: MenuItem[] = [
  { id: 'americano',    name: '아메리카노',  emoji: '☕' },
  { id: 'latte',        name: '라떼',        emoji: '🥛' },
  { id: 'cappuccino',   name: '카푸치노',    emoji: '☕' },
  { id: 'juice',        name: '주스',        emoji: '🧃' },
  { id: 'tea',          name: '허브차',      emoji: '🍵' },
  { id: 'water',        name: '물',          emoji: '💧' },
  { id: 'smoothie',     name: '스무디',      emoji: '🥤' },
  { id: 'cocoa',        name: '코코아',      emoji: '🍫' },
];

// ─────────────────────────────────────────────
// 로컬 목 세션 데이터 (API 미연동 시 사용)
// ─────────────────────────────────────────────
interface MockSession {
  sessionId: string;
  customer: { name: string; emoji: string };
  order: string;           // TTS로 읽을 주문 텍스트
  correctMenuId: string;   // 정답 메뉴 ID
  distractor: string;      // 방해 대화 텍스트
  distractorSpeaker: { name: string; emoji: string }; // 방해 손님
}

const MOCK_SESSIONS: MockSession[] = [
  {
    sessionId: 'mock-1',
    customer: { name: '곰돌이', emoji: '🐻' },
    order: '아메리카노 한 잔 주세요.',
    correctMenuId: 'americano',
    distractor: '오늘 날씨가 참 좋네요, 그렇죠?',
    distractorSpeaker: { name: '토순이', emoji: '🐰' },
  },
  {
    sessionId: 'mock-2',
    customer: { name: '여우댁', emoji: '🦊' },
    order: '따뜻한 라떼 부탁드려요.',
    correctMenuId: 'latte',
    distractor: '저 어제 공원에서 다람이를 봤어요.',
    distractorSpeaker: { name: '사슴어른', emoji: '🦌' },
  },
  {
    sessionId: 'mock-3',
    customer: { name: '부엉선생', emoji: '🦉' },
    order: '허브차 한 잔 주시겠어요?',
    correctMenuId: 'tea',
    distractor: '아, 맞다! 오늘 마을 잔치 있다고 하던데.',
    distractorSpeaker: { name: '고슴이', emoji: '🦔' },
  },
  {
    sessionId: 'mock-4',
    customer: { name: '다람이', emoji: '🐿️' },
    order: '시원한 주스 주세요!',
    correctMenuId: 'juice',
    distractor: '어머나, 오늘 할머니 생신이잖아요.',
    distractorSpeaker: { name: '비버씨', emoji: '🦫' },
  },
];

// ─────────────────────────────────────────────
// 게임 단계 타입
// ─────────────────────────────────────────────
type CafePhase =
  | 'idle'        // 시작 전
  | 'customer'    // 손님 등장
  | 'ordering'    // 주문 TTS 재생 중
  | 'distractor'  // 방해 대화 표시
  | 'selecting'   // 메뉴 선택 중
  | 'feedback'    // 정답/오답 피드백
  | 'complete';   // 3라운드 완료

const TOTAL_ROUNDS = 3;
const CORRECT_SCORE = 10; // 정답 시 점수
const BONUS_SCORE = 5;    // 속도 보너스 (방해 있음에도 정답)

// ─────────────────────────────────────────────
// 메뉴 카드 컴포넌트
// ─────────────────────────────────────────────
interface MenuCardProps {
  item: MenuItem;
  onPress: () => void;
  state: 'default' | 'correct' | 'wrong' | 'disabled';
}

function MenuCard({ item, onPress, state }: MenuCardProps) {
  const bgMap = {
    default: '#FFFFFF',
    correct: '#C8E6C9',
    wrong: '#FFCDD2',
    disabled: '#F5F5F5',
  };
  const borderMap = {
    default: '#E0E0E0',
    correct: '#4CAF50',
    wrong: '#F44336',
    disabled: '#E0E0E0',
  };
  return (
    <TouchableOpacity
      style={[
        menuCardStyles.card,
        { backgroundColor: bgMap[state], borderColor: borderMap[state] },
      ]}
      onPress={onPress}
      disabled={state === 'disabled' || state === 'correct' || state === 'wrong'}
      activeOpacity={0.7}
    >
      <Text style={menuCardStyles.emoji}>{item.emoji}</Text>
      <Text style={menuCardStyles.name}>{item.name}</Text>
      {state === 'correct' && <Text style={menuCardStyles.badge}>✓</Text>}
      {state === 'wrong' && <Text style={menuCardStyles.badge}>✗</Text>}
    </TouchableOpacity>
  );
}

const menuCardStyles = StyleSheet.create({
  card: {
    width: '47%',
    borderRadius: 18,
    borderWidth: 2,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  emoji: { fontSize: 36, marginBottom: 6 },
  name: { fontSize: 18, fontWeight: '700', color: '#424242' },
  badge: {
    position: 'absolute',
    top: 8,
    right: 12,
    fontSize: 22,
    fontWeight: 'bold',
  },
});

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────
export default function CafeScreen() {
  const { mission, setMission } = useAppStore();

  // 게임 상태
  const [phase, setPhase] = useState<CafePhase>('idle');
  const [round, setRound] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [roundResults, setRoundResults] = useState<boolean[]>([]);
  const [currentSession, setCurrentSession] = useState<MockSession | null>(null);
  const [displayMenus, setDisplayMenus] = useState<MenuItem[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showDistractor, setShowDistractor] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // 방해 대화 등장 애니메이션
  const distractorAnim = useRef(new Animated.Value(0)).current;

  // ── 게임 시작 ──
  const handleStart = useCallback(async () => {
    setRound(0);
    setTotalScore(0);
    setRoundResults([]);
    setPhase('customer');
    await loadNextRound(0);
  }, []);

  // ── 다음 라운드 세션 로드 ──
  const loadNextRound = useCallback(async (roundIndex: number) => {
    let session: MockSession;

    try {
      const apiSession = await getBaristaSession();
      // API 세션을 MockSession 형태로 변환
      session = {
        sessionId: apiSession.sessionId,
        customer: apiSession.customer,
        order: apiSession.order,
        correctMenuId: apiSession.menu[0]?.id ?? 'americano',
        distractor: apiSession.distractor,
        distractorSpeaker: { name: '방해꾼', emoji: '😅' },
      };
    } catch {
      // API 미연동 시 목 데이터 순환
      session = MOCK_SESSIONS[roundIndex % MOCK_SESSIONS.length];
    }

    setCurrentSession(session);
    setSelectedMenuId(null);
    setIsCorrect(null);
    setShowDistractor(false);
    distractorAnim.setValue(0);
    setRound(roundIndex);

    // 정답 메뉴 포함 4개 랜덤 선택
    const correctMenu = ALL_MENUS.find((m) => m.id === session.correctMenuId) ?? ALL_MENUS[0];
    const others = ALL_MENUS.filter((m) => m.id !== session.correctMenuId)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);
    const shuffled = [correctMenu, ...others].sort(() => Math.random() - 0.5);
    setDisplayMenus(shuffled);

    setPhase('customer');
  }, []);

  // ── 주문 TTS 재생 ──
  const handleListen = useCallback(() => {
    if (!currentSession) return;
    setPhase('ordering');
    setIsSpeaking(true);

    Speech.speak(currentSession.order, {
      language: 'ko-KR',
      rate: 0.85, // 시니어를 위한 천천히 읽기
      pitch: 1.0,
      onDone: () => {
        setIsSpeaking(false);
        // 주문 직후 방해 대화 등장
        setTimeout(() => showDistractorDialog(), 800);
      },
      onError: () => {
        setIsSpeaking(false);
        showDistractorDialog();
      },
    });
  }, [currentSession]);

  // ── 방해 대화 등장 ──
  const showDistractorDialog = useCallback(() => {
    if (!currentSession) return;
    setShowDistractor(true);
    setPhase('distractor');

    // 슬라이드 인 애니메이션
    Animated.spring(distractorAnim, {
      toValue: 1,
      tension: 50,
      friction: 8,
      useNativeDriver: true,
    }).start();

    // 방해 대화 TTS
    Speech.speak(currentSession.distractor, {
      language: 'ko-KR',
      rate: 0.9,
      onDone: () => {
        // 방해 대화 후 메뉴 선택 단계로
        setTimeout(() => setPhase('selecting'), 500);
      },
      onError: () => setPhase('selecting'),
    });
  }, [currentSession, distractorAnim]);

  // ── 메뉴 선택 ──
  const handleSelectMenu = useCallback(
    async (menuId: string) => {
      if (!currentSession || selectedMenuId !== null) return;

      setSelectedMenuId(menuId);
      const correct = menuId === currentSession.correctMenuId;
      setIsCorrect(correct);
      setPhase('feedback');

      // 점수 계산
      const earnedScore = correct ? CORRECT_SCORE : 0;
      const newTotal = totalScore + earnedScore;
      setTotalScore(newTotal);
      setRoundResults((prev) => [...prev, correct]);

      // 피드백 TTS
      const msg = correct
        ? '딩동댕! 정답이에요! 잘 들으셨어요!'
        : `아쉬워요. ${currentSession.order.replace('주세요', '').replace('!', '').trim()}이 맞아요.`;
      Speech.speak(msg, { language: 'ko-KR', rate: 0.9 });

      // API 제출 (백그라운드)
      submitBaristaAnswer(currentSession.sessionId, menuId).catch(() => null);

      // 다음 라운드 또는 완료
      setTimeout(async () => {
        const nextRound = round + 1;
        if (nextRound >= TOTAL_ROUNDS) {
          // 모든 라운드 완료
          setPhase('complete');
          setMission({ baristaScore: newTotal });
          Speech.speak(
            `게임 종료! 최종 점수는 ${newTotal}점이에요. 수고하셨어요!`,
            { language: 'ko-KR', rate: 0.9 }
          );
        } else {
          await loadNextRound(nextRound);
        }
      }, 2500);
    },
    [currentSession, selectedMenuId, totalScore, round, loadNextRound]
  );

  // ── 메뉴 카드 상태 결정 ──
  const getMenuState = useCallback(
    (menuId: string): MenuCardProps['state'] => {
      if (selectedMenuId === null) return 'default';
      if (menuId === currentSession?.correctMenuId) return 'correct';
      if (menuId === selectedMenuId) return 'wrong';
      return 'disabled';
    },
    [selectedMenuId, currentSession]
  );

  // ─────────────────────────────────────────────
  // 렌더링
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>☕ 마을 카페</Text>
          <Text style={styles.subtitle}>손님 주문을 잘 들어보세요!</Text>
        </View>

        {/* ── 시작 전 ── */}
        {phase === 'idle' && (
          <View style={styles.idleSection}>
            {/* 이전 기록 */}
            {mission.baristaScore !== null && (
              <View style={styles.prevScore}>
                <Text style={styles.prevScoreText}>
                  이전 최고 점수: {mission.baristaScore}점
                </Text>
              </View>
            )}
            <Text style={styles.gameDesc}>
              {'동물 손님의 주문을 듣고\n올바른 음료를 골라주세요!\n\n중간에 다른 손님이\n방해할 수도 있어요 😄'}
            </Text>
            <View style={styles.ruleRow}>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleEmoji}>👂</Text>
                <Text style={styles.ruleText}>주문 듣기</Text>
              </View>
              <Text style={styles.ruleArrow}>→</Text>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleEmoji}>🗣️</Text>
                <Text style={styles.ruleText}>방해 무시</Text>
              </View>
              <Text style={styles.ruleArrow}>→</Text>
              <View style={styles.ruleItem}>
                <Text style={styles.ruleEmoji}>☕</Text>
                <Text style={styles.ruleText}>메뉴 선택</Text>
              </View>
            </View>
            <SeniorButton
              label="게임 시작! ☕"
              onPress={handleStart}
              style={styles.startBtn}
            />
          </View>
        )}

        {/* ── 게임 진행 중 ── */}
        {phase !== 'idle' && phase !== 'complete' && currentSession && (
          <View>
            {/* 라운드 진행 표시 */}
            <View style={styles.roundBar}>
              {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.roundDot,
                    i < round
                      ? roundResults[i]
                        ? styles.roundDotCorrect
                        : styles.roundDotWrong
                      : i === round
                      ? styles.roundDotActive
                      : styles.roundDotPending,
                  ]}
                />
              ))}
              <Text style={styles.roundText}>
                {round + 1} / {TOTAL_ROUNDS} 라운드
              </Text>
            </View>

            {/* 점수 */}
            <View style={styles.scoreRow}>
              <Text style={styles.scoreLabel}>현재 점수</Text>
              <Text style={styles.scoreValue}>{totalScore}점</Text>
            </View>

            {/* 손님 카드 */}
            <View style={styles.customerCard}>
              <Text style={styles.customerEmoji}>{currentSession.customer.emoji}</Text>
              <Text style={styles.customerName}>{currentSession.customer.name}</Text>

              {/* 주문 말풍선 */}
              {(phase === 'ordering' || phase === 'distractor' ||
                phase === 'selecting' || phase === 'feedback') && (
                <View style={styles.speechBubble}>
                  <Text style={styles.speechText}>{currentSession.order}</Text>
                </View>
              )}

              {/* 주문 듣기 버튼 */}
              {phase === 'customer' && (
                <SeniorButton
                  label={`${currentSession.customer.name}의 주문 듣기 👂`}
                  onPress={handleListen}
                  style={styles.listenBtn}
                />
              )}

              {/* 재생 중 표시 */}
              {phase === 'ordering' && isSpeaking && (
                <View style={styles.playingIndicator}>
                  <Text style={styles.playingText}>🔊 주문을 읽고 있어요...</Text>
                </View>
              )}
            </View>

            {/* 방해 대화 오버레이 */}
            {showDistractor && currentSession && (
              <Animated.View
                style={[
                  styles.distractorCard,
                  {
                    transform: [
                      {
                        translateY: distractorAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [60, 0],
                        }),
                      },
                    ],
                    opacity: distractorAnim,
                  },
                ]}
              >
                <Text style={styles.distractorEmoji}>
                  {currentSession.distractorSpeaker.emoji}
                </Text>
                <View style={styles.distractorBubble}>
                  <Text style={styles.distractorName}>
                    {currentSession.distractorSpeaker.name}
                  </Text>
                  <Text style={styles.distractorText}>{currentSession.distractor}</Text>
                </View>
                <View style={styles.distractorBadge}>
                  <Text style={styles.distractorBadgeText}>방해!</Text>
                </View>
              </Animated.View>
            )}

            {/* 메뉴 선택 */}
            {(phase === 'selecting' || phase === 'feedback') && (
              <View>
                <Text style={styles.selectGuide}>
                  {phase === 'selecting'
                    ? '처음 주문을 기억하세요? 맞는 음료를 골라주세요!'
                    : isCorrect
                    ? '🎉 정답이에요!'
                    : '😢 아쉬워요...'}
                </Text>
                <View style={styles.menuGrid}>
                  {displayMenus.map((menu) => (
                    <MenuCard
                      key={menu.id}
                      item={menu}
                      onPress={() => handleSelectMenu(menu.id)}
                      state={getMenuState(menu.id)}
                    />
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {/* ── 게임 완료 ── */}
        {phase === 'complete' && (
          <View style={styles.completeSection}>
            <Text style={styles.completeEmoji}>🏆</Text>
            <Text style={styles.completeTitle}>게임 완료!</Text>

            {/* 최종 점수 */}
            <View style={styles.finalScoreCard}>
              <Text style={styles.finalScoreLabel}>최종 점수</Text>
              <Text style={styles.finalScoreValue}>{totalScore}점</Text>
              <Text style={styles.finalScoreMax}>/ {TOTAL_ROUNDS * CORRECT_SCORE}점 만점</Text>
            </View>

            {/* 라운드별 결과 */}
            <View style={styles.roundSummary}>
              {roundResults.map((correct, i) => (
                <View key={i} style={styles.roundSummaryItem}>
                  <Text style={styles.roundSummaryNum}>{i + 1}라운드</Text>
                  <Text style={styles.roundSummaryResult}>
                    {correct ? '✓ 정답' : '✗ 오답'}
                  </Text>
                </View>
              ))}
            </View>

            {/* 평가 메시지 */}
            <Text style={styles.evalText}>
              {totalScore === TOTAL_ROUNDS * CORRECT_SCORE
                ? '🌟 완벽해요! 기억력이 정말 뛰어나세요!'
                : totalScore >= CORRECT_SCORE * 2
                ? '👏 훌륭해요! 방해에도 잘 기억하셨어요!'
                : '💪 조금 더 연습하면 더 잘하실 수 있어요!'}
            </Text>

            <SeniorButton
              label="다시 하기 ☕"
              onPress={handleStart}
              style={styles.retryBtn}
            />
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBE9E7',
  },

  // 헤더
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4E342E',
  },
  subtitle: {
    fontSize: 18,
    color: '#795548',
    marginTop: 4,
  },

  // 시작 전
  idleSection: {
    padding: 20,
    alignItems: 'center',
  },
  prevScore: {
    backgroundColor: '#FFE0B2',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 16,
  },
  prevScoreText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E65100',
  },
  gameDesc: {
    fontSize: 20,
    color: '#4E342E',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 24,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
  },
  ruleItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    minWidth: 72,
  },
  ruleEmoji: { fontSize: 28, marginBottom: 4 },
  ruleText: { fontSize: 13, fontWeight: '600', color: '#4E342E' },
  ruleArrow: { fontSize: 22, color: '#BCAAA4' },
  startBtn: {
    width: '100%',
    backgroundColor: '#6D4C41',
  },

  // 라운드 바
  roundBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  roundDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  roundDotPending: { backgroundColor: '#D7CCC8' },
  roundDotActive: { backgroundColor: '#795548' },
  roundDotCorrect: { backgroundColor: '#4CAF50' },
  roundDotWrong: { backgroundColor: '#F44336' },
  roundText: {
    marginLeft: 'auto',
    fontSize: 16,
    fontWeight: '600',
    color: '#795548',
  },

  // 점수 행
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  scoreLabel: { fontSize: 16, color: '#8D6E63' },
  scoreValue: { fontSize: 20, fontWeight: 'bold', color: '#4E342E' },

  // 손님 카드
  customerCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  customerEmoji: {
    fontSize: 72,
    marginBottom: 8,
  },
  customerName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4E342E',
    marginBottom: 12,
  },
  speechBubble: {
    backgroundColor: '#FFF3E0',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#FFCCBC',
    maxWidth: '90%',
  },
  speechText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#3E2723',
    textAlign: 'center',
  },
  listenBtn: {
    backgroundColor: '#5D4037',
    minWidth: 240,
  },
  playingIndicator: {
    backgroundColor: '#FFCCBC',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  playingText: {
    fontSize: 16,
    color: '#BF360C',
    fontWeight: '600',
  },

  // 방해 대화
  distractorCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: '#FFF8E1',
    borderRadius: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 2,
    borderColor: '#FFD54F',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 5,
    elevation: 3,
  },
  distractorEmoji: { fontSize: 36, marginRight: 12 },
  distractorBubble: { flex: 1 },
  distractorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#F57F17',
    marginBottom: 4,
  },
  distractorText: {
    fontSize: 16,
    color: '#424242',
    lineHeight: 22,
  },
  distractorBadge: {
    backgroundColor: '#FFD54F',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  distractorBadgeText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#F57F17',
  },

  // 메뉴 선택
  selectGuide: {
    fontSize: 18,
    fontWeight: '600',
    color: '#4E342E',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 14,
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    justifyContent: 'space-between',
  },

  // 완료
  completeSection: {
    margin: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 5,
  },
  completeEmoji: { fontSize: 72, marginBottom: 12 },
  completeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4E342E',
    marginBottom: 20,
  },
  finalScoreCard: {
    backgroundColor: '#FBE9E7',
    borderRadius: 18,
    padding: 20,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  finalScoreLabel: {
    fontSize: 16,
    color: '#8D6E63',
    marginBottom: 4,
  },
  finalScoreValue: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#4E342E',
    lineHeight: 64,
  },
  finalScoreMax: {
    fontSize: 17,
    color: '#BCAAA4',
    marginTop: -4,
  },
  roundSummary: {
    width: '100%',
    marginBottom: 16,
    gap: 8,
  },
  roundSummaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#FFF8F6',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  roundSummaryNum: {
    fontSize: 16,
    color: '#795548',
    fontWeight: '600',
  },
  roundSummaryResult: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4E342E',
  },
  evalText: {
    fontSize: 18,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 20,
  },
  retryBtn: {
    width: '100%',
    backgroundColor: '#6D4C41',
  },
});
