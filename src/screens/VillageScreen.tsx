/**
 * VillageScreen.tsx
 * 마을 메인 화면 — 이장님의 SilverVille 현황판
 *
 * 표시 내용:
 *  - 마을 이름 / 이장님 닉네임 / 레벨
 *  - 오늘 미션 현황 (식단 완료, 걸음 수, 바리스타 점수)
 *  - 자원 현황 (마법의 비료, 조경 아이템)
 *  - 동물 주민 목록
 *  - 연속 달성 일수 배지
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppStore } from '../../app/store/index';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// 동물 주민 데이터 (레벨에 따라 잠금 해제)
// ─────────────────────────────────────────────
const ALL_RESIDENTS = [
  { id: 'bear', emoji: '🐻', name: '곰돌이', unlockLevel: 1 },
  { id: 'rabbit', emoji: '🐰', name: '토순이', unlockLevel: 1 },
  { id: 'fox', emoji: '🦊', name: '여우댁', unlockLevel: 2 },
  { id: 'deer', emoji: '🦌', name: '사슴어른', unlockLevel: 3 },
  { id: 'hedgehog', emoji: '🦔', name: '고슴이', unlockLevel: 4 },
  { id: 'owl', emoji: '🦉', name: '부엉선생', unlockLevel: 5 },
  { id: 'squirrel', emoji: '🐿️', name: '다람이', unlockLevel: 6 },
  { id: 'beaver', emoji: '🦫', name: '비버씨', unlockLevel: 7 },
];

// ─────────────────────────────────────────────
// 미션 카드 컴포넌트
// ─────────────────────────────────────────────
interface MissionCardProps {
  icon: string;
  title: string;
  subtitle: string;
  done: boolean;
}

function MissionCard({ icon, title, subtitle, done }: MissionCardProps) {
  return (
    <View style={[styles.missionCard, done && styles.missionCardDone]}>
      <Text style={styles.missionIcon}>{icon}</Text>
      <View style={styles.missionInfo}>
        <Text style={styles.missionTitle}>{title}</Text>
        <Text style={styles.missionSubtitle}>{subtitle}</Text>
      </View>
      {/* 완료 배지 */}
      <View style={[styles.missionBadge, done ? styles.badgeDone : styles.badgePending]}>
        <Text style={styles.missionBadgeText}>{done ? '완료 ✓' : '진행 중'}</Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// 주민 카드 컴포넌트
// ─────────────────────────────────────────────
interface ResidentCardProps {
  emoji: string;
  name: string;
  unlocked: boolean;
}

function ResidentCard({ emoji, name, unlocked }: ResidentCardProps) {
  return (
    <View style={[styles.residentCard, !unlocked && styles.residentLocked]}>
      <Text style={[styles.residentEmoji, !unlocked && styles.residentLockedEmoji]}>
        {unlocked ? emoji : '🔒'}
      </Text>
      <Text style={[styles.residentName, !unlocked && styles.residentLockedText]}>
        {unlocked ? name : '잠금'}
      </Text>
    </View>
  );
}

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────
export default function VillageScreen() {
  const { player, village, mission } = useAppStore();

  // 경험치 진행률 (0~100%)
  const expProgress = useMemo(() => {
    const expToNextLevel = player.level * 100;
    return Math.min(100, Math.round((player.exp / expToNextLevel) * 100));
  }, [player.exp, player.level]);

  // 걸음 수 진행률
  const walkProgress = useMemo(
    () => Math.min(100, Math.round((mission.walkSteps / mission.walkGoal) * 100)),
    [mission.walkSteps, mission.walkGoal]
  );

  // 현재 레벨에서 해금된 주민 목록
  const residents = useMemo(
    () => ALL_RESIDENTS.filter((r) => r.unlockLevel <= player.level),
    [player.level]
  );

  // 오늘 인사말 (시간대별)
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return '좋은 아침이에요!';
    if (hour < 18) return '오후도 건강하게!';
    return '오늘 하루도 수고하셨어요!';
  }, []);

  // 연속 달성 배지 색상
  const streakColor =
    mission.streakDays >= 7
      ? '#FF6F00' // 7일 이상: 황금
      : mission.streakDays >= 3
      ? '#4CAF50' // 3일 이상: 초록
      : '#9E9E9E'; // 기본: 회색

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── 헤더: 마을 이름 + 인사말 ── */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.villageName}>🏡 {village.name}</Text>
            <Text style={styles.greeting}>
              {player.nickname}님, {greeting}
            </Text>
          </View>
          {/* 연속 달성 배지 */}
          {mission.streakDays > 0 && (
            <View style={[styles.streakBadge, { backgroundColor: streakColor }]}>
              <Text style={styles.streakText}>🔥 {mission.streakDays}일</Text>
            </View>
          )}
        </View>

        {/* ── 레벨 & 경험치 ── */}
        <View style={styles.levelCard}>
          <View style={styles.levelRow}>
            <Text style={styles.levelText}>Lv.{player.level} 이장님</Text>
            <Text style={styles.expText}>
              {player.exp} / {player.level * 100} EXP
            </Text>
          </View>
          {/* 경험치 바 */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${expProgress}%` }]} />
          </View>
        </View>

        {/* ── 자원 현황 ── */}
        <View style={styles.resourceRow}>
          <View style={styles.resourceBox}>
            <Text style={styles.resourceIcon}>🌿</Text>
            <Text style={styles.resourceValue}>{player.fertilizer}</Text>
            <Text style={styles.resourceLabel}>마법의 비료</Text>
          </View>
          <View style={styles.resourceDivider} />
          <View style={styles.resourceBox}>
            <Text style={styles.resourceIcon}>🌳</Text>
            <Text style={styles.resourceValue}>{player.landscapeItems}</Text>
            <Text style={styles.resourceLabel}>조경 아이템</Text>
          </View>
          <View style={styles.resourceDivider} />
          <View style={styles.resourceBox}>
            <Text style={styles.resourceIcon}>👥</Text>
            <Text style={styles.resourceValue}>{residents.length}</Text>
            <Text style={styles.resourceLabel}>주민 수</Text>
          </View>
        </View>

        {/* ── 오늘 미션 현황 ── */}
        <Text style={styles.sectionTitle}>오늘 미션</Text>

        <MissionCard
          icon="🥗"
          title="식단 촬영"
          subtitle="오늘 밥상을 AI로 분석하세요"
          done={mission.dietDone}
        />

        <MissionCard
          icon="🚶"
          title={`걷기 ${mission.walkSteps.toLocaleString()} / ${mission.walkGoal.toLocaleString()}보`}
          subtitle={
            walkProgress >= 100
              ? '목표 달성! 조경 아이템을 받았어요 🎉'
              : `${walkProgress}% 달성 — 조금만 더!`
          }
          done={walkProgress >= 100}
        />

        <MissionCard
          icon="☕"
          title="바리스타 게임"
          subtitle={
            mission.baristaScore !== null
              ? `점수: ${mission.baristaScore}점`
              : '카페에서 주문을 받아보세요'
          }
          done={mission.baristaScore !== null && mission.baristaScore > 0}
        />

        {/* 걸음 수 진행 바 (상세) */}
        <View style={styles.walkBarCard}>
          <View style={styles.walkBarHeader}>
            <Text style={styles.walkBarLabel}>오늘 걸음 수</Text>
            <Text style={styles.walkBarSteps}>
              {mission.walkSteps.toLocaleString()}보
            </Text>
          </View>
          <View style={styles.walkProgressBg}>
            <View
              style={[
                styles.walkProgressFill,
                { width: `${walkProgress}%` },
                walkProgress >= 100 && styles.walkProgressComplete,
              ]}
            />
          </View>
          <View style={styles.walkBarFooter}>
            <Text style={styles.walkBarFooterText}>0보</Text>
            <Text style={styles.walkBarFooterText}>
              목표 {mission.walkGoal.toLocaleString()}보
            </Text>
          </View>
        </View>

        {/* ── 동물 주민 목록 ── */}
        <Text style={styles.sectionTitle}>마을 주민들</Text>
        <View style={styles.residentsGrid}>
          {ALL_RESIDENTS.map((resident) => (
            <ResidentCard
              key={resident.id}
              emoji={resident.emoji}
              name={resident.name}
              unlocked={resident.unlockLevel <= player.level}
            />
          ))}
        </View>

        {/* 하단 여백 */}
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
    backgroundColor: '#F1F8E9', // 연한 초록 배경
  },

  // ── 헤더 ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: { flex: 1 },
  villageName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  greeting: {
    fontSize: 17,
    color: '#558B2F',
    marginTop: 4,
  },
  streakBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  streakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // ── 레벨 카드 ──
  levelCard: {
    marginHorizontal: 20,
    marginVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  levelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  expText: {
    fontSize: 16,
    color: '#757575',
  },
  progressBg: {
    height: 12,
    backgroundColor: '#E8F5E9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },

  // ── 자원 현황 ──
  resourceRow: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  resourceBox: {
    flex: 1,
    alignItems: 'center',
  },
  resourceDivider: {
    width: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 4,
  },
  resourceIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  resourceValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  resourceLabel: {
    fontSize: 13,
    color: '#757575',
    marginTop: 2,
    textAlign: 'center',
  },

  // ── 섹션 제목 ──
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1B5E20',
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
  },

  // ── 미션 카드 ──
  missionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderLeftWidth: 5,
    borderLeftColor: '#E0E0E0',
  },
  missionCardDone: {
    borderLeftColor: '#4CAF50',
    backgroundColor: '#F9FBF9',
  },
  missionIcon: {
    fontSize: 32,
    marginRight: 14,
  },
  missionInfo: {
    flex: 1,
  },
  missionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#212121',
  },
  missionSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 3,
  },
  missionBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    marginLeft: 8,
  },
  badgeDone: {
    backgroundColor: '#E8F5E9',
  },
  badgePending: {
    backgroundColor: '#FFF9C4',
  },
  missionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
  },

  // ── 걸음 수 진행 바 카드 ──
  walkBarCard: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  walkBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  walkBarLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#424242',
  },
  walkBarSteps: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1B5E20',
  },
  walkProgressBg: {
    height: 18,
    backgroundColor: '#E8F5E9',
    borderRadius: 9,
    overflow: 'hidden',
  },
  walkProgressFill: {
    height: '100%',
    backgroundColor: '#66BB6A',
    borderRadius: 9,
  },
  walkProgressComplete: {
    backgroundColor: '#2E7D32',
  },
  walkBarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  walkBarFooterText: {
    fontSize: 13,
    color: '#9E9E9E',
  },

  // ── 주민 그리드 ──
  residentsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 8,
  },
  residentCard: {
    width: (SCREEN_WIDTH - 48 - 24) / 4, // 4열 그리드
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  residentLocked: {
    backgroundColor: '#F5F5F5',
  },
  residentEmoji: {
    fontSize: 30,
    marginBottom: 6,
  },
  residentLockedEmoji: {
    opacity: 0.4,
  },
  residentName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#424242',
    textAlign: 'center',
  },
  residentLockedText: {
    color: '#BDBDBD',
  },
});
