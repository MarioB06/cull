import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors } from '../theme';

interface Props {
  canUndo: boolean;
  onUndo: () => void;
  onDelete: () => void;
  onKeep: () => void;
  disabled?: boolean;
}

/** Drei runde Buttons: Undo · Löschen · Behalten. */
export default function Controls({ canUndo, onUndo, onDelete, onKeep, disabled }: Props) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={onUndo}
        disabled={!canUndo || disabled}
        hitSlop={6}
        style={({ pressed }) => [
          styles.btn,
          styles.undo,
          { opacity: canUndo ? (pressed ? 0.7 : 1) : 0.32 },
        ]}
      >
        <Feather name="corner-up-left" size={20} color={colors.cream} />
      </Pressable>

      <Pressable
        onPress={onDelete}
        disabled={disabled}
        hitSlop={6}
        style={({ pressed }) => [styles.btn, styles.big, styles.delete, pressed && styles.pressed]}
      >
        <Feather name="trash-2" size={24} color={colors.redText} />
      </Pressable>

      <Pressable
        onPress={onKeep}
        disabled={disabled}
        hitSlop={6}
        style={({ pressed }) => [styles.btn, styles.big, styles.keep, pressed && styles.pressed]}
      >
        <Feather name="check" size={26} color={colors.greenText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 26 },
  btn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  pressed: { opacity: 0.75 },
  undo: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderColor: colors.cream25,
    backgroundColor: 'transparent',
  },
  big: { width: 66, height: 66, borderRadius: 33 },
  delete: { borderColor: colors.redBorder, backgroundColor: colors.redFillBg },
  keep: { borderColor: colors.greenBorder, backgroundColor: colors.greenFillBg },
});
