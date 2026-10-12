# Magic Slash for iPhone

A read-only companion to the desktop app: sign in with your Magic Slash account and
follow your agents (workflow status, ticket, branches, pull requests, spec) live from
your iPhone. It never acts on an agent.

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
│   ├── Supabase/                  #   Client built from the Info.plist values
│   └── Theme/                     #   Desktop theme tokens (generated) and the theme store
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

The app declares `ITSAppUsesNonExemptEncryption = NO` (it only uses HTTPS), so no export
compliance question blocks the build.
