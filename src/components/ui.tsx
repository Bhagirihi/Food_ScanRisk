// Shared UI pieces in the house style: warm ivory cards with a gold top
// edge (Shubh), maroon primary buttons, serif display type.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { COLORS, RADIUS, SERIF } from '../lib/theme';

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return (
    <View style={[styles.card, style]}>
      <View style={styles.cardGoldEdge} />
      {children}
    </View>
  );
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionRow}>
        <View style={styles.sectionRule} />
        <Text style={styles.sectionTitle}>{children}</Text>
      </View>
      {!!sub && <Text style={styles.sectionSub}>{sub}</Text>}
    </View>
  );
}

/** Maroon pill button — the primary action everywhere. */
export function PrimaryButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      style={[styles.primaryButton, disabled && styles.primaryButtonDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

/** Plain maroon text button. */
export function TextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.textButton} onPress={onPress}>
      <Text style={styles.textButtonText}>{label}</Text>
    </Pressable>
  );
}

/** Small gold ornament divider: — ◆ — */
export function Ornament({ color }: { color?: string }) {
  const c = color ?? COLORS.gold;
  return (
    <View style={styles.ornament}>
      <View style={[styles.ornamentLine, { backgroundColor: c }]} />
      <Text style={{ color: c, fontSize: 11 }}>◆</Text>
      <View style={[styles.ornamentLine, { backgroundColor: c }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.xl,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    overflow: 'hidden',
    shadowColor: '#7A5A1E',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  cardGoldEdge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: COLORS.goldBright,
    opacity: 0.55,
  },
  sectionWrap: { marginTop: 26, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionRule: { width: 26, height: 3, borderRadius: 2, backgroundColor: COLORS.gold },
  sectionTitle: {
    fontSize: 21,
    fontWeight: '700',
    color: COLORS.ink,
    fontFamily: SERIF,
    letterSpacing: 0.2,
  },
  sectionSub: { fontSize: 13, color: COLORS.soft, marginTop: 4, marginLeft: 36, lineHeight: 18 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
  },
  primaryButtonDisabled: { opacity: 0.5 },
  primaryButtonText: { color: '#FFF7E8', fontSize: 16, fontWeight: '700' },
  textButton: { alignItems: 'center', paddingVertical: 10 },
  textButtonText: { color: COLORS.maroon, fontSize: 15, fontWeight: '700' },
  ornament: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  ornamentLine: { height: 1, width: 44, opacity: 0.7 },
});
