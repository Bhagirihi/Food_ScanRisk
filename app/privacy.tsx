// Privacy Policy — in-app screen, linked from Register and Profile/About.
// States only what the app actually does. Last updated 13 Nov 2026.

import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { COLORS, FONTS } from '../src/lib/theme';

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{children}</Text>
    </View>
  );
}

export default function Privacy() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
            <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Privacy Policy</Text>
        </View>
        <Text style={styles.updated}>Last updated: 13 November 2026</Text>

        <Section title="What ScanRisk does">
          ScanRisk scans a product barcode, looks the product up in the Open Food Facts
          database, and shows a 0–50 nutrition risk score with every point explained.
          Scores are guidance from label data — they are not medical advice.
        </Section>

        <Section title="What stays on your phone">
          Your scan history (up to your last 50 scans), your allergen selections, your
          region, and cached product details are stored on your device only. We do not
          sell your data, and there are no ads in ScanRisk.
        </Section>

        <Section title="Location">
          If you choose to share your location, ScanRisk uses it only to set your
          country/region — so allergens, units and prices match where you live. Your
          precise location (latitude/longitude) is never stored, and you can change
          your region any time in Profile.
        </Section>

        <Section title="Notifications">
          The weekly scan summary is a local notification, built on your phone from
          your own scan history and delivered on Sundays at 9:00. No notification data
          leaves your device, and you can turn it off in Profile.
        </Section>

        <Section title="Accounts (optional)">
          You can use ScanRisk as a guest with no account at all. If you create an
          account, we store the email address and name you provide, only to sign you
          in. Signing in is handled by Supabase; your password is never visible to us.
        </Section>

        <Section title="Product data">
          Product information comes from Open Food Facts (openfoodfacts.org), an open
          database. When you scan a barcode, the barcode is sent to Open Food Facts
          to fetch that product — no account or personal information goes with it.
        </Section>

        <Section title="Changes">
          If this policy changes, the updated version will appear here in the app.
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 22, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  updated: { color: COLORS.soft, fontSize: 13, marginTop: 4, marginBottom: 8, fontFamily: FONTS.body },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.headline },
  sectionBody: { color: COLORS.inkSoft, fontSize: 15, lineHeight: 22, marginTop: 6, fontFamily: FONTS.body },
});
