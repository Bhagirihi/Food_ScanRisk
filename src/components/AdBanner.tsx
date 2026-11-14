// Footer adaptive banner — only rendered when a real ad is available.
// Lazy-loads react-native-google-mobile-ads (see src/lib/ads.ts), so in
// Expo Go this renders nothing and the app keeps working with ads off.
// Never used on the camera (Scan) or Result screens.

import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { BannerAdProps, BannerAdSize } from 'react-native-google-mobile-ads';
import type { ComponentType } from 'react';

import { ADMOB_UNITS } from '../lib/admob';
import { initializeAds, isAdMobAvailable, loadAdsModule } from '../lib/ads';

export default function AdBanner() {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [BannerAd, setBannerAd] = useState<ComponentType<BannerAdProps> | null>(null);
  const [bannerSize, setBannerSize] = useState<BannerAdSize | null>(null);

  const canRequestAd = isAdMobAvailable() && !failed;

  useEffect(() => {
    if (!canRequestAd) return;
    let cancelled = false;
    (async () => {
      if (!(await initializeAds())) return;
      const mod = await loadAdsModule();
      if (cancelled || !mod?.BannerAd || !mod?.BannerAdSize) return;
      setBannerAd(() => mod.BannerAd);
      setBannerSize(mod.BannerAdSize.ANCHORED_ADAPTIVE_BANNER);
    })();
    return () => {
      cancelled = true;
    };
  }, [canRequestAd]);

  if (!canRequestAd || !BannerAd || !bannerSize) return null;

  return (
    <View style={[styles.wrap, !loaded && styles.hiddenBanner]}>
      <BannerAd
        unitId={ADMOB_UNITS.banner}
        size={bannerSize}
        onAdLoaded={() => setLoaded(true)}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', backgroundColor: 'transparent' },
  hiddenBanner: { height: 0, overflow: 'hidden', opacity: 0 },
});
