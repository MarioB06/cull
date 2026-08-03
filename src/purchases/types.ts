// Implementierungsneutrale Typen für den Kauf-Layer. Real (RevenueCat) und Mock
// implementieren dasselbe Interface, damit der Rest der App nie zwischen beiden
// unterscheiden muss (siehe src/purchases/index.ts für die Auswahl).

export type PackageId = 'lifetime' | 'annual';

export interface PurchasesPackageInfo {
  id: PackageId;
  /** Lokalisierter Store-Preis (oder Platzhalter im Mock) — nie hardcoden, immer von hier lesen. */
  priceString: string;
  /** Implementierungsspezifisches Objekt (RevenueCat `PurchasesPackage` | Mock-Marker), 1:1 an purchasePackage zurückgereicht. */
  raw: unknown;
}

export interface PurchasesOfferingInfo {
  lifetime: PurchasesPackageInfo | null;
  annual: PurchasesPackageInfo | null;
}

export interface CustomerInfoResult {
  isPro: boolean;
}

export interface PurchaseOutcome {
  success: boolean;
  cancelled: boolean;
  error: string | null;
  isPro: boolean;
}

export interface RestoreOutcome {
  success: boolean;
  isPro: boolean;
  error: string | null;
  hadPurchases: boolean;
}

export interface PurchasesApi {
  readonly isMock: boolean;
  configure(): Promise<void>;
  getOfferings(): Promise<PurchasesOfferingInfo | null>;
  getCustomerInfo(): Promise<CustomerInfoResult>;
  purchasePackage(pkg: PurchasesPackageInfo): Promise<PurchaseOutcome>;
  restorePurchases(): Promise<RestoreOutcome>;
}
