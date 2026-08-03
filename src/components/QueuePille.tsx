import React from 'react';
import { Text, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, font, radius, blur } from '../theme';
import { Glass } from './Glass';

interface Props {
  count: number;
  onPress: () => void;
}

/** Getönte Glas-Pille rechts oben: "{n}" → öffnet die Queue. */
export default function QueuePille({ count, onPress }: Props) {
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {({ pressed }) => (
        <Glass
          tint={colors.deleteGlass}
          border={colors.deleteGlassBorder}
          radius={radius.circle}
          intensity={blur.panel}
          style={[styles.pille, pressed && styles.pressed]}
        >
          <Feather name="trash-2" size={13} color={colors.deleteText} />
          <Text style={styles.text}>{count}</Text>
        </Glass>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pille: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  pressed: { opacity: 0.75 },
  text: { fontFamily: font.monoMed, fontSize: 13, color: colors.deleteText },
});
