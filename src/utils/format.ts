// Formatierungs-Helfer (Deutsch, Komma als Dezimaltrennzeichen).

const MONTHS_DE = [
  'JAN',
  'FEB',
  'MÄR',
  'APR',
  'MAI',
  'JUN',
  'JUL',
  'AUG',
  'SEP',
  'OKT',
  'NOV',
  'DEZ',
];

/**
 * Datum im Mockup-Stil: "14. MÄR 2024".
 * @param ms Epoch-Millisekunden (MediaLibrary.Asset.creationTime ist in ms).
 */
export function formatDate(ms: number | null | undefined): string {
  if (ms == null || !isFinite(ms) || ms <= 0) return '— — —';
  const d = new Date(ms);
  const day = d.getDate();
  const month = MONTHS_DE[d.getMonth()] ?? '???';
  const year = d.getFullYear();
  return `${day}. ${month} ${year}`;
}

/**
 * Dateigröße im Mockup-Stil mit Komma: "3,2 MB".
 * Gibt "— MB" zurück, wenn die Größe unbekannt ist (nie NaN).
 */
export function formatSize(bytes: number | null | undefined): string {
  if (bytes == null || !isFinite(bytes) || bytes < 0) return '— MB';
  if (bytes === 0) return '0 MB';

  const mb = bytes / (1024 * 1024);
  if (mb < 0.1) {
    const kb = bytes / 1024;
    return `${formatNumber(kb, kb < 10 ? 1 : 0)} KB`;
  }
  if (mb >= 1024) {
    const gb = mb / 1024;
    return `${formatNumber(gb, 1)} GB`;
  }
  return `${formatNumber(mb, mb < 10 ? 1 : 0)} MB`;
}

/** Zahl mit deutschem Komma als Dezimaltrennzeichen. */
export function formatNumber(value: number, decimals: number): string {
  return value.toFixed(decimals).replace('.', ',');
}

/**
 * Summe von Bytes als "x,y MB" o.ä. für die "freigegeben"-Zeile.
 * Unbekannte Größen (null) werden ausgelassen, nie als NaN.
 */
export function formatFreedSize(bytesList: Array<number | null | undefined>): string {
  const total = bytesList.reduce<number>(
    (sum, b) => (b != null && isFinite(b) && b > 0 ? sum + b : sum),
    0,
  );
  return formatSize(total);
}

/** Dateiname aus einem Pfad/URI extrahieren (für Frame-Nummer). */
export function fileNameFromUri(uri: string | null | undefined, fallback: string): string {
  if (!uri) return fallback;
  const clean = uri.split('?')[0];
  const parts = clean.split('/');
  const name = parts[parts.length - 1];
  return name && name.length > 0 ? decodeURIComponent(name) : fallback;
}
