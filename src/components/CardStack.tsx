import React, { forwardRef, useImperativeHandle, useCallback } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import PhotoCard from './PhotoCard';
import type { Asset, AssetDetails } from '../media';
import { radius } from '../theme';
import { SWIPE_THRESHOLD, SWIPE_VELOCITY_THRESHOLD, ROTATION_DIVISOR } from '../constants';

export interface CardStackHandle {
  /** Programmatischer Swipe (für die Buttons). dir: 1 = behalten, -1 = löschen. */
  swipe: (dir: 1 | -1) => void;
}

interface Props {
  pool: Asset[];
  detailsCache: Record<string, AssetDetails>;
  onKeep: () => void;
  onDelete: () => void;
  onCommitHaptic: () => void;
}

const VISIBLE = 3;

const CardStack = forwardRef<CardStackHandle, Props>(function CardStack(
  { pool, detailsCache, onKeep, onDelete, onCommitHaptic },
  ref,
) {
  const { width } = useWindowDimensions();
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const animating = useSharedValue(false);

  // Nach Abschluss der Fly-out-Animation: State weiterschalten + Werte zurücksetzen.
  const afterCommit = useCallback(
    (dir: number) => {
      onCommitHaptic();
      if (dir > 0) onKeep();
      else onDelete();
      tx.value = 0;
      ty.value = 0;
      animating.value = false;
    },
    [onKeep, onDelete, onCommitHaptic, tx, ty, animating],
  );

  const fling = useCallback(
    (dir: 1 | -1) => {
      if (animating.value) return;
      animating.value = true;
      ty.value = withTiming(-30, { duration: 300 });
      tx.value = withTiming(dir * width * 1.5, { duration: 300 }, (finished) => {
        if (finished) runOnJS(afterCommit)(dir);
      });
    },
    [width, afterCommit, tx, ty, animating],
  );

  useImperativeHandle(ref, () => ({ swipe: fling }), [fling]);

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (animating.value) return;
      tx.value = e.translationX;
      ty.value = e.translationY;
    })
    .onEnd((e) => {
      if (animating.value) return;
      const passed =
        Math.abs(tx.value) > SWIPE_THRESHOLD || Math.abs(e.velocityX) > SWIPE_VELOCITY_THRESHOLD;
      if (passed) {
        const dir =
          tx.value > 0 ? 1 : tx.value < 0 ? -1 : e.velocityX > 0 ? 1 : -1;
        animating.value = true;
        ty.value = withTiming(-30, { duration: 300 });
        tx.value = withTiming(dir * width * 1.5, { duration: 300 }, (finished) => {
          if (finished) runOnJS(afterCommit)(dir);
        });
      } else {
        tx.value = withSpring(0, { damping: 18, stiffness: 180 });
        ty.value = withSpring(0, { damping: 18, stiffness: 180 });
      }
    });

  const activeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotate: `${tx.value / ROTATION_DIVISOR}deg` },
    ],
  }));

  // Hintergrund-Karten (statisch); oben die aktive.
  const cards = pool.slice(0, VISIBLE);

  return (
    <View style={styles.stack}>
      {cards
        .map((asset, idx) => {
          if (idx === 0) return null; // aktive Karte separat (oben gerendert)
          const depthStyle =
            idx === 1
              ? { transform: [{ scale: 0.95 }, { translateY: 15 }] }
              : { transform: [{ scale: 0.9 }, { translateY: 30 }] };
          const overlay = idx === 1 ? 0.22 : 0.45;
          return (
            <View key={asset.id} style={[styles.cardWrap, depthStyle]}>
              <PhotoCard asset={asset} details={detailsCache[asset.id]} />
              <View
                pointerEvents="none"
                style={[styles.overlay, { backgroundColor: `rgba(11,9,7,${overlay})` }]}
              />
            </View>
          );
        })
        // Hintere zuerst rendern, damit idx=1 über idx=2 liegt.
        .reverse()}

      {cards[0] && (
        <GestureDetector gesture={pan}>
          <Animated.View key={cards[0].id} style={[styles.cardWrap, activeStyle]}>
            <PhotoCard asset={cards[0]} details={detailsCache[cards[0].id]} translateX={tx} />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  stack: { flex: 1 },
  cardWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: radius.card,
  },
});

export default CardStack;
