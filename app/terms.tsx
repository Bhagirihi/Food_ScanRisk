// Terms of Service — in-app screen, linked from Register and Profile/About.
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

export default function Terms() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton} accessibilityLabel="Go back">
            <MaterialIcons name="arrow-back-ios" size={20} color={COLORS.ink} />
          </Pressable>
          <Text style={styles.headerTitle}>Terms of Service</Text>
        </View>
        <Text style={styles.updated}>Last updated: 13 November 2026</Text>

        <Section title="What ScanRisk is">
          ScanRisk scans product barcodes and shows a 0–50 nutrition risk score built
          from the product label, with every point explained. Product data comes from
          Open Food Facts, an open database that anyone can correct — a product entry
          may be incomplete or out of date.
        </Section>

        <Section title="Not medical advice">
          Scores are guidance from label data, not medical advice, diagnosis or
          treatment. They do not replace a doctor, dietitian or other health
          professional. If you have a food allergy or a medical condition, check the
          product label yourself and follow the advice of your clinician.
        </Section>

        <Section title="Your account">
          You may use ScanRisk as a guest, or create an account with your name, email
          and a password. Keep your password private. You are responsible for what
          happens under your account.
        </Section>

        <Section title="Fair use">
          Use ScanRisk for personal, lawful purposes. Do not misuse the app, try to
          break it, or scrape product data through it at a scale that harms the
          Open Food Facts service.
        </Section>

        <Section title="No ads, no sale of data">
          ScanRisk has no ads and does not sell your data. Your scan history stays on
          your device; see the Privacy Policy for the full picture.
        </Section>

        <Section title="Availability">
          ScanRisk is provided as-is. Barcode lookups need an internet connection and
          depend on Open Food Facts being available; scores may change when a product
          entry is updated. We may update these terms, and the current version always
          appears here in the app.
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
