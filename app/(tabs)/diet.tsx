/**
 * diet.tsx
 * AI 식단 카메라 화면
 * - expo-camera로 밥상 촬영
 * - MIND 식단 음식 인식 결과 표시 (서버 API 또는 로컬 분석)
 * - 비료 보상 지급
 * - 시니어 UX: 큰 촬영 버튼, 명확한 결과 카드
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';

import { useGameStore } from '../../src/store/gameStore';
import {
  calcMindScore,
  calcFertilizer,
  getMindFeedback,
} from '../../src/services/healthService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

interface AnalysisResult {
  mindScore: number;
  detectedFoods: string[];
  fertilizer: number;
  feedback: string;
}

type ScreenPhase =
  | 'camera'    // 카메라 프리뷰
  | 'capturing' // 촬영 중
  | 'analyzing' // AI 분석 중
  | 'result';   // 결과 표시

// ─────────────────────────────────────────────
// 더미 음식 인식 함수 (서버 미연결 시 fallback)
// ─────────────────────────────────────────────

/**
 * 실제 앱에서는 이미지를 서버로 전송해 AI 분석.
 * 여기서는 데모용으로 랜덤 MIND 식단 조합을 반환.
 */
async function mockAnalyzeImage(): Promise<string[]> {
  // 네트워크 지연 시뮬레이션
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const allFoods = [
    ['시금치', '연어', '두부', '현미'],
    ['브로콜리', '고등어', '호두', '두부'],
    ['케일', '닭가슴살', '블루베리', '아몬드'],
    ['상추', '참치', '청국장', '현미'],
    ['시금치', '호두', '딸기', '올리브오일'],
    ['배추', '연어', '견과류'],
    ['라면', '과자'], // 낮은 점수 케이스
  ];

  return allFoods[Math.floor(Math.random() * allFoods.length)];
}

// ─────────────────────────────────────────────
// 서브 컴포넌트
// ─────────────────────────────────────────────

/** MIND 식단 점수 바 */
function MindScoreBar({ score }: { score: number }) {
  const ratio = score / 10;
  let barColor = '#F44336';
  if (score >= 8) barColor = '#2E7D32';
  else if (score >= 6) barColor = '#4CAF50';
  else if (score >= 4) barColor = '#FFC107';
  else if (score >= 2) barColor = '#FF9800';

  return (
    <View style={scoreBarStyles.container}>
      <View style={scoreBarStyles.track}>
        <View
          style={[
            scoreBarStyles.fill,
            { width: `${ratio * 100}%` as any, backgroundColor: barColor },
          ]}
        />
      </View>
      <Text style={[scoreBarStyles.score, { color: barColor }]}>
        {score.toFixed(1)} / 10
      </Text>
    </View>
  );
}

const scoreBarStyles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  track: {
    flex: 1,
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 7,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 7 },
  score: { fontSize: 18, fontWeight: '800', minWidth: 70, textAlign: 'right' },
});

/** 인식 음식 칩 */
function FoodChip({ food, isMind }: { food: string; isMind: boolean }) {
  return (
    <View
      style={[foodChipStyles.chip, isMind && foodChipStyles.chipMind]}
    >
      <Text style={[foodChipStyles.text, isMind && foodChipStyles.textMind]}>
        {isMind ? '✅ ' : '⚠️ '}
        {food}
      </Text>
    </View>
  );
}

const MIND_FOODS_SET = new Set([
  '시금치', '케일', '브로콜리', '상추', '배추', '미나리', '쑥갓',
  '블루베리', '딸기', '라즈베리', '호두', '아몬드', '견과류',
  '연어', '고등어', '참치', '생선', '두부', '콩', '청국장',
  '현미', '통밀', '올리브오일', '닭가슴살', '닭',
]);

const foodChipStyles = StyleSheet.create({
  chip: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFEBEE',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  chipMind: {
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  text: { fontSize: 14, fontWeight: '700', color: '#C62828' },
  textMind: { color: '#2E7D32' },
});

/** 비료 보상 애니메이션 카드 */
function FertilizerReward({ count }: { count: number }) {
  if (count === 0) {
    return (
      <View style={rewardStyles.zero}>
        <Text style={rewardStyles.zeroText}>
          💡 다음엔 녹황색 채소, 생선, 견과류를 더 드셔보세요!
        </Text>
      </View>
    );
  }

  return (
    <View style={rewardStyles.container}>
      <Text style={rewardStyles.emoji}>🌱</Text>
      <View>
        <Text style={rewardStyles.label}>마법의 비료 획득!</Text>
        <Text style={rewardStyles.count}>+{count}개</Text>
      </View>
    </View>
  );
}

const rewardStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 2,
    borderColor: '#A5D6A7',
  },
  emoji: { fontSize: 40 },
  label: { fontSize: 15, color: '#2E7D32', fontWeight: '700' },
  count: { fontSize: 28, fontWeight: '800', color: '#1B5E20' },
  zero: {
    backgroundColor: '#FFF3E0',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  zeroText: { fontSize: 14, color: '#E65100', lineHeight: 20 },
});

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────

export default function DietScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<ScreenPhase>('camera');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [cameraFacing] = useState<CameraType>('back');

  const cameraRef = useRef<CameraView>(null);

  const { fertilizer, addFertilizer, setDietScore } = useGameStore();

  // ── 카메라 권한 요청 ──────────────────────

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, []);

  // ── 촬영 ─────────────────────────────────

  const takePicture = useCallback(async () => {
    if (!cameraRef.current || phase !== 'camera') return;

    setPhase('capturing');

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.7,
        base64: false,
        skipProcessing: true,
      });

      if (!photo) throw new Error('촬영 실패');

      setCapturedUri(photo.uri);
      setPhase('analyzing');

      // AI 분석 (실제: photo.base64를 서버로 전송)
      const detectedFoods = await mockAnalyzeImage();
      const mindScore = calcMindScore(detectedFoods);
      const fertilizerGain = calcFertilizer(mindScore);
      const feedback = getMindFeedback(mindScore);

      // 상태 업데이트
      setDietScore(mindScore, detectedFoods);
      addFertilizer(fertilizerGain);

      setResult({ mindScore, detectedFoods, fertilizer: fertilizerGain, feedback });
      setPhase('result');
    } catch (err) {
      setPhase('camera');
      Alert.alert('오류', '촬영 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  }, [phase, setDietScore, addFertilizer]);

  // ── 다시 찍기 ─────────────────────────────

  const retake = useCallback(() => {
    setResult(null);
    setCapturedUri(null);
    setPhase('camera');
  }, []);

  // ─────────────────────────────────────────

  // 권한 미허용
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#E65100" />
          <Text style={styles.permissionText}>카메라 권한 확인 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="camera-outline" size={64} color="#BDBDBD" />
          <Text style={styles.permissionText}>
            식단 촬영을 위해{'\n'}카메라 권한이 필요합니다.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>권한 허용하기</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── 카메라 / 분석 중 화면 ─────────────────

  if (phase === 'camera' || phase === 'capturing' || phase === 'analyzing') {
    return (
      <SafeAreaView style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          <Text style={styles.title}>🥗 식단 카메라</Text>
          <Text style={styles.subtitle}>오늘 밥상을 카메라로 찍어보세요!</Text>
        </View>

        {/* 안내 텍스트 */}
        <View style={styles.guideBox}>
          <Text style={styles.guideText}>
            💡 MIND 식단 음식: 시금치, 연어, 두부, 견과류, 블루베리, 현미 등
          </Text>
        </View>

        {/* 카메라 프리뷰 */}
        <View style={styles.cameraWrapper}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={cameraFacing}
          >
            {/* 촬영 가이드 오버레이 */}
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraFrame} />
            </View>
          </CameraView>
        </View>

        {/* 분석 중 오버레이 */}
        {(phase === 'capturing' || phase === 'analyzing') && (
          <View style={styles.analyzingOverlay}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.analyzingText}>
              {phase === 'capturing'
                ? '📸 촬영 중...'
                : '🔍 AI가 식단을 분석 중이에요...'}
            </Text>
          </View>
        )}

        {/* 촬영 버튼 */}
        <View style={styles.shutterRow}>
          <TouchableOpacity
            style={[
              styles.shutterBtn,
              phase !== 'camera' && styles.shutterBtnDisabled,
            ]}
            onPress={takePicture}
            disabled={phase !== 'camera'}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
          <Text style={styles.shutterHint}>밥상 촬영</Text>
        </View>

        {/* 현재 비료 보유량 */}
        <View style={styles.fertilizerStatus}>
          <Text style={styles.fertilizerStatusText}>
            🌱 현재 비료: {fertilizer}개
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── 결과 화면 ─────────────────────────────

  if (phase === 'result' && result) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.resultScroll}
        >
          {/* 헤더 */}
          <View style={styles.header}>
            <Text style={styles.title}>🥗 식단 분석 결과</Text>
          </View>

          {/* 촬영된 이미지 썸네일 */}
          {capturedUri && (
            <Image
              source={{ uri: capturedUri }}
              style={styles.capturedImage}
              resizeMode="cover"
            />
          )}

          {/* MIND 점수 */}
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>🧠 MIND 식단 점수</Text>
            <MindScoreBar score={result.mindScore} />
            <Text style={styles.feedbackText}>{result.feedback}</Text>
          </View>

          {/* 인식된 음식 */}
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>
              🔍 인식된 음식 ({result.detectedFoods.length}가지)
            </Text>
            <View style={styles.foodChipRow}>
              {result.detectedFoods.map((food) => (
                <FoodChip
                  key={food}
                  food={food}
                  isMind={MIND_FOODS_SET.has(food)}
                />
              ))}
            </View>
          </View>

          {/* 비료 보상 */}
          <View style={styles.resultCard}>
            <Text style={styles.resultCardTitle}>🌱 비료 보상</Text>
            <FertilizerReward count={result.fertilizer} />
          </View>

          {/* MIND 식단 팁 */}
          <View style={styles.tipCard}>
            <Text style={styles.tipTitle}>📚 MIND 식단이란?</Text>
            <Text style={styles.tipText}>
              지중해 식단과 DASH 식단을 결합한 뇌 건강 식단이에요.
              녹황색 채소, 생선, 견과류, 베리류를 자주 드시면 치매 위험을 최대 53% 줄일 수 있어요!
            </Text>
          </View>

          {/* 다시 찍기 버튼 */}
          <TouchableOpacity style={styles.retakeBtn} onPress={retake}>
            <Ionicons name="camera" size={22} color="#FFF" />
            <Text style={styles.retakeBtnText}>다른 식사 촬영하기</Text>
          </TouchableOpacity>

          {/* 현재 비료 보유량 */}
          <View style={styles.fertilizerStatus}>
            <Text style={styles.fertilizerStatusText}>
              🌱 총 비료: {fertilizer}개 보유 중
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return null;
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    padding: 30,
  },

  header: { padding: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#E65100' },
  subtitle: { fontSize: 16, color: '#666', marginTop: 4 },

  guideBox: {
    backgroundColor: '#FFF3E0',
    marginHorizontal: 20,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  guideText: { fontSize: 13, color: '#E65100', lineHeight: 18 },

  // 카메라
  cameraWrapper: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  camera: { flex: 1 },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFrame: {
    width: SCREEN_WIDTH * 0.7,
    height: SCREEN_WIDTH * 0.7,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
  },

  // 분석 오버레이
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    zIndex: 100,
  },
  analyzingText: {
    fontSize: 18,
    color: '#FFF',
    fontWeight: '700',
  },

  // 셔터 버튼
  shutterRow: { alignItems: 'center', paddingVertical: 20 },
  shutterBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#E65100',
    elevation: 5,
  },
  shutterBtnDisabled: { opacity: 0.4 },
  shutterInner: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#E65100',
  },
  shutterHint: { fontSize: 14, color: '#888', marginTop: 8, fontWeight: '600' },

  // 비료 현황
  fertilizerStatus: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  fertilizerStatusText: { fontSize: 14, color: '#666', fontWeight: '600' },

  // 권한 화면
  permissionText: {
    fontSize: 18,
    color: '#555',
    textAlign: 'center',
    lineHeight: 26,
    fontWeight: '600',
  },
  permBtn: {
    backgroundColor: '#E65100',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  permBtnText: { fontSize: 16, fontWeight: '800', color: '#FFF' },

  // 결과 화면
  resultScroll: { padding: 20, paddingBottom: 40 },
  capturedImage: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  resultCardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#333',
    marginBottom: 12,
  },
  feedbackText: {
    fontSize: 15,
    color: '#555',
    marginTop: 10,
    lineHeight: 22,
  },
  foodChipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },

  tipCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#A5D6A7',
  },
  tipTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E7D32',
    marginBottom: 8,
  },
  tipText: { fontSize: 13, color: '#444', lineHeight: 20 },

  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E65100',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
    marginBottom: 12,
    elevation: 3,
  },
  retakeBtnText: { fontSize: 17, fontWeight: '800', color: '#FFF' },
});
