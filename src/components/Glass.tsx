import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { colors, radius as radiusTokens, blur as blurTokens } from '../theme';

interface Props {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tint?: string;
  border?: string;
  radius?: number;
  intensity?: number;
}

/**
 * Milchglas-Baustein: BlurView + halbtransparente Fläche + dünne helle Kante.
 * `experimentalBlurMethod` ist Pflicht, sonst blurt Android nicht (nur Transparenz als Fallback).
 */
export function Glass({
  children,
  style,
  tint = colors.glass,
  border = colors.glassBorder,
  radius = radiusTokens.panel,
  intensity = blurTokens.panel,
}: Props) {
  return (
    <BlurView
      intensity={intensity}
      tint="dark"
      experimentalBlurMethod="dimezisBlurView"
      style={[
        {
          borderRadius: radius,
          borderWidth: 0.5,
          borderColor: border,
          backgroundColor: tint,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </BlurView>
  );
}

export const glassStyles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});

export default Glass;
