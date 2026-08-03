# Setup: Cull Pro (RevenueCat)

Der komplette Onboarding- und Paywall-Flow läuft bereits jetzt in Expo Go — über den Mock
in `src/purchases/mock.ts`. Für echte Käufe fehlen noch ein paar externe Schritte, die ich
nicht für dich erledigen kann.

## 1. RevenueCat-Account + API-Keys

1. Account auf [revenuecat.com](https://app.revenuecat.com) anlegen, ein Projekt für Cull erstellen.
2. Ein iOS-App und ein Android-App-Objekt im Projekt anlegen → je einen **Public API Key**.
3. Keys eintragen in [`src/constants.ts`](src/constants.ts):
   ```ts
   export const REVENUECAT_API_KEY_IOS = 'appl_...';
   export const REVENUECAT_API_KEY_ANDROID = 'goog_...';
   ```
   Solange diese leer sind, läuft die App automatisch weiter auf dem Mock (siehe
   `src/purchases/index.ts` — `shouldUseMock()`), auch in einem Dev-Build. Für ein
   öffentliches Repo ggf. stattdessen über `app.config.js` + Umgebungsvariablen einbinden,
   statt die Keys hart zu committen.

## 2. Produkte anlegen

**App Store Connect:**
- Non-Consumable **„Lifetime"** (einmaliger Kauf).
- Auto-Renewable Subscription **„Jahr"** (1 Jahr Laufzeit).

**Google Play Console:**
- In-App-Produkt (einmalig) **„Lifetime"**.
- Abo **„Jahr"** (jährliche Laufzeit).

## 3. In RevenueCat verknüpfen

1. Beide Produkte (iOS + Android) in RevenueCat unter **Products** importieren/verknüpfen.
2. Ein **Entitlement** namens exakt `pro` anlegen (Code liest `entitlements.active["pro"]` —
   siehe `ENTITLEMENT_ID` in `src/constants.ts`) und beide Produkte diesem Entitlement zuordnen.
3. Ein **Offering** (z. B. `default`, als „Current" markiert) mit zwei **Packages** anlegen:
   - Package-Identifier `$rc_lifetime` → Lifetime-Produkt.
   - Package-Identifier `$rc_annual` → Jahres-Produkt.
   Die vordefinierten Identifier sind wichtig — `src/purchases/real.ts` liest
   `offering.current.lifetime` / `offering.current.annual`, die RevenueCat nur befüllt, wenn
   diese Standard-Identifier verwendet werden.

## 4. Dev-Build statt Expo Go

`react-native-purchases` ist ein natives Modul und läuft nicht in Expo Go. Für echte
Kauf-Tests:
```
npx expo prebuild
npx expo run:ios      # oder: npx expo run:android
```
oder ein EAS-Dev-Build. Sobald das native Modul + ein gültiger API-Key vorhanden sind,
wählt `src/purchases/index.ts` automatisch die echte RevenueCat-Implementierung statt
des Mocks.

> Hinweis: Die aktuell installierte Version von `react-native-purchases` (10.6.0) bringt
> **kein** Expo-Config-Plugin mit (kein `app.plugin.js` im Paket) — es ist also **kein**
> zusätzlicher Eintrag unter `expo.plugins` in `app.json` nötig oder vorhanden. Autolinking
> reicht für den Dev-Build. Falls eine spätere Version ein Plugin ergänzt, folge den
> Release-Notes des Pakets.

## 5. Rechtstexte

`TERMS_URL` und `PRIVACY_URL` in `src/constants.ts` sind aktuell leer (Links auf der
Paywall tun bis dahin nichts). App Store und Play Store verlangen funktionierende Links
auf Nutzungsbedingungen und Datenschutzerklärung, sobald In-App-Käufe angeboten werden —
bitte vor Store-Einreichung mit echten, gehosteten Seiten befüllen.

## 6. Zum Nachjustieren

- `FREE_DELETE_LIMIT` (Standard 200) und `ENTITLEMENT_ID` (`pro`) in `src/constants.ts`.
- `PURCHASES_MOCK` in `src/purchases/index.ts` auf `true` setzen, um den Mock auch in
  einem Dev-Build zu erzwingen (z. B. für Screenshots).
