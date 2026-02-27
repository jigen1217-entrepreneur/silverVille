/**
 * village.tsx
 * 마을 메인 화면
 * - 마을 레벨 및 경험치 바
 * - 동물 주민 목록 (이모지 그리드)
 * - 오늘의 건강 요약 (걸음 수, 식단 점수)
 * - 마법의 비료 & 조경 아이템 재화 표시
 * - 마을 발전 미션 카드
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useGameStore, selectHealthScore, selectWalkProgress } from '../../src/store/gameStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// 상수 — 기본 건물 목록
// ─────────────────────────────────────────────
const DEFAULT_BUILDINGS = [
  { id: 'town_hall', emoji: '🏛️', name: '마을회관', unlockLevel: 1 },
  { id: 'cafe',      emoji: '☕', name: '카페',     unlockLevel: 2 },
  { id: 'farm',      emoji: '🌾', name: '농장',     unlockLevel: 3 },
  { id: 'garden',    emoji: '🌸', name: '정원',     unlockLevel: 4 },
  { id: 'fountain',  emoji: '⛲', name: '분수',     unlockLevel: 5 },
];

/** 마을 레벨별 배경 색상 */
const LEVEL_COLORS: Record<number, string> = {
  1: '#E8F5E9',
  2: '#DCEDC8',
  3: '#C8E6C9',
  4: '#A5D6A7',
  5: '#81C784',
};

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

/** 경험치 진행 바 */
function ExpBar({ current, max }: { current: number; max: number }) {
  const ratio = Math.min(current / max, 1);
  return (
    <View style={expBarStyles.container}>
      <View style={[expBarStyles.fill, { width: `${ratio * 100}%` as any }]} />
    </View>
  );
}

const expBarStyles = StyleSheet.create({
  container: {
    height: 12,
    backgroundColor: '#C8E6C9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: '#2E7D32',
    borderRadius: 6,
  },
});

/** 재화 칩 (비료 / 조경 아이템) */
function ResourceChip({
  emoji,
  count,
  label,
}: {
  emoji: string;
  count: number;
  label: string;
}) {
  return (
    <View style={chipStyles.container}>
      <Text style={chipStyles.emoji}>{emoji}</Text>
      <Text style={chipStyles.count}>{count}</Text>
      <Text style={chipStyles.label}>{label}</Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emoji: { fontSize: 20 },
  count: { fontSize: 18, fontWeight: '800', color: '#2E7D32' },
  label: { fontSize: 13, color: '#666', fontWeight: '600' },
});

/** 건강 스탯 카드 */
function HealthCard({
  icon,
  label,
  value,
  unit,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  unit: string;
  color: string;
}) {
  return (
    <View style={[healthCardStyles.container, { borderLeftColor: color }]}>
      <Text style={healthCardStyles.icon}>{icon}</Text>
      <View>
        <Text style={healthCardStyles.label}>{label}</Text>
        <Text style={[healthCardStyles.value, { color }]}>
          {value.toLocaleString()}
          <Text style={healthCardStyles.unit}> {unit}</Text>
        </Text>
      </View>
    </View>
  );
}

const healthCardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    flex: 1,
    gap: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  icon: { fontSize: 28 },
  label: { fontSize: 12, color: '#888', fontWeight: '600' },
  value: { fontSize: 22, fontWeight: '800' },
  unit: { fontSize: 13, fontWeight: '500' },
});

/** 동물 주민 카드 */
function ResidentCard({ emoji, name }: { emoji: string; name: string }) {
  return (
    <View style={residentStyles.card}>
      <Text style={residentStyles.emoji}>{emoji}</Text>
      <Text style={residentStyles.name}>{name}</Text>
    </View>
  );
}

const residentStyles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    width: (SCREEN_WIDTH - 60) / 3,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emoji: { fontSize: 36 },
  name: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 4 },
});

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────

export default function VillageScreen() {
  const {
    steps,
    walkGoal,
    dietScore,
    villageLevel,
    villageExp,
    residents,
    fertilizer,
    landscapeItems,
    streakDays,
  } = useGameStore();

  // 셀렉터로 파생 값 계산
  const healthScore = useGameStore(selectHealthScore);
  const walkProgress = useGameStore(selectWalkProgress);

  // 현재 레벨 경험치 max (다음 레벨 기준)
  const levelExpMax = useMemo(() => {
    const thresholds: Record<number, number> = {
      1: 100, 2: 250, 3: 500, 4: 900, 5: 1500,
      6: 2400, 7: 3700, 8: 5500, 9: 8000, 10: 9999,
    };
    return thresholds[villageLevel] ?? 100;
  }, [villageLevel]);

  // 해금된 건물 목록
  const unlockedBuildings = DEFAULT_BUILDINGS.filter(
    (b) => b.unlockLevel <= villageLevel,
  );

  // 마을 배경 색상
  const bgColor = LEVEL_COLORS[Math.min(villageLevel, 5)] ?? '#E8F5E9';

  // 빈 마을 (주민 없음) 여부
  const isEmpty = residents.length === 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── 헤더: 마을 이름 및 레벨 ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.villageName}>🏡 나의 실버빌</Text>
            <Text style={styles.levelBadge}>마을 레벨 {villageLevel}</Text>
          </View>
          {/* 연속 달성 스트릭 */}
          {streakDays > 0 && (
            <View style={styles.streakBadge}>
              <Text style={styles.streakText}>🔥 {streakDays}일 연속</Text>
            </View>
          )}
        </View>

        {/* ── 경험치 바 ── */}
        <View style={styles.expSection}>
          <ExpBar current={villageExp} max={levelExpMax} />
          <Text style={styles.expText}>
            {villageExp} / {levelExpMax} XP
          </Text>
        </View>

        {/* ── 재화 현황 ── */}
        <View style={styles.resourceRow}>
          <ResourceChip emoji="🌱" count={fertilizer} label="비료" />
          <ResourceChip emoji="🌳" count={landscapeItems} label="조경" />
          <ResourceChip emoji="🏅" count={healthScore} label="건강점수" />
        </View>

        {/* ── 마을 풍경 (건물 이모지 그리드) ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🏘️ 마을 풍경</Text>
          <View style={styles.buildingRow}>
            {unlockedBuildings.map((b) => (
              <View key={b.id} style={styles.buildingItem}>
                <Text style={styles.buildingEmoji}>{b.emoji}</Text>
                <Text style={styles.buildingName}>{b.name}</Text>
              </View>
            ))}
            {/* 다음 해금 미리보기 */}
            {villageLevel < 5 && (
              <View style={[styles.buildingItem, styles.buildingLocked]}>
                <Text style={styles.buildingEmoji}>🔒</Text>
                <Text style={styles.buildingName}>
                  Lv.{villageLevel + 1} 해금
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* ── 동물 주민 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            🐾 동물 주민 ({residents.length}마리)
          </Text>
          {isEmpty ? (
            <View style={styles.emptyResidents}>
              <Text style={styles.emptyEmoji}>🏠</Text>
              <Text style={styles.emptyText}>
                아직 주민이 없어요.{'\n'}걷기와 식단으로 마을을 발전시키면{'\n'}귀여운 동물들이 이사 와요!
              </Text>
            </View>
          ) : (
            <View style={styles.residentGrid}>
              {residents.map((r) => (
                <ResidentCard key={r.id} emoji={r.emoji} name={r.name} />
              ))}
            </View>
          )}
        </View>

        {/* ── 오늘의 건강 현황 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 오늘의 건강 현황</Text>
          <View style={styles.healthRow}>
            <HealthCard
              icon="👟"
              label="오늘 걸음"
              value={steps}
              unit="보"
              color="#1976D2"
            />
            <HealthCard
              icon="🥗"
              label="식단 점수"
              value={dietScore}
              unit="점"
              color="#E65100"
            />
          </View>

          {/* 걷기 목표 진행 바 */}
          <View style={styles.walkProgressCard}>
            <View style={styles.walkProgressHeader}>
              <Text style={styles.walkProgressLabel}>
                🚶 걷기 목표 ({walkGoal.toLocaleString()}보)
              </Text>
              <Text style={styles.walkProgressPct}>{walkProgress}%</Text>
            </View>
            <View style={styles.walkProgressBar}>
              <View
                style={[
                  styles.walkProgressFill,
                  { width: `${walkProgress}%` as any },
                ]}
              />
            </View>
            <Text style={styles.walkProgressSub}>
              {steps >= walkGoal
                ? '🎉 오늘 목표를 달성했어요!'
                : `${(walkGoal - steps).toLocaleString()}보 더 걸으면 조경 아이템을 받아요!`}
            </Text>
          </View>
        </View>

        {/* ── 오늘 할 일 미션 카드 ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>✅ 오늘 할 일</Text>
          <MissionCard
            done={steps >= walkGoal}
            icon="🚶"
            label={`${walkGoal.toLocaleString()}보 걷기`}
            reward="조경 아이템 +1"
          />
          <MissionCard
            done={dietScore >= 4}
            icon="🥗"
            label="MIND 식단 촬영"
            reward="마법의 비료 +2"
          />
          <MissionCard
            done={false /* 카페 완료 여부는 cafeScore로 판별 가능 */}
            icon="☕"
            label="카페 바리스타 게임"
            reward="마을 경험치 +20"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/** 미션 카드 */
function MissionCard({
  done,
  icon,
  label,
  reward,
}: {
  done: boolean;
  icon: string;
  label: string;
  reward: string;
}) {
  return (
    <View style={[missionStyles.card, done && missionStyles.cardDone]}>
      <Text style={missionStyles.icon}>{icon}</Text>
      <View style={missionStyles.textCol}>
        <Text
          style={[missionStyles.label, done && missionStyles.labelDone]}
        >
          {label}
        </Text>
        <Text style={missionStyles.reward}>보상: {reward}</Text>
      </View>
      <Text style={missionStyles.check}>{done ? '✅' : '⬜'}</Text>
    </View>
  );
}

const missionStyles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    gap: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  cardDone: { backgroundColor: '#F1F8E9', opacity: 0.85 },
  icon: { fontSize: 26 },
  textCol: { flex: 1 },
  label: { fontSize: 16, fontWeight: '700', color: '#333' },
  labelDone: { textDecorationLine: 'line-through', color: '#888' },
  reward: { fontSize: 13, color: '#666', marginTop: 2 },
  check: { fontSize: 22 },
});

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  // 헤더
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  villageName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1B5E20',
  },
  levelBadge: {
    fontSize: 15,
    color: '#388E3C',
    fontWeight: '600',
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: '#FF6F00',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakText: { fontSize: 14, fontWeight: '800', color: '#FFF' },

  // 경험치
  expSection: { marginBottom: 16 },
  expText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 4,
  },

  // 재화
  resourceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },

  // 섹션
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 12,
  },

  // 건물
  buildingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  buildingItem: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    minWidth: 70,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buildingLocked: { opacity: 0.45 },
  buildingEmoji: { fontSize: 32 },
  buildingName: { fontSize: 11, color: '#555', fontWeight: '600', marginTop: 4 },

  // 주민
  emptyResidents: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
  },
  emptyEmoji: { fontSize: 48 },
  emptyText: {
    fontSize: 15,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
  },
  residentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },

  // 건강
  healthRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  walkProgressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  walkProgressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  walkProgressLabel: { fontSize: 15, fontWeight: '700', color: '#333' },
  walkProgressPct: { fontSize: 15, fontWeight: '800', color: '#1976D2' },
  walkProgressBar: {
    height: 10,
    backgroundColor: '#E3F2FD',
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  walkProgressFill: {
    height: '100%',
    backgroundColor: '#1976D2',
    borderRadius: 5,
  },
  walkProgressSub: { fontSize: 13, color: '#666' },
});
