import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

/**
 * 하단 탭 네비게이션
 * 시니어 UX: 큰 아이콘(28px), 명확한 레이블, 고대비 색상
 */
export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#9E9E9E',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: { height: 65, paddingBottom: 8 },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="village/index"
        options={{
          title: '내 마을',
          tabBarIcon: ({ color }) => (
            <Ionicons name="home" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="walk/index"
        options={{
          title: '산책',
          tabBarIcon: ({ color }) => (
            <Ionicons name="walk" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="diet/index"
        options={{
          title: '식단',
          tabBarIcon: ({ color }) => (
            <Ionicons name="restaurant" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="barista/index"
        options={{
          title: '카페',
          tabBarIcon: ({ color }) => (
            <Ionicons name="cafe" size={28} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="family/index"
        options={{
          title: '가족',
          tabBarIcon: ({ color }) => (
            <Ionicons name="mail" size={28} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
