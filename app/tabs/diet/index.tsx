import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * AI 식단 카메라 & 마법의 농장
 * - 식사 촬영 (expo-camera)
 * - OpenAI Vision → MIND 식단 스코어링
 * - 비료 보상 → 마을 농장 반영
 */
export default function DietScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🥗 식단 카메라</Text>
        <Text style={styles.subtitle}>오늘 밥상을 찍어보세요</Text>
      </View>
      {/* TODO: 카메라 프리뷰, 촬영 버튼, AI 결과 카드 */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>식단 화면 준비 중...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E1' },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#E65100' },
  subtitle: { fontSize: 18, color: '#555', marginTop: 4 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 18, color: '#9E9E9E' },
});
