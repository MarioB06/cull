import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

interface Props {
  children: React.ReactNode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
}

/** Bildschirm-Grundlage mit sanftem Verlaufs-Hintergrund statt Flachfarbe (mehr Tiefe). */
export default function Screen({ children, edges = ['top', 'bottom'], style }: Props) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[colors.bgGradientTop, colors.screenBg, colors.bgGradientBottom]}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={[styles.safe, style]} edges={edges as Edge[]}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.screenBg },
  safe: { flex: 1 },
});
