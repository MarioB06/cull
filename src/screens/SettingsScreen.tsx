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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { colors, fonts, radius, spacing } from '../theme';
import { APP_NAME } from '../constants';
import { useStore } from '../state/store';
import { listAlbums, type AlbumInfo } from '../media';
import type { SortOrder } from '../db/settings';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export default function SettingsScreen() {
  const nav = useNavigation<Nav>();
  const { state, updateSetting, resetHistory } = useStore();
  const s = state.settings;
  const [albums, setAlbums] = useState<AlbumInfo[] | null>(null);
  const [showAlbums, setShowAlbums] = useState(false);

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
      void updateSetting('albumId', album ? album.id : null);
      void updateSetting('albumTitle', album ? album.title : null);
      setShowAlbums(false);
    },
    [updateSetting],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => nav.goBack()} hitSlop={10} style={styles.backBtn}>
          <Feather name="chevron-left" size={22} color={colors.cream} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={styles.title}>Einstellungen</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
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
            value={s.includeVideos}
            onChange={(v) => void updateSetting('includeVideos', v)}
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
              color={colors.cream40}
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
                <ActivityIndicator color={colors.cream40} style={{ marginVertical: 12 }} />
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

        {/* Verlauf */}
        <Section label="VERLAUF">
          <Pressable style={styles.row} onPress={confirmReset}>
            <Text style={[styles.rowLabel, { color: colors.redText }]}>Verlauf zurücksetzen</Text>
            <Feather name="rotate-ccw" size={18} color={colors.redText} />
          </Pressable>
        </Section>

        {/* Sicherer Hinweis */}
        <View style={styles.note}>
          <Feather name="shield" size={14} color={colors.cream40} />
          <Text style={styles.noteText}>
            Gelöschte Fotos landen auf iOS für 30 Tage in „Zuletzt gelöscht" — nichts ist sofort
            für immer weg. Alles passiert lokal; {APP_NAME} sendet nichts an irgendeinen Server.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
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
        trackColor={{ false: colors.cream13, true: colors.greenFill }}
        thumbColor={colors.cream}
        ios_backgroundColor={colors.cream13}
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
      {selected && <Feather name="check" size={16} color={colors.greenText} />}
    </Pressable>
  );
}

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

  scroll: { padding: spacing.screenH, paddingBottom: 40, gap: 22 },
  section: { gap: 9 },
  sectionLabel: {
    fontFamily: fonts.mono500,
    fontSize: 10,
    letterSpacing: 1.6,
    color: colors.cream40,
    marginLeft: 2,
  },
  card: {
    backgroundColor: 'rgba(236,227,212,0.04)',
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.cream13,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  rowTextWrap: { flex: 1, gap: 2 },
  rowLabel: { fontFamily: fonts.sans500, fontSize: 14, color: colors.cream },
  rowHint: { fontFamily: fonts.mono400, fontSize: 11, color: colors.cream40 },

  segmented: { flexDirection: 'row', padding: 5, gap: 5 },
  segment: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  segmentActive: { backgroundColor: 'rgba(236,227,212,0.1)' },
  segmentText: { fontFamily: fonts.sans500, fontSize: 13, color: colors.cream40 },
  segmentTextActive: { color: colors.cream },

  albumList: { borderTopWidth: 1, borderTopColor: colors.cream13, paddingVertical: 4 },
  albumOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 12,
  },
  albumTitle: { flex: 1, fontFamily: fonts.sans400, fontSize: 13, color: colors.cream55 },
  albumTitleActive: { color: colors.cream, fontFamily: fonts.sans600 },

  note: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    borderRadius: radius.button,
    backgroundColor: 'rgba(236,227,212,0.03)',
  },
  noteText: { flex: 1, fontFamily: fonts.mono400, fontSize: 11, lineHeight: 17, color: colors.cream40 },
});
