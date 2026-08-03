import React, { useState } from 'react';
import { View, Text, StyleSheet, Image as RNImage, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';
import { Glass } from './Glass';
import { colors, font, radius, blur, shadowCard } from '../theme';
import { STAMP_FULL_AT } from '../constants';
import type { Asset, AssetDetails } from '../media';
import { formatDate, formatSize, fileNameFromUri } from '../utils/format';

const grain = require('../../assets/grain.png');

interface Props {
  asset: Asset;
  details?: AssetDetails;
  /** Nur für die aktive Karte: treibt Stamp-Opacity. */
  translateX?: SharedValue<number>;
}

function PhotoCardBase({ asset, details, translateX }: Props) {
  const [loaded, setLoaded] = useState(false);
  const uri = details?.localUri ?? asset.uri;
  const filename = details?.filename ?? fileNameFromUri(asset.uri, asset.filename ?? asset.id);
  const date = formatDate(asset.creationTime);
  const size = formatSize(details?.fileSize);

  return (
    <View style={styles.card}>
      <Image
        style={StyleSheet.absoluteFill}
        source={{ uri }}
        contentFit="cover"
        transition={120}
        onLoadEnd={() => setLoaded(true)}
        recyclingKey={asset.id}
      />

      {!loaded && (
        <View style={styles.imgLoader}>
          <ActivityIndicator color={colors.textFaint} />
        </View>
      )}

      {/* Film-Grain-Overlay (gekacheltes Rauschen, soft-light-artig). */}
      <RNImage source={grain} style={styles.grain} resizeMode="repeat" />

      {/* Verlauf unten für Lesbarkeit der Chips. */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.6)']}
        locations={[0.55, 1]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Frame-Nummer = Dateiname, oben links, als dunkler Glas-Chip. */}
      <View style={styles.frameWrap} pointerEvents="none">
        <Glass tint={colors.scrimChip} border={colors.scrimChipBorder} radius={radius.chip} intensity={blur.light} style={styles.frameChip}>
          <Text style={styles.frame} numberOfLines={1}>
            {filename}
          </Text>
        </Glass>
      </View>

      {/* Meta-Chips unten links: Datum + Größe. */}
      <View style={styles.chips} pointerEvents="none">
        <Chip text={date} />
        <Chip text={size} />
      </View>

      {/* Stamps nur auf der aktiven Karte. */}
      {translateX && <Stamps translateX={translateX} />}
    </View>
  );
}

function Chip({ text }: { text: string }) {
  return (
    <Glass tint={colors.scrimChip} border={colors.scrimChipBorder} radius={radius.chip} intensity={blur.light} style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </Glass>
  );
}

function Stamps({ translateX }: { translateX: SharedValue<number> }) {
  const keepStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [0, STAMP_FULL_AT], [0, 1], Extrapolation.CLAMP),
  }));
  const deleteStyle = useAnimatedStyle(() => ({
    opacity: interpolate(translateX.value, [-STAMP_FULL_AT, 0], [1, 0], Extrapolation.CLAMP),
  }));
  return (
    <>
      <Animated.View style={[styles.stampWrap, styles.stampKeepPos, keepStyle]} pointerEvents="none">
        <Glass tint={colors.keepGlass} border="rgba(147,179,132,0.85)" radius={radius.chip} intensity={blur.light} style={styles.stamp}>
          <Text style={[styles.stampText, { color: colors.keepText }]}>BEHALTEN</Text>
        </Glass>
      </Animated.View>
      <Animated.View style={[styles.stampWrap, styles.stampDeletePos, deleteStyle]} pointerEvents="none">
        <Glass tint={colors.deleteGlass} border="rgba(226,120,95,0.85)" radius={radius.chip} intensity={blur.light} style={styles.stamp}>
          <Text style={[styles.stampText, { color: colors.deleteText }]}>LÖSCHEN</Text>
        </Glass>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: radius.card,
    overflow: 'hidden',
    backgroundColor: '#0a0805',
    ...shadowCard,
  },
  imgLoader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grain: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    // Dezent halten: ohne echten Blend würde 0.5 das Foto zukleistern.
    // soft-light blendet das Rauschen filmisch ein, wo unterstützt; sonst
    // ist die niedrige Opacity kaum sichtbar (Bild bleibt klar erkennbar).
    opacity: 0.08,
    mixBlendMode: 'soft-light',
  },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '50%' },
  frameWrap: { position: 'absolute', top: 14, left: 14, right: 14 },
  frameChip: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6 },
  frame: {
    fontFamily: font.mono,
    fontSize: 10,
    color: colors.textDim,
    letterSpacing: 0.5,
  },
  chips: { position: 'absolute', left: 14, bottom: 14, flexDirection: 'row', gap: 8 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontFamily: font.monoMed, fontSize: 11, color: colors.text },
  stampWrap: { position: 'absolute', top: 34 },
  stampKeepPos: { left: 22, transform: [{ rotate: '-11deg' }] },
  stampDeletePos: { right: 22, transform: [{ rotate: '11deg' }] },
  stamp: {
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stampText: { fontFamily: font.monoSemi, fontSize: 26, letterSpacing: 1 },
});

export default React.memo(PhotoCardBase);
