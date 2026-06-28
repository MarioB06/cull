import * as Haptics from 'expo-haptics';

let enabled = true;

/** Globalen Haptik-Schalter setzen (aus den Settings). */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

/** Leichtes Feedback bei einer normalen Entscheidung (Keep/Delete-Commit). */
export function hapticCommit(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Mittleres Feedback beim endgültigen Löschen. */
export function hapticDelete(): void {
  if (!enabled) return;
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Dezentes Feedback bei Undo / Abwählen. */
export function hapticSelection(): void {
  if (!enabled) return;
  Haptics.selectionAsync().catch(() => {});
}
