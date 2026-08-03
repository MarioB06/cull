import React, { useState } from 'react';
import { View, Text, StyleSheet, Image as RNImage, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';
import { colors, fonts, radius } from '../theme';
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
          <ActivityIndicator color={colors.cream40} />
        </View>
      )}

      {/* Film-Grain-Overlay (gekacheltes Rauschen, soft-light-artig). */}
      <RNImage source={grain} style={styles.grain} resizeMode="repeat" />

      {/* Verlauf unten für Lesbarkeit der Chips. */}
      <LinearGradient
        colors={['transparent', 'rgba(11,9,7,0.6)']}
        locations={[0.55, 1]}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Frame-Nummer = Dateiname, oben links. */}
      <View style={styles.frameWrap} pointerEvents="none">
        <Text style={styles.frame} numberOfLines={1}>
          {filename}
        </Text>
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
    <BlurView intensity={18} tint="dark" style={styles.chip}>
      <Text style={styles.chipText}>{text}</Text>
    </BlurView>
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
      <Animated.View style={[styles.stamp, styles.stampKeep, keepStyle]} pointerEvents="none">
        <Text style={[styles.stampText, styles.stampTextKeep]}>BEHALTEN</Text>
      </Animated.View>
      <Animated.View style={[styles.stamp, styles.stampDelete, deleteStyle]} pointerEvents="none">
        <Text style={[styles.stampText, styles.stampTextDelete]}>LÖSCHEN</Text>
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
  frame: {
    fontFamily: fonts.mono400,
    fontSize: 10,
    color: colors.cream70,
    letterSpacing: 0.5,
  },
  chips: { position: 'absolute', left: 14, bottom: 14, flexDirection: 'row', gap: 8 },
  chip: {
    overflow: 'hidden',
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: colors.cream13,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { fontFamily: fonts.mono500, fontSize: 11, color: colors.creamHi },
  stamp: {
    position: 'absolute',
    top: 34,
    borderWidth: 2.5,
    borderRadius: radius.chip,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stampKeep: {
    left: 22,
    borderColor: colors.greenBorder,
    backgroundColor: colors.greenFillBg,
    transform: [{ rotate: '-11deg' }],
  },
  stampDelete: {
    right: 22,
    borderColor: colors.redBorder,
    backgroundColor: colors.redFillBg,
    transform: [{ rotate: '11deg' }],
  },
  stampText: { fontFamily: fonts.mono600, fontSize: 26, letterSpacing: 1 },
  stampTextKeep: { color: colors.greenText },
  stampTextDelete: { color: colors.redText },
});

export default React.memo(PhotoCardBase);
