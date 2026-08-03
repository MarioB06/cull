import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, font } from '../theme';
import { Glass } from './Glass';
import { useStore } from '../state/store';
import { presentLimitedPicker } from '../media';

/** Banner bei iOS "limited" Zugriff: Hinweis + Button zum Nachlegen von Fotos. */
export default function LimitedBanner() {
  const { state } = useStore();
  if (state.permission?.state !== 'limited') return null;

  return (
    <Glass style={styles.banner}>
      <Feather name="info" size={14} color={colors.textDim} />
      <Text style={styles.text}>Nur ausgewählte Fotos sichtbar —</Text>
      <Pressable onPress={presentLimitedPicker} hitSlop={8}>
        <Text style={styles.action}>mehr auswählen</Text>
      </Pressable>
    </Glass>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: 14,
    marginTop: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  text: { fontFamily: font.mono, fontSize: 11, color: colors.textDim },
  action: { fontFamily: font.monoMed, fontSize: 11, color: colors.text },
});
