import { getDb } from './index';

export type SortOrder = 'newest' | 'oldest';

export interface AppSettings {
  sortOrder: SortOrder;
  includeVideos: boolean;
  skipFavorites: boolean;
  haptics: boolean;
  albumId: string | null; // null = alle Fotos
  albumTitle: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  sortOrder: 'newest',
  includeVideos: false,
  skipFavorites: false,
  haptics: true,
  albumId: null,
  albumTitle: null,
};

const KEYS = {
  sortOrder: 'sort_order',
  includeVideos: 'include_videos',
  skipFavorites: 'skip_favorites',
  haptics: 'haptics',
  albumId: 'album_id',
  albumTitle: 'album_title',
} as const;

async function getRaw(): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = await db.getAllAsync<{ key: string; value: string }>(
    `SELECT key, value FROM settings`,
  );
  return new Map(rows.map((r) => [r.key, r.value]));
}

export async function loadSettings(): Promise<AppSettings> {
  const raw = await getRaw();
  const bool = (k: string, def: boolean) => {
    const v = raw.get(k);
    return v == null ? def : v === '1';
  };
  return {
    sortOrder: (raw.get(KEYS.sortOrder) as SortOrder) || DEFAULT_SETTINGS.sortOrder,
    includeVideos: bool(KEYS.includeVideos, DEFAULT_SETTINGS.includeVideos),
    skipFavorites: bool(KEYS.skipFavorites, DEFAULT_SETTINGS.skipFavorites),
    haptics: bool(KEYS.haptics, DEFAULT_SETTINGS.haptics),
    albumId: raw.get(KEYS.albumId) ?? DEFAULT_SETTINGS.albumId,
    albumTitle: raw.get(KEYS.albumTitle) ?? DEFAULT_SETTINGS.albumTitle,
  };
}

async function put(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
}

async function del(key: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(`DELETE FROM settings WHERE key = ?`, [key]);
}

export async function saveSetting<K extends keyof AppSettings>(
  key: K,
  value: AppSettings[K],
): Promise<void> {
  switch (key) {
    case 'sortOrder':
      return put(KEYS.sortOrder, String(value));
    case 'includeVideos':
      return put(KEYS.includeVideos, value ? '1' : '0');
    case 'skipFavorites':
      return put(KEYS.skipFavorites, value ? '1' : '0');
    case 'haptics':
      return put(KEYS.haptics, value ? '1' : '0');
    case 'albumId':
      return value == null ? del(KEYS.albumId) : put(KEYS.albumId, String(value));
    case 'albumTitle':
      return value == null ? del(KEYS.albumTitle) : put(KEYS.albumTitle, String(value));
  }
}
