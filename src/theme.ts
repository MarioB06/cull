// Zentrales Design-System.

/** Primärtext-Creme mit abgestufter Transparenz. */
export const cream = (alpha: number = 1): string => `rgba(236,227,212,${alpha})`;

/** Rot (Löschen) mit Transparenz. */
export const red = (alpha: number = 1): string => `rgba(194,84,63,${alpha})`;

/** Grün (Behalten) mit Transparenz. */
export const green = (alpha: number = 1): string => `rgba(127,160,111,${alpha})`;

/** Marken-Akzent (warmes Gold) mit Transparenz. */
export const accent = (alpha: number = 1): string => `rgba(240,168,64,${alpha})`;

export const colors = {
  pageBg: '#0b0907',
  screenBg: '#15110d',
  // Verlaufs-Stops für den Bildschirm-Hintergrund (mehr Tiefe statt Flachfarbe).
  bgGradientTop: '#231910',
  bgGradientBottom: '#0d0a07',

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

  // Marken-Akzent (warmes Gold) — primäre CTAs, aktive Zustände, Highlights, Badges.
  accent: '#f0a840',
  accentBright: '#ffc266',
  accentDeep: '#c9821f',
  accentBg: accent(0.14),
  accentBorder: accent(0.4),
  // Buttontext auf Akzent-Fill.
  onAccent: '#241505',

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

// Grosszügigere Radien für eine weichere, freundlichere Anmutung.
export const radius = {
  card: 20,
  thumb: 12,
  button: 18,
  chip: 10,
  pill: 999,
} as const;

export const spacing = {
  screenH: 20,
} as const;

// Weiche Tiefe statt harter Kanten. shadowColor/-Opacity/-Radius für iOS,
// elevation für Android (RN mappt das nicht automatisch zwischen Plattformen).
export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 10,
  },
  raised: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  /** Farbiges Glühen unter Akzent-/Semantik-Buttons (z.B. shadow.glow(colors.accent)). */
  glow: (color: string) => ({
    shadowColor: color,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }),
} as const;
