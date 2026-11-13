import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, useSegments, router } from 'expo-router';
import type { Session } from '@supabase/supabase-js';
import * as Notifications from 'expo-notifications';
import {
  useFonts as useJakartaFonts,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  useFonts as useInterFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';

import BrandedSplash from '../src/components/BrandedSplash';
import { getSession, onAuthStateChange } from '../src/lib/supabase';
import { hasCompletedOnboarding, isGuest } from '../src/lib/session';
import { COLORS, FONTS } from '../src/lib/theme';

const AUTH_ROUTES = ['login', 'register', 'forgot-password'];

export default function Layout() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [tick, setTick] = useState(0);
  const segments = useSegments();

  // Load the Stitch fonts. The app never blocks on them: if they fail to
  // load, React Native falls back to the system fonts.
  useJakartaFonts({ PlusJakartaSans_600SemiBold, PlusJakartaSans_700Bold });
  useInterFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });

  // Weekly summary notifications show as a banner + in the notification
  // list. No-op on web; on native this only takes effect in a dev build or
  // a store build (Expo Go does not carry the native module).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
    } catch {
      // Notifications are best-effort.
    }
  }, []);

  // Boot: load the session, then show the branded splash briefly.
  useEffect(() => {
    let alive = true;
    (async () => {
      const s = await getSession();
      if (!alive) return;
      setSession(s);
      await new Promise((r) => setTimeout(r, 900));
      if (alive) setReady(true);
    })();
    const { data } = onAuthStateChange((s) => {
      setSession(s);
      setTick((t) => t + 1);
    });
    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // Routing guard: onboarding first, then sign-in (or guest), then the app.
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    (async () => {
      const [onboarded, guest] = await Promise.all([hasCompletedOnboarding(), isGuest()]);
      if (!alive) return;
      const seg = segments[0];
      const inOnboarding = seg === 'onboarding';
      const inAuth = AUTH_ROUTES.includes(seg as string);
      const authed = !!session || guest;
      if (!onboarded && !inOnboarding) router.replace('/onboarding');
      else if (onboarded && !authed && !inAuth) router.replace('/login');
      else if (onboarded && authed && (inAuth || inOnboarding)) router.replace('/');
    })();
    return () => {
      alive = false;
    };
  }, [ready, segments, session, tick]);

  if (!ready) return <BrandedSplash />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: COLORS.maroon },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontFamily: FONTS.headline },
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="scan" />
      <Stack.Screen name="result" />
      <Stack.Screen name="history" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="terms" />
    </Stack>
  );
}
