# Expo App Deployment Plan — Apple App Store & Google Play

This document is the step-by-step plan for taking an Expo-based app from local development to
live listings on both the Apple App Store and Google Play Store, using EAS (Expo Application
Services).

---

## 0. Prerequisites

| Requirement | Status | Notes |
|---|---|---|
| Apple Developer Program account | ✅ Ready | $99/year, needed for App Store submission and signing |
| Google Play Console account | ✅ Ready | $25 one-time, needed for Play Store submission |
| Expo account | ⬜ | Free, sign up at expo.dev |
| Node.js + npm/yarn | ⬜ | LTS version |
| EAS CLI | ⬜ | `npm install -g eas-cli` |
| App source code | ⬜ | Built with Expo (managed or bare workflow) |

---

## 1. Project Setup

1. **Initialize the Expo app** (if not already scaffolded):
   ```bash
   npx create-expo-app my-app
   cd my-app
   ```
2. **Install EAS CLI and log in:**
   ```bash
   npm install -g eas-cli
   eas login
   ```
3. **Configure the project for EAS:**
   ```bash
   eas init
   ```
   This links the local project to an Expo project ID (creates/updates `app.json` → `extra.eas.projectId`).

4. **Define app identity in `app.json` / `app.config.js`:**
   - `name`, `slug`, `version`
   - `ios.bundleIdentifier` (e.g. `com.atlaslakes.myapp`)
   - `android.package` (e.g. `com.atlaslakes.myapp`)
   - `icon`, `splash`, `orientation`
   - `ios.buildNumber` and `android.versionCode` (bumped per submission)

---

## 2. EAS Build Configuration

1. **Generate `eas.json`:**
   ```bash
   eas build:configure
   ```
2. **Define build profiles** in `eas.json` — typically three:
   - `development` — dev client, internal testing
   - `preview` — internal distribution (TestFlight / internal Play track), no store submission
   - `production` — store-ready build

   Example skeleton:
   ```json
   {
     "build": {
       "development": { "developmentClient": true, "distribution": "internal" },
       "preview": { "distribution": "internal" },
       "production": {}
     },
     "submit": {
       "production": {}
     }
   }
   ```

---

## 3. iOS — Apple App Store Setup

1. **App Store Connect:**
   - Create the app entry in [App Store Connect](https://appstoreconnect.apple.com) with matching Bundle ID.
   - Fill in app metadata placeholders (name, category, privacy policy URL).

2. **Credentials (let EAS manage them, recommended):**
   ```bash
   eas credentials
   ```
   - EAS can auto-generate/manage: Distribution Certificate, Provisioning Profile, Push Key (if needed).
   - Requires Apple ID login + app-specific password or API key (recommended: create an
     App Store Connect API Key for CI-safe, non-interactive auth).

3. **Build for iOS:**
   ```bash
   eas build --platform ios --profile production
   ```

4. **Internal testing via TestFlight:**
   ```bash
   eas submit --platform ios --profile production
   ```
   Then add internal/external testers in App Store Connect → TestFlight tab.

5. **Store listing requirements:**
   - App icon (1024×1024, no alpha)
   - Screenshots per required device sizes (6.7", 6.5", 5.5", iPad if supporting)
   - Privacy Policy URL (required)
   - App Privacy details (data collection questionnaire)
   - Description, keywords, support URL
   - Age rating questionnaire
   - Export compliance (encryption usage — usually "no" unless custom crypto)

6. **Submit for review:**
   - In App Store Connect, attach the build, complete listing, submit for review.
   - Review time: typically 1–3 days.

---

## 4. Android — Google Play Setup

1. **Google Play Console:**
   - Create app entry in [Play Console](https://play.google.com/console).
   - Set up the app's default store listing, content rating, target audience.

2. **Credentials (let EAS manage, recommended):**
   ```bash
   eas credentials
   ```
   - EAS generates/stores the Android Keystore (or upload your own).
   - **Back up the keystore** — losing it means you can never update the app under the same package name again (unless using Play App Signing, which is default and recommended).

3. **Service account for automated submission:**
   - Create a Google Cloud service account with **Play Console API** access.
   - Grant it "Release manager" (or equivalent) permissions in Play Console → Users & permissions.
   - Download the JSON key, reference it in `eas.json`:
     ```json
     "submit": {
       "production": {
         "android": { "serviceAccountKeyPath": "./google-service-account.json" }
       }
     }
     ```
   - **Do not commit this JSON key to git** — add to `.gitignore`.

4. **Build for Android:**
   ```bash
   eas build --platform android --profile production
   ```
   Produces an `.aab` (Android App Bundle) by default — required by Play Store.

5. **Internal testing track:**
   ```bash
   eas submit --platform android --profile production
   ```
   First submit to the **Internal testing** track, verify, then promote to Closed → Open → Production.

6. **Store listing requirements:**
   - App icon (512×512), feature graphic (1024×500)
   - Screenshots (phone, tablet if supporting)
   - Short description (80 chars), full description (4000 chars)
   - Privacy Policy URL (required)
   - Data safety form (data collection/sharing disclosure)
   - Content rating questionnaire (via IARC)
   - Target API level compliance (Play requires recent Android API level)

7. **Submit for review:**
   - Roll out to Production track once internal testing passes.
   - Review time: typically hours to a few days.

---

## 5. Versioning Strategy

- Use `eas.json` `"autoIncrement": true` (or manage manually) to bump:
  - iOS: `buildNumber`
  - Android: `versionCode`
- Keep `version` (semantic, e.g. `1.2.0`) in sync across both platforms for the same release.
- Tag each release in git (e.g. `v1.2.0`) once submitted.

---

## 6. Over-the-Air (OTA) Updates

For JS/asset-only changes (no native code changes), skip full store resubmission:
```bash
eas update --branch production --message "Fix login bug"
```
- Requires `expo-updates` installed and configured (`eas update:configure`).
- Note: App Store/Play Store review guidelines restrict what OTA updates can change (no new native functionality, no circumventing review).

---

## 7. CI/CD (optional, recommended once stable)

- Use **EAS Workflows** or GitHub Actions to automate:
  - Build on merge to `main` / release branches
  - Auto-submit to internal testing tracks
  - Run `eas update` on merge for OTA-eligible changes
- Store secrets (Apple API key, Google service account JSON) as encrypted repo/CI secrets, never committed.

---

## 8. Pre-Launch Checklist

- [ ] Bundle ID / package name finalized and matches both consoles
- [ ] App icons, splash screens, screenshots prepared for both platforms
- [ ] Privacy Policy hosted and linked
- [ ] Data safety / App Privacy questionnaires completed accurately
- [ ] Terms of Service (if applicable)
- [ ] Support email/URL set
- [ ] Android keystore backed up securely (outside git)
- [ ] Apple API key / Google service account key excluded from git
- [ ] Internal testing completed on both platforms (TestFlight + Play Internal track)
- [ ] Crash reporting / analytics wired up (e.g. Sentry, Expo's built-in error reporting)
- [ ] `eas.json` production profile reviewed
- [ ] Version numbers bumped and git-tagged

---

## 9. Reference Commands Summary

```bash
# One-time setup
npm install -g eas-cli
eas login
eas init
eas build:configure
eas credentials

# Build
eas build --platform ios --profile production
eas build --platform android --profile production
eas build --platform all --profile production

# Submit
eas submit --platform ios --profile production
eas submit --platform android --profile production

# OTA update
eas update --branch production --message "description"
```

---

## 10. Open Decisions / To Confirm

- [ ] Managed workflow vs. bare workflow (affects native module flexibility)
- [ ] Which build profile strategy (dev/preview/production) fits the team's testing process
- [ ] Who holds the Google service account key and Apple API key (secrets ownership)
- [ ] OTA update policy — which changes go via `eas update` vs. full store release
