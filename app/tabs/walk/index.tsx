import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * 이중 과제(Dual-Task) 산책 모드
 * - 만보기 연동 (expo-sensors Pedometer)
 * - 5,000보 목표 진행 바
 * - 음성 퀴즈 재생 (expo-av)
 * - 음성 답변 녹음 → Whisper STT
 */
export default function WalkScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🚶 산책 모드</Text>
        <Text style={styles.subtitle}>걸으면서 뇌도 함께 운동해요</Text>
      </View>
      {/* TODO: 만보기 UI, 퀴즈 카드, 음성 녹음 버튼 */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>산책 화면 준비 중...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8F5E9' },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1B5E20' },
  subtitle: { fontSize: 18, color: '#555', marginTop: 4 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 18, color: '#9E9E9E' },
});
