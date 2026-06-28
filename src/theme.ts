// Zentrales Design-System. 1:1 aus dem Mockup übernommen.

/** Primärtext-Creme mit abgestufter Transparenz. */
export const cream = (alpha: number = 1): string => `rgba(236,227,212,${alpha})`;

/** Rot (Löschen) mit Transparenz. */
export const red = (alpha: number = 1): string => `rgba(194,84,63,${alpha})`;

/** Grün (Behalten) mit Transparenz. */
export const green = (alpha: number = 1): string => `rgba(127,160,111,${alpha})`;

export const colors = {
  pageBg: '#0b0907',
  screenBg: '#15110d',

  cream: '#ece3d4',
  // Häufig genutzte Creme-Abstufungen.
  creamHi: cream(0.85),
  cream70: cream(0.7),
  cream55: cream(0.55),
  cream40: cream(0.4),
  cream38: cream(0.38),
  cream30: cream(0.3),
  cream25: cream(0.25),
  cream13: cream(0.13),

  // Löschen / Rot.
  redBorder: '#c2543f',
  redFill: '#c2543f',
  redText: '#d9745f',
  redBright: '#cf5a44',
  redFillBg: red(0.13),
  redBorder40: red(0.4),

  // Behalten / Grün.
  greenBorder: '#7fa06f',
  greenFill: '#7fa06f',
  greenText: '#93b384',
  greenFillBg: green(0.14),

  // Buttontext auf rotem Fill.
  onRed: '#fbeee9',
} as const;

// Schriftfamilien (Keys aus useFonts in App.tsx).
export const fonts = {
  // Archivo: Titel, Body, Buttontext.
  sans400: 'Archivo_400Regular',
  sans500: 'Archivo_500Medium',
  sans600: 'Archivo_600SemiBold',
  sans700: 'Archivo_700Bold',
  // IBM Plex Mono: Zahlen, Metadaten, Labels, Stamps.
  mono400: 'IBMPlexMono_400Regular',
  mono500: 'IBMPlexMono_500Medium',
  mono600: 'IBMPlexMono_600SemiBold',
} as const;

export const radius = {
  card: 12,
  thumb: 8,
  button: 14,
} as const;

export const spacing = {
  screenH: 20,
} as const;
