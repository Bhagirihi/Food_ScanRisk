// Shared chrome for the auth screens: safe area + logo + brand + title.

import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ornament } from './ui';
import { COLORS, SERIF } from '../lib/theme';

export function AuthShell({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <Text style={styles.brand}>ScanRisk</Text>
        <Ornament />
        <Text style={styles.title}>{title}</Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  logo: { width: 64, height: 64, borderRadius: 16, alignSelf: 'center', marginTop: 8 },
  brand: {
    color: COLORS.maroon,
    fontSize: 30,
    fontWeight: '700',
    fontFamily: SERIF,
    textAlign: 'center',
    marginTop: 8,
  },
  title: {
    color: COLORS.ink,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: SERIF,
    marginTop: 28,
    textAlign: 'center',
  },
  sub: { color: COLORS.soft, fontSize: 14, marginTop: 6, textAlign: 'center', marginBottom: 20 },
});
