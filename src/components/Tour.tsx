// Coach-mark walkthrough: dims the screen with a spotlight hole around the
// target element and shows an explanatory tooltip bubble. Falls back to a
// centered card if the target can't be measured. Adapted from Shubh
// Muhurat's Tour component (same measurement approach, ScanRisk styling).

import { useCallback, useEffect, useState, type RefObject } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { COLORS, FONTS } from '../lib/theme';

const { height: H } = Dimensions.get('window');
const DIM = 'rgba(24,10,14,0.66)';
const PAD = 10;

export interface TourStep {
  key: string;
  title: string;
  body: string;
}

export interface Measurable {
  measureInWindow?: (cb: (x: number, y: number, w: number, h: number) => void) => void;
}

export type TargetRef = RefObject<Measurable | null>;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function Tour({
  steps,
  targets,
  containerRef,
  onDone,
}: {
  steps: TourStep[];
  targets: Record<string, TargetRef>;
  // Ref of the view the overlay fills (the Tour's direct parent). Targets
  // are measured with measureInWindow, but the overlay is positioned in this
  // container's coordinate space — on Android those two spaces differ by the
  // status-bar inset on some devices. Measuring the container in the same
  // space and subtracting cancels that offset.
  containerRef: TargetRef;
  onDone: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [containerH, setContainerH] = useState(H);
  const [settled, setSettled] = useState(false);

  const step = steps[index];

  const measureInWindow = (node: Measurable | null | undefined) =>
    new Promise<Rect | null>((resolve) => {
      if (!node || typeof node.measureInWindow !== 'function') return resolve(null);
      try {
        node.measureInWindow((x, y, w, h) => resolve(w > 0 && h > 0 ? { x, y, w, h } : null));
      } catch {
        resolve(null);
      }
    });

  const measure = useCallback(
    async (key: string) => {
      const target = targets[key]?.current;
      if (!target || typeof target.measureInWindow !== 'function') {
        setRect(null);
        setSettled(true);
        return;
      }
      for (let attempt = 0; attempt <= 6; attempt++) {
        const tm = await measureInWindow(target);
        if (tm) {
          const cm = await measureInWindow(containerRef?.current);
          if (cm) {
            setRect({ x: tm.x - cm.x, y: tm.y - cm.y, w: tm.w, h: tm.h });
            setContainerH(cm.h);
          } else {
            setRect(tm);
            setContainerH(H);
          }
          setSettled(true);
          return;
        }
        if (attempt < 6) await new Promise((r) => setTimeout(r, 140));
      }
      setRect(null);
      setSettled(true);
    },
    [targets, containerRef],
  );

  const go = (d: number) => {
    const next = index + d;
    if (next >= steps.length) {
      onDone();
      return;
    }
    setRect(null);
    setSettled(false);
    setIndex(Math.max(0, next));
  };

  useEffect(() => {
    // Measure after layout, not synchronously in the effect body.
    const start = setTimeout(() => measure(step.key), 0);
    // Re-measure once after layout settles (font swap / ScrollView mount can
    // grow the target after the first measure, which used to leave the bubble
    // overlapping the target's bottom lines).
    const settle = setTimeout(() => measure(step.key), 450);
    return () => {
      clearTimeout(start);
      clearTimeout(settle);
    };
  }, [index, step.key, measure]);

  const tooltipBelow = rect ? containerH - (rect.y + rect.h) > 250 : false;

  const bubble = (
    <View
      style={[
        styles.bubble,
        { maxHeight: containerH * 0.42 },
        rect && !tooltipBelow ? styles.bubbleAbove : styles.bubbleBelow,
        !rect && styles.bubbleCenter,
      ]}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.stepCount}>
          STEP {index + 1} OF {steps.length}
        </Text>
        <Text style={styles.bubbleTitle}>{step.title}</Text>
        <Text style={styles.bubbleBody}>{step.body}</Text>
        <View style={styles.bubbleRow}>
          <View style={styles.bubbleDots}>
            {steps.map((_, i) => (
              <View key={i} style={[styles.bubbleDot, i === index && styles.bubbleDotActive]} />
            ))}
          </View>
          <View style={styles.bubbleBtns}>
            {index > 0 && (
              <TouchableOpacity onPress={() => go(-1)} style={styles.linkBtn}>
                <Text style={styles.linkText}>Back</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => go(1)} style={styles.nextBtn}>
              <Text style={styles.nextText}>{index === steps.length - 1 ? 'Got it' : 'Next'}</Text>
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity onPress={onDone} style={styles.skipLink}>
          <Text style={styles.skipLinkText}>Skip tour</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="auto">
      {rect && settled ? (
        <>
          <View style={[styles.dim, { height: Math.max(0, rect.y - PAD) }]} />
          <View style={[styles.dim, { top: rect.y + rect.h + PAD, bottom: 0 }]} />
          <View
            style={[
              styles.dim,
              { top: rect.y - PAD, height: rect.h + PAD * 2, width: Math.max(0, rect.x - PAD) },
            ]}
          />
          <View
            style={[
              styles.dim,
              { top: rect.y - PAD, height: rect.h + PAD * 2, left: rect.x + rect.w + PAD, right: 0 },
            ]}
          />
          <View
            style={[
              styles.ring,
              {
                left: rect.x - PAD,
                top: rect.y - PAD,
                width: rect.w + PAD * 2,
                height: rect.h + PAD * 2,
              },
            ]}
          />
          {tooltipBelow ? (
            <View style={[styles.bubbleWrap, { top: rect.y + rect.h + PAD + 20 }]}>{bubble}</View>
          ) : (
            <View style={[styles.bubbleWrap, { bottom: containerH - (rect.y - PAD) + 20 }]}>
              {bubble}
            </View>
          )}
        </>
      ) : (
        <View style={styles.dimFull}>
          <View style={styles.centerWrap}>{bubble}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', left: 0, right: 0, backgroundColor: DIM },
  dimFull: { ...StyleSheet.absoluteFill, backgroundColor: DIM, justifyContent: 'center' },
  centerWrap: { paddingHorizontal: 30 },
  ring: {
    position: 'absolute',
    borderWidth: 2.5,
    borderColor: COLORS.amber,
    borderRadius: 16,
    shadowColor: COLORS.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  bubbleWrap: { position: 'absolute', left: 20, right: 20 },
  bubble: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: COLORS.amber,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: H * 0.42,
  },
  bubbleAbove: {},
  bubbleBelow: {},
  bubbleCenter: {},
  stepCount: {
    fontSize: 10.5,
    fontWeight: '800',
    color: COLORS.amberDeep,
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  bubbleTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.maroon,
    fontFamily: FONTS.headline,
    marginBottom: 6,
  },
  bubbleBody: { fontSize: 14, color: COLORS.inkSoft, lineHeight: 21 },
  bubbleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  bubbleDots: { flexDirection: 'row', gap: 6 },
  bubbleDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: COLORS.line },
  bubbleDotActive: { width: 22, backgroundColor: COLORS.amber },
  bubbleBtns: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkBtn: { paddingVertical: 8, paddingHorizontal: 4 },
  linkText: { fontSize: 14, fontWeight: '700', color: COLORS.amberDeep },
  nextBtn: {
    backgroundColor: COLORS.maroon,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  nextText: { color: '#FFF7E8', fontSize: 14, fontWeight: '800' },
  skipLink: { alignItems: 'center', marginTop: 12, paddingVertical: 4 },
  skipLinkText: { fontSize: 13, fontWeight: '700', color: COLORS.soft },
});
