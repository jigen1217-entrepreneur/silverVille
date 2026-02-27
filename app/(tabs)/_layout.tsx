/**
 * (tabs)/_layout.tsx
 * 하단 탭 네비게이션 레이아웃
 * 시니어 UX: 큰 아이콘(30px), 명확한 한국어 레이블, 고대비 색상
 * 탭 구성: 마을 | 산책 | 식단 | 카페
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, StyleSheet } from 'react-native';

/** 탭 아이콘 색상 */
const COLORS = {
  active: '#2E7D32',   // 진한 초록 — 활성 탭
  inactive: '#BDBDBD', // 연회색 — 비활성 탭
  background: '#FFFFFF',
  border: '#E0E0E0',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: COLORS.active,
        tabBarInactiveTintColor: COLORS.inactive,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        headerShown: false,
      }}
    >
      {/* ① 마을 탭 — 마을 현황 및 동물 주민 */}
      <Tabs.Screen
        name="village"
        options={{
          title: '마을',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'home' : 'home-outline'}
              size={30}
              color={color}
            />
          ),
        }}
      />

      {/* ② 산책 탭 — 이중 과제 걷기 모드 */}
      <Tabs.Screen
        name="walk"
        options={{
          title: '산책',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'walk' : 'walk-outline'}
              size={30}
              color={color}
            />
          ),
        }}
      />

      {/* ③ 식단 탭 — AI 식단 카메라 */}
      <Tabs.Screen
        name="diet"
        options={{
          title: '식단',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'restaurant' : 'restaurant-outline'}
              size={30}
              color={color}
            />
          ),
        }}
      />

      {/* ④ 카페 탭 — 바리스타 작업 기억력 게임 */}
      <Tabs.Screen
        name="cafe"
        options={{
          title: '카페',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? 'cafe' : 'cafe-outline'}
              size={30}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 85 : 70,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    paddingTop: 8,
    backgroundColor: COLORS.background,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    // 시니어 접근성: 충분한 탭 영역
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  tabLabel: {
    fontSize: 13,        // 시니어 가독성을 위해 약간 크게
    fontWeight: '700',
    marginTop: 2,
  },
});
