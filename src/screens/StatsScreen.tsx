import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { colors, font, spacing } from '../theme';
import { countByDecision, sumFreedBytesLifetime, getWeeklyFreedBytes } from '../db/decisions';
import { formatSize } from '../utils/format';
import Screen from '../components/Screen';
import { Glass } from '../components/Glass';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const WEEKS = 8;

interface StatsData {
  freedBytes: number;
  deleted: number;
  kept: number;
  weekly: number[];
}

export default function StatsScreen() {
  const nav = useNavigation<Nav>();
  const [data, setData] = useState<StatsData | null>(null);

  useEffect(() => {
    void (async () => {
      const [freedBytes, byDecision, weekly] = await Promise.all([
        sumFreedBytesLifetime(),
        countByDecision(),
        getWeeklyFreedBytes(WEEKS),
      ]);
      setData({ freedBytes, deleted: byDecision.deleted, kept: byDecision.kept, weekly });
    })();
  }, []);

  return (
    <Screen glow>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10}>
          <Glass style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Glass>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Statistik</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {data === null ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.textFaint} />
        </View>
      ) : (
        <View style={styles.body}>
          <Glass style={styles.hero}>
            <Text style={styles.heroLabel}>Insgesamt freigegeben</Text>
            <Text style={styles.heroValue}>{formatSize(data.freedBytes)}</Text>
          </Glass>

          <View style={styles.tileRow}>
            <StatTile label="Fotos gelöscht" value={data.deleted} />
            <StatTile label="Fotos behalten" value={data.kept} />
          </View>

          <Glass style={styles.chartCard}>
            <Text style={styles.chartLabel}>LETZTE {WEEKS} WOCHEN</Text>
            {data.weekly.every((v) => v === 0) ? (
              <Text style={styles.emptyText}>
                Noch keine Löschungen in diesem Zeitraum — leg los und dein Verlauf füllt sich hier.
              </Text>
            ) : (
              <>
                <WeeklyBars values={data.weekly} />
                <View style={styles.axisRow}>
                  <Text style={styles.axisText}>vor {WEEKS} Wo.</Text>
                  <Text style={styles.axisText}>heute</Text>
                </View>
              </>
            )}
          </Glass>
        </View>
      )}
    </Screen>
  );
}

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <Glass style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Glass>
  );
}

const BAR_AREA_HEIGHT = 84;

function WeeklyBars({ values }: { values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <View style={styles.barArea}>
      {values.map((v, i) => {
        const h = Math.max((v / max) * BAR_AREA_HEIGHT, v > 0 ? 3 : 0);
        return (
          <View key={i} style={styles.barSlot}>
            <View style={[styles.bar, { height: h }]} />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenH,
    paddingVertical: 12,
    gap: 12,
  },
  headerSpacer: { width: 40 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, alignItems: 'center' },
  title: { fontFamily: font.sansMed, fontSize: 16, color: colors.text },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  body: { padding: spacing.screenH, gap: 16 },

  hero: { padding: 20, alignItems: 'center', gap: 6 },
  heroLabel: {
    fontFamily: font.monoMed,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.textFaint,
  },
  heroValue: { fontFamily: font.sansBold, fontSize: 40, color: colors.text },

  tileRow: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, padding: 16, gap: 4, alignItems: 'flex-start' },
  tileValue: { fontFamily: font.sansSemi, fontSize: 22, color: colors.text },
  tileLabel: { fontFamily: font.mono, fontSize: 11, color: colors.textFaint },

  chartCard: { padding: 16, gap: 12 },
  chartLabel: {
    fontFamily: font.monoMed,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.textFaint,
  },
  emptyText: {
    fontFamily: font.mono,
    fontSize: 12,
    lineHeight: 18,
    color: colors.textDim,
    paddingVertical: 12,
  },
  barArea: {
    height: BAR_AREA_HEIGHT,
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  barSlot: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  bar: {
    width: '100%',
    maxWidth: 24,
    backgroundColor: colors.accent,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between' },
  axisText: { fontFamily: font.mono, fontSize: 10, color: colors.textFaint },
});
