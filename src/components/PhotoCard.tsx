import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Image as RNImage, ActivityIndicator, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { useEvent } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import Animated, { useAnimatedStyle, interpolate, Extrapolation, type SharedValue } from 'react-native-reanimated';
import { Glass } from './Glass';
import { colors, font, radius, blur, shadowCard } from '../theme';
import { STAMP_FULL_AT } from '../constants';
import type { Asset, AssetDetails } from '../media';
import { formatDate, formatSize, formatDuration, fileNameFromUri } from '../utils/format';

const grain = require('../../assets/grain.png');

interface Props {
  asset: Asset;
  details?: AssetDetails;
  /** Nur für die aktive Karte: treibt Stamp-Opacity + erlaubt Video-Wiedergabe. */
  translateX?: SharedValue<number>;
}

function PhotoCardBase({ asset, details, translateX }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const isVideo = asset.mediaType === 'video';
  const isActive = !!translateX;

  // expo-image kann Videodateien nicht dekodieren — für Videos immer das
  // generierte Standbild zeigen, nie die rohe Videodatei (sonst schwarzer Screen).
  const posterUri = isVideo ? (details?.posterUri ?? null) : null;
  const displayUri = isVideo ? posterUri : (details?.localUri ?? asset.uri);
  // Thumbnail-Erzeugung ist final gescheitert (z. B. exotischer Codec) — kein endloser Loader.
  const posterFailed = isVideo && !!details && !posterUri;

  // Player wird immer erzeugt (Hook-Regeln), spielt aber nur auf der aktiven Karte.
  //
  // asset.uri zuerst: auf iOS ist das eine ph://-Referenz aufs Photos-Asset, die expo-video
  // über PHImageManager auflöst — denselben Weg, den Photos.app selbst nutzt. Manche
  // HDR-/Sonderformat-Videos lassen sich so abspielen, obwohl die von MediaLibrary exportierte
  // lokale Kopie (localUri) am AVPlayer scheitert. localUri bleibt Fallback (u. a. Android,
  // wo asset.uri ohnehin schon file:// ist).
  const videoSource = isVideo ? (asset.uri ?? details?.localUri ?? null) : null;
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
  });
  // Manche Videos laden fehlerfrei ein Standbild, scheitern aber erst beim eigentlichen
  // Decodieren (AVPlayer/ExoPlayer-Fehler) — dann bliebe die VideoView sonst einfach
  // schwarz stehen, ohne dass wir das je erfahren. Also den echten Player-Status verfolgen.
  const { status: playerStatus } = useEvent(player, 'statusChange', { status: player.status });
  const playbackFailed = isVideo && playerStatus === 'error';

  useEffect(() => {
    if (playbackFailed) setPlaying(false);
  }, [playbackFailed]);

  const canPlay = isVideo && isActive && !!videoSource && !playbackFailed;

  const togglePlay = () => {
    if (!canPlay) return;
    if (playing) {
      player.pause();
      setPlaying(false);
    } else {
      player.play();
      setPlaying(true);
    }
  };

  const filename = details?.filename ?? fileNameFromUri(asset.uri, asset.filename ?? asset.id);
  const date = formatDate(asset.creationTime);
  const size = formatSize(details?.fileSize);
  const duration = isVideo ? formatDuration(asset.duration) : '';

  return (
    <View style={styles.card}>
      {playing && canPlay ? (
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit="cover"
          nativeControls={false}
        />
      ) : (
        displayUri && (
          <Image
            style={StyleSheet.absoluteFill}
            source={{ uri: displayUri }}
            contentFit="cover"
            transition={120}
            onLoadEnd={() => setLoaded(true)}
            recyclingKey={asset.id}
          />
        )
      )}

      {!playing && !posterFailed && (!loaded || !displayUri) && (
        <View style={styles.imgLoader}>
          <ActivityIndicator color={colors.textFaint} />
        </View>
      )}

      {!playing && posterFailed && !playbackFailed && (
        <View style={styles.imgLoader} pointerEvents="none">
          <Feather name="film" size={28} color={colors.textFaint} />
        </View>
      )}

      {/* Player lädt noch (nach Tap auf Play, bevor das erste Bild da ist). */}
      {playing && canPlay && playerStatus === 'loading' && (
        <View style={styles.imgLoader} pointerEvents="none">
          <ActivityIndicator color={colors.textFaint} />
        </View>
      )}

      {isVideo && !playing && !playbackFailed && (loaded || posterFailed) && (
        <PlayBadge icon="play" onPress={canPlay ? togglePlay : undefined} />
      )}

      {isVideo && playing && canPlay && <PlayBadge icon="pause" onPress={togglePlay} />}

      {/* Decodierung ist am eigentlichen Player gescheitert (nicht nur am Thumbnail) —
          eindeutig als kaputt markieren statt einen toten Play-Button zu zeigen. */}
      {isVideo && playbackFailed && (
        <View style={styles.imgLoader} pointerEvents="none">
          <Feather name="alert-triangle" size={26} color={colors.textFaint} />
        </View>
      )}

      {/* Film-Grain-Overlay (gekacheltes Rauschen, soft-light-artig). */}
      <View style={styles.grain} pointerEvents="none">
        <RNImage source={grain} style={styles.grainImage} resizeMode="repeat" />
      </View>

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
        {!!duration && <Chip text={duration} />}
      </View>

      {/* Stamps nur auf der aktiven Karte. */}
      {translateX && <Stamps translateX={translateX} />}
    </View>
  );
}

/** Play/Pause-Badge, zentriert. Ohne `onPress` (inaktive Stack-Karte) rein dekorativ. */
function PlayBadge({ icon, onPress }: { icon: 'play' | 'pause'; onPress?: () => void }) {
  return (
    <Pressable style={styles.playBadge} onPress={onPress} disabled={!onPress} hitSlop={20}>
      <Glass
        tint={colors.scrimChip}
        border={colors.scrimChipBorder}
        radius={radius.circle}
        intensity={blur.light}
        style={[styles.playBadgeInner, icon === 'play' && styles.playBadgeIconNudge]}
      >
        <Feather name={icon} size={18} color={colors.text} />
      </Glass>
    </Pressable>
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
  playBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadgeInner: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBadgeIconNudge: {
    paddingLeft: 3, // optisch zentrieren, Play-Dreieck wirkt sonst nach links versetzt
  },
  grain: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  grainImage: {
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
