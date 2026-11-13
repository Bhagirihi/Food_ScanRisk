// Shared chrome for the auth screens: pale gradient, logo, brand, title.

import type { ReactNode } from 'react';
import { Image, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { COLORS, FONTS, GRADIENTS } from '../lib/theme';

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
      <LinearGradient colors={GRADIENTS.auth} style={styles.gradient}>
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <Image source={require('../../assets/icon.png')} style={styles.logo} />
          <Text style={styles.brand}>ScanRisk</Text>
          <Text style={styles.title}>{title}</Text>
          {sub ? <Text style={styles.sub}>{sub}</Text> : null}
          {children}
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FDFBFF' },
  gradient: { flex: 1 },
  container: { flex: 1 },
  content: { padding: 24, paddingBottom: 40 },
  logo: { width: 64, height: 64, borderRadius: 16, alignSelf: 'center', marginTop: 8 },
  brand: {
    color: COLORS.maroon,
    fontSize: 30,
    fontWeight: '700',
    fontFamily: FONTS.headline,
    textAlign: 'center',
    marginTop: 8,
  },
  title: {
    color: COLORS.ink,
    fontSize: 24,
    fontWeight: '700',
    fontFamily: FONTS.headline,
    marginTop: 28,
    textAlign: 'center',
  },
  sub: {
    color: COLORS.soft,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: FONTS.body,
    lineHeight: 20,
  },
});
