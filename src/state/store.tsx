import React, {
  createContext,
  useContext,
  useReducer,
  useRef,
  useCallback,
  useMemo,
} from 'react';
import * as Media from '../media';
import type { Asset, AssetDetails, PermissionResult } from '../media';
import * as Decisions from '../db/decisions';
import {
  loadSettings,
  saveSetting,
  DEFAULT_SETTINGS,
  type AppSettings,
} from '../db/settings';
import { PAGE_SIZE, UNDO_STACK_SIZE, DELETE_CHUNK_SIZE, DRY_RUN } from '../constants';

interface Counts {
  kept: number;
  queued: number;
  deleted: number;
}

interface UndoEntry {
  asset: Asset;
  wasDecision: 'kept' | 'queued';
}

interface State {
  ready: boolean;
  permission: PermissionResult | null;
  settings: AppSettings;
  loading: boolean;
  pool: Asset[];
  cursor: string | undefined;
  hasNextPage: boolean;
  totalCount: number;
  processed: number;
  counts: Counts;
  queueCount: number;
  detailsCache: Record<string, AssetDetails>;
  undoDepth: number;
  error: string | null;
}

const initialState: State = {
  ready: false,
  permission: null,
  settings: DEFAULT_SETTINGS,
  loading: false,
  pool: [],
  cursor: undefined,
  hasNextPage: true,
  totalCount: 0,
  processed: 0,
  counts: { kept: 0, queued: 0, deleted: 0 },
  queueCount: 0,
  detailsCache: {},
  undoDepth: 0,
  error: null,
};

type Action =
  | { type: 'SET_PERMISSION'; permission: PermissionResult }
  | { type: 'SET_SETTINGS'; settings: AppSettings }
  | { type: 'SET_LOADING'; loading: boolean }
  | {
      type: 'SET_GALLERY';
      pool: Asset[];
      cursor: string | undefined;
      hasNextPage: boolean;
      totalCount: number;
    }
  | { type: 'APPEND_POOL'; assets: Asset[]; cursor: string | undefined; hasNextPage: boolean }
  | {
      type: 'SET_COUNTS';
      processed: number;
      counts: Counts;
      queueCount: number;
    }
  | { type: 'POP_FRONT' }
  | { type: 'UNSHIFT'; asset: Asset }
  | { type: 'REMOVE_ASSETS'; ids: string[] }
  | { type: 'SET_DETAILS'; id: string; details: AssetDetails }
  | { type: 'SET_UNDO_DEPTH'; depth: number }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'READY' }
  | { type: 'PATCH_COUNTS'; patch: Partial<{ processed: number; queueCount: number }> & { counts?: Partial<Counts> } };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_PERMISSION':
      return { ...state, permission: action.permission };
    case 'SET_SETTINGS':
      return { ...state, settings: action.settings };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    case 'SET_GALLERY':
      return {
        ...state,
        pool: action.pool,
        cursor: action.cursor,
        hasNextPage: action.hasNextPage,
        totalCount: action.totalCount,
      };
    case 'APPEND_POOL':
      return {
        ...state,
        pool: [...state.pool, ...action.assets],
        cursor: action.cursor,
        hasNextPage: action.hasNextPage,
      };
    case 'SET_COUNTS':
      return {
        ...state,
        processed: action.processed,
        counts: action.counts,
        queueCount: action.queueCount,
      };
    case 'POP_FRONT':
      return { ...state, pool: state.pool.slice(1) };
    case 'UNSHIFT':
      return { ...state, pool: [action.asset, ...state.pool] };
    case 'REMOVE_ASSETS': {
      const ids = new Set(action.ids);
      return { ...state, pool: state.pool.filter((a) => !ids.has(a.id)) };
    }
    case 'SET_DETAILS':
      return {
        ...state,
        detailsCache: { ...state.detailsCache, [action.id]: action.details },
      };
    case 'SET_UNDO_DEPTH':
      return { ...state, undoDepth: action.depth };
    case 'SET_ERROR':
      return { ...state, error: action.error };
    case 'READY':
      return { ...state, ready: true };
    case 'PATCH_COUNTS':
      return {
        ...state,
        processed: action.patch.processed ?? state.processed,
        queueCount: action.patch.queueCount ?? state.queueCount,
        counts: action.patch.counts ? { ...state.counts, ...action.patch.counts } : state.counts,
      };
    default:
      return state;
  }
}

interface StoreApi {
  state: State;
  // Lebenszyklus
  initialize: () => Promise<void>;
  requestPermission: () => Promise<void>;
  recheckPermission: () => Promise<void>;
  reloadGallery: () => Promise<void>;
  // Entscheidungen
  decideKeep: () => Promise<void>;
  decideDelete: () => Promise<void>;
  autoKeep: (assetId: string) => Promise<void>;
  undo: () => Promise<void>;
  // Queue
  removeFromQueue: (assetId: string) => Promise<void>;
  commitDelete: () => Promise<Media.DeleteResult & { freedBytes: number }>;
  // Details
  loadDetails: (asset: Asset) => Promise<void>;
  // Settings
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  resetHistory: () => Promise<void>;
}

const StoreContext = createContext<StoreApi | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Aktuellen State synchron in async-Thunks lesen.
  const stateRef = useRef(state);
  stateRef.current = state;

  // Undo-Stack im Ref (kein Render-relevanter Inhalt außer Tiefe).
  const undoStack = useRef<UndoEntry[]>([]);
  // Verhindert parallele Lade-Vorgänge.
  const loadingPage = useRef(false);

  const setUndoDepth = useCallback(() => {
    dispatch({ type: 'SET_UNDO_DEPTH', depth: undoStack.current.length });
  }, []);

  /** Zähler frisch aus der DB lesen. */
  const refreshCounts = useCallback(async (scopeTotal?: number) => {
    const [counts, queueCount] = await Promise.all([
      Decisions.countByDecision(),
      Decisions.getQueuedIds().then((ids) => ids.length),
    ]);
    const processed = counts.kept + counts.queued + counts.deleted;
    dispatch({
      type: 'SET_COUNTS',
      processed,
      counts,
      queueCount,
    });
  }, []);

  /** Eine Galerie-Seite laden und nur unentschiedene Assets in den Pool hängen. */
  const fetchMoreInternal = useCallback(async (): Promise<void> => {
    const s = stateRef.current;
    if (loadingPage.current || !s.hasNextPage) return;
    loadingPage.current = true;
    try {
      const decided = await Decisions.getDecidedIds();
      let cursor = s.cursor;
      let hasNext: boolean = s.hasNextPage;
      let collected: Asset[] = [];
      // Solange weiterladen, bis wir neue unentschiedene Assets haben oder das Ende erreicht ist.
      let guard = 0;
      while (collected.length === 0 && hasNext && guard < 50) {
        guard += 1;
        const page = await Media.fetchAssetPage({
          first: PAGE_SIZE,
          after: cursor,
          sortOrder: s.settings.sortOrder,
          includeVideos: s.settings.includeVideos,
          albumId: s.settings.albumId,
        });
        cursor = page.endCursor;
        hasNext = page.hasNextPage;
        const existingIds = new Set(stateRef.current.pool.map((a) => a.id));
        collected = page.assets.filter((a) => !decided.has(a.id) && !existingIds.has(a.id));
        if (!hasNext) break;
      }
      dispatch({ type: 'APPEND_POOL', assets: collected, cursor, hasNextPage: hasNext });
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: e instanceof Error ? e.message : String(e) });
    } finally {
      loadingPage.current = false;
    }
  }, []);

  const reloadGallery = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', loading: true });
    dispatch({ type: 'SET_ERROR', error: null });
    undoStack.current = [];
    setUndoDepth();
    try {
      const settings = stateRef.current.settings;
      const [decided, totalCount] = await Promise.all([
        Decisions.getDecidedIds(),
        Media.countAssetsInScope({
          includeVideos: settings.includeVideos,
          albumId: settings.albumId,
        }),
      ]);

      // Erste Seite(n) laden bis wir genug unentschiedene haben (oder Ende).
      let cursor: string | undefined = undefined;
      let hasNext = true;
      const pool: Asset[] = [];
      let guard = 0;
      while (pool.length < PAGE_SIZE && hasNext && guard < 50) {
        guard += 1;
        const page = await Media.fetchAssetPage({
          first: PAGE_SIZE,
          after: cursor,
          sortOrder: settings.sortOrder,
          includeVideos: settings.includeVideos,
          albumId: settings.albumId,
        });
        cursor = page.endCursor;
        hasNext = page.hasNextPage;
        for (const a of page.assets) {
          if (!decided.has(a.id)) pool.push(a);
        }
      }

      dispatch({
        type: 'SET_GALLERY',
        pool,
        cursor,
        hasNextPage: hasNext,
        totalCount,
      });
      await refreshCounts(totalCount);
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: e instanceof Error ? e.message : String(e) });
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  }, [refreshCounts, setUndoDepth]);

  const initialize = useCallback(async () => {
    const settings = await loadSettings();
    dispatch({ type: 'SET_SETTINGS', settings });
    const perm = await Media.checkPermission();
    dispatch({ type: 'SET_PERMISSION', permission: perm });
    dispatch({ type: 'READY' });
    if (perm.state === 'granted' || perm.state === 'limited') {
      await reloadGallery();
    }
  }, [reloadGallery]);

  const requestPermission = useCallback(async () => {
    const perm = await Media.requestPermission();
    dispatch({ type: 'SET_PERMISSION', permission: perm });
    if (perm.state === 'granted' || perm.state === 'limited') {
      await reloadGallery();
    }
  }, [reloadGallery]);

  const recheckPermission = useCallback(async () => {
    const prev = stateRef.current.permission?.state;
    const perm = await Media.checkPermission();
    dispatch({ type: 'SET_PERMISSION', permission: perm });
    const nowOk = perm.state === 'granted' || perm.state === 'limited';
    // Nur neu laden, wenn sich der Zugriffsstatus geändert hat (sonst Undo-Stack erhalten).
    if (nowOk && perm.state !== prev) {
      await reloadGallery();
    }
  }, [reloadGallery]);

  const loadDetails = useCallback(async (asset: Asset) => {
    if (stateRef.current.detailsCache[asset.id]) return;
    const details = await Media.getAssetDetails(asset);
    dispatch({ type: 'SET_DETAILS', id: asset.id, details });
  }, []);

  // Gemeinsame Decide-Logik (top-Karte oder per-ID).
  const decide = useCallback(
    async (decision: 'kept' | 'queued', auto = false) => {
      const s = stateRef.current;
      const asset = s.pool[0];
      if (!asset) return;

      // Optimistisch aus dem Pool nehmen.
      dispatch({ type: 'POP_FRONT' });

      // Undo-Eintrag (bei auto-Keep von Favoriten nicht stapeln).
      if (!auto) {
        undoStack.current.push({ asset, wasDecision: decision });
        if (undoStack.current.length > UNDO_STACK_SIZE) undoStack.current.shift();
        setUndoDepth();
      }

      // Lokale Zähler-Updates (snappy).
      const patch: Partial<{ processed: number; queueCount: number }> & {
        counts?: Partial<Counts>;
      } = { processed: s.processed + 1 };
      if (decision === 'queued') {
        patch.queueCount = s.queueCount + 1;
        patch.counts = { queued: s.counts.queued + 1 };
      } else {
        patch.counts = { kept: s.counts.kept + 1 };
      }
      dispatch({ type: 'PATCH_COUNTS', patch });

      // Persistieren. Größe aus Cache, sonst lazy nachladen.
      const cached = s.detailsCache[asset.id];
      const size = cached?.fileSize ?? null;
      try {
        await Decisions.setDecision(asset.id, decision, size);
        if (decision === 'queued' && size == null) {
          // Größe im Hintergrund nachziehen (für Queue/„freigegeben").
          Media.getAssetDetails(asset)
            .then((d) => {
              if (d.fileSize != null) Decisions.updateFileSize(asset.id, d.fileSize);
              dispatch({ type: 'SET_DETAILS', id: asset.id, details: d });
            })
            .catch(() => {});
        }
      } catch (e) {
        dispatch({ type: 'SET_ERROR', error: e instanceof Error ? e.message : String(e) });
      }

      // Pool ggf. nachfüllen.
      if (stateRef.current.pool.length < 5) {
        void fetchMoreInternal();
      }
    },
    [fetchMoreInternal, setUndoDepth],
  );

  const decideKeep = useCallback(() => decide('kept'), [decide]);
  const decideDelete = useCallback(() => decide('queued'), [decide]);

  /** Favoriten-Auto-Keep (überspringt Undo-Stack, da unsichtbar). */
  const autoKeep = useCallback(
    async (assetId: string) => {
      const s = stateRef.current;
      if (s.pool[0]?.id !== assetId) return;
      await decide('kept', true);
    },
    [decide],
  );

  const undo = useCallback(async () => {
    const entry = undoStack.current.pop();
    setUndoDepth();
    if (!entry) return;
    const s = stateRef.current;
    try {
      await Decisions.clearDecision(entry.asset.id);
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: e instanceof Error ? e.message : String(e) });
    }
    // Asset zurück an den Anfang des Pools.
    dispatch({ type: 'UNSHIFT', asset: entry.asset });
    const patch: Partial<{ processed: number; queueCount: number }> & {
      counts?: Partial<Counts>;
    } = { processed: Math.max(0, s.processed - 1) };
    if (entry.wasDecision === 'queued') {
      patch.queueCount = Math.max(0, s.queueCount - 1);
      patch.counts = { queued: Math.max(0, s.counts.queued - 1) };
    } else {
      patch.counts = { kept: Math.max(0, s.counts.kept - 1) };
    }
    dispatch({ type: 'PATCH_COUNTS', patch });
  }, [setUndoDepth]);

  const removeFromQueue = useCallback(async (assetId: string) => {
    // Abwählen = Entscheidung auf 'kept' (bewusst gegen Re-Review-Schleifen,
    // statt komplett unentschieden zu machen).
    const s = stateRef.current;
    try {
      await Decisions.setDecision(assetId, 'kept');
    } catch (e) {
      dispatch({ type: 'SET_ERROR', error: e instanceof Error ? e.message : String(e) });
    }
    dispatch({
      type: 'PATCH_COUNTS',
      patch: {
        queueCount: Math.max(0, s.queueCount - 1),
        counts: {
          queued: Math.max(0, s.counts.queued - 1),
          kept: s.counts.kept + 1,
        },
      },
    });
  }, []);

  const commitDelete = useCallback(async (): Promise<
    Media.DeleteResult & { freedBytes: number }
  > => {
    const queue = await Decisions.getQueue();
    const ids = queue.map((q) => q.asset_id);
    const sizeById = new Map(queue.map((q) => [q.asset_id, q.file_size]));

    if (ids.length === 0) {
      return { deletedIds: [], cancelled: false, error: null, freedBytes: 0 };
    }

    let result: Media.DeleteResult;
    if (DRY_RUN) {
      // Simulation: nichts wirklich löschen.
      result = { deletedIds: ids, cancelled: false, error: null };
    } else {
      // In Chunks löschen (Plattform-Limits bei sehr großen Queues).
      const deleted: string[] = [];
      let cancelled = false;
      let error: string | null = null;
      for (let i = 0; i < ids.length; i += DELETE_CHUNK_SIZE) {
        const chunk = ids.slice(i, i + DELETE_CHUNK_SIZE);
        const r = await Media.deleteAssets(chunk);
        if (r.error) {
          error = r.error;
          break;
        }
        if (r.cancelled) {
          cancelled = true;
          break;
        }
        deleted.push(...r.deletedIds);
      }
      result = { deletedIds: deleted, cancelled, error };
    }

    if (result.deletedIds.length > 0) {
      await Decisions.markDeleted(result.deletedIds);
      const deletedSet = new Set(result.deletedIds);
      dispatch({ type: 'REMOVE_ASSETS', ids: result.deletedIds });
      await refreshCounts();
      const freedBytes = result.deletedIds.reduce((sum, id) => {
        const sz = sizeById.get(id);
        return sz != null && isFinite(sz) ? sum + sz : sum;
      }, 0);
      void deletedSet;
      return { ...result, freedBytes };
    }

    return { ...result, freedBytes: 0 };
  }, [refreshCounts]);

  const updateSetting = useCallback(
    async <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      await saveSetting(key, value);
      const next = { ...stateRef.current.settings, [key]: value } as AppSettings;
      dispatch({ type: 'SET_SETTINGS', settings: next });
      // Scope-relevante Settings → Galerie neu laden.
      if (
        key === 'sortOrder' ||
        key === 'includeVideos' ||
        key === 'albumId' ||
        key === 'skipFavorites'
      ) {
        await reloadGallery();
      }
    },
    [reloadGallery],
  );

  const resetHistory = useCallback(async () => {
    await Decisions.resetAllDecisions();
    await reloadGallery();
  }, [reloadGallery]);

  const api = useMemo<StoreApi>(
    () => ({
      state,
      initialize,
      requestPermission,
      recheckPermission,
      reloadGallery,
      decideKeep,
      decideDelete,
      autoKeep,
      undo,
      removeFromQueue,
      commitDelete,
      loadDetails,
      updateSetting,
      resetHistory,
    }),
    [
      state,
      initialize,
      requestPermission,
      recheckPermission,
      reloadGallery,
      decideKeep,
      decideDelete,
      autoKeep,
      undo,
      removeFromQueue,
      commitDelete,
      loadDetails,
      updateSetting,
      resetHistory,
    ],
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreApi {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore muss innerhalb von StoreProvider verwendet werden');
  return ctx;
}
