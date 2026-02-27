/**
 * _layout.tsx (Root)
 * Expo Router 루트 레이아웃
 * - GestureHandlerRootView: 스와이프/제스처 지원
 * - SafeAreaProvider: 노치/하단 바 안전 영역
 * - (tabs): 하단 탭 네비게이션 그룹 (마을/산책/식단/카페)
 */

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* 시니어 UX: 밝은 배경에 어두운 상태바 아이콘 */}
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          {/* 메인 탭 네비게이션 그룹 (마을/산책/식단/카페) */}
          <Stack.Screen name="(tabs)" />
          {/* 온보딩 (최초 실행) */}
          <Stack.Screen name="onboarding" />
          {/* 404 */}
          <Stack.Screen name="+not-found" />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
