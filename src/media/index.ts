// SDK 54: expo-media-library exportiert die klassische API direkt; bei
// expo-file-system liegt die klassische (getInfoAsync) API unter /legacy.
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import type { SortOrder } from '../db/settings';

export type { Asset } from 'expo-media-library';

export type PermissionState = 'undetermined' | 'granted' | 'limited' | 'denied';

export interface PermissionResult {
  state: PermissionState;
  canAskAgain: boolean;
}

function normalize(perm: MediaLibrary.PermissionResponse): PermissionResult {
  // iOS unterscheidet 'all' vs 'limited'. Android kennt nur granted/denied.
  if (perm.granted) {
    const priv = perm.accessPrivileges;
    if (priv === 'limited') return { state: 'limited', canAskAgain: perm.canAskAgain };
    return { state: 'granted', canAskAgain: perm.canAskAgain };
  }
  if (perm.status === 'undetermined') {
    return { state: 'undetermined', canAskAgain: perm.canAskAgain };
  }
  return { state: 'denied', canAskAgain: perm.canAskAgain };
}

export async function requestPermission(): Promise<PermissionResult> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  return normalize(perm);
}

export async function checkPermission(): Promise<PermissionResult> {
  const perm = await MediaLibrary.getPermissionsAsync();
  return normalize(perm);
}

export async function presentLimitedPicker(): Promise<void> {
  try {
    await MediaLibrary.presentPermissionsPickerAsync();
  } catch {
    // Auf Plattformen/Versionen ohne diese API einfach ignorieren.
  }
}

export interface AssetPage {
  assets: MediaLibrary.Asset[];
  endCursor: string | undefined;
  hasNextPage: boolean;
  totalCount: number;
}

export interface FetchOptions {
  after?: string;
  first: number;
  sortOrder: SortOrder;
  includeVideos: boolean;
  albumId: string | null;
}

export async function fetchAssetPage(opts: FetchOptions): Promise<AssetPage> {
  const mediaType = opts.includeVideos
    ? [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video]
    : [MediaLibrary.MediaType.photo];

  // sortBy: [creationTime, ascending?] — true = älteste zuerst, false = neueste zuerst.
  const ascending = opts.sortOrder === 'oldest';

  const result = await MediaLibrary.getAssetsAsync({
    first: opts.first,
    after: opts.after,
    mediaType,
    sortBy: [[MediaLibrary.SortBy.creationTime, ascending]],
    ...(opts.albumId ? { album: opts.albumId } : {}),
  });

  return {
    assets: result.assets,
    endCursor: result.endCursor,
    hasNextPage: result.hasNextPage,
    totalCount: result.totalCount,
  };
}

/** Gesamtzahl der Assets im aktuellen Scope (für den total-Zähler). */
export async function countAssetsInScope(opts: {
  includeVideos: boolean;
  albumId: string | null;
}): Promise<number> {
  const mediaType = opts.includeVideos
    ? [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video]
    : [MediaLibrary.MediaType.photo];
  // first: 0 liefert totalCount ohne Assets zu materialisieren.
  const result = await MediaLibrary.getAssetsAsync({
    first: 0,
    mediaType,
    ...(opts.albumId ? { album: opts.albumId } : {}),
  });
  return result.totalCount;
}

export interface AssetDetails {
  id: string;
  localUri: string | null;
  fileSize: number | null;
  isFavorite: boolean;
  filename: string;
  /** Nur für Videos gesetzt: Standbild (erstes Frame) als Ersatz für die rohe Videodatei. */
  posterUri: string | null;
}

/**
 * Lazy Details für eine Karte / ein Queue-Item: localUri (zum Anzeigen & für Größe),
 * Dateigröße (via FileSystem) und Favoriten-Flag. Wirft nie — gibt bei Fehlern Defaults.
 */
export async function getAssetDetails(asset: MediaLibrary.Asset): Promise<AssetDetails> {
  let localUri: string | null = asset.uri ?? null;
  let isFavorite = false;
  let fileSize: number | null = null;
  let posterUri: string | null = null;

  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset);
    localUri = info.localUri ?? asset.uri ?? null;
    isFavorite = !!info.isFavorite;
  } catch {
    // iCloud-Asset evtl. noch nicht lokal — uri als Fallback verwenden.
  }

  fileSize = await getFileSize(localUri);

  // expo-image kann Videodateien nicht als Bild dekodieren (schwarzer Bildschirm) —
  // deshalb für Videos ein Standbild erzeugen und das statt der Rohdatei anzeigen.
  if (asset.mediaType === 'video' && localUri) {
    try {
      const thumb = await VideoThumbnails.getThumbnailAsync(localUri, { time: 0 });
      posterUri = thumb.uri;
    } catch {
      // Manche Codecs/DRM-Videos liefern kein Thumbnail — Karte zeigt dann den Loader.
    }
  }

  return {
    id: asset.id,
    localUri,
    fileSize,
    isFavorite,
    filename: asset.filename ?? asset.id,
    posterUri,
  };
}

/**
 * URI eines Assets per ID auflösen (für Queue-Thumbnails). Gibt null zurück,
 * wenn das Asset nicht mehr existiert (außerhalb der App gelöscht) — kein Crash.
 */
export async function getUriById(assetId: string): Promise<string | null> {
  try {
    const info = await MediaLibrary.getAssetInfoAsync(assetId);
    return info?.localUri ?? info?.uri ?? null;
  } catch {
    return null;
  }
}

/** Dateigröße in Bytes via FileSystem; null wenn nicht ermittelbar. */
export async function getFileSize(localUri: string | null): Promise<number | null> {
  if (!localUri || !localUri.startsWith('file:')) return null;
  try {
    const info = await FileSystem.getInfoAsync(localUri);
    if (info.exists && typeof info.size === 'number') {
      return info.size;
    }
  } catch {
    // ignorieren
  }
  return null;
}

export interface DeleteResult {
  deletedIds: string[];
  cancelled: boolean;
  error: string | null;
}

/**
 * Markierte Assets über den System-Dialog löschen. Behandelt Abbruch, Teil-Erfolg
 * und fehlende IDs (außerhalb der App gelöscht) defensiv.
 */
export async function deleteAssets(assetIds: string[]): Promise<DeleteResult> {
  if (assetIds.length === 0) {
    return { deletedIds: [], cancelled: false, error: null };
  }
  try {
    // deleteAssetsAsync akzeptiert IDs oder Asset-Objekte und löst genau EINEN System-Dialog aus.
    const ok = await MediaLibrary.deleteAssetsAsync(assetIds);
    if (ok) {
      return { deletedIds: assetIds, cancelled: false, error: null };
    }
    // false = Nutzer hat den System-Dialog abgebrochen.
    return { deletedIds: [], cancelled: true, error: null };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { deletedIds: [], cancelled: false, error: msg };
  }
}

export interface AlbumInfo {
  id: string;
  title: string;
  count: number;
}

export async function listAlbums(): Promise<AlbumInfo[]> {
  try {
    const albums = await MediaLibrary.getAlbumsAsync({ includeSmartAlbums: true });
    return albums
      .map((a) => ({ id: a.id, title: a.title, count: a.assetCount ?? 0 }))
      .filter((a) => a.count > 0)
      .sort((a, b) => b.count - a.count);
  } catch {
    return [];
  }
}
