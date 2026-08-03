import * as Decisions from '../db/decisions';
import { FREE_DELETE_LIMIT } from '../constants';

/**
 * Ob ein Löschvorgang mit `queueCount` Fotos noch innerhalb des Free-Limits liegt.
 * Prüft die GESAMTE anstehende Charge auf einmal (keine Off-by-one-Sperre mitten im Batch):
 * passt sie nicht mehr, geht sie gar nicht durch — nicht teilweise.
 */
export async function canCommitDelete(queueCount: number, isPro: boolean): Promise<boolean> {
  if (isPro) return true;
  if (queueCount <= 0) return true;
  const alreadyDeleted = await Decisions.countDeletedLifetime();
  return alreadyDeleted + queueCount <= FREE_DELETE_LIMIT;
}
