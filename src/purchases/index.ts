import { NativeModules, Platform } from 'react-native';

import { REVENUECAT_API_KEY_IOS, REVENUECAT_API_KEY_ANDROID } from '../constants';
import { mockPurchases } from './mock';
import { realPurchases } from './real';
import type { PurchasesApi } from './types';

export * from './types';

// Auf true setzen, um den Mock zu erzwingen (z.B. für Screenshots), selbst in einem
// Dev-Build mit korrekt verlinktem nativen Modul.
export const PURCHASES_MOCK = false;

function nativeModuleAvailable(): boolean {
  // react-native-purchases registriert sich nativ unter diesem Namen. Fehlt es
  // (Expo Go), ist kein echter Kauf möglich — wir laufen dann auf dem Mock.
  return NativeModules.RNPurchases != null;
}

function apiKeyConfigured(): boolean {
  const key = Platform.OS === 'ios' ? REVENUECAT_API_KEY_IOS : REVENUECAT_API_KEY_ANDROID;
  return !!key;
}

function shouldUseMock(): boolean {
  if (PURCHASES_MOCK) return true;
  if (!nativeModuleAvailable()) return true;
  // Natives Modul vorhanden (Dev-Build), aber noch kein RevenueCat-Key hinterlegt
  // (siehe SETUP.md) — sicher auf den Mock zurückfallen statt zu crashen.
  if (!apiKeyConfigured()) return true;
  return false;
}

export const purchases: PurchasesApi = shouldUseMock() ? mockPurchases : realPurchases;
