import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Stack, useSegments, router } from 'expo-router';
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
import { onAuthStateChange, type User } from '../src/lib/firebase';
import { hasCompletedOnboarding, isGuest } from '../src/lib/session';
import { COLORS, FONTS } from '../src/lib/theme';

const AUTH_ROUTES = ['login', 'register', 'forgot-password'];

export default function Layout() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
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

  // Boot: wait for Firebase Auth to restore the session from storage
  // (onAuthStateChanged fires immediately with the restored user, or null),
  // then show the branded splash briefly. Ready is gated on the auth
  // callback so a signed-in user never flashes the login screen.
  useEffect(() => {
    let alive = true;
    let authReady = false;
    const unsubscribe = onAuthStateChange((u) => {
      if (!alive) return;
      setUser(u);
      setTick((t) => t + 1);
      if (!authReady) {
        authReady = true;
        setTimeout(() => {
          if (alive) setReady(true);
        }, 900);
      }
    });
    return () => {
      alive = false;
      unsubscribe();
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
      const authed = !!user || guest;
      if (!onboarded && !inOnboarding) router.replace('/onboarding');
      else if (onboarded && !authed && !inAuth) router.replace('/login');
      else if (onboarded && authed && (inAuth || inOnboarding)) router.replace('/');
    })();
    return () => {
      alive = false;
    };
  }, [ready, segments, user, tick]);

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
