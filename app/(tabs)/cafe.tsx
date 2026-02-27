/**
 * cafe.tsx
 * 귀 밝은 바리스타 — 작업 기억력 훈련 미니게임
 *
 * 게임 흐름:
 * 1. 동물 손님 등장 → 주문 TTS 재생 ("아이스 아메리카노 1잔 주세요")
 * 2. 방해 손님 대화 오버레이 ("오늘 날씨 참 좋죠?") TTS 재생
 * 3. 메뉴 카드 4개 중 올바른 주문 선택
 * 4. 정답/오답 피드백 → 점수 누적
 * 5. 3라운드 후 세션 결산 및 마을 경험치 보상
 *
 * 란셋 보고서 기반: 청각 자극 유지 + 방해 요소를 이겨내는 작업 기억력 훈련
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Speech from 'expo-speech';
import { Ionicons } from '@expo/vector-icons';

import { useGameStore } from '../../src/store/gameStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

interface MenuItem {
  id: string;
  name: string;
  emoji: string;
}

interface Customer {
  name: string;
  emoji: string;
  personality: string; // 방해 대사 스타일
}

interface Round {
  customer: Customer;
  correctItem: MenuItem;
  distractorText: string; // 방해 손님 대사
  allChoices: MenuItem[];  // 4개 선택지 (정답 포함)
}

type GamePhase =
  | 'ready'        // 시작 전
  | 'ordering'     // 주문 TTS 재생 중
  | 'distracted'   // 방해 대화 TTS 재생 중
  | 'choosing'     // 플레이어 선택 대기
  | 'feedback'     // 결과 피드백
  | 'result';      // 세션 결산

// ─────────────────────────────────────────────
// 게임 데이터
// ─────────────────────────────────────────────

const MENU_ITEMS: MenuItem[] = [
  { id: 'ice_americano',   name: '아이스 아메리카노', emoji: '🧊☕' },
  { id: 'hot_americano',   name: '따뜻한 아메리카노', emoji: '☕' },
  { id: 'cafe_latte',      name: '카페라떼',         emoji: '🥛☕' },
  { id: 'green_tea_latte', name: '녹차라떼',         emoji: '🍵' },
  { id: 'strawberry_ade',  name: '딸기에이드',       emoji: '🍓🥤' },
  { id: 'lemon_ade',       name: '레몬에이드',       emoji: '🍋🥤' },
  { id: 'cappuccino',      name: '카푸치노',         emoji: '☕🫧' },
  { id: 'hot_chocolate',   name: '핫초코',           emoji: '🍫☕' },
];

const CUSTOMERS: Customer[] = [
  { name: '솜이', emoji: '🐰', personality: '수다스러운' },
  { name: '두부', emoji: '🐻', personality: '느긋한' },
  { name: '당근이', emoji: '🐿️', personality: '활발한' },
  { name: '복실이', emoji: '🐶', personality: '친근한' },
  { name: '초코', emoji: '🐱', personality: '도도한' },
];

const DISTRACTOR_LINES = [
  '오늘 날씨가 참 좋지 않나요?',
  '어제 텔레비전에서 재미있는 드라마 봤어요!',
  '요즘 꽃이 예쁘게 피었더라고요.',
  '이 카페 음악이 참 좋네요!',
  '손자가 이번 주에 놀러 온대요.',
  '요즘 건강하게 잘 지내고 계세요?',
  '아, 저도 뭔가 먹고 싶은데 고민이에요.',
];

const ORDER_TEMPLATES = [
  (item: string) => `${item} 한 잔 주세요.`,
  (item: string) => `저는 ${item}로 주세요!`,
  (item: string) => `${item} 한 잔 부탁드려요.`,
  (item: string) => `오늘은 ${item}이 먹고 싶어요.`,
];

// ─────────────────────────────────────────────
// 유틸리티
// ─────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** 라운드 1개 생성 */
function generateRound(): Round {
  const customer = pick(CUSTOMERS);
  const correctItem = pick(MENU_ITEMS);
  const distractorText = pick(DISTRACTOR_LINES);

  // 선택지: 정답 + 랜덤 3개 (중복 제외)
  const others = shuffle(MENU_ITEMS.filter((m) => m.id !== correctItem.id)).slice(0, 3);
  const allChoices = shuffle([correctItem, ...others]);

  return { customer, correctItem, distractorText, allChoices };
}

const TOTAL_ROUNDS = 3;

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

/** 점수 별 표시 */
function ScoreStars({ score, maxScore }: { score: number; maxScore: number }) {
  const ratio = score / maxScore;
  const stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : ratio > 0 ? 1 : 0;
  return (
    <View style={starStyles.row}>
      {[1, 2, 3].map((s) => (
        <Text key={s} style={starStyles.star}>
          {s <= stars ? '⭐' : '☆'}
        </Text>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4 },
  star: { fontSize: 28 },
});

/** 메뉴 선택 버튼 */
function MenuButton({
  item,
  selected,
  correct,
  answered,
  onPress,
}: {
  item: MenuItem;
  selected: boolean;
  correct: boolean;
  answered: boolean;
  onPress: () => void;
}) {
  let bg = '#FFFFFF';
  let borderColor = '#E0E0E0';

  if (answered) {
    if (correct) {
      bg = '#E8F5E9';
      borderColor = '#4CAF50';
    } else if (selected) {
      bg = '#FFEBEE';
      borderColor = '#EF9A9A';
    }
  }

  return (
    <TouchableOpacity
      style={[menuBtnStyles.btn, { backgroundColor: bg, borderColor }]}
      onPress={onPress}
      disabled={answered}
      activeOpacity={0.75}
    >
      <Text style={menuBtnStyles.emoji}>{item.emoji}</Text>
      <Text style={menuBtnStyles.name}>{item.name}</Text>
      {answered && correct && (
        <Ionicons name="checkmark-circle" size={22} color="#2E7D32" style={{ marginLeft: 4 }} />
      )}
      {answered && selected && !correct && (
        <Ionicons name="close-circle" size={22} color="#C62828" style={{ marginLeft: 4 }} />
      )}
    </TouchableOpacity>
  );
}

const menuBtnStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    borderWidth: 2,
    marginBottom: 10,
    elevation: 1,
    gap: 10,
  },
  emoji: { fontSize: 26 },
  name: { fontSize: 17, fontWeight: '700', color: '#333', flex: 1 },
});

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────

export default function CafeScreen() {
  const { cafeScore, addCafeScore, resetCafeSession, addVillageExp } = useGameStore();

  // 게임 상태
  const [phase, setPhase] = useState<GamePhase>('ready');
  const [currentRound, setCurrentRound] = useState(0);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sessionCorrect, setSessionCorrect] = useState(0);

  // 방해 오버레이 표시 여부
  const [showDistractor, setShowDistractor] = useState(false);
  const distractorAnim = useRef(new Animated.Value(0)).current;

  // 손님 등장 애니메이션
  const customerAnim = useRef(new Animated.Value(0)).current;

  // TTS 재생 중 여부
  const isSpeakingRef = useRef(false);

  // ── TTS 헬퍼 ────────────────────────────

  const speak = useCallback((text: string, onDone?: () => void) => {
    Speech.stop();
    isSpeakingRef.current = true;
    Speech.speak(text, {
      language: 'ko-KR',
      rate: 0.85,
      pitch: 1.0,
      onDone: () => {
        isSpeakingRef.current = false;
        onDone?.();
      },
    });
  }, []);

  // ── 게임 시작 ────────────────────────────

  const startGame = useCallback(() => {
    const newRounds = Array.from({ length: TOTAL_ROUNDS }, generateRound);
    setRounds(newRounds);
    setCurrentRound(0);
    setSelectedId(null);
    setSessionCorrect(0);
    resetCafeSession();
    setPhase('ordering');

    // 첫 라운드 시작
    startRound(newRounds[0]);
  }, [resetCafeSession]);

  // ── 라운드 시작 ───────────────────────────

  const startRound = useCallback(
    (round: Round) => {
      setSelectedId(null);
      setShowDistractor(false);
      distractorAnim.setValue(0);

      // 손님 등장 애니메이션
      customerAnim.setValue(0);
      Animated.spring(customerAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 60,
        friction: 8,
      }).start();

      // 주문 TTS
      const orderText = pick(ORDER_TEMPLATES)(round.correctItem.name);
      const fullScript = `${round.customer.name}가 주문합니다. ${orderText}`;

      speak(fullScript, () => {
        // 주문 TTS 끝 → 방해 TTS 시작
        setPhase('distracted');
        showDistractorOverlay(round.distractorText);
      });
    },
    [speak, customerAnim, distractorAnim],
  );

  // ── 방해 오버레이 ─────────────────────────

  const showDistractorOverlay = useCallback(
    (text: string) => {
      setShowDistractor(true);

      // 오버레이 페이드인
      Animated.timing(distractorAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      // 방해 TTS 재생 후 선택 단계로
      speak(`다른 손님: ${text}`, () => {
        Animated.timing(distractorAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowDistractor(false);
          setPhase('choosing');
        });
      });
    },
    [speak, distractorAnim],
  );

  // ── 메뉴 선택 ────────────────────────────

  const selectMenu = useCallback(
    (itemId: string) => {
      if (phase !== 'choosing' || selectedId !== null) return;

      setSelectedId(itemId);

      const round = rounds[currentRound];
      const correct = itemId === round.correctItem.id;

      if (correct) {
        setSessionCorrect((prev) => prev + 1);
        addCafeScore(10);
        speak('딩동댕! 정답이에요, 잘 기억하셨네요!');
      } else {
        speak(`아쉽네요. 정답은 ${round.correctItem.name} 이었어요.`);
      }

      setPhase('feedback');

      // 1.8초 후 다음 라운드 or 결산
      setTimeout(() => {
        const nextRound = currentRound + 1;
        if (nextRound < TOTAL_ROUNDS) {
          setCurrentRound(nextRound);
          setPhase('ordering');
          startRound(rounds[nextRound]);
        } else {
          // 세션 종료
          setPhase('result');
          Speech.stop();

          // 마을 경험치 보상
          const exp = (sessionCorrect + (correct ? 1 : 0)) * 10;
          addVillageExp(exp);
        }
      }, 1800);
    },
    [
      phase,
      selectedId,
      rounds,
      currentRound,
      addCafeScore,
      addVillageExp,
      speak,
      startRound,
      sessionCorrect,
    ],
  );

  // ── 정리 ─────────────────────────────────

  useEffect(() => {
    return () => {
      Speech.stop();
    };
  }, []);

  // ─────────────────────────────────────────
  // 렌더
  // ─────────────────────────────────────────

  // ── 준비 화면 ────────────────────────────
  if (phase === 'ready') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.readyScreen}>
          <Text style={styles.readyCafe}>☕</Text>
          <Text style={styles.readyTitle}>마을 카페에 오신 걸{'\n'}환영해요!</Text>
          <Text style={styles.readyDesc}>
            동물 손님의 주문을 잘 듣고 기억하세요.{'\n'}
            중간에 다른 손님이 말을 걸어도{'\n'}
            처음 주문을 잊으면 안 돼요! 💪
          </Text>
          <View style={styles.readyRuleCard}>
            <Text style={styles.readyRuleTitle}>📋 게임 규칙</Text>
            <Text style={styles.readyRuleText}>1. 손님 주문 음성을 잘 들어요</Text>
            <Text style={styles.readyRuleText}>2. 방해 대화를 무시해요</Text>
            <Text style={styles.readyRuleText}>3. 올바른 메뉴를 선택해요</Text>
            <Text style={styles.readyRuleText}>4. {TOTAL_ROUNDS}라운드 도전!</Text>
          </View>
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Ionicons name="play" size={26} color="#FFF" />
            <Text style={styles.startBtnText}>게임 시작!</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 결산 화면 ────────────────────────────
  if (phase === 'result') {
    const finalCorrect = sessionCorrect;
    const maxScore = TOTAL_ROUNDS * 10;
    const earned = finalCorrect * 10;
    const expReward = finalCorrect * 10;

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.resultScroll}>
          <Text style={styles.resultTitle}>☕ 오늘 바리스타 결과</Text>

          {/* 별점 */}
          <View style={styles.starSection}>
            <ScoreStars score={earned} maxScore={maxScore} />
            <Text style={styles.resultScore}>
              {finalCorrect} / {TOTAL_ROUNDS} 정답
            </Text>
          </View>

          {/* 메시지 */}
          <View style={styles.resultMessageCard}>
            <Text style={styles.resultMessage}>
              {finalCorrect === TOTAL_ROUNDS
                ? '🎉 완벽해요! 기억력이 아주 훌륭하세요!'
                : finalCorrect >= 2
                ? '👏 잘 하셨어요! 조금 더 집중해보아요!'
                : '💪 괜찮아요! 다시 도전해봐요!'}
            </Text>
          </View>

          {/* 보상 */}
          <View style={styles.rewardCard}>
            <Text style={styles.rewardTitle}>🏅 보상</Text>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardEmoji}>🌟</Text>
              <Text style={styles.rewardText}>마을 경험치 +{expReward}</Text>
            </View>
            <View style={styles.rewardRow}>
              <Text style={styles.rewardEmoji}>☕</Text>
              <Text style={styles.rewardText}>바리스타 점수 +{earned}</Text>
            </View>
          </View>

          {/* 뇌 건강 TIP */}
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>🧠 알고 계셨나요?</Text>
            <Text style={styles.tipText}>
              방해 요소를 이겨내며 정보를 기억하는 훈련은{'\n'}
              '작업 기억력'을 강화해 치매 예방에 도움이 돼요.{'\n'}
              란셋(Lancet) 보고서에서도 청각 자극과 작업 기억{'\n'}훈련을 중요하게 다루고 있어요.
            </Text>
          </View>

          {/* 다시 하기 */}
          <TouchableOpacity style={styles.startBtn} onPress={startGame}>
            <Ionicons name="refresh" size={22} color="#FFF" />
            <Text style={styles.startBtnText}>다시 도전!</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ── 게임 진행 화면 ────────────────────────

  const round = rounds[currentRound];
  if (!round) return null;

  const isAnswered = phase === 'feedback';
  const roundLabel = `${currentRound + 1} / ${TOTAL_ROUNDS} 라운드`;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.gameScroll}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>☕ 마을 카페</Text>
          <View style={styles.roundBadge}>
            <Text style={styles.roundBadgeText}>{roundLabel}</Text>
          </View>
        </View>

        {/* 점수 현황 */}
        <View style={styles.scoreRow}>
          {Array.from({ length: TOTAL_ROUNDS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.scoreDot,
                i < currentRound
                  ? styles.scoreDotDone
                  : i === currentRound
                  ? styles.scoreDotCurrent
                  : styles.scoreDotPending,
              ]}
            />
          ))}
        </View>

        {/* 손님 카드 */}
        <Animated.View
          style={[
            styles.customerCard,
            {
              transform: [
                {
                  scale: customerAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.85, 1],
                  }),
                },
              ],
              opacity: customerAnim,
            },
          ]}
        >
          <Text style={styles.customerEmoji}>{round.customer.emoji}</Text>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{round.customer.name}</Text>
            <Text style={styles.customerPersonality}>
              {round.customer.personality} 손님
            </Text>
          </View>
        </Animated.View>

        {/* 상태 배지 */}
        <View style={styles.phaseBadge}>
          {phase === 'ordering' && (
            <View style={[styles.phaseChip, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="volume-high" size={18} color="#1976D2" />
              <Text style={[styles.phaseChipText, { color: '#1976D2' }]}>
                주문 듣는 중...
              </Text>
            </View>
          )}
          {phase === 'distracted' && (
            <View style={[styles.phaseChip, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="chatbubble-ellipses" size={18} color="#E65100" />
              <Text style={[styles.phaseChipText, { color: '#E65100' }]}>
                방해 대화 중... 집중하세요!
              </Text>
            </View>
          )}
          {(phase === 'choosing' || phase === 'feedback') && (
            <View style={[styles.phaseChip, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="hand-right" size={18} color="#2E7D32" />
              <Text style={[styles.phaseChipText, { color: '#2E7D32' }]}>
                주문을 선택하세요!
              </Text>
            </View>
          )}
        </View>

        {/* 방해 대화 오버레이 */}
        {showDistractor && (
          <Animated.View
            style={[styles.distractorCard, { opacity: distractorAnim }]}
          >
            <Text style={styles.distractorLabel}>💬 다른 손님이 말을 걸어요</Text>
            <Text style={styles.distractorText}>
              "{round.distractorText}"
            </Text>
            <Text style={styles.distractorHint}>
              ⚠️ 처음 주문을 기억하세요!
            </Text>
          </Animated.View>
        )}

        {/* 메뉴 선택 (choosing / feedback 단계에서 표시) */}
        {(phase === 'choosing' || phase === 'feedback') && (
          <View style={styles.menuSection}>
            <Text style={styles.menuTitle}>🍽️ 무엇을 주문했나요?</Text>
            {round.allChoices.map((item) => {
              const isSelected = selectedId === item.id;
              const isCorrect = item.id === round.correctItem.id;
              return (
                <MenuButton
                  key={item.id}
                  item={item}
                  selected={isSelected}
                  correct={isAnswered && isCorrect}
                  answered={isAnswered}
                  onPress={() => selectMenu(item.id)}
                />
              );
            })}
          </View>
        )}

        {/* 대기 중 힌트 */}
        {(phase === 'ordering' || phase === 'distracted') && (
          <View style={styles.waitHint}>
            <Text style={styles.waitHintText}>
              {phase === 'ordering'
                ? '👂 주문을 잘 들어보세요...'
                : '🧠 처음 주문을 기억하세요!'}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBE9E7' },

  // 준비 화면
  readyScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    gap: 16,
  },
  readyCafe: { fontSize: 72 },
  readyTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4E342E',
    textAlign: 'center',
    lineHeight: 34,
  },
  readyDesc: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  readyRuleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    gap: 6,
    elevation: 2,
  },
  readyRuleTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#4E342E',
    marginBottom: 4,
  },
  readyRuleText: { fontSize: 15, color: '#555' },

  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#795548',
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 36,
    gap: 10,
    elevation: 4,
    marginTop: 4,
  },
  startBtnText: { fontSize: 19, fontWeight: '800', color: '#FFF' },

  // 게임 화면
  gameScroll: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#4E342E' },
  roundBadge: {
    backgroundColor: '#795548',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  roundBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFF' },

  // 진행 점
  scoreRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    marginBottom: 18,
  },
  scoreDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  scoreDotDone: { backgroundColor: '#2E7D32' },
  scoreDotCurrent: { backgroundColor: '#795548' },
  scoreDotPending: { backgroundColor: '#BDBDBD' },

  // 손님 카드
  customerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 16,
    marginBottom: 14,
    elevation: 3,
    shadowColor: '#795548',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
  },
  customerEmoji: { fontSize: 56 },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 22, fontWeight: '800', color: '#3E2723' },
  customerPersonality: { fontSize: 14, color: '#8D6E63', marginTop: 2 },

  // 상태 배지
  phaseBadge: { marginBottom: 14 },
  phaseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  phaseChipText: { fontSize: 15, fontWeight: '700' },

  // 방해 오버레이
  distractorCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 2,
    borderColor: '#FFE082',
    elevation: 2,
  },
  distractorLabel: { fontSize: 13, fontWeight: '700', color: '#F57F17', marginBottom: 6 },
  distractorText: { fontSize: 17, color: '#5D4037', fontWeight: '600', lineHeight: 24 },
  distractorHint: { fontSize: 13, color: '#E65100', marginTop: 8, fontWeight: '600' },

  // 메뉴 선택
  menuSection: { marginTop: 4 },
  menuTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#4E342E',
    marginBottom: 12,
  },

  // 대기 힌트
  waitHint: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
    marginTop: 10,
    elevation: 1,
  },
  waitHintText: { fontSize: 17, color: '#795548', fontWeight: '700' },

  // 결산 화면
  resultScroll: { padding: 24, paddingBottom: 40, alignItems: 'center' },
  resultTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#4E342E',
    marginBottom: 20,
  },
  starSection: { alignItems: 'center', marginBottom: 16, gap: 8 },
  resultScore: { fontSize: 22, fontWeight: '800', color: '#795548' },
  resultMessageCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    width: '100%',
    elevation: 2,
  },
  resultMessage: {
    fontSize: 18,
    color: '#4E342E',
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 26,
  },
  rewardCard: {
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  rewardTitle: { fontSize: 16, fontWeight: '800', color: '#F57F17', marginBottom: 4 },
  rewardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rewardEmoji: { fontSize: 22 },
  rewardText: { fontSize: 16, fontWeight: '700', color: '#5D4037' },
  tipCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 18,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  tipTitle: { fontSize: 15, fontWeight: '800', color: '#2E7D32', marginBottom: 6 },
  tipText: { fontSize: 13, color: '#444', lineHeight: 20 },
});
