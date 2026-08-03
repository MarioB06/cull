import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, fonts, radius, shadow } from '../theme';
import { APP_NAME } from '../constants';
import { useStore } from '../state/store';
import { presentLimitedPicker } from '../media';
import Screen from './Screen';

/**
 * Steuert den Zugriff: undetermined → Anfrage-CTA, denied → Einstellungen,
 * granted/limited → Inhalt (Kinder). Bei "limited" zusätzlich ein Banner.
 */
export default function PermissionGate({ children }: { children: React.ReactNode }) {
  const { state, requestPermission } = useStore();

  if (!state.ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.cream} />
      </View>
    );
  }

  const perm = state.permission?.state ?? 'undetermined';

  if (perm === 'granted' || perm === 'limited') {
    return <>{children}</>;
  }

  if (perm === 'undetermined') {
    return (
      <Screen>
        <View style={styles.body}>
          <View style={styles.iconCircle}>
            <Feather name="image" size={26} color={colors.accent} />
          </View>
          <Text style={styles.title}>{APP_NAME}</Text>
          <Text style={styles.text}>
            {APP_NAME} geht deine Foto-Galerie mit dir durch, damit du sie schnell ausmisten kannst.
            Alles passiert lokal — es verlässt nichts dein Gerät.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
            onPress={requestPermission}
          >
            <Text style={styles.btnText}>Foto-Zugriff erlauben</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // denied
  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Feather name="lock" size={26} color={colors.accent} />
        </View>
        <Text style={styles.title}>Kein Foto-Zugriff</Text>
        <Text style={styles.text}>
          {APP_NAME} braucht Zugriff auf deine Fotos, um sie hier durchzugehen. Du kannst den
          Zugriff in den Einstellungen aktivieren.
        </Text>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.btnText}>Einstellungen öffnen</Text>
        </Pressable>
        <Pressable style={styles.linkBtn} onPress={presentLimitedPicker}>
          <Text style={styles.linkText}>Erneut anfragen</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 18 },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow(colors.accent),
  },
  title: { fontFamily: fonts.sans600, fontSize: 22, color: colors.cream, marginTop: 6 },
  text: {
    fontFamily: fonts.sans400,
    fontSize: 14,
    lineHeight: 21,
    color: colors.cream55,
    textAlign: 'center',
  },
  btn: {
    marginTop: 10,
    backgroundColor: colors.accent,
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: radius.button,
    ...shadow.glow(colors.accent),
  },
  btnPressed: { opacity: 0.85 },
  btnText: { fontFamily: fonts.sans600, fontSize: 15, color: colors.onAccent },
  linkBtn: { paddingVertical: 8 },
  linkText: { fontFamily: fonts.mono500, fontSize: 12, color: colors.cream40 },
});
