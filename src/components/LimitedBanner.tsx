import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, fonts } from '../theme';
import { useStore } from '../state/store';
import { presentLimitedPicker } from '../media';

/** Banner bei iOS "limited" Zugriff: Hinweis + Button zum Nachlegen von Fotos. */
export default function LimitedBanner() {
  const { state } = useStore();
  if (state.permission?.state !== 'limited') return null;

  return (
    <View style={styles.banner}>
      <Feather name="info" size={14} color={colors.accent} />
      <Text style={styles.text}>Eingeschränkter Zugriff — nur ausgewählte Fotos sichtbar.</Text>
      <Pressable onPress={presentLimitedPicker} hitSlop={8}>
        <Text style={styles.action}>Mehr</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: colors.accentBg,
    borderWidth: 1,
    borderColor: colors.accentBorder,
  },
  text: { flex: 1, fontFamily: fonts.mono400, fontSize: 11, color: colors.cream70 },
  action: { fontFamily: fonts.mono600, fontSize: 11, color: colors.accent },
});
