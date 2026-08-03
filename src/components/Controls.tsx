import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, radius, blur } from '../theme';
import { Glass } from './Glass';

interface Props {
  canUndo: boolean;
  onUndo: () => void;
  onDelete: () => void;
  onKeep: () => void;
  disabled?: boolean;
}

/** Drei schwebende Glas-Buttons: Undo · Löschen · Behalten. */
export default function Controls({ canUndo, onUndo, onDelete, onKeep, disabled }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onUndo}
        disabled={!canUndo || disabled}
        hitSlop={6}
        style={{ opacity: canUndo ? 1 : 0.32 }}
      >
        {({ pressed }) => (
          <Glass
            tint={colors.glass}
            border={colors.glassBorder}
            radius={radius.circle}
            intensity={blur.panel}
            style={[styles.btn, styles.undo, pressed && styles.pressed]}
          >
            <Feather name="corner-up-left" size={20} color={colors.text} />
          </Glass>
        )}
      </Pressable>

      <Pressable onPress={onDelete} disabled={disabled} hitSlop={6}>
        {({ pressed }) => (
          <Glass
            tint={colors.deleteGlass}
            border={colors.deleteGlassBorder}
            radius={radius.circle}
            intensity={blur.panel}
            style={[styles.btn, styles.big, pressed && styles.pressed]}
          >
            <Feather name="x" size={26} color={colors.deleteText} />
          </Glass>
        )}
      </Pressable>

      <Pressable onPress={onKeep} disabled={disabled} hitSlop={6}>
        {({ pressed }) => (
          <Glass
            tint={colors.keepGlass}
            border={colors.keepGlassBorder}
            radius={radius.circle}
            intensity={blur.panel}
            style={[styles.btn, styles.big, pressed && styles.pressed]}
          >
            <Feather name="check" size={28} color={colors.keepText} />
          </Glass>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26 },
  btn: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.75 },
  undo: { width: 50, height: 50 },
  big: { width: 66, height: 66 },
});
