import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, font, radius, blur } from '../theme';
import { Glass } from './Glass';

/** Dezenter Einmal-Hinweis auf der allerersten Swipe-Karte. */
export default function FirstRunCoach() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <Glass tint={colors.glass} border={colors.glassBorder} radius={radius.circle} intensity={blur.panel} style={styles.pill}>
        <Text style={styles.textDelete}>← Löschen</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.textKeep}>Behalten →</Text>
      </Glass>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  textDelete: { fontFamily: font.monoMed, fontSize: 12, color: colors.deleteText },
  textKeep: { fontFamily: font.monoMed, fontSize: 12, color: colors.keepText },
  dot: { fontFamily: font.mono, fontSize: 12, color: colors.textFaint },
});
