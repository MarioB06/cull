// SDK 54: expo-media-library exportiert die klassische API direkt; bei
// expo-file-system liegt die klassische (getInfoAsync) API unter /legacy.
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as VideoThumbnails from 'expo-video-thumbnails';
import type { SortOrder, SmartFilter } from '../db/settings';
import { LARGE_FILE_THRESHOLD_BYTES, DUPLICATE_WINDOW_MS } from '../constants';

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
  smartFilter: SmartFilter;
}

/**
 * Läuft `fn` über `items` mit höchstens `limit` gleichzeitig laufenden Aufrufen — schützt
 * die native Bridge davor, z. B. 60 `getAssetInfoAsync`-Aufrufe (Smart-Filter "Grosse
 * Dateien") auf einen Schlag loszuschicken.
 */
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Smart-Filter "Grosse Dateien": pro Asset Dateigrösse auflösen (wie getAssetDetails,
 * aber ohne Poster/Favorit — hier zählt nur die Grösse) und alles unter der Schwelle
 * verwerfen. Läuft nur auf der aktuell geladenen Seite, nicht auf der ganzen Bibliothek.
 */
async function filterLargeAssets(assets: MediaLibrary.Asset[]): Promise<MediaLibrary.Asset[]> {
  const isLarge = await mapWithConcurrency(assets, 8, async (a) => {
    try {
      const info = await withTimeout(MediaLibrary.getAssetInfoAsync(a), 5000);
      const size = await getFileSize(info.localUri ?? a.uri);
      return size != null && size >= LARGE_FILE_THRESHOLD_BYTES;
    } catch {
      return false;
    }
  });
  return assets.filter((_, i) => isLarge[i]);
}

/**
 * Smart-Filter "Duplikate": einfache Serienbild-Heuristik auf Basis der bereits
 * vorhandenen Metadaten (kein zusätzlicher nativer Aufruf nötig) — zwei direkt
 * aufeinanderfolgende Aufnahmen (Liste ist nach creationTime sortiert) gelten als
 * Duplikat-Paar, wenn sie innerhalb von DUPLICATE_WINDOW_MS, mit gleicher Auflösung und
 * gleichem Medientyp entstanden sind. Erkennt bewusst nur angrenzende Paare pro Seite
 * (keine Seiten-übergreifende oder inhaltliche Bildanalyse) — für den typischen
 * "5x fast das gleiche Foto"-Fall reicht das.
 */
function filterDuplicateAssets(assets: MediaLibrary.Asset[]): MediaLibrary.Asset[] {
  const dupIds = new Set<string>();
  for (let i = 0; i < assets.length - 1; i++) {
    const a = assets[i];
    const b = assets[i + 1];
    const closeInTime = Math.abs(a.creationTime - b.creationTime) <= DUPLICATE_WINDOW_MS;
    if (closeInTime && a.width === b.width && a.height === b.height && a.mediaType === b.mediaType) {
      dupIds.add(a.id);
      dupIds.add(b.id);
    }
  }
  return assets.filter((a) => dupIds.has(a.id));
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
    // Screenshots laufen als natives Query-Filter (iOS) — billig und exakt, im Gegensatz
    // zu "large"/"duplicates", die erst nach dem Laden pro Seite nachgefiltert werden.
    ...(opts.smartFilter === 'screenshots' ? { mediaSubtypes: ['screenshot'] as MediaLibrary.MediaSubtype[] } : {}),
  });

  let assets = result.assets;
  if (opts.smartFilter === 'large') {
    assets = await filterLargeAssets(assets);
  } else if (opts.smartFilter === 'duplicates') {
    assets = filterDuplicateAssets(assets);
  }

  return {
    assets,
    endCursor: result.endCursor,
    hasNextPage: result.hasNextPage,
    totalCount: result.totalCount,
  };
}

/**
 * Gesamtzahl der Assets im aktuellen Scope (für den total-Zähler). Bei "screenshots" exakt
 * (natives Filter), bei "large"/"duplicates" die ungefilterte Scope-Grösse — eine exakte
 * Zahl würde die ganze Bibliothek durchgehen müssen, das ist bewusst nicht implementiert.
 */
export async function countAssetsInScope(opts: {
  includeVideos: boolean;
  albumId: string | null;
  smartFilter: SmartFilter;
}): Promise<number> {
  const mediaType = opts.includeVideos
    ? [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video]
    : [MediaLibrary.MediaType.photo];
  // first: 0 liefert totalCount ohne Assets zu materialisieren.
  const result = await MediaLibrary.getAssetsAsync({
    first: 0,
    mediaType,
    ...(opts.albumId ? { album: opts.albumId } : {}),
    ...(opts.smartFilter === 'screenshots' ? { mediaSubtypes: ['screenshot'] as MediaLibrary.MediaSubtype[] } : {}),
  });
  return result.totalCount;
}

/**
 * Bricht das Warten auf `promise` nach `ms` ab. Die native Operation läuft im
 * Hintergrund weiter (kein Cancel-API vorhanden) — wir geben nur nicht mehr auf sie acht,
 * damit ein hängender Call (z. B. iCloud-Download, exotischer Codec) die Karte nicht
 * für immer im Loading-Zustand hält.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      },
    );
  });
}

/**
 * Serialisiert eine teure Operation app-weit auf höchstens eine gleichzeitig laufende.
 * Video-Thumbnail-Erzeugung ist native Decode-Arbeit — beim Prefetch (aktive Karte + 3
 * vorausgeladene, siehe PREFETCH_COUNT) liefen sonst bis zu 4 Decodes gleichzeitig,
 * was sich gegenseitig so ausbremst, dass reihenweise Anfragen den Timeout reißen.
 */
let thumbnailQueue: Promise<unknown> = Promise.resolve();
function enqueueThumbnail<T>(fn: () => Promise<T>): Promise<T> {
  const run = thumbnailQueue.then(fn, fn);
  thumbnailQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
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
    // iCloud-Videos ohne lokale Kopie können hier sehr lange hängen (Download läuft) —
    // nach 8s aufgeben statt die Karte für immer im Loading-Zustand zu lassen.
    const info = await withTimeout(MediaLibrary.getAssetInfoAsync(asset), 8000);
    localUri = info.localUri ?? asset.uri ?? null;
    isFavorite = !!info.isFavorite;
  } catch {
    // iCloud-Asset evtl. noch nicht lokal, oder Timeout — uri als Fallback verwenden.
  }

  fileSize = await getFileSize(localUri);

  // expo-image kann Videodateien nicht als Bild dekodieren (schwarzer Bildschirm) —
  // deshalb für Videos ein Standbild erzeugen und das statt der Rohdatei anzeigen.
  //
  // time: 0 mit Nulltoleranz scheitert bei vielen re-encodeten .mp4 (WhatsApp, Downloads
  // etc.) — deren erstes Sample ist oft kein valides Keyframe (AVFoundationError -11832).
  // Kamera-.mov klappt bei 0 fast immer. Zusätzlich haben viele (v. a. längere) Videos einen
  // schwarzen Leader/Fade-in in den ersten Frames — technisch ein gültiges Thumbnail, aber
  // optisch nutzlos. Deshalb bei längeren Videos 1s reingehen (überspringt die meisten
  // Fade-ins), bei kürzeren mit kleinerem Offset, immer mit 0 als letztem Rückfall.
  if (asset.mediaType === 'video' && localUri) {
    const durationMs = Math.round((asset.duration ?? 0) * 1000);
    const attempts =
      durationMs > 1200 ? [1000, 0] : durationMs > 200 ? [100, 0] : [0];
    const uri = localUri;
    posterUri = await enqueueThumbnail(async () => {
      for (const time of attempts) {
        try {
          // Timeout pro Versuch — manche Videos lassen die native Decode-Operation
          // nie fertig werden (nie resolve/reject), ohne das würde die Karte ewig laden.
          const thumb = await withTimeout(VideoThumbnails.getThumbnailAsync(uri, { time }), 5000);
          return thumb.uri;
        } catch {
          // nächsten Versuch probieren; wenn alle scheitern, bleibt posterUri null
          // und die Karte zeigt einen Fallback-Platzhalter statt endlos zu laden.
        }
      }
      return null;
    });
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
