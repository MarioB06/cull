// Zentrales Design-System — Glas-Look. Foto/Ambiente zuunterst, Bedienelemente als Milchglas.

export const colors = {
  canvas: '#0e0b09', // tiefes warmes Near-Black als Grundfläche

  // Glas — neutral (Standard-Bedienelement)
  glass: 'rgba(255,255,255,0.12)',
  glassStrong: 'rgba(255,255,255,0.16)',
  glassBorder: 'rgba(255,255,255,0.22)',
  glassBorderStrong: 'rgba(255,255,255,0.30)',

  // Glas — Terracotta (Löschen / Warnung / Primär-Glas)
  deleteGlass: 'rgba(194,84,63,0.34)',
  deleteGlassBorder: 'rgba(226,120,95,0.60)',
  deleteText: '#ffe2d9',

  // Glas — Salbei (Behalten / Positiv)
  keepGlass: 'rgba(127,160,111,0.36)',
  keepGlassBorder: 'rgba(147,179,132,0.60)',
  keepText: '#e9f2e0',

  // Solider Akzent (sehr sparsam, z. B. Paywall-CTA)
  accent: '#c2543f',
  onAccent: '#ffffff',
  check: '#a9c298', // Häkchen-Grün auf Glas

  // Text
  text: '#f5efe4', // Creme, primär
  textDim: 'rgba(245,239,228,0.70)',
  textFaint: 'rgba(245,239,228,0.50)',
  white: '#ffffff',

  // dunkle Chip-Fläche auf hellen Fotos (z. B. Metadaten)
  scrimChip: 'rgba(0,0,0,0.32)',
  scrimChipBorder: 'rgba(255,255,255,0.16)',
} as const;

export const radius = { chip: 11, panel: 16, card: 30, circle: 999 } as const;

export const blur = { light: 30, panel: 40, heavy: 60 } as const; // expo-blur intensity 0–100

export const shadowCard = {
  shadowColor: '#000',
  shadowOpacity: 0.55,
  shadowRadius: 22,
  shadowOffset: { width: 0, height: 22 },
  elevation: 20,
} as const;

// Fonts (Keys aus useFonts in App.tsx).
export const font = {
  sans: 'Archivo_400Regular',
  sansMed: 'Archivo_500Medium',
  sansSemi: 'Archivo_600SemiBold',
  sansBold: 'Archivo_700Bold',
  mono: 'DMMono_400Regular',
  monoMed: 'DMMono_500Medium',
  monoSemi: 'DMMono_500Medium',
} as const;

// Warmer Ambiente-Verlauf für Screens ohne Foto (Onboarding, Paywall).
export const ambientGradient = ['#a8734a', '#6e4227', '#2a1710', '#0e0b09'] as const;
export const ambientLocations = [0, 0.38, 0.7, 1] as const;

export const spacing = { screenH: 20 } as const;
