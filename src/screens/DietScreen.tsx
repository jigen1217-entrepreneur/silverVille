/**
 * DietScreen.tsx
 * AI 식단 카메라 & 마법의 농장
 *
 * 게임 흐름:
 *  1. 카메라 권한 요청
 *  2. CameraView로 식사 프리뷰
 *  3. [찰칵!] 버튼 → 사진 촬영
 *  4. 촬영된 사진 미리보기
 *  5. [AI 분석] 버튼 → dietApi.analyze() 호출
 *  6. MIND 식단 스코어 + 감지된 음식 목록 표시
 *  7. 마법의 비료 보상 획득
 *  8. [마을에 비료 주기] → store 업데이트 + dietApi.record()
 *
 * 논문 근거: MIND 식단(녹황색 채소·생선·견과류) → 인지 기능 보호
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAppStore } from '../../app/store/index';
import { SeniorButton } from '../../app/components/ui/SeniorButton';
import {
  analyzeFood,
  recordDiet,
  calcFertilizer,
  getMindFeedback,
  type DietAnalysisResult,
} from '../services/healthService';

// ─────────────────────────────────────────────
// 목 분석 결과 (API 미연동 시 사용)
// ─────────────────────────────────────────────
const MOCK_RESULT: DietAnalysisResult = {
  mindScore: 7.5,
  detectedFoods: ['시금치', '연어', '호두', '현미', '브로콜리'],
  fertilizer: 3,
  feedback: '👍 좋아요! 채소나 생선을 조금 더 드시면 더욱 좋아요.',
};

// ─────────────────────────────────────────────
// MIND 스코어 색상 반환
// ─────────────────────────────────────────────
function getScoreColor(score: number): string {
  if (score >= 8) return '#2E7D32'; // 최우수: 진한 초록
  if (score >= 6) return '#388E3C'; // 우수: 초록
  if (score >= 4) return '#F57F17'; // 보통: 주황
  return '#C62828';                 // 미흡: 빨강
}

// ─────────────────────────────────────────────
// 음식 칩 컴포넌트
// ─────────────────────────────────────────────
function FoodChip({ name }: { name: string }) {
  const isMind =
    ['시금치', '케일', '브로콜리', '상추', '블루베리', '딸기', '호두', '아몬드',
      '연어', '고등어', '참치', '두부', '콩', '현미', '올리브오일'].includes(name);
  return (
    <View style={[chipStyles.chip, isMind ? chipStyles.mindChip : chipStyles.normalChip]}>
      <Text style={[chipStyles.text, isMind ? chipStyles.mindText : chipStyles.normalText]}>
        {isMind ? '✓ ' : ''}{name}
      </Text>
    </View>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
  },
  mindChip: {
    backgroundColor: '#C8E6C9',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  normalChip: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  text: { fontSize: 15, fontWeight: '600' },
  mindText: { color: '#1B5E20' },
  normalText: { color: '#616161' },
});

// ─────────────────────────────────────────────
// 메인 화면
// ─────────────────────────────────────────────

// 화면 단계
type DietPhase =
  | 'camera'    // 카메라 프리뷰
  | 'preview'   // 촬영된 사진 미리보기
  | 'analyzing' // AI 분석 중
  | 'result'    // 분석 결과 표시
  | 'done';     // 비료 지급 완료

export default function DietScreen() {
  const { player, mission, setPlayer, setMission } = useAppStore();

  // 카메라 권한 훅 (expo-camera ~16)
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraView>(null);

  // 화면 상태
  const [phase, setPhase] = useState<DietPhase>('camera');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [result, setResult] = useState<DietAnalysisResult | null>(null);
  const [isFlashOn, setIsFlashOn] = useState(false);

  // ── 권한 미부여 화면 ──
  if (!permission) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permCenter}>
          <ActivityIndicator size="large" color="#E65100" />
          <Text style={styles.permText}>카메라 권한 확인 중...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permCenter}>
          <Text style={styles.permEmoji}>📷</Text>
          <Text style={styles.permTitle}>카메라 권한이 필요해요</Text>
          <Text style={styles.permDesc}>
            밥상을 촬영해서{'\n'}MIND 식단 점수를 받아보세요!
          </Text>
          <SeniorButton
            label="카메라 허용하기"
            onPress={requestPermission}
            style={{ marginTop: 24, minWidth: 220 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── 사진 촬영 ──
  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: 0.7, // 시니어 기기 성능 고려 품질 절충
      });
      if (!photo) return;
      setCapturedUri(photo.uri);
      setCapturedBase64(photo.base64 ?? null);
      setPhase('preview');
    } catch (e) {
      Alert.alert('오류', '사진 촬영에 실패했어요. 다시 시도해주세요.');
    }
  }, []);

  // ── AI 분석 ──
  const handleAnalyze = useCallback(async () => {
    setPhase('analyzing');
    try {
      const analysisResult = await analyzeFood(capturedBase64 ?? '');
      setResult(analysisResult);
    } catch {
      // API 실패 시 목 데이터로 대체 (개발/오프라인 환경)
      setResult(MOCK_RESULT);
    }
    setPhase('result');
  }, [capturedBase64]);

  // ── 비료 마을에 주기 ──
  const handleApplyFertilizer = useCallback(async () => {
    if (!result) return;
    const { mindScore, detectedFoods, fertilizer } = result;

    // store 업데이트
    setPlayer({ fertilizer: player.fertilizer + fertilizer });
    setMission({ dietDone: true });

    // 서버 기록 (백그라운드)
    recordDiet(mindScore, detectedFoods, fertilizer).catch(() => null);

    setPhase('done');
  }, [result, player.fertilizer]);

  // ── 다시 찍기 ──
  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setCapturedBase64(null);
    setResult(null);
    setPhase('camera');
  }, []);

  // ─────────────────────────────────────────────
  // 렌더링
  // ─────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>

      {/* ── 헤더 ── */}
      <View style={styles.header}>
        <Text style={styles.title}>🥗 식단 카메라</Text>
        <Text style={styles.subtitle}>오늘 밥상을 찍어 MIND 점수를 받아보세요</Text>
      </View>

      {/* ── 카메라 프리뷰 ── */}
      {phase === 'camera' && (
        <View style={styles.cameraSection}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            flash={isFlashOn ? 'on' : 'off'}
          >
            {/* 촬영 가이드 오버레이 */}
            <View style={styles.cameraOverlay}>
              <View style={styles.cameraGuideBox} />
              <Text style={styles.cameraGuideText}>밥상 전체가 들어오게 찍어주세요</Text>
            </View>
          </CameraView>

          {/* 카메라 컨트롤 */}
          <View style={styles.cameraControls}>
            {/* 플래시 토글 */}
            <TouchableOpacity
              style={styles.flashBtn}
              onPress={() => setIsFlashOn((v) => !v)}
            >
              <Text style={styles.flashText}>{isFlashOn ? '⚡ ON' : '⚡ OFF'}</Text>
            </TouchableOpacity>

            {/* 촬영 버튼 */}
            <TouchableOpacity style={styles.captureBtn} onPress={handleCapture} activeOpacity={0.8}>
              <View style={styles.captureBtnInner} />
            </TouchableOpacity>

            {/* 이미 분석 완료된 경우 배지 */}
            {mission.dietDone && (
              <View style={styles.doneBadge}>
                <Text style={styles.doneBadgeText}>✓ 완료</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ── 사진 미리보기 ── */}
      {phase === 'preview' && capturedUri && (
        <ScrollView style={styles.flex}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.previewActions}>
            <SeniorButton
              label="다시 찍기 📷"
              onPress={handleRetake}
              variant="secondary"
              style={styles.halfBtn}
            />
            <SeniorButton
              label="AI 분석하기 🔍"
              onPress={handleAnalyze}
              style={styles.halfBtn}
            />
          </View>
        </ScrollView>
      )}

      {/* ── 분석 중 ── */}
      {phase === 'analyzing' && (
        <View style={styles.analyzingSection}>
          <ActivityIndicator size="large" color="#E65100" />
          <Text style={styles.analyzingText}>AI가 밥상을 분석하고 있어요...</Text>
          <Text style={styles.analyzingSubText}>MIND 식단 성분을 확인 중 🔍</Text>
        </View>
      )}

      {/* ── 분석 결과 ── */}
      {(phase === 'result' || phase === 'done') && result && (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.flex}>

          {/* 촬영 사진 썸네일 */}
          {capturedUri && (
            <Image
              source={{ uri: capturedUri }}
              style={styles.resultThumb}
              resizeMode="cover"
            />
          )}

          {/* MIND 스코어 카드 */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>MIND 식단 점수</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(result.mindScore) }]}>
              {result.mindScore.toFixed(1)}
            </Text>
            <Text style={styles.scoreMax}>/ 10점</Text>

            {/* 점수 바 */}
            <View style={styles.scoreBg}>
              <View
                style={[
                  styles.scoreFill,
                  {
                    width: `${(result.mindScore / 10) * 100}%`,
                    backgroundColor: getScoreColor(result.mindScore),
                  },
                ]}
              />
            </View>

            {/* 피드백 메시지 */}
            <Text style={styles.feedbackText}>{result.feedback}</Text>
          </View>

          {/* 감지된 음식 목록 */}
          <View style={styles.foodsCard}>
            <Text style={styles.foodsTitle}>감지된 음식</Text>
            <View style={styles.foodChips}>
              {result.detectedFoods.map((food) => (
                <FoodChip key={food} name={food} />
              ))}
            </View>
            <Text style={styles.mindLegend}>✓ 초록 표시 = MIND 식단 해당 식품</Text>
          </View>

          {/* 비료 보상 카드 */}
          <View style={styles.rewardCard}>
            <Text style={styles.rewardEmoji}>🌿</Text>
            <Text style={styles.rewardTitle}>마법의 비료 획득!</Text>
            <Text style={styles.rewardAmount}>+{result.fertilizer}개</Text>
            <Text style={styles.rewardDesc}>마을 농장에 뿌리면 작물이 자라요</Text>
          </View>

          {/* 버튼 */}
          {phase === 'result' && (
            <View style={styles.resultActions}>
              <SeniorButton
                label="다시 찍기"
                onPress={handleRetake}
                variant="secondary"
                style={styles.halfBtn}
              />
              <SeniorButton
                label={`마을에 비료 주기 🌿×${result.fertilizer}`}
                onPress={handleApplyFertilizer}
                style={styles.halfBtn}
              />
            </View>
          )}

          {/* 완료 상태 */}
          {phase === 'done' && (
            <View style={styles.doneSection}>
              <Text style={styles.doneText}>🎉 비료를 마을 농장에 뿌렸어요!</Text>
              <Text style={styles.doneSubText}>
                현재 보유 비료: {player.fertilizer}개
              </Text>
              <SeniorButton
                label="다시 찍기 📷"
                onPress={handleRetake}
                variant="secondary"
                style={{ marginTop: 12 }}
              />
            </View>
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────
// 스타일
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E1',
  },
  flex: { flex: 1 },

  // 헤더
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#E65100',
  },
  subtitle: {
    fontSize: 16,
    color: '#795548',
    marginTop: 4,
  },

  // 권한
  permCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  permEmoji: { fontSize: 64, marginBottom: 16 },
  permTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 12,
    textAlign: 'center',
  },
  permDesc: {
    fontSize: 17,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 26,
  },
  permText: { fontSize: 17, color: '#757575', marginTop: 12 },

  // 카메라
  cameraSection: {
    flex: 1,
  },
  camera: {
    flex: 1,
    minHeight: 340,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraGuideBox: {
    width: 280,
    height: 200,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    borderStyle: 'dashed',
  },
  cameraGuideText: {
    marginTop: 14,
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cameraControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFF8E1',
  },
  flashBtn: {
    position: 'absolute',
    left: 24,
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  flashText: { fontSize: 16, fontWeight: '600', color: '#424242' },
  captureBtn: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFFFFF',
    borderWidth: 4,
    borderColor: '#E65100',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E65100',
  },
  doneBadge: {
    position: 'absolute',
    right: 24,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  doneBadgeText: { fontSize: 15, color: '#FFFFFF', fontWeight: 'bold' },

  // 미리보기
  previewImage: {
    width: '100%',
    height: 300,
  },
  previewActions: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },

  // 분석 중
  analyzingSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  analyzingText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#E65100',
  },
  analyzingSubText: {
    fontSize: 16,
    color: '#8D6E63',
  },

  // 결과 썸네일
  resultThumb: {
    width: '100%',
    height: 180,
  },

  // MIND 스코어 카드
  scoreCard: {
    margin: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scoreLabel: {
    fontSize: 16,
    color: '#795548',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: 'bold',
    lineHeight: 72,
  },
  scoreMax: {
    fontSize: 18,
    color: '#9E9E9E',
    marginTop: -4,
    marginBottom: 16,
  },
  scoreBg: {
    width: '100%',
    height: 16,
    backgroundColor: '#FBE9E7',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 14,
  },
  scoreFill: {
    height: '100%',
    borderRadius: 8,
  },
  feedbackText: {
    fontSize: 17,
    color: '#424242',
    textAlign: 'center',
    lineHeight: 24,
  },

  // 감지 음식
  foodsCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 5,
    elevation: 3,
  },
  foodsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#424242',
    marginBottom: 12,
  },
  foodChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  mindLegend: {
    fontSize: 13,
    color: '#4CAF50',
    marginTop: 4,
  },

  // 보상 카드
  rewardCard: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: '#F1F8E9',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  rewardEmoji: { fontSize: 48, marginBottom: 8 },
  rewardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 4,
  },
  rewardAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 4,
  },
  rewardDesc: {
    fontSize: 15,
    color: '#558B2F',
  },

  // 결과 액션
  resultActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  halfBtn: { flex: 1 },

  // 완료
  doneSection: {
    marginHorizontal: 16,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  doneText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2E7D32',
    textAlign: 'center',
  },
  doneSubText: {
    fontSize: 17,
    color: '#388E3C',
    marginTop: 8,
  },
});
