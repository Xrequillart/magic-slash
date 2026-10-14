# Magic Slash for iPhone

A companion to the desktop app: sign in with your Magic Slash account and follow your
agents (workflow status, ticket, branches, pull requests, spec) live from your iPhone.
Paired with a Mac, it also shows each agent's live runtime state and usage, and answers
the questions an agent asks. It also edits the desktop's non-sensitive settings (see
[Settings](#settings)).

SwiftUI, iOS 17+, iPhone only. The only dependency is
[supabase-swift](https://github.com/supabase/supabase-swift), pulled by Swift Package
Manager.

## Layout

```text
ios/
├── Config/
│   ├── Base.xcconfig              # Build settings shared by Debug and Release
│   └── Secrets.example.xcconfig   # Template for the git-ignored Secrets.xcconfig
├── MagicSlash.xcodeproj           # Hand-written project: the app and its notification extension
├── MagicSlash/                    # Sources (synchronized folder: new files need no project edit)
│   ├── App/                       #   Entry point, routing, shared components
│   ├── Auth/                      #   Email + password sign-in, TOTP second factor
│   ├── Agents/                    #   Agent model, store (Realtime), list and detail screens
│   ├── Notifications/             #   Push keys, push_devices rows, routing a tapped notification
│   ├── Plans/                     #   Spec lookup in plan_sessions
│   ├── Remote/                    #   Mac pairing and the end-to-end encrypted relay
│   ├── Settings/                  #   Settings screen, the one writer, the column lists (generated)
│   ├── Supabase/                  #   Client built from the Info.plist values
│   └── Theme/                     #   Desktop theme tokens (generated) and the desktop settings store
├── MagicSlashNotificationService/ # Extension that decrypts a push (shares RelayCrypto, Keychain, PushKeys)
├── relay/                         # Check of RelayCrypto.swift against the Node vectors
├── settings/                      # Generator of the settings column lists, scan of the writes
└── theme/                         # Generator for Theme/ThemeTokens.generated.swift
```

## Setup

1. Copy the secrets template and fill it in:

   ```bash
   cp ios/Config/Secrets.example.xcconfig ios/Config/Secrets.xcconfig
   ```

   | Key                 | Value                                                                 |
   | ------------------- | --------------------------------------------------------------------- |
   | `SUPABASE_HOST`     | The project host, without `https://` (`//` starts an xcconfig comment) |
   | `SUPABASE_ANON_KEY` | The project's public anon key                                         |
   | `DEVELOPMENT_TEAM`  | Your Apple Developer team id (only needed for devices and archives)   |

   `Secrets.xcconfig` is git-ignored. Without it the app still builds, and shows a
   "Not configured" screen at launch.

2. Open the project:

   ```bash
   open ios/MagicSlash.xcodeproj
   ```

   Xcode resolves the Swift package on first open (`Package.resolved` pins the version).

## Build and run

In Xcode, pick the `MagicSlash` scheme and an iPhone simulator, then Run.

From the command line:

```bash
cd ios
xcodebuild -project MagicSlash.xcodeproj -scheme MagicSlash \
  -destination 'generic/platform=iOS Simulator' \
  CODE_SIGNING_ALLOWED=NO build
```

Sign in with the same account as the desktop app. An account enrolled in two-factor
authentication is asked for its 6-digit TOTP code before anything is shown.

## Theme

The app wears the theme picked on the desktop (`user_settings.theme`), and follows a
change live. Picking one in Settings on the iPhone changes both. The colour tokens are generated from the desktop's theme definitions, never
edited by hand. After a theme change on the desktop side, regenerate them from the repo
root:

```bash
npm run ios:theme
```

## Settings

**Settings** in the account menu holds the iPhone's own settings, kept on the device
(`App/AppPreferences.swift`): haptic feedback on the buttons, the paired Macs with a
**Reconnect** for the relay, and the app's version. The desktop's settings are changed on
the desktop: the iPhone only follows three of them, read live from `user_settings`
(`Theme/DesktopSettingsStore.swift`): the theme, the sidebar's sort, and which tool calls
the chat draws.

## Live state from a Mac

The runtime state of an agent (working, waiting for input, completed…) and its usage (cost,
context, model, 5-hour and 7-day limits) never reach the database. A Mac with remote
access on sends them, end-to-end encrypted, over a private Supabase Realtime channel
(`relay:<userId>`) that Supabase only relays. The contract is
[`desktop/src/main/remote/PROTOCOL.md`](../desktop/src/main/remote/PROTOCOL.md).

- **Pairing.** On the Mac, open Settings > Remote access, turn it on, and click
  **Pair**. On the iPhone, open the account menu, **Pair a Mac**, and scan the code.
  Both screens then show the same 4-digit code: approve on the Mac. The iPhone saves the Mac only once the Mac accepts.
  **Paired Macs** in the same menu lists them; **Forget** is local to the iPhone (revoke
  the iPhone on the Mac to stop it sending).
- **Keys and Face ID.** The iPhone's key is a Secure Enclave P-256 key that needs Face ID
  and dies if a new face is enrolled (the app then asks to pair again). One Face ID prompt
  per return to the foreground unlocks it; the derived keys stay in memory only and are
  dropped in the background. The phone id, the wrapped keys and the paired Macs are in the
  Keychain, this device only.
- **Answering a question.** When an agent waits on a question or a permission, its detail
  screen shows it with its options (Allow and Deny for a permission). An answer is a
  command signed by a second Secure Enclave key, a P-256 signing key made at the first
  pairing that finds it missing and kept across later ones. Every answer asks for Face ID
  on its own, whatever the session already unlocked. The Mac checks the signature, the
  pairing, the time and the question before typing anything, and says how it went: an
  answer to a question already handled on the Mac, or expired, is refused and the screen
  says so. A question the Mac cannot answer remotely shows "answer this one on the Mac".
  An iPhone paired before this existed has no signing key on its Macs: it still follows
  them, but has to be paired again to answer.
- **Offline Mac.** A Mac is online while its presence is on the channel and its last
  snapshot is under 75 s old. Otherwise the list says so, and the last snapshot (cached on
  the device) is shown dimmed as the last known state.
- **Simulator.** It has no Secure Enclave and no camera: DEBUG Simulator builds use
  software keys instead (so no Face ID per answer either), and offer a field to paste the
  QR's text. Neither exists in any other build.

- **Notifications.** With the app closed, an agent that waits or finishes reaches the
  iPhone as a push (PROTOCOL.md §14). After each unlock the iPhone hands every paired Mac a
  push key of its own (one per pairing, in a Keychain group shared with the extension, no
  Face ID), and keeps one `push_devices` row per Mac with its APNs token. The Mac seals the
  text with that key, the server relays the opaque box to APNs, and
  `MagicSlashNotificationService` opens it on the phone; anything that does not check out
  shows a generic "An agent needs your attention". Settings > Notifications holds the two
  toggles, stored in those rows only. Forget, revocation and sign-out delete the key and the
  row.

After touching `Remote/RelayCrypto.swift` or the desktop's `crypto.ts`, replay the shared
test vectors from the repo root (macOS):

```bash
npm run ios:relay-check
```

### Push setup (Apple Developer, once)

Nothing is sent until this exists; the app builds and runs without it.

1. App IDs `io.magic-slash.ios` (Push Notifications capability) and
   `io.magic-slash.ios.NotificationService`, both with the keychain group
   `io.magic-slash.ios.shared` (`MagicSlash.entitlements`,
   `MagicSlashNotificationService.entitlements`). Automatic signing creates the profiles.
2. An APNs auth key (`.p8`) for the team, whose values go to the web server's `APNS_*`
   variables (see `webapp/README.md`).

## TestFlight (internal testers)

### With Xcode Cloud

`ci_scripts/ci_post_clone.sh` writes `Secrets.xcconfig` on the build machine from two
environment variables of the workflow (App Store Connect > Xcode Cloud > the workflow >
Environment): `SUPABASE_HOST` and `SUPABASE_ANON_KEY`. An archive without them fails,
rather than reaching TestFlight with the "Not configured" screen. Xcode Cloud signs with
the app's team and numbers the builds itself.

### By hand

1. Make sure `DEVELOPMENT_TEAM` is set in `Secrets.xcconfig` and that the bundle id
   `io.magic-slash.ios` exists in App Store Connect, with an app record.
2. Bump `CURRENT_PROJECT_VERSION` (build number) in the project's build settings for every
   upload, and `MARKETING_VERSION` for a new version. Both are set on the project, not the
   targets, so the app and its extension never disagree (App Store Connect refuses that).
3. In Xcode, select the **Any iOS Device (arm64)** destination, then
   **Product > Archive**.
4. In the Organizer, select the archive and click **Distribute App > App Store Connect >
   Upload**. Keep automatic signing.
5. Once processing finishes in App Store Connect (a few minutes), open
   **TestFlight > Internal Testing**, add the build to the internal group, and testers
   get it in the TestFlight app.

The app declares `ITSAppUsesNonExemptEncryption = NO`, so no export compliance question
blocks the build. That stays true with the relay: besides HTTPS, the app only uses Apple's
standard CryptoKit primitives (P-256 ECDH, HKDF, AES-GCM) to protect the user's own data,
which is exempt.
