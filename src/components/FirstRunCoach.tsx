import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, fonts } from '../theme';

/** Dezenter Einmal-Hinweis auf der allerersten Swipe-Karte. */
export default function FirstRunCoach() {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.pill}>
        <Text style={styles.textDelete}>← Löschen</Text>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.textKeep}>Behalten →</Text>
      </View>
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
    backgroundColor: 'rgba(11,9,7,0.55)',
    borderWidth: 1,
    borderColor: colors.cream13,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  textDelete: { fontFamily: fonts.mono500, fontSize: 12, color: colors.redText },
  textKeep: { fontFamily: fonts.mono500, fontSize: 12, color: colors.greenText },
  dot: { fontFamily: fonts.mono400, fontSize: 12, color: colors.cream30 },
});
