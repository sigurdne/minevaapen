import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { ensureSeeded } from '@/src/database/seed';
import '@/src/i18n';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [databaseReady, setDatabaseReady] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    let isMounted = true;

    ensureSeeded()
      .then(() => {
        if (isMounted) {
          setDatabaseReady(true);
        }
      })
      .catch((error) => {
        console.error('Failed to seed database', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (!databaseReady) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator accessibilityLabel={t('common.loading')} />
      </View>
    );
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="modal"
          options={{ presentation: 'modal', title: t('navigation.modalTitle') }}
        />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
