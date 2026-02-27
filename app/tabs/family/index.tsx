import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/**
 * 가족 연동 우체통
 * - 카카오 계정 연동으로 자녀/손주 연결
 * - 3일 연속 미션 달성 시 가족에게 알림 전송
 * - 가족이 보낸 음성 칭찬 메시지 / 아이템 수신
 * - 사회적 고립감 해소 및 우울증 예방
 */
export default function FamilyScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>📮 가족 우체통</Text>
        <Text style={styles.subtitle}>가족에게 안부를 전해보세요</Text>
      </View>
      {/* TODO: 가족 연동 카드, 받은 메시지 목록, 연동 초대 버튼 */}
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>가족 우체통 준비 중...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E8EAF6' },
  header: { padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#283593' },
  subtitle: { fontSize: 18, color: '#555', marginTop: 4 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 18, color: '#9E9E9E' },
});
