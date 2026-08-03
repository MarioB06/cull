import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { purchases } from '../purchases';
import type { PurchasesOfferingInfo, PurchasesPackageInfo } from '../purchases/types';
import { getProCached, setProCached } from '../db/flags';

interface PurchasesState {
  ready: boolean;
  isPro: boolean;
  offering: PurchasesOfferingInfo | null;
  purchasing: boolean;
  restoring: boolean;
}

export interface PurchaseFeedback {
  success: boolean;
  cancelled: boolean;
  error: string | null;
}

export interface RestoreFeedback {
  success: boolean;
  error: string | null;
  hadPurchases: boolean;
}

interface PurchasesStoreApi extends PurchasesState {
  isMock: boolean;
  refresh: () => Promise<void>;
  purchase: (pkg: PurchasesPackageInfo) => Promise<PurchaseFeedback>;
  restore: () => Promise<RestoreFeedback>;
}

const PurchasesContext = createContext<PurchasesStoreApi | null>(null);

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PurchasesState>({
    ready: false,
    isPro: false,
    offering: null,
    purchasing: false,
    restoring: false,
  });

  const didInit = useRef(false);
  const purchasingRef = useRef(false);
  const restoringRef = useRef(false);

  const refresh = useCallback(async () => {
    const [info, offering] = await Promise.all([purchases.getCustomerInfo(), purchases.getOfferings()]);
    setState((s) => ({ ...s, isPro: info.isPro, offering, ready: true }));
    void setProCached(info.isPro);
  }, []);

  useEffect(() => {
    if (didInit.current) return;
    didInit.current = true;
    (async () => {
      // Gecachten Status sofort fürs UI übernehmen (funktioniert offline).
      const cached = await getProCached();
      setState((s) => ({ ...s, isPro: cached }));
      try {
        await purchases.configure();
        await refresh();
      } catch {
        // Offline oder Store nicht erreichbar beim Start: gecachter Status bleibt
        // gültig, die App darf nicht blockieren.
        setState((s) => ({ ...s, ready: true }));
      }
    })();
  }, [refresh]);

  const purchase = useCallback(async (pkg: PurchasesPackageInfo): Promise<PurchaseFeedback> => {
    if (purchasingRef.current) {
      return { success: false, cancelled: false, error: null };
    }
    purchasingRef.current = true;
    setState((s) => ({ ...s, purchasing: true }));
    try {
      const result = await purchases.purchasePackage(pkg);
      if (result.success) {
        setState((s) => ({ ...s, isPro: s.isPro || result.isPro }));
        void setProCached(true);
      }
      return { success: result.success, cancelled: result.cancelled, error: result.error };
    } finally {
      purchasingRef.current = false;
      setState((s) => ({ ...s, purchasing: false }));
    }
  }, []);

  const restore = useCallback(async (): Promise<RestoreFeedback> => {
    if (restoringRef.current) {
      return { success: false, error: null, hadPurchases: false };
    }
    restoringRef.current = true;
    setState((s) => ({ ...s, restoring: true }));
    try {
      const result = await purchases.restorePurchases();
      if (result.isPro) {
        setState((s) => ({ ...s, isPro: true }));
        void setProCached(true);
      }
      return {
        success: result.success && result.hadPurchases,
        error: result.error,
        hadPurchases: result.hadPurchases,
      };
    } finally {
      restoringRef.current = false;
      setState((s) => ({ ...s, restoring: false }));
    }
  }, []);

  const api = useMemo<PurchasesStoreApi>(
    () => ({ ...state, isMock: purchases.isMock, refresh, purchase, restore }),
    [state, refresh, purchase, restore],
  );

  return <PurchasesContext.Provider value={api}>{children}</PurchasesContext.Provider>;
}

export function usePurchasesStore(): PurchasesStoreApi {
  const ctx = useContext(PurchasesContext);
  if (!ctx) throw new Error('usePurchasesStore muss innerhalb von PurchasesProvider verwendet werden');
  return ctx;
}
