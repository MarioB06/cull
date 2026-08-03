import { Platform } from 'react-native';
import Purchases, { PACKAGE_TYPE, type PurchasesPackage } from 'react-native-purchases';

import { ENTITLEMENT_ID, REVENUECAT_API_KEY_IOS, REVENUECAT_API_KEY_ANDROID } from '../constants';
import type {
  PurchasesApi,
  PurchasesOfferingInfo,
  PurchasesPackageInfo,
  CustomerInfoResult,
  PurchaseOutcome,
  RestoreOutcome,
} from './types';

// Echte RevenueCat-Anbindung. Aktiv im Dev-/Production-Build, sobald ein API-Key
// gesetzt ist (siehe src/purchases/index.ts für die Mock/Real-Auswahl und SETUP.md
// für die externen Schritte). In Expo Go fehlt das native Modul — react-native-purchases
// fällt dort selbst automatisch in einen Preview-Modus, wir wählen aber ohnehin schon
// vorher den Mock, damit Offering/Preise zu unserem Paywall-Design passen.

let configured = false;

function apiKey(): string {
  return Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
}

function toPackageInfo(pkg: PurchasesPackage | null): PurchasesPackageInfo | null {
  if (!pkg) return null;
  const id = pkg.packageType === PACKAGE_TYPE.LIFETIME ? 'lifetime' : 'annual';
  return { id, priceString: pkg.product.priceString, raw: pkg };
}

function errorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'message' in e && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return fallback;
}

function isUserCancelled(e: unknown): boolean {
  return !!(e && typeof e === 'object' && (e as { userCancelled?: boolean }).userCancelled);
}

export const realPurchases: PurchasesApi = {
  isMock: false,

  async configure() {
    const key = apiKey();
    if (!key || configured) return;
    Purchases.configure({ apiKey: key });
    configured = true;
  },

  async getOfferings(): Promise<PurchasesOfferingInfo | null> {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    if (!current) return null;
    return { lifetime: toPackageInfo(current.lifetime), annual: toPackageInfo(current.annual) };
  },

  async getCustomerInfo(): Promise<CustomerInfoResult> {
    const info = await Purchases.getCustomerInfo();
    return { isPro: !!info.entitlements.active[ENTITLEMENT_ID] };
  },

  async purchasePackage(pkg: PurchasesPackageInfo): Promise<PurchaseOutcome> {
    try {
      const result = await Purchases.purchasePackage(pkg.raw as PurchasesPackage);
      const isPro = !!result.customerInfo.entitlements.active[ENTITLEMENT_ID];
      return { success: true, cancelled: false, error: null, isPro };
    } catch (e) {
      if (isUserCancelled(e)) {
        return { success: false, cancelled: true, error: null, isPro: false };
      }
      return { success: false, cancelled: false, error: errorMessage(e, 'Kauf nicht möglich.'), isPro: false };
    }
  },

  async restorePurchases(): Promise<RestoreOutcome> {
    try {
      const info = await Purchases.restorePurchases();
      const isPro = !!info.entitlements.active[ENTITLEMENT_ID];
      return {
        success: true,
        isPro,
        error: null,
        hadPurchases: info.allPurchasedProductIdentifiers.length > 0,
      };
    } catch (e) {
      return {
        success: false,
        isPro: false,
        error: errorMessage(e, 'Wiederherstellung fehlgeschlagen.'),
        hadPurchases: false,
      };
    }
  },
};
