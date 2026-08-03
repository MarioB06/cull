import { getDb } from './index';

// Einfache Bool-Flags in der settings-Tabelle (getrennt von AppSettings, da sie
// keinen Galerie-Reload auslösen und nicht im Settings-Screen editierbar sind).

const KEYS = {
  onboardingCompleted: 'onboarding_completed',
  coachShown: 'coach_shown',
  proCached: 'pro_cached',
} as const;

async function getBool(key: string): Promise<boolean> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ value: string }>(
    `SELECT value FROM settings WHERE key = ?`,
    [key],
  );
  return row?.value === '1';
}

async function setBool(key: string, value: boolean): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value ? '1' : '0'],
  );
}

export const getOnboardingCompleted = (): Promise<boolean> => getBool(KEYS.onboardingCompleted);
export const setOnboardingCompleted = (value: boolean): Promise<void> =>
  setBool(KEYS.onboardingCompleted, value);

export const getCoachShown = (): Promise<boolean> => getBool(KEYS.coachShown);
export const setCoachShown = (value: boolean): Promise<void> => setBool(KEYS.coachShown, value);

/** Nur für sofortiges UI beim Kaltstart — Quelle der Wahrheit bleibt RevenueCat/Mock. */
export const getProCached = (): Promise<boolean> => getBool(KEYS.proCached);
export const setProCached = (value: boolean): Promise<void> => setBool(KEYS.proCached, value);
