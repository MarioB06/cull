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
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { colors, font, radius } from '../theme';
import { PREFETCH_COUNT } from '../constants';
import { useStore } from '../state/store';
import { setHapticsEnabled, hapticCommit, hapticSelection } from '../utils/haptics';
import { getCoachShown, setCoachShown } from '../db/flags';
import Screen from '../components/Screen';
import AmbientScreen from '../components/AmbientScreen';
import { Glass } from '../components/Glass';
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

  // --- Zustände ohne Foto: warme Ambiente + Glas-Panel. ---
  if (loading && pool.length === 0) {
    return (
      <AmbientScreen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
          <Text style={styles.loadingText}>Galerie wird geladen …</Text>
        </View>
      </AmbientScreen>
    );
  }

  if (totalCount === 0) {
    return (
      <AmbientScreen>
        <View style={styles.center}>
          <Glass style={styles.statePanel}>
            <Feather name="image" size={32} color={colors.textFaint} />
            <Text style={styles.bigState}>KEINE FOTOS</Text>
            <Text style={styles.subState}>In deiner Mediathek gibt es nichts zum Durchgehen.</Text>
          </Glass>
        </View>
      </AmbientScreen>
    );
  }

  if (pool.length === 0) {
    return (
      <AmbientScreen>
        <View style={styles.center}>
          <Glass style={styles.statePanel}>
            <Feather name="check-circle" size={34} color={colors.keepText} />
            <Text style={styles.bigState}>DURCH!</Text>
            <Text style={styles.subState}>
              {counts.kept} behalten · {counts.queued + counts.deleted} aussortiert
            </Text>
            {queueCount > 0 ? (
              <>
                <Text style={styles.hintState}>
                  {queueCount} Foto{queueCount === 1 ? '' : 's'} warten in der Lösch-Queue.
                </Text>
                <Pressable onPress={openQueue}>
                  {({ pressed }) => (
                    <Glass
                      tint={colors.deleteGlass}
                      border={colors.deleteGlassBorder}
                      style={[styles.cta, pressed && styles.ctaPressed]}
                    >
                      <Feather name="trash-2" size={16} color={colors.deleteText} />
                      <Text style={styles.ctaText}>Queue prüfen</Text>
                    </Glass>
                  )}
                </Pressable>
              </>
            ) : (
              <Text style={styles.hintState}>Alles aufgeräumt. Gut gemacht.</Text>
            )}
          </Glass>
        </View>
      </AmbientScreen>
    );
  }

  // --- Normaler Swipe-Screen: Glas-Chrome in eigenem Bereich, Foto bleibt vollständig frei. ---
  return (
    <Screen edges={['top', 'bottom']}>
      <LimitedBanner />

      {/* Chrome oben — eigene Zeile, überlappt die Karte nicht. */}
      <View style={styles.topBar}>
        <Glass style={styles.progressPanel}>
          <View style={styles.counterRow}>
            <Text style={styles.counterDone}>{processed}</Text>
            <Text style={styles.counterTotal}> / {totalCount}</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        </Glass>
        <View style={styles.topBarRight}>
          {queueCount > 0 && <QueuePille count={queueCount} onPress={openQueue} />}
          <Pressable onPress={openSettings} hitSlop={10}>
            {({ pressed }) => (
              <Glass style={[styles.gear, pressed && styles.pressed]}>
                <Feather name="sliders" size={16} color={colors.text} />
              </Glass>
            )}
          </Pressable>
        </View>
      </View>

      {/* Karten-Stapel — bekommt den ganzen restlichen Platz, nichts überlappt das Foto. */}
      <View style={styles.cardArea}>
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

      {/* Chrome unten — eigene Zeile. */}
      <View style={styles.bottomBar}>
        <Text style={styles.hintRow}>
          <Text style={styles.hintDelete}>← LÖSCHEN</Text>
          <Text style={styles.hintDot}> · </Text>
          <Text style={styles.hintKeep}>BEHALTEN →</Text>
        </Text>
        <Controls
          canUndo={state.undoDepth > 0}
          onUndo={onUndo}
          onDelete={() => cardRef.current?.swipe(-1)}
          onKeep={() => cardRef.current?.swipe(1)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  statePanel: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 28,
    paddingHorizontal: 26,
    minWidth: 220,
  },
  loadingText: { fontFamily: font.mono, fontSize: 12, color: colors.textFaint, marginTop: 14 },
  bigState: {
    fontFamily: font.monoSemi,
    fontSize: 20,
    letterSpacing: 2,
    color: colors.text,
    marginTop: 2,
  },
  subState: {
    fontFamily: font.mono,
    fontSize: 12,
    color: colors.textDim,
    textAlign: 'center',
  },
  hintState: {
    fontFamily: font.sans,
    fontSize: 13,
    color: colors.textFaint,
    textAlign: 'center',
    marginTop: 4,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 13,
    paddingHorizontal: 22,
  },
  ctaPressed: { opacity: 0.8 },
  ctaText: { fontFamily: font.sansSemi, fontSize: 15, color: colors.deleteText },

  cardArea: {
    flex: 1,
    marginHorizontal: 14,
    marginBottom: 14,
  },

  topBar: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  progressPanel: { paddingHorizontal: 14, paddingVertical: 10, minWidth: 108 },
  counterRow: { flexDirection: 'row', alignItems: 'baseline' },
  counterDone: { fontFamily: font.monoMed, fontSize: 15, color: colors.text },
  counterTotal: { fontFamily: font.mono, fontSize: 13, color: colors.textFaint },
  progressTrack: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
    width: 90,
  },
  progressFill: { height: 3, backgroundColor: colors.white, borderRadius: 2 },

  topBarRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  gear: {
    width: 38,
    height: 38,
    borderRadius: radius.circle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.75 },

  bottomBar: {
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 14,
    alignItems: 'center',
    gap: 12,
  },
  hintRow: { textAlign: 'center' },
  hintDelete: { fontFamily: font.mono, fontSize: 9, letterSpacing: 1.4, color: 'rgba(226,120,95,0.75)' },
  hintKeep: { fontFamily: font.mono, fontSize: 9, letterSpacing: 1.4, color: 'rgba(147,179,132,0.75)' },
  hintDot: { fontFamily: font.mono, fontSize: 9, color: colors.textFaint },
});
