import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * 마을 메인 화면
 * - 플레이어 마을 현황 표시
 * - 동물 주민 및 건물 렌더링
 * - 일일 미션 진행 현황
 */
export default function VillageScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🏡 내 마을</Text>
        <Text style={styles.subtitle}>이장님, 좋은 아침이에요!</Text>
      </View>
      {/* TODO: 마을 캔버스 (Reanimated + SVG) */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>마을 화면 준비 중...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F0' },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#2E7D32' },
  subtitle: { fontSize: 18, color: '#555', marginTop: 4 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 18, color: '#9E9E9E' },
});
