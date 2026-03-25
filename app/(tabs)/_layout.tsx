import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, View, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

function TabIcon({
  name,
  focused,
  activeColor,
  inactiveColor,
}: {
  name: string;
  focused: boolean;
  activeColor: string;
  inactiveColor: string;
}) {
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: activeColor, borderRadius: 14 }]}>
      <IconSymbol size={22} name={name as any} color={focused ? '#fff' : inactiveColor} />
    </View>
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primaryBlue,
        tabBarInactiveTintColor: colors.tabIconDefault,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: true,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500', marginTop: 2 },
        tabBarStyle: [
          styles.tabBar,
          Platform.select({
            ios: { position: 'absolute' },
            default: {
              backgroundColor: colors.cardBg,
              borderTopColor: colors.border,
            },
          }),
        ],
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="briefcase.fill" focused={focused} activeColor={colors.primaryBlue} inactiveColor={colors.tabIconDefault} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="list.bullet" focused={focused} activeColor={colors.primaryBlue} inactiveColor={colors.tabIconDefault} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person.fill" focused={focused} activeColor={colors.primaryBlue} inactiveColor={colors.tabIconDefault} />
          ),
        }}
      />
      <Tabs.Screen
        name="qr"
        options={{
          title: 'Scan',
          tabBarIcon: ({ focused }) => (
            <TabIcon name="qrcode.viewfinder" focused={focused} activeColor={colors.primaryBlue} inactiveColor={colors.tabIconDefault} />
          ),
        }}
      />
      {/* Exchange still accessible via quick action, hidden from tab bar */}
      <Tabs.Screen
        name="exchange"
        options={{
          href: null,
          title: 'Exchange',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 64,
    paddingTop: 8,
  },
  iconWrap: {
    width: 44,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
