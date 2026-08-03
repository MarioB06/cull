import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors } from '../../theme';

interface Props {
  count: number;
  active: number;
}

/** Fortschritts-Punkte für den Onboarding-Stepper. */
export default function Dots({ count, active }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={[styles.dot, i === active && styles.dotActive]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(245,239,228,0.3)' },
  dotActive: { width: 18, backgroundColor: colors.text },
});
