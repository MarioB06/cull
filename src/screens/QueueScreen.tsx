import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { colors, font, spacing, blur } from '../theme';
import Screen from '../components/Screen';
import { Glass } from '../components/Glass';
import { DRY_RUN } from '../constants';
import { useStore } from '../state/store';
import { usePurchasesStore } from '../state/purchases';
import { canCommitDelete } from '../purchases/gating';
import { getQueue, countDeletedLifetime } from '../db/decisions';
import type { DecisionRow } from '../db/index';
import { getUriById } from '../media';
import { formatFreedSize, fileNameFromUri } from '../utils/format';
import { hapticSelection, hapticDelete } from '../utils/haptics';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function QueueScreen() {
  const nav = useNavigation<Nav>();
  const store = useStore();
  const { isPro } = usePurchasesStore();
  const [rows, setRows] = useState<DecisionRow[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    const q = await getQueue();
    setRows(q);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const deselect = useCallback(
    (assetId: string) => {
      hapticSelection();
      setRows((prev) => prev.filter((r) => r.asset_id !== assetId));
      void store.removeFromQueue(assetId);
    },
    [store],
  );

  const onCommit = useCallback(async () => {
    if (rows.length === 0 || deleting) return;

    // Limit-Trigger: würde diese Charge das Free-Limit überschreiten, gar nicht erst
    // löschen (kein Off-by-one-Abschnitt mitten im Batch) — stattdessen die Paywall.
    const allowed = await canCommitDelete(rows.length, isPro);
    if (!allowed) {
      nav.navigate('Paywall', {});
      return;
    }

    // Für den Freed-Space-Aufhänger: war das die allererste jemals abgeschlossene Löschung?
    const wasFirstEver = !isPro && (await countDeletedLifetime()) === 0;

    hapticDelete();
    setDeleting(true);
    try {
      const result = await store.commitDelete();
      if (result.error) {
        Alert.alert('Löschen fehlgeschlagen', result.error);
        await load();
      } else if (result.cancelled) {
        // Nutzer hat den System-Dialog abgebrochen — nichts ändern.
        await load();
      } else {
        // Erfolg (ggf. Teil-Erfolg). Zurück zum Swipe.
        await load();
        if (result.deletedIds.length > 0) {
          nav.goBack();
          // Value-first: den Freed-Space-Moment nur nach der allerersten Löschung als
          // Paywall-Aufhänger zeigen, nicht bei jedem Commit.
          if (wasFirstEver) {
            nav.navigate('Paywall', { freedBytes: result.freedBytes });
          }
        }
      }
    } finally {
      setDeleting(false);
    }
  }, [rows.length, deleting, isPro, store, load, nav]);

  const freed = formatFreedSize(rows.map((r) => r.file_size));
  const count = rows.length;

  return (
    <Screen glow>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10}>
          <Glass style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Glass>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Lösch-Queue</Text>
          <Text style={styles.subtitle}>
            {count} markiert · antippen zum abwählen
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* Inhalt */}
      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.textFaint} />
        </View>
      ) : count === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyBig}>QUEUE LEER</Text>
          <Text style={styles.emptySub}>Keine Fotos zum Löschen markiert.</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.asset_id}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.gridRow}
          renderItem={({ item }) => <QueueItem row={item} onDeselect={deselect} />}
          initialNumToRender={18}
          windowSize={5}
          removeClippedSubviews
        />
      )}

      {/* Sticky Delete-Leiste */}
      {count > 0 && (
        <View style={styles.stickyWrap} pointerEvents="box-none">
          <LinearGradient
            colors={['transparent', colors.canvas]}
            locations={[0, 0.5]}
            style={styles.stickyGradient}
            pointerEvents="none"
          />
          <View style={styles.stickyInner}>
            <Pressable onPress={onCommit} disabled={deleting}>
              {({ pressed }) => (
                <Glass
                  tint={colors.deleteGlass}
                  border={colors.deleteGlassBorder}
                  style={[styles.deleteBtn, pressed && styles.deleteBtnPressed]}
                >
                  {deleting ? (
                    <ActivityIndicator color={colors.deleteText} />
                  ) : (
                    <>
                      <Feather name="trash-2" size={18} color={colors.deleteText} />
                      <Text style={styles.deleteText}>Endgültig löschen</Text>
                      <Text style={styles.deleteCount}>({count})</Text>
                    </>
                  )}
                </Glass>
              )}
            </Pressable>
            <Text style={styles.freedText}>
              {freed} werden freigegeben{DRY_RUN ? ' · TESTMODUS' : ''}
            </Text>
          </View>
        </View>
      )}
    </Screen>
  );
}

function QueueItem({
  row,
  onDeselect,
}: {
  row: DecisionRow;
  onDeselect: (id: string) => void;
}) {
  const [uri, setUri] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getUriById(row.asset_id).then((u) => {
        if (active) {
          setUri(u);
          setResolved(true);
        }
      });
      return () => {
        active = false;
      };
    }, [row.asset_id]),
  );

  const frameId = fileNameFromUri(uri, row.asset_id.slice(0, 8));

  return (
    <Pressable style={styles.item} onPress={() => onDeselect(row.asset_id)}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumb} contentFit="cover" transition={100} />
      ) : (
        <View style={[styles.thumb, styles.thumbPlaceholder]}>
          {!resolved && <ActivityIndicator size="small" color={colors.textFaint} />}
        </View>
      )}
      <View style={styles.thumbOverlay} pointerEvents="none" />
      <Glass
        tint={colors.scrimChip}
        border={colors.scrimChipBorder}
        radius={11}
        intensity={blur.light}
        style={styles.xBadge}
      >
        <Feather name="x" size={12} color={colors.text} />
      </Glass>
      <Text style={styles.frameId} numberOfLines={1} pointerEvents="none">
        {frameId}
      </Text>
    </Pressable>
  );
}

const GAP = 9;

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenH,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSpacer: { width: 40 },
  headerText: { flex: 1, alignItems: 'center' },
  title: { fontFamily: font.sansMed, fontSize: 16, color: colors.text },
  subtitle: {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: 0.4,
    color: colors.textFaint,
    marginTop: 3,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyBig: { fontFamily: font.monoMed, fontSize: 16, letterSpacing: 2, color: colors.textFaint },
  emptySub: { fontFamily: font.sans, fontSize: 13, color: colors.textDim },

  grid: { padding: spacing.screenH, paddingBottom: 140 },
  gridRow: { gap: GAP, marginBottom: GAP },
  item: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  thumb: { width: '100%', height: '100%', backgroundColor: '#0a0805' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.22)',
  },
  xBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameId: {
    position: 'absolute',
    bottom: 5,
    left: 6,
    right: 6,
    fontFamily: font.mono,
    fontSize: 8,
    color: colors.textDim,
  },

  stickyWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  stickyGradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 120 },
  stickyInner: { paddingHorizontal: spacing.screenH, paddingBottom: 18, paddingTop: 8, gap: 8 },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 56,
  },
  deleteBtnPressed: { opacity: 0.85 },
  deleteText: { fontFamily: font.sansSemi, fontSize: 16, color: colors.deleteText },
  deleteCount: { fontFamily: font.monoMed, fontSize: 14, color: colors.deleteText },
  freedText: {
    fontFamily: font.mono,
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
