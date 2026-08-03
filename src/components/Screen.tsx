import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colors } from '../theme';

interface Props {
  children: React.ReactNode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  /** Dezenter warmer Glow oben (z. B. Queue-Screen). */
  glow?: boolean;
}

/** Grundfläche für fotolose Screens ohne Ambiente (Queue, Settings, Permission-Zustände): canvas. */
export default function Screen({ children, edges = ['top', 'bottom'], style, glow }: Props) {
  return (
    <View style={styles.root}>
      {glow && <View style={styles.glow} pointerEvents="none" />}
      <SafeAreaView style={[styles.safe, style]} edges={edges as Edge[]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  safe: { flex: 1 },
  glow: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(168,115,74,0.16)',
  },
});
