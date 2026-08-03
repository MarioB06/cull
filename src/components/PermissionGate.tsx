import React from 'react';
import { View, Text, StyleSheet, Pressable, Linking, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';

import { colors, font, radius } from '../theme';
import { APP_NAME } from '../constants';
import { useStore } from '../state/store';
import { presentLimitedPicker } from '../media';
import AmbientScreen from './AmbientScreen';
import { Glass } from './Glass';

/**
 * Steuert den Zugriff: undetermined → Anfrage-CTA, denied → Einstellungen,
 * granted/limited → Inhalt (Kinder). Bei "limited" zusätzlich ein Banner.
 */
export default function PermissionGate({ children }: { children: React.ReactNode }) {
  const { state, requestPermission } = useStore();

  if (!state.ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.text} />
      </View>
    );
  }

  const perm = state.permission?.state ?? 'undetermined';

  if (perm === 'granted' || perm === 'limited') {
    return <>{children}</>;
  }

  if (perm === 'undetermined') {
    return (
      <AmbientScreen>
        <View style={styles.body}>
          <Glass style={styles.panel}>
            <View style={styles.iconCircle}>
              <Feather name="image" size={26} color={colors.text} />
            </View>
            <Text style={styles.title}>{APP_NAME}</Text>
            <Text style={styles.text}>
              {APP_NAME} geht deine Foto-Galerie mit dir durch, damit du sie schnell ausmisten kannst.
              Alles passiert lokal — es verlässt nichts dein Gerät.
            </Text>
            <Pressable onPress={requestPermission}>
              {({ pressed }) => (
                <Glass
                  tint={colors.glassStrong}
                  border={colors.glassBorderStrong}
                  style={[styles.btn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.btnText}>Foto-Zugriff erlauben</Text>
                </Glass>
              )}
            </Pressable>
          </Glass>
        </View>
      </AmbientScreen>
    );
  }

  // denied
  return (
    <AmbientScreen>
      <View style={styles.body}>
        <Glass style={styles.panel}>
          <View style={styles.iconCircle}>
            <Feather name="lock" size={26} color={colors.text} />
          </View>
          <Text style={styles.title}>Kein Foto-Zugriff</Text>
          <Text style={styles.text}>
            {APP_NAME} braucht Zugriff auf deine Fotos, um sie hier durchzugehen. Du kannst den
            Zugriff in den Einstellungen aktivieren.
          </Text>
          <Pressable onPress={() => Linking.openSettings()}>
            {({ pressed }) => (
              <Glass
                tint={colors.glassStrong}
                border={colors.glassBorderStrong}
                style={[styles.btn, pressed && styles.btnPressed]}
              >
                <Text style={styles.btnText}>Einstellungen öffnen</Text>
              </Glass>
            )}
          </Pressable>
          <Pressable style={styles.linkBtn} onPress={presentLimitedPicker}>
            <Text style={styles.linkText}>Erneut anfragen</Text>
          </Pressable>
        </Glass>
      </View>
    </AmbientScreen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.canvas, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  panel: { alignItems: 'center', padding: 28, gap: 16, width: '100%', maxWidth: 360 },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 0.5,
    borderColor: colors.glassBorder,
    backgroundColor: colors.glass,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: font.sansSemi, fontSize: 22, color: colors.text, marginTop: 2 },
  text: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textDim,
    textAlign: 'center',
  },
  btn: {
    marginTop: 6,
    paddingVertical: 15,
    paddingHorizontal: 26,
    borderRadius: radius.panel,
  },
  btnPressed: { opacity: 0.85 },
  btnText: { fontFamily: font.sansSemi, fontSize: 15, color: colors.text },
  linkBtn: { paddingVertical: 4 },
  linkText: { fontFamily: font.monoMed, fontSize: 12, color: colors.textFaint },
});
