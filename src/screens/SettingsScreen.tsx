import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Switch,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { colors, font, radius, spacing } from '../theme';
import { APP_NAME, LARGE_FILE_THRESHOLD_BYTES } from '../constants';
import { useStore } from '../state/store';
import { usePurchasesStore } from '../state/purchases';
import { listAlbums, type AlbumInfo } from '../media';
import type { SortOrder, SmartFilter } from '../db/settings';
import { formatSize } from '../utils/format';
import Screen from '../components/Screen';
import { Glass } from '../components/Glass';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SMART_FILTER_OPTIONS: { value: SmartFilter; label: string; hint: string }[] = [
  { value: 'none', label: 'Aus', hint: 'Alle Fotos in normaler Reihenfolge' },
  { value: 'screenshots', label: 'Nur Screenshots', hint: 'Zeigt ausschliesslich Screenshots' },
  {
    value: 'large',
    label: 'Grosse Dateien',
    hint: `Ab ${formatSize(LARGE_FILE_THRESHOLD_BYTES)} pro Foto/Video`,
  },
  { value: 'duplicates', label: 'Duplikate', hint: 'Ähnliche Serienbilder direkt hintereinander' },
];

export default function SettingsScreen() {
  const nav = useNavigation<Nav>();
  const { state, updateSetting, resetHistory } = useStore();
  const { isPro } = usePurchasesStore();
  const s = state.settings;
  const [albums, setAlbums] = useState<AlbumInfo[] | null>(null);
  const [showAlbums, setShowAlbums] = useState(false);
  const [showSmartFilter, setShowSmartFilter] = useState(false);

  const openPaywall = useCallback(() => nav.navigate('Paywall', {}), [nav]);

  const onToggleVideos = useCallback(
    (v: boolean) => {
      if (v && !isPro) {
        openPaywall();
        return;
      }
      void updateSetting('includeVideos', v);
    },
    [isPro, openPaywall, updateSetting],
  );

  const onSmartFilterRow = useCallback(() => {
    if (!isPro) {
      openPaywall();
      return;
    }
    setShowSmartFilter((v) => !v);
  }, [isPro, openPaywall]);

  const pickSmartFilter = useCallback(
    (value: SmartFilter) => {
      setShowSmartFilter(false);
      void updateSetting('smartFilter', value);
    },
    [updateSetting],
  );

  const onStats = useCallback(() => {
    if (!isPro) {
      openPaywall();
      return;
    }
    nav.navigate('Stats');
  }, [isPro, openPaywall, nav]);

  useEffect(() => {
    if (showAlbums && albums === null) {
      void listAlbums().then(setAlbums);
    }
  }, [showAlbums, albums]);

  const confirmReset = useCallback(() => {
    Alert.alert(
      'Verlauf zurücksetzen?',
      'Alle deine Behalten-/Löschen-Entscheidungen werden gelöscht. Du beginnst von vorn. (Bereits gelöschte Fotos kommen dadurch nicht zurück.)',
      [
        { text: 'Abbrechen', style: 'cancel' },
        {
          text: 'Zurücksetzen',
          style: 'destructive',
          onPress: () => void resetHistory(),
        },
      ],
    );
  }, [resetHistory]);

  const pickAlbum = useCallback(
    (album: AlbumInfo | null) => {
      setShowAlbums(false);
      if (album && !isPro) {
        openPaywall();
        return;
      }
      void updateSetting('albumId', album ? album.id : null);
      void updateSetting('albumTitle', album ? album.title : null);
    },
    [isPro, openPaywall, updateSetting],
  );

  return (
    <Screen glow>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10}>
          <Glass style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.text} />
          </Glass>
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Einstellungen</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Cull Pro */}
        {isPro ? (
          <Section label="CULL PRO">
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{APP_NAME} Pro aktiv</Text>
              <Feather name="check" size={18} color={colors.keepText} />
            </View>
          </Section>
        ) : (
          <Pressable onPress={openPaywall}>
            {({ pressed }) => (
              <Glass tint={colors.glassStrong} border={colors.glassBorderStrong} style={[styles.promoCard, pressed && styles.pressed]}>
                <View style={styles.promoIcon}>
                  <Feather name="zap" size={18} color={colors.accent} />
                </View>
                <View style={styles.rowTextWrap}>
                  <Text style={styles.promoTitle}>{APP_NAME} Pro freischalten</Text>
                  <Text style={styles.promoHint}>Unbegrenzt löschen · Album-Filter · Videos · mehr</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colors.accent} />
              </Glass>
            )}
          </Pressable>
        )}

        {/* Sortierung */}
        <Section label="SORTIERUNG">
          <Segmented<SortOrder>
            value={s.sortOrder}
            options={[
              { value: 'newest', label: 'Neueste zuerst' },
              { value: 'oldest', label: 'Älteste zuerst' },
            ]}
            onChange={(v) => void updateSetting('sortOrder', v)}
          />
        </Section>

        {/* Schalter */}
        <Section label="DURCHGEHEN">
          <ToggleRow
            label="Videos einbeziehen"
            hint={isPro ? undefined : 'Pro'}
            value={s.includeVideos}
            onChange={onToggleVideos}
          />
          <ToggleRow
            label="Favoriten überspringen"
            hint="Favorisierte Fotos sind meist Keeper."
            value={s.skipFavorites}
            onChange={(v) => void updateSetting('skipFavorites', v)}
          />
          <ToggleRow
            label="Haptisches Feedback"
            value={s.haptics}
            onChange={(v) => void updateSetting('haptics', v)}
          />
        </Section>

        {/* Album-Filter */}
        <Section label="QUELLE">
          <Pressable style={styles.row} onPress={() => setShowAlbums((v) => !v)}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowLabel}>Album</Text>
              <Text style={styles.rowHint}>{s.albumTitle ?? 'Alle Fotos'}</Text>
            </View>
            <Feather
              name={showAlbums ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.textFaint}
            />
          </Pressable>

          {showAlbums && (
            <View style={styles.albumList}>
              <AlbumOption
                title="Alle Fotos"
                selected={s.albumId === null}
                onPress={() => pickAlbum(null)}
              />
              {albums === null ? (
                <ActivityIndicator color={colors.textFaint} style={{ marginVertical: 12 }} />
              ) : (
                albums.map((a) => (
                  <AlbumOption
                    key={a.id}
                    title={a.title}
                    count={a.count}
                    selected={s.albumId === a.id}
                    onPress={() => pickAlbum(a)}
                  />
                ))
              )}
            </View>
          )}
        </Section>

        {/* Smart-Filter & Statistik (Pro) */}
        <Section label="SMART">
          <Pressable style={styles.row} onPress={onSmartFilterRow}>
            <View style={styles.rowTextWrap}>
              <Text style={styles.rowLabel}>Smart-Filter</Text>
              <Text style={styles.rowHint}>
                {isPro
                  ? (SMART_FILTER_OPTIONS.find((o) => o.value === s.smartFilter)?.label ?? 'Aus')
                  : 'Screenshots · grosse Dateien · Duplikate'}
              </Text>
            </View>
            {isPro ? (
              <Feather
                name={showSmartFilter ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={colors.textFaint}
              />
            ) : (
              <ProBadge />
            )}
          </Pressable>

          {isPro && showSmartFilter && (
            <View style={styles.albumList}>
              {SMART_FILTER_OPTIONS.map((o) => (
                <FilterOption
                  key={o.value}
                  title={o.label}
                  hint={o.hint}
                  selected={s.smartFilter === o.value}
                  onPress={() => pickSmartFilter(o.value)}
                />
              ))}
            </View>
          )}

          <Pressable style={styles.row} onPress={onStats}>
            <Text style={styles.rowLabel}>Freigegebener Speicher</Text>
            {isPro ? (
              <Feather name="chevron-right" size={18} color={colors.textFaint} />
            ) : (
              <ProBadge />
            )}
          </Pressable>
        </Section>

        {/* Verlauf */}
        <Section label="VERLAUF">
          <Pressable style={styles.row} onPress={confirmReset}>
            <Text style={[styles.rowLabel, { color: colors.deleteText }]}>Verlauf zurücksetzen</Text>
            <Feather name="rotate-ccw" size={18} color={colors.deleteText} />
          </Pressable>
        </Section>

        {/* Sicherer Hinweis */}
        <Glass style={styles.note}>
          <Feather name="shield" size={14} color={colors.textFaint} />
          <Text style={styles.noteText}>
            Gelöschte Fotos landen auf iOS für 30 Tage in „Zuletzt gelöscht" — nichts ist sofort
            für immer weg. Alles passiert lokal; {APP_NAME} sendet nichts an irgendeinen Server.
          </Text>
        </Glass>
      </ScrollView>
    </Screen>
  );
}

function ProBadge() {
  return (
    <View style={styles.proBadge}>
      <Text style={styles.proBadgeText}>PRO</Text>
    </View>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <Glass style={styles.card}>{children}</Glass>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowTextWrap}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint && <Text style={styles.rowHint}>{hint}</Text>}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: 'rgba(255,255,255,0.18)', true: colors.accent }}
        thumbColor={colors.white}
        ios_backgroundColor="rgba(255,255,255,0.18)"
      />
    </View>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(o.value)}
          >
            <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function FilterOption({
  title,
  hint,
  selected,
  onPress,
}: {
  title: string;
  hint: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.albumOption} onPress={onPress}>
      <View style={styles.rowTextWrap}>
        <Text style={[styles.albumTitle, selected && styles.albumTitleActive]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.filterOptionHint}>{hint}</Text>
      </View>
      {selected && <Feather name="check" size={16} color={colors.accent} />}
    </Pressable>
  );
}

function AlbumOption({
  title,
  count,
  selected,
  onPress,
}: {
  title: string;
  count?: number;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.albumOption} onPress={onPress}>
      <Text style={[styles.albumTitle, selected && styles.albumTitleActive]} numberOfLines={1}>
        {title}
        {count != null ? `  (${count})` : ''}
      </Text>
      {selected && <Feather name="check" size={16} color={colors.accent} />}
    </Pressable>
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

  scroll: { padding: spacing.screenH, paddingBottom: 40, gap: 22 },
  section: { gap: 9 },
  sectionLabel: {
    fontFamily: font.monoMed,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.textFaint,
    marginLeft: 2,
  },
  card: { padding: 0 },
  pressed: { opacity: 0.85 },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  promoIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(194,84,63,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoTitle: { fontFamily: font.sansSemi, fontSize: 14, color: colors.text },
  promoHint: { fontFamily: font.mono, fontSize: 11, color: colors.textDim, marginTop: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowTextWrap: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: font.sansMed, fontSize: 14, color: colors.text },
  rowHint: { fontFamily: font.mono, fontSize: 11, color: colors.textFaint },
  proBadge: {
    borderWidth: 0.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    borderRadius: radius.circle,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  proBadgeText: { fontFamily: font.monoSemi, fontSize: 9, letterSpacing: 0.8, color: colors.accent },

  segmented: { flexDirection: 'row', padding: 5, gap: 5 },
  segment: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentActive: { backgroundColor: 'rgba(255,255,255,0.12)' },
  segmentText: { fontFamily: font.sansMed, fontSize: 13, color: colors.textFaint },
  segmentTextActive: { color: colors.text },

  albumList: { borderTopWidth: 0.5, borderTopColor: colors.glassBorder, paddingVertical: 4 },
  albumOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  albumTitle: { flex: 1, fontFamily: font.sans, fontSize: 13, color: colors.textDim },
  albumTitleActive: { color: colors.text, fontFamily: font.sansSemi },
  filterOptionHint: { fontFamily: font.mono, fontSize: 10, color: colors.textFaint, marginTop: 2 },

  note: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
  },
  noteText: { flex: 1, fontFamily: font.mono, fontSize: 11, lineHeight: 17, color: colors.textFaint },
});
