import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * 귀 밝은 바리스타 — 작업 기억력 훈련 미니게임
 * - 동물 손님 음성 주문 재생
 * - 방해 대화 오버레이 (청각 집중력)
 * - 메뉴 카드 선택 UI
 * - 란셋 보고서 기반: 청각 자극 + 작업 기억력 훈련
 */
export default function BaristaScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>☕ 마을 카페</Text>
        <Text style={styles.subtitle}>손님 주문을 잘 들어보세요!</Text>
      </View>
      {/* TODO: 동물 손님 카드, 주문 음성 재생, 메뉴 선택 버튼 */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>바리스타 게임 준비 중...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBE9E7' },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#4E342E' },
  subtitle: { fontSize: 18, color: '#555', marginTop: 4 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 18, color: '#9E9E9E' },
});
