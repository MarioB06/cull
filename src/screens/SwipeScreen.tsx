import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  AppState,
  ActivityIndicator,
  Pressable,
  type AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { colors, fonts, spacing } from '../theme';
import { APP_NAME, PREFETCH_COUNT } from '../constants';
import { useStore } from '../state/store';
import { setHapticsEnabled, hapticCommit, hapticSelection } from '../utils/haptics';
import { getCoachShown, setCoachShown } from '../db/flags';
import CardStack, { type CardStackHandle } from '../components/CardStack';
import Controls from '../components/Controls';
import QueuePille from '../components/QueuePille';
import PermissionGate from '../components/PermissionGate';
import LimitedBanner from '../components/LimitedBanner';
import FirstRunCoach from '../components/FirstRunCoach';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SwipeScreen() {
  const nav = useNavigation<Nav>();
  const store = useStore();
  const { state } = store;
  const cardRef = useRef<CardStackHandle>(null);
  const didInit = useRef(false);

  // Einmalige Initialisierung.
  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    void store.initialize();
  }, [store]);

  // First-Run-Coach: einmaliger Hinweis auf der allerersten Swipe-Karte.
  const [showCoach, setShowCoach] = React.useState(false);
  const coachHandled = useRef(false);
  useEffect(() => {
    void getCoachShown().then((shown) => {
      if (!shown) setShowCoach(true);
    });
  }, []);
  const dismissCoach = useCallback(() => {
    if (coachHandled.current) return;
    coachHandled.current = true;
    setShowCoach(false);
    void setCoachShown(true);
  }, []);

  // Haptik-Setting in den Helper spiegeln.
  useEffect(() => {
    setHapticsEnabled(state.settings.haptics);
  }, [state.settings.haptics]);

  // Permissions beim Zurückkehren aus dem Hintergrund neu prüfen.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') void store.recheckPermission();
    });
    return () => sub.remove();
  }, [store]);

  // Details der aktiven Karte laden + nächste Bilder vorladen.
  const pool = state.pool;
  useEffect(() => {
    if (pool.length === 0) return;
    void store.loadDetails(pool[0]);
    const next = pool.slice(1, 1 + PREFETCH_COUNT);
    next.forEach((a) => void store.loadDetails(a));
    const uris = pool
      .slice(0, 1 + PREFETCH_COUNT)
      .map((a) => state.detailsCache[a.id]?.localUri ?? a.uri)
      .filter((u): u is string => !!u);
    if (uris.length > 0) Image.prefetch(uris).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool, store]);

  // Favoriten automatisch behalten (überspringen), wenn aktiviert.
  useEffect(() => {
    if (!state.settings.skipFavorites) return;
    const top = pool[0];
    if (!top) return;
    const det = state.detailsCache[top.id];
    if (det && det.isFavorite) {
      void store.autoKeep(top.id);
    }
  }, [pool, state.detailsCache, state.settings.skipFavorites, store]);

  const handleKeep = useCallback(() => {
    dismissCoach();
    return store.decideKeep();
  }, [store, dismissCoach]);
  const handleDelete = useCallback(() => {
    dismissCoach();
    return store.decideDelete();
  }, [store, dismissCoach]);
  const handleUndo = useCallback(() => {
    hapticSelection();
    void store.undo();
  }, [store]);

  const openQueue = useCallback(() => nav.navigate('Queue'), [nav]);
  const openSettings = useCallback(() => nav.navigate('Settings'), [nav]);

  return (
    <PermissionGate>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <LimitedBanner />
        <Content
          store={store}
          cardRef={cardRef}
          onKeep={handleKeep}
          onDelete={handleDelete}
          onUndo={handleUndo}
          openQueue={openQueue}
          openSettings={openSettings}
          showCoach={showCoach}
        />
      </SafeAreaView>
    </PermissionGate>
  );
}

interface ContentProps {
  store: ReturnType<typeof useStore>;
  cardRef: React.RefObject<CardStackHandle | null>;
  onKeep: () => void;
  onDelete: () => void;
  onUndo: () => void;
  openQueue: () => void;
  openSettings: () => void;
  showCoach: boolean;
}

function Content({ store, cardRef, onKeep, onDelete, onUndo, openQueue, openSettings, showCoach }: ContentProps) {
  const { state } = store;
  const { processed, totalCount, pool, queueCount, counts, loading, hasNextPage } = state;
  const progress = totalCount > 0 ? Math.min(1, processed / totalCount) : 0;

  // Pool leer aber noch Seiten offen → nachladen.
  useEffect(() => {
    if (pool.length === 0 && hasNextPage && !loading) {
      void store.reloadGallery();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pool.length, hasNextPage, loading]);

  // --- Zustände ---
  if (loading && pool.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.cream} />
        <Text style={styles.loadingText}>Galerie wird geladen …</Text>
      </View>
    );
  }

  // Keine Fotos in der Bibliothek.
  if (totalCount === 0) {
    return (
      <View style={styles.center}>
        <Feather name="image" size={40} color={colors.cream30} />
        <Text style={styles.bigState}>KEINE FOTOS</Text>
        <Text style={styles.subState}>
          In deiner Mediathek gibt es nichts zum Durchgehen.
        </Text>
      </View>
    );
  }

  // Alles durchgesehen.
  if (pool.length === 0) {
    return (
      <View style={styles.center}>
        <Feather name="check-circle" size={42} color={colors.greenText} />
        <Text style={styles.bigState}>DURCH!</Text>
        <Text style={styles.subState}>
          {counts.kept} behalten · {counts.queued + counts.deleted} aussortiert
        </Text>
        {queueCount > 0 ? (
          <>
            <Text style={styles.hintState}>
              {queueCount} Foto{queueCount === 1 ? '' : 's'} warten in der Lösch-Queue.
            </Text>
            <Pressable
              style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
              onPress={openQueue}
            >
              <Feather name="trash-2" size={16} color={colors.onRed} />
              <Text style={styles.ctaText}>Queue prüfen</Text>
            </Pressable>
          </>
        ) : (
          <Text style={styles.hintState}>Alles aufgeräumt. Gut gemacht.</Text>
        )}
      </View>
    );
  }

  // --- Normaler Swipe-Screen ---
  return (
    <View style={styles.flex}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.counterRow}>
            <Text style={styles.counterDone}>{processed}</Text>
            <Text style={styles.counterTotal}> / {totalCount}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>DURCHGESEHEN</Text>
        </View>
        <View style={styles.headerRight}>
          {queueCount > 0 && <QueuePille count={queueCount} onPress={openQueue} />}
          <Pressable onPress={openSettings} hitSlop={10} style={styles.gear}>
            <Feather name="sliders" size={18} color={colors.cream40} />
          </Pressable>
        </View>
      </View>

      {/* Karten-Stapel */}
      <View style={styles.stackArea}>
        <CardStack
          ref={cardRef}
          pool={pool}
          detailsCache={state.detailsCache}
          onKeep={onKeep}
          onDelete={onDelete}
          onCommitHaptic={hapticCommit}
        />
        {showCoach && <FirstRunCoach />}
      </View>

      {/* Swipe-Hinweis */}
      <View style={styles.hintRow}>
        <Text style={styles.hintDelete}>← LÖSCHEN</Text>
        <Text style={styles.hintDot}> · </Text>
        <Text style={styles.hintKeep}>BEHALTEN →</Text>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <Controls
          canUndo={state.undoDepth > 0}
          onUndo={onUndo}
          onDelete={() => cardRef.current?.swipe(-1)}
          onKeep={() => cardRef.current?.swipe(1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 14,
  },
  loadingText: { fontFamily: fonts.mono400, fontSize: 12, color: colors.cream40 },
  bigState: {
    fontFamily: fonts.mono600,
    fontSize: 22,
    letterSpacing: 2,
    color: colors.cream,
    marginTop: 4,
  },
  subState: {
    fontFamily: fonts.mono400,
    fontSize: 12,
    color: colors.cream55,
    textAlign: 'center',
  },
  hintState: {
    fontFamily: fonts.sans400,
    fontSize: 13,
    color: colors.cream40,
    textAlign: 'center',
    marginTop: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    backgroundColor: colors.redFill,
    paddingVertical: 13,
    paddingHorizontal: 22,
    borderRadius: 14,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { fontFamily: fonts.sans600, fontSize: 15, color: colors.onRed },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.screenH,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerLeft: { flex: 1, paddingRight: 12 },
  counterRow: { flexDirection: 'row', alignItems: 'baseline' },
  counterDone: { fontFamily: fonts.mono500, fontSize: 15, color: colors.cream },
  counterTotal: { fontFamily: fonts.mono400, fontSize: 15, color: colors.cream38 },
  progressTrack: {
    height: 2,
    backgroundColor: colors.cream13,
    borderRadius: 1,
    marginTop: 8,
    overflow: 'hidden',
    maxWidth: 180,
  },
  progressFill: { height: 2, backgroundColor: colors.cream70 },
  progressLabel: {
    fontFamily: fonts.mono400,
    fontSize: 9,
    letterSpacing: 1.6,
    color: colors.cream30,
    marginTop: 6,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2 },
  gear: { padding: 4 },

  stackArea: {
    flex: 1,
    marginHorizontal: spacing.screenH,
    marginTop: 6,
    marginBottom: 6,
  },

  hintRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10 },
  hintDelete: { fontFamily: fonts.mono400, fontSize: 9, letterSpacing: 1.4, color: 'rgba(217,116,95,0.6)' },
  hintKeep: { fontFamily: fonts.mono400, fontSize: 9, letterSpacing: 1.4, color: 'rgba(147,179,132,0.6)' },
  hintDot: { fontFamily: fonts.mono400, fontSize: 9, color: colors.cream30 },

  controls: { paddingBottom: 14, paddingTop: 4 },
});
