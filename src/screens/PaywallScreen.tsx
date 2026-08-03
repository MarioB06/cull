import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import type { RootStackParamList } from '../../App';
import { colors, font, radius, spacing } from '../theme';
import { APP_NAME, TERMS_URL, PRIVACY_URL } from '../constants';
import { usePurchasesStore } from '../state/purchases';
import type { PackageId, PurchasesPackageInfo } from '../purchases/types';
import { formatSize } from '../utils/format';
import AmbientScreen from '../components/AmbientScreen';
import { Glass } from '../components/Glass';

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
      <AmbientScreen>
        <View style={styles.center}>
          <ActivityIndicator color={colors.text} />
        </View>
      </AmbientScreen>
    );
  }

  if (isPro) {
    return (
      <AmbientScreen>
        <CloseHeader onClose={close} />
        <View style={styles.center}>
          <Glass style={styles.panel}>
            <View style={styles.successIcon}>
              <Feather name="check" size={26} color={colors.keepText} />
            </View>
            <Text style={styles.headline}>{APP_NAME} Pro ist aktiv</Text>
            <Text style={styles.body}>Alle Pro-Funktionen sind bereits freigeschaltet.</Text>
          </Glass>
        </View>
      </AmbientScreen>
    );
  }

  return (
    <AmbientScreen>
      <View style={styles.scrim} pointerEvents="none" />
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
              <Text style={styles.heroNumber}>{formatSize(freedBytes)}</Text>
              <Text style={styles.heroLabel}>freigemacht.</Text>
              <Text style={styles.heroSub}>Mach weiter mit {APP_NAME} Pro.</Text>
            </>
          ) : (
            <Text style={styles.heroTitle}>{APP_NAME} Pro</Text>
          )}
        </View>

        {/* Features */}
        <Glass style={styles.featuresPanel}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <Feather name="check" size={15} color={colors.check} />
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </Glass>

        {/* Pakete — gestapelt */}
        {offering ? (
          <View style={styles.cards}>
            <PackageCard
              label="Lifetime"
              price={offering.lifetime?.priceString ?? '—'}
              sublabel="einmalig — für immer"
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

        {/* Haupt-CTA — der einzige solide Button */}
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

        {/* Restore + Rechtliches */}
        <View style={styles.legalRow}>
          <Pressable onPress={onRestore} disabled={purchasing || restoring} hitSlop={8}>
            {restoring ? (
              <ActivityIndicator color={colors.textFaint} size="small" />
            ) : (
              <Text style={styles.legalText}>Käufe wiederherstellen</Text>
            )}
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => TERMS_URL && Linking.openURL(TERMS_URL)} hitSlop={6}>
            <Text style={styles.legalText}>Nutzungsbedingungen</Text>
          </Pressable>
          <Text style={styles.legalDot}>·</Text>
          <Pressable onPress={() => PRIVACY_URL && Linking.openURL(PRIVACY_URL)} hitSlop={6}>
            <Text style={styles.legalText}>Datenschutz</Text>
          </Pressable>
        </View>
      </ScrollView>
    </AmbientScreen>
  );
}

function CloseHeader({ onClose }: { onClose: () => void }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onClose} hitSlop={10}>
        <Glass style={styles.closeBtn}>
          <Feather name="x" size={17} color={colors.text} />
        </Glass>
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
    <Pressable onPress={onPress}>
      <Glass
        tint={recommended ? colors.deleteGlass : colors.glass}
        border={recommended ? 'rgba(226,120,95,0.7)' : colors.glassBorder}
        style={[styles.card, recommended && styles.cardRecommended, selected && styles.cardSelected]}
      >
        {recommended && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>EMPFOHLEN</Text>
          </View>
        )}
        <View style={styles.cardRow}>
          <Text style={styles.cardLabel}>{label}</Text>
          <Text style={styles.cardPrice}>{price}</Text>
        </View>
        <Text style={styles.cardSub}>{sublabel}</Text>
      </Glass>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  panel: { alignItems: 'center', padding: 28, gap: 10, width: '100%', maxWidth: 360 },
  header: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.screenH, paddingTop: 8 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { paddingHorizontal: spacing.screenH, paddingBottom: 32, gap: 22 },

  mockBadge: {
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.deleteGlassBorder,
    backgroundColor: colors.deleteGlass,
    borderRadius: radius.circle,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  mockBadgeText: { fontFamily: font.monoMed, fontSize: 10, letterSpacing: 1, color: colors.deleteText },

  hero: { alignItems: 'center', gap: 2, marginTop: 4 },
  heroNumber: { fontFamily: font.monoSemi, fontSize: 38, color: colors.text, textAlign: 'center' },
  heroLabel: { fontFamily: font.sansMed, fontSize: 18, color: colors.text, textAlign: 'center' },
  heroSub: { fontFamily: font.sans, fontSize: 14, color: colors.textDim, textAlign: 'center', marginTop: 6 },
  heroTitle: { fontFamily: font.sansSemi, fontSize: 26, color: colors.text, textAlign: 'center' },

  successIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.keepGlass,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  headline: { fontFamily: font.sansMed, fontSize: 19, color: colors.text, textAlign: 'center' },
  body: { fontFamily: font.sans, fontSize: 14, color: colors.textDim, textAlign: 'center' },

  featuresPanel: { padding: 16, gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontFamily: font.sans, fontSize: 14, color: colors.text, flex: 1 },

  cards: { gap: 12 },
  card: {
    padding: 16,
    gap: 4,
  },
  cardRecommended: { borderWidth: 1.5 },
  cardSelected: { borderWidth: 1.5, borderColor: colors.white },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    borderRadius: radius.circle,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  badgeText: { fontFamily: font.monoSemi, fontSize: 9, letterSpacing: 0.8, color: colors.onAccent },
  cardLabel: { fontFamily: font.sansSemi, fontSize: 15, color: colors.text },
  cardPrice: { fontFamily: font.monoMed, fontSize: 16, color: colors.text },
  cardSub: { fontFamily: font.mono, fontSize: 11, color: colors.textFaint },

  unavailable: {
    fontFamily: font.sans,
    fontSize: 13,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 19,
  },

  hint: { fontFamily: font.mono, fontSize: 11, color: colors.textFaint, textAlign: 'center', marginTop: -8 },

  cta: {
    backgroundColor: colors.accent,
    borderRadius: radius.panel,
    paddingVertical: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: { opacity: 0.88 },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontFamily: font.sansSemi, fontSize: 16, color: colors.onAccent },

  legalRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  legalText: { fontFamily: font.mono, fontSize: 11, color: colors.textFaint },
  legalDot: { fontFamily: font.mono, fontSize: 11, color: colors.textFaint },
});
