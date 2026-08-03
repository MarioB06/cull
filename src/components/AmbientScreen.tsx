import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, ambientGradient, ambientLocations } from '../theme';

interface Props {
  children: React.ReactNode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
}

/** Warme, unscharfe Ambiente-Grundfläche für fotolose Screens (Onboarding, Paywall). */
export default function AmbientScreen({ children, edges = ['top', 'bottom'], style }: Props) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={ambientGradient}
        locations={ambientLocations}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.glow} pointerEvents="none" />
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
    top: -40,
    right: -30,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(226,150,90,0.35)',
  },
});
