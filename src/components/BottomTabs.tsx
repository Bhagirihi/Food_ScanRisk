// Shared bottom tab bar (Home / History / Profile), rendered on the three
// main screens. The app keeps its Stack router — this is a component, not
// expo-router Tabs.

import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { COLORS, FONTS } from '../lib/theme';

export type TabId = 'home' | 'history' | 'profile';

const TABS: { id: TabId; label: string; icon: keyof typeof MaterialIcons.glyphMap; route: string }[] = [
  { id: 'home', label: 'Home', icon: 'dashboard', route: '/' },
  { id: 'history', label: 'History', icon: 'history', route: '/history' },
  { id: 'profile', label: 'Profile', icon: 'account-circle', route: '/profile' },
];

export default function BottomTabs({ active }: { active: TabId }) {
  return (
    <View style={styles.bar}>
      {TABS.map((t) => {
        const on = t.id === active;
        return (
          <Pressable
            key={t.id}
            style={styles.tab}
            onPress={() => {
              if (!on) router.replace(t.route);
            }}
          >
            <MaterialIcons name={t.icon} size={26} color={on ? COLORS.maroon : COLORS.soft} />
            <Text style={[styles.label, on && styles.labelActive]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: COLORS.card,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    paddingTop: 8,
    paddingBottom: 10,
  },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  label: { fontSize: 12, fontWeight: '600', color: COLORS.soft, fontFamily: FONTS.bodySemi },
  labelActive: { color: COLORS.maroon },
});
