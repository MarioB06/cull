import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, AppState, type AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../App';
import { colors, fonts, radius, shadow, spacing } from '../../theme';
import { APP_NAME } from '../../constants';
import { useStore } from '../../state/store';
import { checkPermission } from '../../media';
import { setOnboardingCompleted } from '../../db/flags';
import Dots from '../../components/onboarding/Dots';
import Screen from '../../components/Screen';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Step = 0 | 1 | 2 | 'recovery';

export default function OnboardingScreen() {
  const nav = useNavigation<Nav>();
  const store = useStore();
  const [step, setStep] = useState<Step>(0);
  const [requesting, setRequesting] = useState(false);

  const finish = useCallback(async () => {
    await setOnboardingCompleted(true);
    nav.reset({ index: 0, routes: [{ name: 'Swipe' }] });
  }, [nav]);

  const requestAccess = useCallback(async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const perm = await store.requestPermission();
      if (perm.state === 'granted' || perm.state === 'limited') {
        await finish();
      } else {
        setStep('recovery');
      }
    } finally {
      setRequesting(false);
    }
  }, [requesting, store, finish]);

  // Aus den Einstellungen zurück (nach "Einstellungen öffnen" im Recovery-Screen):
  // Permission erneut prüfen und bei Erfolg das Onboarding automatisch abschließen.
  useEffect(() => {
    if (step !== 'recovery') return;
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s !== 'active') return;
      void checkPermission().then((perm) => {
        if (perm.state === 'granted' || perm.state === 'limited') {
          void finish();
        }
      });
    });
    return () => sub.remove();
  }, [step, finish]);

  return (
    <Screen>
      <StatusBar style="light" />
      {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
      {step === 1 && <HowItWorksStep onNext={() => setStep(2)} />}
      {step === 2 && (
        <PermissionStep onRequest={requestAccess} requesting={requesting} />
      )}
      {step === 'recovery' && <RecoveryStep />}
    </Screen>
  );
}

function CMark() {
  return (
    <View style={styles.mark}>
      <Text style={styles.markText}>C</Text>
    </View>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <CMark />
        <Text style={styles.wordmark}>{APP_NAME.toLowerCase()}</Text>
        <Text style={styles.subline}>Deine Galerie, ausgemistet. Ein Foto, ein Wisch.</Text>
      </View>
      <View style={styles.bottom}>
        <Dots count={3} active={0} />
        <Pressable
          style={({ pressed }) => [styles.ctaFill, pressed && styles.pressed]}
          onPress={onNext}
        >
          <Text style={styles.ctaFillText}>Los geht&apos;s</Text>
        </Pressable>
      </View>
    </View>
  );
}

function HowItWorksStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <View style={styles.vizRow}>
          <View style={styles.vizSide}>
            <View style={[styles.vizArrow, { borderColor: colors.redBorder40, backgroundColor: colors.redFillBg }]}>
              <Feather name="arrow-left" size={20} color={colors.redText} />
            </View>
            <Text style={[styles.vizLabel, { color: colors.redText }]}>LÖSCHEN</Text>
          </View>
          <View style={styles.vizCard}>
            <Feather name="image" size={26} color={colors.cream30} />
          </View>
          <View style={styles.vizSide}>
            <View style={[styles.vizArrow, { borderColor: colors.greenFillBg, backgroundColor: colors.greenFillBg }]}>
              <Feather name="arrow-right" size={20} color={colors.greenText} />
            </View>
            <Text style={[styles.vizLabel, { color: colors.greenText }]}>BEHALTEN</Text>
          </View>
        </View>
        <Text style={styles.headline}>Rechts behalten, links löschen.</Text>
        <Text style={styles.body}>
          Nichts verschwindet sofort. Du sammelst alles und bestätigst am Schluss auf einmal.
        </Text>
      </View>
      <View style={styles.bottom}>
        <Dots count={3} active={1} />
        <Pressable
          style={({ pressed }) => [styles.ctaOutline, pressed && styles.pressed]}
          onPress={onNext}
        >
          <Text style={styles.ctaOutlineText}>Weiter</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PermissionStep({
  onRequest,
  requesting,
}: {
  onRequest: () => void;
  requesting: boolean;
}) {
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Feather name="lock" size={24} color={colors.accent} />
        </View>
        <Text style={styles.headline}>Bleibt auf deinem Gerät.</Text>
        <Text style={styles.body}>
          Kein Konto, kein Upload, keine Cloud. {APP_NAME} braucht nur Zugriff auf deine Fotos,
          um sie dir hier zu zeigen.
        </Text>
      </View>
      <View style={styles.bottom}>
        <Dots count={3} active={2} />
        <Pressable
          style={({ pressed }) => [styles.ctaFill, pressed && styles.pressed, requesting && styles.disabled]}
          onPress={onRequest}
          disabled={requesting}
        >
          <Text style={styles.ctaFillText}>Fotozugriff erlauben</Text>
        </Pressable>
        <Text style={styles.footnote}>Du kannst den Zugriff jederzeit widerrufen.</Text>
      </View>
    </View>
  );
}

function RecoveryStep() {
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <View style={styles.iconCircle}>
          <Feather name="alert-circle" size={24} color={colors.accent} />
        </View>
        <Text style={styles.headline}>Kein Foto-Zugriff</Text>
        <Text style={styles.body}>Ohne Fotozugriff kann {APP_NAME} nichts anzeigen.</Text>
      </View>
      <View style={styles.bottom}>
        <Pressable
          style={({ pressed }) => [styles.ctaFill, pressed && styles.pressed]}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.ctaFillText}>Einstellungen öffnen</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flex: 1, paddingHorizontal: spacing.screenH, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 12 },
  bottom: { paddingBottom: 18, gap: 18 },

  mark: {
    width: 68,
    height: 68,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...shadow.glow(colors.accent),
  },
  markText: { fontFamily: fonts.mono600, fontSize: 30, color: colors.accentBright },
  wordmark: { fontFamily: fonts.mono500, fontSize: 20, letterSpacing: 1, color: colors.cream },
  subline: {
    fontFamily: fonts.sans400,
    fontSize: 14,
    lineHeight: 21,
    color: colors.creamHi,
    textAlign: 'center',
    marginTop: 2,
  },

  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: colors.accentBorder,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    ...shadow.glow(colors.accent),
  },

  headline: {
    fontFamily: fonts.sans500,
    fontSize: 21,
    color: colors.cream,
    textAlign: 'center',
  },
  body: {
    fontFamily: fonts.sans400,
    fontSize: 14,
    lineHeight: 21,
    color: colors.cream55,
    textAlign: 'center',
  },

  vizRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 22,
    marginBottom: 8,
  },
  vizSide: { alignItems: 'center', gap: 8, width: 64 },
  vizArrow: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vizLabel: { fontFamily: fonts.mono500, fontSize: 10, letterSpacing: 1.2 },
  vizCard: {
    width: 92,
    height: 128,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.cream13,
    backgroundColor: 'rgba(236,227,212,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.raised,
  },

  ctaFill: {
    backgroundColor: colors.accent,
    paddingVertical: 17,
    borderRadius: radius.button,
    alignItems: 'center',
    ...shadow.glow(colors.accent),
  },
  ctaFillText: { fontFamily: fonts.sans600, fontSize: 16, color: colors.onAccent },
  ctaOutline: {
    borderWidth: 1.5,
    borderColor: colors.cream25,
    paddingVertical: 17,
    borderRadius: radius.button,
    alignItems: 'center',
  },
  ctaOutlineText: { fontFamily: fonts.sans600, fontSize: 16, color: colors.cream },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.6 },
  footnote: {
    fontFamily: fonts.mono400,
    fontSize: 11,
    color: colors.cream40,
    textAlign: 'center',
  },
});
