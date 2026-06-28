import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, fonts } from '../theme';

interface Props {
  count: number;
  onPress: () => void;
}

/** Rote Pille rechts im Header: "{n} zum Löschen" → öffnet die Queue. */
export default function QueuePille({ count, onPress }: Props) {
  return (
    <Pressable
      style={({ pressed }) => [styles.pille, pressed && styles.pressed]}
      onPress={onPress}
      hitSlop={8}
    >
      <Feather name="trash-2" size={13} color={colors.redText} />
      <Text style={styles.text}>{count} zum Löschen</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pille: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: colors.redBorder40,
    backgroundColor: colors.redFillBg,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pressed: { opacity: 0.7 },
  text: { fontFamily: fonts.mono500, fontSize: 12, color: colors.redText },
});
