// Shared UI pieces in the Stitch design system: white cards, pill buttons
// (maroon primary, amber secondary, outlined), Inter body, Plus Jakarta
// Sans headlines, MaterialIcons.

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { COLORS, FONTS, RADIUS } from '../lib/theme';

type IconName = keyof typeof MaterialIcons.glyphMap;

export function Card({ children, style }: { children: ReactNode; style?: object }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionTitle({ children, sub }: { children: ReactNode; sub?: string }) {
  return (
    <View style={styles.sectionWrap}>
      <Text style={styles.sectionTitle}>{children}</Text>
      {!!sub && <Text style={styles.sectionSub}>{sub}</Text>}
    </View>
  );
}

interface ButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  icon?: IconName;
  style?: object;
}

function ButtonRow({ icon, label, textStyle }: { icon?: IconName; label: string; textStyle: object }) {
  return (
    <View style={styles.buttonRow}>
      {icon ? <MaterialIcons name={icon} size={20} color="#fff" /> : null}
      <Text style={textStyle}>{label}</Text>
    </View>
  );
}

/** Maroon pill button — the primary action everywhere. */
export function PrimaryButton({ label, onPress, disabled, icon, style }: ButtonProps) {
  return (
    <Pressable
      style={[styles.primaryButton, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <ButtonRow icon={icon} label={label} textStyle={styles.primaryButtonText} />
    </Pressable>
  );
}

/** Amber pill button — the secondary action. */
export function SecondaryButton({ label, onPress, disabled, icon, style }: ButtonProps) {
  return (
    <Pressable
      style={[styles.secondaryButton, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <ButtonRow icon={icon} label={label} textStyle={styles.secondaryButtonText} />
    </Pressable>
  );
}

/** Outlined pill button — maroon border and text, transparent fill. */
export function OutlinedButton({ label, onPress, disabled, icon, style }: ButtonProps) {
  return (
    <Pressable
      style={[styles.outlinedButton, disabled && styles.disabled, style]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={styles.buttonRow}>
        {icon ? <MaterialIcons name={icon} size={20} color={COLORS.maroon} /> : null}
        <Text style={styles.outlinedButtonText}>{label}</Text>
      </View>
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

/** Small pill chip, e.g. a score or a NOVA label. */
export function Chip({ label, color, style }: { label: string; color: string; style?: object }) {
  return (
    <View style={[styles.chip, { backgroundColor: color }, style]}>
      <Text style={styles.chipText}>{label}</Text>
    </View>
  );
}

/** Brief confirmation toast, rendered above the bottom tabs. */
export function Toast({ message, bottom }: { message: string; bottom?: number }) {
  return (
    <View style={[styles.toast, { bottom: bottom ?? 100 }]} pointerEvents="none">
      <MaterialIcons name="check-circle" size={18} color="#fff" />
      <Text style={styles.toastText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: RADIUS.lg,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    shadowColor: '#171321',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  sectionWrap: { marginTop: 26, marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  sectionSub: { fontSize: 13, color: COLORS.soft, marginTop: 4, lineHeight: 18, fontFamily: FONTS.body },
  buttonRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.maroon,
    borderRadius: RADIUS.pill,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: FONTS.bodySemi },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: COLORS.amber,
    borderRadius: RADIUS.pill,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  secondaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700', fontFamily: FONTS.bodySemi },
  outlinedButton: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderColor: COLORS.maroon,
    borderRadius: RADIUS.pill,
    borderWidth: 1.5,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  outlinedButtonText: { color: COLORS.maroon, fontSize: 16, fontWeight: '700', fontFamily: FONTS.bodySemi },
  disabled: { opacity: 0.5 },
  textButton: { alignItems: 'center', paddingVertical: 10 },
  textButtonText: { color: COLORS.maroon, fontSize: 15, fontWeight: '700', fontFamily: FONTS.bodySemi },
  chip: { borderRadius: RADIUS.pill, paddingHorizontal: 12, paddingVertical: 6 },
  chipText: { color: '#fff', fontSize: 13, fontWeight: '800', fontFamily: FONTS.bodyBold },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.ink,
    borderRadius: RADIUS.pill,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '700', fontFamily: FONTS.bodySemi },
});
