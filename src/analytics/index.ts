import PostHog from 'posthog-react-native';
import { POSTHOG_API_KEY, POSTHOG_HOST } from '../constants';

// Bewusst minimal: nur die Events unten, kein Autocapture, kein Session-Replay, keine
// Screen-View-Verfolgung. Ohne PostHog-Key bleibt alles ein No-op (siehe SETUP.md).

export type PaywallTrigger = 'freed_space' | 'limit' | 'feature' | 'settings';
export type PermissionResultState = 'granted' | 'limited' | 'denied';
export type PurchasePackageKind = 'lifetime' | 'annual';

export type AnalyticsEvent =
  | { name: 'app_opened' }
  | { name: 'onboarding_started' }
  | { name: 'onboarding_completed' }
  | { name: 'permission_result'; state: PermissionResultState; source: 'initial' | 'recovery' }
  | { name: 'first_swipe' }
  | { name: 'paywall_shown'; trigger: PaywallTrigger }
  | { name: 'purchase_completed'; package: PurchasePackageKind }
  | { name: 'purchase_cancelled_or_failed'; reason: 'cancelled' | 'failed' }
  | { name: 'first_delete_completed' };

let client: PostHog | null = null;

/** Einmalig beim App-Start aufrufen. Ohne Key bleibt client null — track() wird dann zum No-op. */
export function initAnalytics(): void {
  if (!POSTHOG_API_KEY || client) return;
  client = new PostHog(POSTHOG_API_KEY, {
    host: POSTHOG_HOST,
    // Wir senden app_opened selbst als eines von genau neun bewusst gewählten Events —
    // die eingebauten Lifecycle-Events (Installed/Updated/BecameActive/Backgrounded) wollen
    // wir nicht zusätzlich.
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
  });
}

/** Eines der oben typisierten Events senden. No-op ohne konfigurierten Key. */
export function track(event: AnalyticsEvent): void {
  if (!client) return;
  const { name, ...properties } = event;
  client.capture(name, properties);
}
