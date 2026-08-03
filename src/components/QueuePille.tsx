import React from 'react';
import { Text, StyleSheet, Pressable, View } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, fonts, radius, shadow } from '../theme';

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
      <View style={styles.dot} />
      <Feather name="trash-2" size={12} color={colors.redText} />
      <Text style={styles.text}>{count} zum Löschen</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pille: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.redBorder40,
    backgroundColor: colors.redFillBg,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 7,
    ...shadow.glow(colors.redBright),
  },
  pressed: { opacity: 0.7 },
  dot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.redBright },
  text: { fontFamily: fonts.mono500, fontSize: 12, color: colors.redText },
});
