// Native ad card for the History feed — a real ad rendered in ScanRisk's
// own card style, labelled "Ad". Lazy-loads react-native-google-mobile-ads
// (see src/lib/ads.ts), so in Expo Go this renders nothing and the app
// keeps working with ads off. Renders only once an ad actually loads;
// no-fill / errors stay invisible (no empty box, no layout shift).

import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import type * as Ads from 'react-native-google-mobile-ads';

import { ADMOB_UNITS } from '../lib/admob';
import { initializeAds, isAdMobAvailable, loadAdsModule } from '../lib/ads';
import { COLORS, FONTS } from '../lib/theme';

type AdsModule = typeof Ads;

function LoadedNativeAd({ mod }: { mod: AdsModule }) {
  const { status, nativeAd } = mod.useNativeAd({ adUnitId: ADMOB_UNITS.native });

  if (status !== 'loaded' || !nativeAd) return null;

  return (
    <mod.NativeAdView nativeAd={nativeAd} style={styles.card}>
      <View style={styles.topRow}>
        {nativeAd.icon?.url ? (
          <mod.NativeAsset assetType={mod.NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </mod.NativeAsset>
        ) : null}
        <View style={styles.headlineWrap}>
          <mod.NativeAsset assetType={mod.NativeAssetType.HEADLINE}>
            <Text style={styles.headline} numberOfLines={1}>
              {nativeAd.headline}
            </Text>
          </mod.NativeAsset>
          {nativeAd.advertiser ? (
            <Text style={styles.advertiser} numberOfLines={1}>
              {nativeAd.advertiser}
            </Text>
          ) : null}
        </View>
        <View style={styles.adBadge}>
          <Text style={styles.adBadgeText}>Ad</Text>
        </View>
      </View>
      {nativeAd.body ? (
        <mod.NativeAsset assetType={mod.NativeAssetType.BODY}>
          <Text style={styles.body} numberOfLines={2}>
            {nativeAd.body}
          </Text>
        </mod.NativeAsset>
      ) : null}
      {nativeAd.callToAction ? (
        <View style={styles.ctaRow}>
          <mod.NativeAsset assetType={mod.NativeAssetType.CALL_TO_ACTION}>
            <Text style={styles.cta}>{nativeAd.callToAction}</Text>
          </mod.NativeAsset>
        </View>
      ) : null}
    </mod.NativeAdView>
  );
}

export default function NativeAdCard() {
  const [mod, setMod] = useState<AdsModule | null>(null);

  useEffect(() => {
    if (!isAdMobAvailable()) return;
    let cancelled = false;
    (async () => {
      if (!(await initializeAds())) return;
      const loaded = await loadAdsModule();
      if (!cancelled && loaded) {
        setMod(loaded);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!mod) return null;
  return <LoadedNativeAd mod={mod} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.line,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 40, height: 40, borderRadius: 8 },
  headlineWrap: { flex: 1 },
  headline: { fontSize: 15, fontWeight: '700', color: COLORS.ink, fontFamily: FONTS.bodySemi },
  advertiser: { fontSize: 12, color: COLORS.soft, marginTop: 2, fontFamily: FONTS.body },
  adBadge: {
    backgroundColor: COLORS.softBlue,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  adBadgeText: { fontSize: 11, fontWeight: '800', color: COLORS.navy, fontFamily: FONTS.bodyBold },
  body: { fontSize: 13, lineHeight: 18, color: COLORS.inkSoft, marginTop: 8, fontFamily: FONTS.body },
  ctaRow: { alignSelf: 'flex-start', backgroundColor: COLORS.maroon, borderRadius: 999, marginTop: 10, paddingHorizontal: 14, paddingVertical: 8 },
  cta: { color: '#fff', fontSize: 13, fontWeight: '700', fontFamily: FONTS.bodySemi },
});
