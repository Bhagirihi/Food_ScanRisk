import { useEffect, useState } from 'react';
import { Pressable, Text } from 'react-native';
import { router, Stack, useSegments } from 'expo-router';
import type { Session } from '@supabase/supabase-js';

import BrandedSplash from '../src/components/BrandedSplash';
import { getSession, onAuthStateChange } from '../src/lib/supabase';
import { hasCompletedOnboarding, isGuest } from '../src/lib/session';
import { COLORS, SERIF } from '../src/lib/theme';

const AUTH_ROUTES = ['login', 'register', 'forgot-password'];

export default function Layout() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [tick, setTick] = useState(0);
  const segments = useSegments();

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
        headerStyle: { backgroundColor: COLORS.maroon },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700', fontFamily: SERIF },
        contentStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'ScanRisk',
          headerRight: () => (
            <Pressable onPress={() => router.push('/profile')}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Profile</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="scan" options={{ title: 'Scan barcode' }} />
      <Stack.Screen name="result" options={{ title: 'Product' }} />
      <Stack.Screen name="history" options={{ title: 'Scan history' }} />
      <Stack.Screen name="profile" options={{ title: 'Profile & Settings' }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
    </Stack>
  );
}
