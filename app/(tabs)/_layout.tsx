import { Tabs, useRouter, useSegments } from 'expo-router';
import React, { useEffect } from 'react';

import { useAuth } from '@/auth/auth-context';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTranslation } from '@/i18n';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { email, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const { t } = useTranslation();
  const isLoggedIn = Boolean(email);

  useEffect(() => {
    const currentTab = segments[1];

    if (!isLoading && !isLoggedIn && (currentTab === undefined || currentTab === 'editor')) {
      router.replace('/account');
    }
  }, [isLoading, isLoggedIn, router, segments]);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          paddingBottom: 6,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          href: isLoggedIn ? '/' : null,
          title: t('tabs.sites'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="editor"
        options={{
          href: isLoggedIn ? '/editor' : null,
          title: t('tabs.editor'),
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="pencil" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: t('tabs.account'),
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="person.crop.circle" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
