// Zentrale Konstanten. App-Name hier (und in app.json) ändern, um umzubenennen.

export const APP_NAME = 'Cull';

// Dev-Schalter: wenn true, löscht "Endgültig löschen" NICHT echt, sondern simuliert nur.
// Damit lässt sich der gesamte Flow testen, ohne echte Fotos zu verlieren.
export const DRY_RUN = false;

// Seitengröße fürs paginierte Laden der Galerie.
export const PAGE_SIZE = 60;

// Anzahl der nächsten Bilder, die per Image.prefetch vorgeladen werden.
export const PREFETCH_COUNT = 3;

// Swipe-Mechanik.
export const SWIPE_THRESHOLD = 100; // px horizontale Distanz für Commit
export const SWIPE_VELOCITY_THRESHOLD = 800; // Flick-Geschwindigkeit für Commit
export const ROTATION_DIVISOR = 18; // rotate(deg) = translateX / divisor
export const STAMP_FULL_AT = 100; // px ab dem ein Stamp voll sichtbar ist

// Undo-Stack-Größe.
export const UNDO_STACK_SIZE = 5;

// Chunk-Größe für deleteAssetsAsync bei sehr großen Queues.
export const DELETE_CHUNK_SIZE = 200;

// --- Monetarisierung ---

// RevenueCat-Entitlement-Name (siehe SETUP.md).
export const ENTITLEMENT_ID = 'pro';

// Lebenslange kostenlose Löschungen (aus decisions zählbar), bevor Cull Pro nötig ist.
export const FREE_DELETE_LIMIT = 200;

// RevenueCat-API-Keys — siehe SETUP.md. Solange leer, bleibt die Real-Implementierung
// inaktiv und die App nutzt automatisch den Mock (auch in einem Dev-Build).
export const REVENUECAT_API_KEY_IOS = 'appl_tHtXqUvoWmIeguxcJMExMFuckXE';
export const REVENUECAT_API_KEY_ANDROID = '';

// Rechtstexte für die Paywall (App-Store-Pflicht). Siehe SETUP.md.
export const TERMS_URL = 'https://cull.mbozic.dev/nutzungsbedingungen';
export const PRIVACY_URL = 'https://cull.mbozic.dev/datenschutz';

// --- Smart-Filter (Pro, iOS) ---

// Ab dieser Dateigröße gilt ein Foto/Video als "gross" für den Smart-Filter.
export const LARGE_FILE_THRESHOLD_BYTES = 8 * 1024 * 1024; // 8 MB

// --- Analytics (PostHog) ---

// Siehe SETUP.md. Solange leer, bleibt Analytics komplett inaktiv (kein Client wird erzeugt,
// jeder track()-Aufruf ist ein No-op) — kein Warten auf einen Key nötig, um die App zu bauen.
export const POSTHOG_API_KEY = 'phc_B63QKRiErTH3yXRvEmTZ8owPXMqJSTyu2fcmsEEQqgq6';
export const POSTHOG_HOST = 'https://eu.i.posthog.com';
