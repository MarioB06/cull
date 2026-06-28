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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { colors, fonts, radius, spacing } from '../theme';
import { DRY_RUN } from '../constants';
import { useStore } from '../state/store';
import { getQueue } from '../db/decisions';
import type { DecisionRow } from '../db/index';
import { getUriById } from '../media';
import { formatFreedSize, fileNameFromUri } from '../utils/format';
import { hapticSelection, hapticDelete } from '../utils/haptics';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function QueueScreen() {
  const nav = useNavigation<Nav>();
  const store = useStore();
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
        }
      }
    } finally {
      setDeleting(false);
    }
  }, [rows.length, deleting, store, load, nav]);

  const freed = formatFreedSize(rows.map((r) => r.file_size));
  const count = rows.length;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.cream} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Lösch-Queue</Text>
          <Text style={styles.subtitle}>
            {count} MARKIERT · ANTIPPEN ZUM ABWÄHLEN
          </Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      {/* Inhalt */}
      {!loaded ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.cream40} />
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

      {/* Sticky Delete-Button */}
      {count > 0 && (
        <View style={styles.stickyWrap} pointerEvents="box-none">
          <LinearGradient
            colors={['transparent', colors.screenBg]}
            locations={[0, 0.5]}
            style={styles.stickyGradient}
            pointerEvents="none"
          />
          <View style={styles.stickyInner}>
            <Pressable
              style={({ pressed }) => [styles.deleteBtn, pressed && styles.deleteBtnPressed]}
              onPress={onCommit}
              disabled={deleting}
            >
              {deleting ? (
                <ActivityIndicator color={colors.onRed} />
              ) : (
                <>
                  <Feather name="trash-2" size={18} color={colors.onRed} />
                  <Text style={styles.deleteText}>Endgültig löschen</Text>
                  <Text style={styles.deleteCount}>({count})</Text>
                </>
              )}
            </Pressable>
            <Text style={styles.freedText}>
              {freed} werden freigegeben{DRY_RUN ? ' · TESTMODUS' : ''}
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
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
          {!resolved && <ActivityIndicator size="small" color={colors.cream30} />}
        </View>
      )}
      <View style={styles.thumbOverlay} pointerEvents="none" />
      <View style={styles.xBadge} pointerEvents="none">
        <Feather name="x" size={13} color={colors.cream} />
      </View>
      <Text style={styles.frameId} numberOfLines={1} pointerEvents="none">
        {frameId}
      </Text>
    </Pressable>
  );
}

const GAP = 9;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.screenBg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenH,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.cream13,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.cream25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, alignItems: 'center' },
  title: { fontFamily: fonts.sans600, fontSize: 16, color: colors.cream },
  subtitle: {
    fontFamily: fonts.mono400,
    fontSize: 10,
    letterSpacing: 0.8,
    color: colors.cream40,
    marginTop: 3,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  emptyBig: { fontFamily: fonts.mono500, fontSize: 16, letterSpacing: 2, color: colors.cream30 },
  emptySub: { fontFamily: fonts.sans400, fontSize: 13, color: colors.cream55 },

  grid: { padding: spacing.screenH, paddingBottom: 140 },
  gridRow: { gap: GAP, marginBottom: GAP },
  item: { flex: 1, aspectRatio: 1, borderRadius: radius.thumb, overflow: 'hidden' },
  thumb: { width: '100%', height: '100%', backgroundColor: '#0a0805' },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11,9,7,0.25)',
  },
  xBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(11,9,7,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameId: {
    position: 'absolute',
    bottom: 5,
    left: 6,
    right: 6,
    fontFamily: fonts.mono400,
    fontSize: 8,
    color: colors.cream70,
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
    borderRadius: radius.button,
    backgroundColor: colors.redFill,
  },
  deleteBtnPressed: { opacity: 0.85 },
  deleteText: { fontFamily: fonts.sans600, fontSize: 16, color: colors.onRed },
  deleteCount: { fontFamily: fonts.mono500, fontSize: 14, color: colors.onRed },
  freedText: {
    fontFamily: fonts.mono400,
    fontSize: 11,
    color: colors.cream40,
    textAlign: 'center',
  },
});
