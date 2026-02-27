import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface SeniorButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

/**
 * 시니어 UX 기준 버튼 컴포넌트
 * - 최소 터치 영역: 56×56dp (WCAG 권장 48dp 이상)
 * - 폰트 크기: 18px 이상
 * - 고대비 색상
 */
export function SeniorButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
  textStyle,
}: SeniorButtonProps) {
  const bgColor = {
    primary: '#4CAF50',
    secondary: '#2196F3',
    danger: '#F44336',
  }[variant];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.base,
        { backgroundColor: disabled ? '#BDBDBD' : bgColor },
        style,
      ]}
      activeOpacity={0.7}
    >
      <Text style={[styles.label, textStyle]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56,
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
