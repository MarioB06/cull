import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking, AppState, type AppStateStatus } from 'react-native';
import { Image } from 'expo-image';
import { StatusBar } from 'expo-status-bar';
import { Feather } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../../App';
import { colors, font, radius, spacing } from '../../theme';
import { APP_NAME } from '../../constants';
import { useStore } from '../../state/store';
import { checkPermission } from '../../media';
import { setOnboardingCompleted } from '../../db/flags';
import { track } from '../../analytics';
import Dots from '../../components/onboarding/Dots';
import AmbientScreen from '../../components/AmbientScreen';
import { Glass } from '../../components/Glass';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Step = 0 | 1 | 2 | 'recovery';

export default function OnboardingScreen() {
  const nav = useNavigation<Nav>();
  const store = useStore();
  const [step, setStep] = useState<Step>(0);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    track({ name: 'onboarding_started' });
  }, []);

  const finish = useCallback(async () => {
    track({ name: 'onboarding_completed' });
    await setOnboardingCompleted(true);
    nav.reset({ index: 0, routes: [{ name: 'Swipe' }] });
  }, [nav]);

  const requestAccess = useCallback(async () => {
    if (requesting) return;
    setRequesting(true);
    try {
      const perm = await store.requestPermission();
      if (perm.state === 'granted' || perm.state === 'limited' || perm.state === 'denied') {
        track({ name: 'permission_result', state: perm.state, source: 'initial' });
      }
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
          track({ name: 'permission_result', state: perm.state, source: 'recovery' });
          void finish();
        }
      });
    });
    return () => sub.remove();
  }, [step, finish]);

  return (
    <AmbientScreen>
      <StatusBar style="light" />
      {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
      {step === 1 && <HowItWorksStep onNext={() => setStep(2)} />}
      {step === 2 && (
        <PermissionStep onRequest={requestAccess} requesting={requesting} />
      )}
      {step === 'recovery' && <RecoveryStep />}
    </AmbientScreen>
  );
}

function GlassCta({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <Glass
          tint={colors.glassStrong}
          border={colors.glassBorderStrong}
          radius={radius.panel}
          style={[styles.cta, (pressed || disabled) && styles.pressed]}
        >
          <Text style={styles.ctaText}>{label}</Text>
        </Glass>
      )}
    </Pressable>
  );
}

function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <Image
          source={require('../../../assets/mascot/mascot-wave.png')}
          style={styles.mascot}
          contentFit="contain"
        />
        <Text style={styles.wordmark}>{APP_NAME.toLowerCase()}</Text>
        <Text style={styles.subline}>Deine Galerie, aufgeräumt. Ein Foto, ein Wisch.</Text>
      </View>
      <View style={styles.bottom}>
        <Dots count={3} active={0} />
        <GlassCta label="Los geht's" onPress={onNext} />
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
            <Glass tint={colors.deleteGlass} border={colors.deleteGlassBorder} radius={22} style={styles.vizArrow}>
              <Feather name="arrow-left" size={20} color={colors.deleteText} />
            </Glass>
            <Text style={[styles.vizLabel, { color: colors.deleteText }]}>LÖSCHEN</Text>
          </View>
          <Glass tint={colors.glass} border={colors.glassBorder} radius={radius.card * 0.6} style={styles.vizCard}>
            <Feather name="image" size={26} color={colors.textFaint} />
          </Glass>
          <View style={styles.vizSide}>
            <Glass tint={colors.keepGlass} border={colors.keepGlassBorder} radius={22} style={styles.vizArrow}>
              <Feather name="arrow-right" size={20} color={colors.keepText} />
            </Glass>
            <Text style={[styles.vizLabel, { color: colors.keepText }]}>BEHALTEN</Text>
          </View>
        </View>
        <Text style={styles.headline}>Rechts behalten, links löschen.</Text>
        <Text style={styles.body}>
          Nichts verschwindet sofort. Du sammelst alles und bestätigst am Schluss auf einmal.
        </Text>
      </View>
      <View style={styles.bottom}>
        <Dots count={3} active={1} />
        <GlassCta label="Weiter" onPress={onNext} />
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
        <Glass tint={colors.glass} border={colors.glassBorder} radius={31} style={styles.iconCircle}>
          <Feather name="lock" size={24} color={colors.text} />
        </Glass>
        <Text style={styles.headline}>Bleibt auf deinem Gerät.</Text>
        <Text style={styles.body}>
          Kein Konto, kein Upload, keine Cloud. {APP_NAME} braucht nur Zugriff auf deine Fotos,
          um sie dir hier zu zeigen.
        </Text>
      </View>
      <View style={styles.bottom}>
        <Dots count={3} active={2} />
        <GlassCta label="Fotozugriff erlauben" onPress={onRequest} disabled={requesting} />
        <Text style={styles.footnote}>Du kannst den Zugriff jederzeit widerrufen.</Text>
      </View>
    </View>
  );
}

function RecoveryStep() {
  return (
    <View style={styles.step}>
      <View style={styles.center}>
        <Glass tint={colors.glass} border={colors.glassBorder} radius={31} style={styles.iconCircle}>
          <Feather name="alert-circle" size={24} color={colors.text} />
        </Glass>
        <Text style={styles.headline}>Kein Foto-Zugriff</Text>
        <Text style={styles.body}>Ohne Fotozugriff kann {APP_NAME} nichts anzeigen.</Text>
      </View>
      <View style={styles.bottom}>
        <GlassCta label="Einstellungen öffnen" onPress={() => Linking.openSettings()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  step: { flex: 1, paddingHorizontal: spacing.screenH, justifyContent: 'space-between' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 12 },
  bottom: { paddingBottom: 18, gap: 18 },

  mascot: {
    width: 200,
    height: 200,
    marginBottom: 4,
  },
  wordmark: { fontFamily: font.monoMed, fontSize: 20, letterSpacing: 1, color: colors.text },
  subline: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textDim,
    textAlign: 'center',
    marginTop: 2,
  },

  iconCircle: {
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },

  headline: {
    fontFamily: font.sansMed,
    fontSize: 21,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    fontFamily: font.sans,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textDim,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  vizLabel: { fontFamily: font.monoMed, fontSize: 10, letterSpacing: 1.2 },
  vizCard: {
    width: 92,
    height: 128,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cta: {
    paddingVertical: 17,
    alignItems: 'center',
  },
  ctaText: { fontFamily: font.sansSemi, fontSize: 16, color: colors.white },
  pressed: { opacity: 0.8 },
  footnote: {
    fontFamily: font.mono,
    fontSize: 11,
    color: colors.textFaint,
    textAlign: 'center',
  },
});
