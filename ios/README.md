# Magic Slash for iPhone

A read-only companion to the desktop app: sign in with your Magic Slash account and
follow your agents (workflow status, ticket, branches, pull requests, spec) live from
your iPhone. Paired with a Mac, it also shows each agent's live runtime state and usage.
It never acts on an agent, and sends no command to the Mac.

SwiftUI, iOS 17+, iPhone only. The only dependency is
[supabase-swift](https://github.com/supabase/supabase-swift), pulled by Swift Package
Manager.

## Layout

```text
ios/
├── Config/
│   ├── Base.xcconfig              # Build settings shared by Debug and Release
│   └── Secrets.example.xcconfig   # Template for the git-ignored Secrets.xcconfig
├── MagicSlash.xcodeproj           # Hand-written project, one app target
├── MagicSlash/                    # Sources (synchronized folder: new files need no project edit)
│   ├── App/                       #   Entry point, routing, shared components
│   ├── Auth/                      #   Email + password sign-in, TOTP second factor
│   ├── Agents/                    #   Agent model, store (Realtime), list and detail screens
│   ├── Plans/                     #   Spec lookup in plan_sessions
│   ├── Remote/                    #   Mac pairing and the end-to-end encrypted relay
│   ├── Supabase/                  #   Client built from the Info.plist values
│   └── Theme/                     #   Desktop theme tokens (generated) and the theme store
├── relay/                         # Check of RelayCrypto.swift against the Node vectors
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
change live. The colour tokens are generated from the desktop's theme definitions, never
edited by hand. After a theme change on the desktop side, regenerate them from the repo
root:

```bash
npm run ios:theme
```

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
  dropped in the background. The phone id, the wrapped key and the paired Macs are in the
  Keychain, this device only.
- **Offline Mac.** A Mac is online while its presence is on the channel and its last
  snapshot is under 75 s old. Otherwise the list says so, and the last snapshot (cached on
  the device) is shown dimmed as the last known state.
- **Simulator.** It has no Secure Enclave and no camera: DEBUG Simulator builds use a
  software key instead, and offer a field to paste the QR's text. Neither exists in any
  other build.

After touching `Remote/RelayCrypto.swift` or the desktop's `crypto.ts`, replay the shared
test vectors from the repo root (macOS):

```bash
npm run ios:relay-check
```

## TestFlight (internal testers)

1. Make sure `DEVELOPMENT_TEAM` is set in `Secrets.xcconfig` and that the bundle id
   `io.poppins.magicslash` exists in App Store Connect, with an app record.
2. Bump `CURRENT_PROJECT_VERSION` (build number) in the target's build settings for every
   upload, and `MARKETING_VERSION` for a new version.
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
