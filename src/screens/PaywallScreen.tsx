import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { colors, fonts, radius, shadow, spacing } from '../theme';
import { APP_NAME, TERMS_URL, PRIVACY_URL } from '../constants';
import { usePurchasesStore } from '../state/purchases';
import type { PackageId, PurchasesPackageInfo } from '../purchases/types';
import { formatSize } from '../utils/format';
import Screen from '../components/Screen';

type Nav = NativeStackNavigationProp<RootStackParamList>;
type PaywallRoute = RouteProp<RootStackParamList, 'Paywall'>;

const FEATURES = [
  'Unbegrenzt ausmisten',
  'Album für Album',
  'Videos einbeziehen',
  'Smart-Filter: Screenshots, grosse Dateien, Duplikate',
  'Statistik: freigegebener Speicher',
];

export default function PaywallScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<PaywallRoute>();
  const freedBytes = route.params?.freedBytes;
  const { ready, isPro, offering, purchasing, restoring, isMock, purchase, restore } =
    usePurchasesStore();
  const [selected, setSelected] = useState<PackageId>('lifetime');

  const close = useCallback(() => nav.goBack(), [nav]);

  const onPurchase = useCallback(async () => {
    const pkg: PurchasesPackageInfo | null | undefined =
      selected === 'lifetime' ? offering?.lifetime : offering?.annual;
    if (!pkg) return;
    const result = await purchase(pkg);
    if (result.success) {
      Alert.alert(`${APP_NAME} Pro aktiv`, 'Danke für deinen Kauf!', [
        { text: 'OK', onPress: close },
      ]);
    } else if (result.cancelled) {
      // Nutzer hat das Store-Sheet geschlossen — einfach zurück zur Paywall, kein Fehler.
    } else {
      Alert.alert('Kauf nicht möglich', 'Versuch es nochmal.');
    }
  }, [selected, offering, purchase, close]);

  const onRestore = useCallback(async () => {
    const result = await restore();
    if (result.error) {
      Alert.alert('Wiederherstellung fehlgeschlagen', result.error);
    } else if (result.hadPurchases) {
      Alert.alert('Wiederhergestellt', `${APP_NAME} Pro ist jetzt aktiv.`, [
        { text: 'OK', onPress: close },
      ]);
    } else {
      Alert.alert('Keine Käufe gefunden', 'Keine früheren Käufe gefunden.');
    }
  }, [restore, close]);

  if (!ready) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.cream} />
        </View>
      </Screen>
    );
  }

  if (isPro) {
    return (
      <Screen>
        <CloseHeader onClose={close} />
        <View style={styles.center}>
          <View style={styles.successIcon}>
            <Feather name="check" size={28} color={colors.greenText} />
          </View>
          <Text style={styles.headline}>{APP_NAME} Pro ist aktiv</Text>
          <Text style={styles.body}>Alle Pro-Funktionen sind bereits freigeschaltet.</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <LinearGradient
        colors={[colors.accentBg, 'transparent']}
        style={styles.glow}
        pointerEvents="none"
      />
      <CloseHeader onClose={close} />
      <ScrollView contentContainerStyle={styles.scroll}>
        {isMock && (
          <View style={styles.mockBadge}>
            <Text style={styles.mockBadgeText}>DEV · SIMULIERTER KAUF</Text>
          </View>
        )}

        {/* Aufhänger */}
        <View style={styles.hero}>
          {freedBytes != null && freedBytes > 0 ? (
            <>
              <Text style={styles.heroNumber}>{formatSize(freedBytes)} freigemacht.</Text>
              <Text style={styles.heroSub}>Mach weiter mit {APP_NAME} Pro.</Text>
            </>
          ) : (
            <Text style={styles.heroTitle}>{APP_NAME} Pro</Text>
          )}
        </View>

        {/* Features */}
        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View style={styles.featureCheck}>
                <Feather name="check" size={12} color={colors.accent} />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {/* Pakete */}
        {offering ? (
          <View style={styles.cards}>
            <PackageCard
              label="Lifetime"
              price={offering.lifetime?.priceString ?? '—'}
              sublabel="Einmalig — für immer"
              recommended
              selected={selected === 'lifetime'}
              onPress={() => setSelected('lifetime')}
            />
            <PackageCard
              label="Jahresabo"
              price={offering.annual?.priceString ?? '—'}
              sublabel="pro Jahr"
              selected={selected === 'annual'}
              onPress={() => setSelected('annual')}
            />
          </View>
        ) : (
          <Text style={styles.unavailable}>
            Angebote gerade nicht verfügbar. Prüf deine Verbindung und versuch es erneut.
          </Text>
        )}

        {selected === 'lifetime' && (
          <Text style={styles.hint}>Kauf einmalig, kein Abo-Zwang.</Text>
        )}

        {/* Haupt-CTA */}
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            (pressed || purchasing) && styles.ctaPressed,
            !offering && styles.ctaDisabled,
          ]}
          onPress={onPurchase}
          disabled={!offering || purchasing || restoring}
        >
          {purchasing ? (
            <ActivityIndicator color={colors.onAccent} />
          ) : (
            <Text style={styles.ctaText}>{APP_NAME} Pro holen</Text>
          )}
        </Pressable>

        {/* Restore */}
        <Pressable onPress={onRestore} disabled={purchasing || restoring} hitSlop={8} style={styles.restoreBtn}>
          {restoring ? (
            <ActivityIndicator color={colors.cream40} size="small" />
          ) : (
            <Text style={styles.restoreText}>Käufe wiederherstellen</Text>
          )}
        </Pressable>

        {/* Rechtliches */}
        <View style={styles.legalRow}>
          <Pressable onPress={() => TERMS_URL && Linking.openURL(TERMS_URL)} hitSlop={6}>
            <Text style={styles.legalText}>Nutzungsbedingungen</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => PRIVACY_URL && Linking.openURL(PRIVACY_URL)} hitSlop={6}>
            <Text style={styles.legalText}>Datenschutz</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

function CloseHeader({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
        <Feather name="x" size={20} color={colors.cream} />
      </Pressable>
    </View>
  );
}

function PackageCard({
  label,
  price,
  sublabel,
  recommended,
  selected,
  onPress,
}: {
  label: string;
  price: string;
  sublabel: string;
  recommended?: boolean;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.card, recommended && styles.cardRecommended, selected && styles.cardSelected]}
      onPress={onPress}
    >
      {recommended && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>EMPFOHLEN</Text>
        </View>
      )}
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardPrice}>{price}</Text>
      <Text style={styles.cardSub}>{sublabel}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  glow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 340,
  },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.screenH, paddingTop: 8 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.cream13,
    backgroundColor: 'rgba(236,227,212,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: spacing.screenH, paddingBottom: 32, gap: 22 },

  mockBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.redBorder40,
    backgroundColor: colors.redFillBg,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mockBadgeText: { fontFamily: fonts.mono500, fontSize: 10, letterSpacing: 1, color: colors.redText },

  hero: { alignItems: 'center', gap: 4, marginTop: 4 },
  heroNumber: { fontFamily: fonts.mono600, fontSize: 32, color: colors.accentBright, textAlign: 'center' },
  heroSub: { fontFamily: fonts.sans500, fontSize: 16, color: colors.creamHi, textAlign: 'center' },
  heroTitle: { fontFamily: fonts.sans600, fontSize: 26, color: colors.cream, textAlign: 'center' },

  successIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.greenFillBg,
    backgroundColor: colors.greenFillBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headline: { fontFamily: fonts.sans500, fontSize: 19, color: colors.cream, textAlign: 'center' },
  body: { fontFamily: fonts.sans400, fontSize: 14, color: colors.cream55, textAlign: 'center' },

  features: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { fontFamily: fonts.sans400, fontSize: 14, color: colors.creamHi, flex: 1 },

  cards: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.cream13,
    backgroundColor: 'rgba(236,227,212,0.04)',
    padding: 16,
    gap: 4,
    ...shadow.raised,
  },
  cardRecommended: { borderColor: colors.accentBorder },
  cardSelected: { borderWidth: 2, borderColor: colors.accent, ...shadow.glow(colors.accent) },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 6,
  },
  badgeText: { fontFamily: fonts.mono600, fontSize: 9, letterSpacing: 0.8, color: colors.onAccent },
  cardLabel: { fontFamily: fonts.sans600, fontSize: 15, color: colors.cream },
  cardPrice: { fontFamily: fonts.mono500, fontSize: 18, color: colors.cream, marginTop: 4 },
  cardSub: { fontFamily: fonts.mono400, fontSize: 11, color: colors.cream40 },

  unavailable: {
    fontFamily: fonts.sans400,
    fontSize: 13,
    color: colors.cream55,
    textAlign: 'center',
    lineHeight: 19,
  },

  hint: { fontFamily: fonts.mono400, fontSize: 11, color: colors.cream40, textAlign: 'center', marginTop: -8 },

  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.button,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.glow(colors.accent),
  },
  ctaPressed: { opacity: 0.88 },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontFamily: fonts.sans600, fontSize: 16, color: colors.onAccent },

  restoreBtn: { alignItems: 'center', paddingVertical: 4 },
  restoreText: { fontFamily: fonts.mono500, fontSize: 12, color: colors.cream40 },

  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 4 },
  legalText: { fontFamily: fonts.mono400, fontSize: 11, color: colors.cream30 },
  legalDot: { fontFamily: fonts.mono400, fontSize: 11, color: colors.cream30 },
});
