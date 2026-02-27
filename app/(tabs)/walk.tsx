/**
 * walk.tsx
 * 이중 과제(Dual-Task) 산책 모드
 * - expo-sensors Pedometer로 실시간 걸음 수 추적
 * - 1000보마다 음성 퀴즈 자동 출제 (expo-speech TTS)
 * - 4지선다 퀴즈 카드 UI
 * - 5000보 달성 시 조경 아이템 보상
 * - 걷기 미가능 시 모의 테스트 모드 지원
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useGameStore, selectWalkProgress } from '../../src/store/gameStore';
import {
  pedometerService,
  WalkQuiz,
  PedometerStatus,
} from '../../src/services/pedometerService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

type QuizState =
  | { phase: 'idle' }
  | { phase: 'playing'; quiz: WalkQuiz }
  | { phase: 'answered'; quiz: WalkQuiz; selected: string; correct: boolean };

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────
const WALK_GOAL = 5000;

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

/** 걸음 수 진행 원형 표시기 (간단 버전) */
function StepCircle({
  steps,
  goal,
  progress,
}: {
  steps: number;
  goal: number;
  progress: number;
}) {
  const circumference = 2 * Math.PI * 54; // r=54
  const strokeDashoffset = circumference * (1 - progress / 100);

  return (
    <View style={circleStyles.wrapper}>
      {/* SVG 대신 border-radius 원 구현 (RN에서 SVG 없이) */}
      <View style={circleStyles.outer}>
        <View
          style={[
            circleStyles.progressRing,
            {
              borderColor: progress >= 100 ? '#2E7D32' : '#42A5F5',
            },
          ]}
        />
        <View style={circleStyles.inner}>
          <Text style={circleStyles.stepNumber}>{steps.toLocaleString()}</Text>
          <Text style={circleStyles.stepLabel}>걸음</Text>
          <Text style={circleStyles.goalLabel}>목표 {goal.toLocaleString()}보</Text>
        </View>
      </View>
      <Text style={circleStyles.pctText}>{progress}%</Text>
    </View>
  );
}

const circleStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', marginVertical: 8 },
  outer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },
  progressRing: {
    position: 'absolute',
    width: 156,
    height: 156,
    borderRadius: 78,
    borderWidth: 8,
  },
  inner: { alignItems: 'center' },
  stepNumber: { fontSize: 32, fontWeight: '800', color: '#1B5E20' },
  stepLabel: { fontSize: 14, color: '#666', fontWeight: '600' },
  goalLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  pctText: { fontSize: 22, fontWeight: '800', color: '#1976D2', marginTop: 8 },
});

/** 퀴즈 선택지 버튼 */
function ChoiceButton({
  choice,
  selected,
  correct,
  answered,
  onPress,
}: {
  choice: string;
  selected: boolean;
  correct: boolean;
  answered: boolean;
  onPress: () => void;
}) {
  let bg = '#FFFFFF';
  let textColor = '#333';

  if (answered) {
    if (correct) {
      bg = '#C8E6C9';
      textColor = '#1B5E20';
    } else if (selected) {
      bg = '#FFCDD2';
      textColor = '#B71C1C';
    }
  } else if (selected) {
    bg = '#E3F2FD';
    textColor = '#0D47A1';
  }

  return (
    <TouchableOpacity
      style={[choiceStyles.btn, { backgroundColor: bg }]}
      onPress={onPress}
      disabled={answered}
      activeOpacity={0.7}
    >
      <Text style={[choiceStyles.text, { color: textColor }]}>{choice}</Text>
      {answered && correct && (
        <Ionicons name="checkmark-circle" size={22} color="#2E7D32" />
      )}
      {answered && selected && !correct && (
        <Ionicons name="close-circle" size={22} color="#C62828" />
      )}
    </TouchableOpacity>
  );
}

const choiceStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    elevation: 1,
  },
  text: { fontSize: 17, fontWeight: '700', flex: 1 },
});

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────

export default function WalkScreen() {
  const { steps, walkGoal, addLandscapeItems, setSteps, addQuizRecord } =
    useGameStore();
  const walkProgress = useGameStore(selectWalkProgress);

  // 만보기 상태
  const [pedometerStatus, setPedometerStatus] =
    useState<PedometerStatus | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  // 퀴즈 상태
  const [quizState, setQuizState] = useState<QuizState>({ phase: 'idle' });

  // 보상 지급 여부 (세션당 1회)
  const rewardGivenRef = useRef(false);

  // 퀴즈 카드 페이드 애니메이션
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // ── 만보기 초기화 ────────────────────────

  useEffect(() => {
    (async () => {
      const status = await pedometerService.initialize();
      setPedometerStatus(status);
    })();
    return () => {
      pedometerService.stopTracking();
      pedometerService.stopSpeaking();
    };
  }, []);

  // ── 걷기 시작 ────────────────────────────

  const startTracking = useCallback(() => {
    if (!pedometerStatus?.isAvailable) return;

    setIsTracking(true);
    rewardGivenRef.current = false;

    pedometerService.startTracking(
      // 걸음 수 업데이트 콜백
      ({ steps: newSteps, goalReached }) => {
        setSteps(newSteps);

        // 5000보 보상 (최초 1회)
        if (goalReached && !rewardGivenRef.current) {
          rewardGivenRef.current = true;
          addLandscapeItems(1);
          Alert.alert(
            '🎉 목표 달성!',
            `${WALK_GOAL.toLocaleString()}보 달성!\n조경 아이템 1개를 획득했어요!`,
            [{ text: '와아, 좋아요! 🌳' }],
          );
        }
      },
      // 퀴즈 트리거 콜백 (1000보마다)
      (milestone) => {
        triggerQuiz(milestone);
      },
    );
  }, [pedometerStatus, setSteps, addLandscapeItems]);

  // ── 걷기 중지 ────────────────────────────

  const stopTracking = useCallback(() => {
    pedometerService.stopTracking();
    pedometerService.stopSpeaking();
    setIsTracking(false);
    setQuizState({ phase: 'idle' });
  }, []);

  // ── 퀴즈 트리거 ──────────────────────────

  const triggerQuiz = useCallback(
    (milestone: number) => {
      const quiz = pedometerService.getRandomQuiz();
      setQuizState({ phase: 'playing', quiz });

      // TTS로 퀴즈 질문 읽기
      pedometerService.speakQuiz(
        `${milestone}보 걸었어요! 퀴즈입니다. ${quiz.question}`,
      );

      // 퀴즈 카드 페이드인
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    },
    [fadeAnim],
  );

  // ── 답 선택 ──────────────────────────────

  const selectAnswer = useCallback(
    (choice: string) => {
      if (quizState.phase !== 'playing') return;

      const correct = choice === quizState.quiz.answer;
      pedometerService.stopSpeaking();

      // 정답/오답 음성 피드백
      pedometerService.speakQuiz(
        correct
          ? '정답이에요! 아주 잘 하셨어요!'
          : `아쉽네요. 정답은 ${quizState.quiz.answer} 이에요.`,
      );

      setQuizState({
        phase: 'answered',
        quiz: quizState.quiz,
        selected: choice,
        correct,
      });

      // 퀴즈 기록 저장
      addQuizRecord({
        question: quizState.quiz.question,
        answer: choice,
        correct,
        timestamp: Date.now(),
      });

      // 3초 후 퀴즈 카드 닫기
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setQuizState({ phase: 'idle' }));
      }, 3000);
    },
    [quizState, fadeAnim, addQuizRecord],
  );

  // ── 모의 퀴즈 (테스트용) ──────────────────

  const triggerTestQuiz = useCallback(() => {
    triggerQuiz(steps || 1000);
  }, [triggerQuiz, steps]);

  // ── 렌더 ─────────────────────────────────

  const goalReached = steps >= WALK_GOAL;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 헤더 ── */}
        <View style={styles.header}>
          <Text style={styles.title}>🚶 산책 모드</Text>
          <Text style={styles.subtitle}>걸으면서 뇌도 함께 운동해요</Text>
        </View>

        {/* ── 만보기 상태 배지 ── */}
        {pedometerStatus && !pedometerStatus.isAvailable && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={20} color="#E65100" />
            <Text style={styles.warningText}>
              {pedometerStatus.error ?? '만보기를 사용할 수 없습니다.'}
            </Text>
          </View>
        )}

        {/* ── 걸음 수 원형 표시기 ── */}
        <View style={styles.stepCircleWrapper}>
          <StepCircle
            steps={steps}
            goal={WALK_GOAL}
            progress={walkProgress}
          />
          {goalReached && (
            <View style={styles.goalBadge}>
              <Text style={styles.goalBadgeText}>🎉 목표 달성!</Text>
            </View>
          )}
        </View>

        {/* ── 걷기 시작/중지 버튼 ── */}
        <View style={styles.controlRow}>
          {!isTracking ? (
            <TouchableOpacity
              style={[
                styles.startBtn,
                !pedometerStatus?.isAvailable && styles.startBtnDisabled,
              ]}
              onPress={startTracking}
              disabled={!pedometerStatus?.isAvailable}
            >
              <Ionicons name="play" size={28} color="#FFF" />
              <Text style={styles.startBtnText}>산책 시작</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.stopBtn} onPress={stopTracking}>
              <Ionicons name="stop" size={28} color="#FFF" />
              <Text style={styles.startBtnText}>산책 중지</Text>
            </TouchableOpacity>
          )}

          {/* 테스트용: 퀴즈 강제 트리거 */}
          <TouchableOpacity
            style={styles.testBtn}
            onPress={triggerTestQuiz}
          >
            <Ionicons name="bulb-outline" size={22} color="#F57F17" />
            <Text style={styles.testBtnText}>퀴즈 테스트</Text>
          </TouchableOpacity>
        </View>

        {/* ── 마일스톤 안내 ── */}
        <View style={styles.milestoneCard}>
          <Text style={styles.milestoneTitle}>🏅 걷기 마일스톤</Text>
          {[1000, 2000, 3000, 4000, 5000].map((m) => (
            <View key={m} style={styles.milestoneRow}>
              <Text
                style={[
                  styles.milestoneDot,
                  steps >= m && styles.milestoneDotDone,
                ]}
              >
                {steps >= m ? '●' : '○'}
              </Text>
              <Text
                style={[
                  styles.milestoneLabel,
                  steps >= m && styles.milestoneLabelDone,
                ]}
              >
                {m.toLocaleString()}보
                {m < 5000 ? ' — 퀴즈 출제' : ' — 조경 아이템 보상! 🌳'}
              </Text>
            </View>
          ))}
        </View>

        {/* ── 퀴즈 카드 (오버레이 스타일) ── */}
        {quizState.phase !== 'idle' && (
          <Animated.View style={[styles.quizCard, { opacity: fadeAnim }]}>
            <Text style={styles.quizBadge}>🎯 이중 과제 퀴즈</Text>
            <Text style={styles.quizQuestion}>{quizState.quiz.question}</Text>

            {quizState.quiz.choices.map((choice) => {
              const isSelected =
                quizState.phase === 'answered' &&
                quizState.selected === choice;
              const isCorrect = choice === quizState.quiz.answer;
              const isAnswered = quizState.phase === 'answered';

              return (
                <ChoiceButton
                  key={choice}
                  choice={choice}
                  selected={isSelected}
                  correct={isAnswered && isCorrect}
                  answered={isAnswered}
                  onPress={() => selectAnswer(choice)}
                />
              );
            })}

            {/* 정답 힌트 (답변 후 표시) */}
            {quizState.phase === 'answered' && quizState.quiz.hint && (
              <View style={styles.hintBox}>
                <Text style={styles.hintText}>
                  💡 {quizState.quiz.hint}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* ── 오늘 퀴즈 기록 ── */}
        <QuizHistorySection />
      </ScrollView>
    </SafeAreaView>
  );
}

/** 오늘 퀴즈 기록 섹션 */
function QuizHistorySection() {
  const { quizHistory } = useGameStore();

  if (quizHistory.length === 0) return null;

  const correctCount = quizHistory.filter((q) => q.correct).length;

  return (
    <View style={styles.historySection}>
      <Text style={styles.historyTitle}>
        📝 오늘 퀴즈 기록 ({correctCount}/{quizHistory.length} 정답)
      </Text>
      {quizHistory.map((record, idx) => (
        <View key={idx} style={styles.historyRow}>
          <Text style={styles.historyIcon}>
            {record.correct ? '✅' : '❌'}
          </Text>
          <Text style={styles.historyQuestion} numberOfLines={1}>
            {record.question}
          </Text>
        </View>
      ))}
    </View>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  scrollContent: { padding: 20, paddingBottom: 40 },

  header: { marginBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#1B5E20' },
  subtitle: { fontSize: 16, color: '#555', marginTop: 4 },

  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 12,
  },
  warningText: { fontSize: 14, color: '#E65100', flex: 1 },

  stepCircleWrapper: { alignItems: 'center', marginBottom: 20 },
  goalBadge: {
    backgroundColor: '#2E7D32',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginTop: 8,
  },
  goalBadgeText: { fontSize: 15, fontWeight: '800', color: '#FFF' },

  controlRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
    justifyContent: 'center',
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 8,
    elevation: 3,
  },
  startBtnDisabled: { backgroundColor: '#BDBDBD' },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C62828',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 28,
    gap: 8,
    elevation: 3,
  },
  startBtnText: { fontSize: 18, fontWeight: '800', color: '#FFF' },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 6,
    borderWidth: 2,
    borderColor: '#F57F17',
  },
  testBtnText: { fontSize: 14, fontWeight: '700', color: '#F57F17' },

  milestoneCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  milestoneTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 12,
  },
  milestoneRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
  milestoneDot: { fontSize: 16, color: '#BDBDBD' },
  milestoneDotDone: { color: '#2E7D32' },
  milestoneLabel: { fontSize: 14, color: '#888' },
  milestoneLabelDone: { color: '#2E7D32', fontWeight: '700' },

  // 퀴즈 카드
  quizCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: '#42A5F5',
    elevation: 4,
    shadowColor: '#1976D2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  quizBadge: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1565C0',
    marginBottom: 10,
  },
  quizQuestion: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B2631',
    marginBottom: 16,
    lineHeight: 28,
  },
  hintBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
  },
  hintText: { fontSize: 14, color: '#2E7D32', lineHeight: 20 },

  // 히스토리
  historySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#333',
    marginBottom: 10,
  },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  historyIcon: { fontSize: 16 },
  historyQuestion: { fontSize: 14, color: '#555', flex: 1 },
});
