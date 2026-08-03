import { getProCached, setProCached } from '../db/flags';
import type {
  PurchasesApi,
  PurchasesOfferingInfo,
  PurchasesPackageInfo,
  CustomerInfoResult,
  PurchaseOutcome,
  RestoreOutcome,
} from './types';

// Aktiv in Expo Go (kein natives Kauf-Modul) oder wenn PURCHASES_MOCK erzwungen wird.
// Liefert ein Fake-Offering und simuliert erfolgreichen Kauf/Restore über das
// lokal gecachte Pro-Flag — so lässt sich der komplette Paywall-/Gating-Flow ohne
// Dev-Build entwickeln und testen.

const MOCK_LIFETIME: PurchasesPackageInfo = {
  id: 'lifetime',
  priceString: 'CHF 7.00',
  raw: 'mock-lifetime',
};

const MOCK_ANNUAL: PurchasesPackageInfo = {
  id: 'annual',
  priceString: 'CHF 12.00',
  raw: 'mock-annual',
};

const MOCK_OFFERING: PurchasesOfferingInfo = {
  lifetime: MOCK_LIFETIME,
  annual: MOCK_ANNUAL,
};

let cachedIsPro: boolean | null = null;

async function loadIsPro(): Promise<boolean> {
  if (cachedIsPro == null) cachedIsPro = await getProCached();
  return cachedIsPro;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export const mockPurchases: PurchasesApi = {
  isMock: true,

  async configure() {
    await loadIsPro();
  },

  async getOfferings(): Promise<PurchasesOfferingInfo | null> {
    return MOCK_OFFERING;
  },

  async getCustomerInfo(): Promise<CustomerInfoResult> {
    return { isPro: await loadIsPro() };
  },

  async purchasePackage(): Promise<PurchaseOutcome> {
    // Kurze Verzögerung, um das Store-Sheet zu simulieren.
    await delay(500);
    cachedIsPro = true;
    await setProCached(true);
    return { success: true, cancelled: false, error: null, isPro: true };
  },

  async restorePurchases(): Promise<RestoreOutcome> {
    await delay(350);
    const isPro = await loadIsPro();
    return { success: true, isPro, error: null, hadPurchases: isPro };
  },
};
