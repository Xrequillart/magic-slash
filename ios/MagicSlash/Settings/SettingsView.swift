import SwiftUI
import UserNotifications

/// The account menu, laid out as a settings screen: the user's card on top, then the
/// iPhone's own settings, its link to the Macs, the app's version, and signing out.
///
/// Only the iPhone's settings live here (`AppPreferences`). The desktop's are changed on the
/// desktop; the iPhone follows the three it needs (`DesktopSettingsStore`). The notification
/// toggles are the exception: they live in this phone's `push_devices` rows, which the server
/// reads before sending, and nowhere else.
struct SettingsView: View {
  @Environment(\.theme) private var theme
  @Environment(\.dismiss) private var dismiss
  @Environment(\.scenePhase) private var scenePhase

  let relay: RelayStore
  let profile: ProfileStore
  let onPair: () -> Void
  let onSignOut: () -> Void

  @AppStorage(AppPreferences.hapticsKey) private var haptics = true
  @AppStorage(AppPreferences.themeKey) private var themeChoice = "desktop"
  @State private var path: [Page] = []
  @State private var confirmingSignOut = false
  /// iOS's answer to the permission prompt, nil until read.
  @State private var notificationStatus: UNAuthorizationStatus?
  /// The two toggles as this phone's rows hold them, nil while unread or when there is no row.
  @State private var notify: PushRegistration.Preferences?

  enum Page: Hashable {
    case macs
    case theme
  }

  var body: some View {
    NavigationStack(path: $path) {
      List {
        Section {
          UserCard(profile: profile)
            .listRowBackground(theme.surface)
        }

        Section {
          Button {
            Haptics.tap()
            path.append(.theme)
          } label: {
            NavigationRow(title: "Theme", systemImage: "paintpalette", value: ThemeChoice(raw: themeChoice).summary)
          }
          .buttonStyle(.plain)
          .listRowBackground(theme.surface)

          Button {
            Haptics.tap()
            if let url = URL(string: UIApplication.openSettingsURLString) {
              UIApplication.shared.open(url)
            }
          } label: {
            NavigationRow(title: "Language", systemImage: "globe", value: Text(AppPreferences.languageName), external: true)
          }
          .buttonStyle(.plain)
          .listRowBackground(theme.surface)

          Toggle(isOn: $haptics) {
            RowLabel(title: "Haptic feedback", systemImage: "hand.tap")
          }
          .tint(theme.accent)
          .listRowBackground(theme.surface)
        } header: {
          header("App")
        }

        notificationsSection

        Section {
          Button {
            Haptics.tap()
            path.append(.macs)
          } label: {
            NavigationRow(title: "Paired Macs", systemImage: "laptopcomputer", value: Text(macsSummary))
          }
          .buttonStyle(.plain)
          .listRowBackground(theme.surface)
          if !relay.macs.isEmpty {
            ReconnectButton(relay: relay)
              .listRowBackground(theme.surface)
          }
        } header: {
          header("Connection")
        }

        Section {
          HStack {
            RowLabel(title: "Version", systemImage: "info.circle")
            Spacer(minLength: 8)
            Text(AppPreferences.version)
              .foregroundStyle(theme.textSecondary)
              .monospacedDigit()
          }
          .listRowBackground(theme.surface)
        } header: {
          header("About")
        }

        Section {
          Button(role: .destructive) {
            Haptics.tap()
            confirmingSignOut = true
          } label: {
            Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
              .foregroundStyle(theme.red)
          }
          .listRowBackground(theme.surface)
        }
      }
      .font(.cera(.body))
      .tint(theme.accent)
      .scrollContentBackground(.hidden)
      .background(theme.bg.ignoresSafeArea())
      .navigationTitle("Settings")
      .navigationBarTitleDisplayMode(.inline)
      .toolbarBackground(theme.bg, for: .navigationBar)
      .toolbar {
        CloseToolbarItem { dismiss() }
      }
      .navigationDestination(for: Page.self) { page in
        switch page {
        case .macs: PairedMacsList(relay: relay, onPair: onPair)
        case .theme: ThemePicker(choiceRaw: $themeChoice)
        }
      }
      .task { await loadNotifications() }
      // Back from the Settings app, where the permission may have changed.
      .onChange(of: scenePhase) { _, phase in
        if phase == .active { Task { await loadNotifications() } }
      }
      .confirmationDialog("Sign out of Magic Slash?", isPresented: $confirmingSignOut, titleVisibility: .visible) {
        Button("Sign out", role: .destructive) {
          Haptics.destructive()
          onSignOut()
        }
      }
    }
    .presentationBackground(theme.bg)
  }

  // MARK: - Notifications

  private var notificationsSection: some View {
    Section {
      Button {
        Haptics.tap()
        if notificationStatus == .notDetermined {
          Task {
            await PushAuthorization.requestAndRegister()
            await loadNotifications()
          }
        } else if let url = URL(string: UIApplication.openNotificationSettingsURLString) {
          UIApplication.shared.open(url)
        }
      } label: {
        NavigationRow(title: "Notifications", systemImage: "bell", value: notificationSummary, external: notificationStatus != .notDetermined)
      }
      .buttonStyle(.plain)
      .listRowBackground(theme.surface)

      if notify != nil {
        Toggle(isOn: notifyBinding(waiting: true)) {
          RowLabel(title: "Agent waiting", systemImage: "hourglass")
        }
        .tint(theme.accent)
        .listRowBackground(theme.surface)

        Toggle(isOn: notifyBinding(waiting: false)) {
          RowLabel(title: "Agent finished", systemImage: "checkmark.circle")
        }
        .tint(theme.accent)
        .listRowBackground(theme.surface)
      }
    } header: {
      header("Notifications")
    } footer: {
      if notify == nil {
        // Two `Text`s, not one over a ternary: a `String` would skip the translation.
        (relay.macs.isEmpty
          ? Text("Pair a Mac to be notified when its agents need you.")
          : Text("The choices appear once this iPhone is registered with your Macs."))
          .font(.cera(.footnote))
          .foregroundStyle(theme.textSecondary)
      }
    }
  }

  /// What iOS allows, as the row shows it.
  private var notificationSummary: Text {
    switch notificationStatus {
    case .authorized, .provisional, .ephemeral: Text("On")
    case .denied: Text("Off")
    case .notDetermined: Text("Turn on")
    default: Text(verbatim: "")
    }
  }

  /// One toggle, written to every row of this phone. Shown at once, put back if the write fails.
  private func notifyBinding(waiting: Bool) -> Binding<Bool> {
    Binding {
      guard let notify else { return true }
      return waiting ? notify.waiting : notify.completed
    } set: { value in
      guard let previous = notify else { return }
      var next = previous
      if waiting { next.waiting = value } else { next.completed = value }
      notify = next
      Task {
        do {
          try await relay.push.setPreferences(next)
        } catch {
          relay.log("notification setting not saved: \(error.localizedDescription)")
          if notify == next { notify = previous }
        }
      }
    }
  }

  private func loadNotifications() async {
    notificationStatus = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus
    do {
      notify = try await relay.push.preferences()
    } catch {
      // Kept as shown: a failed read is no reason to hide the toggles already there.
      relay.log("notification settings not read: \(error.localizedDescription)")
    }
  }

  /// How many Macs, and how many of them are online.
  private var macsSummary: String {
    let statuses = relay.statuses()
    guard !statuses.isEmpty else { return String(localized: "None") }
    let online = statuses.filter(\.isOnline).count
    return online == statuses.count
      ? String(localized: "\(online) online")
      : String(localized: "\(online) of \(statuses.count) online")
  }

  private func header(_ title: String) -> some View {
    Text(title)
      .font(.cera(.subheadline))
      .foregroundStyle(theme.textSecondary)
      .textCase(nil)
  }
}

/// A row that opens something: its label, its current value, and a chevron, or an arrow
/// when it leaves the app.
private struct NavigationRow: View {
  @Environment(\.theme) private var theme
  let title: LocalizedStringKey
  let systemImage: String
  let value: Text
  var external = false

  var body: some View {
    HStack(spacing: 14) {
      RowLabel(title: title, systemImage: systemImage)
      Spacer(minLength: 8)
      value
        .foregroundStyle(theme.textSecondary)
        .lineLimit(1)
      Image(systemName: external ? "arrow.up.forward" : "chevron.right")
        .font(.system(size: 13, weight: .semibold))
        .foregroundStyle(theme.iconMuted)
    }
    .contentShape(Rectangle())
  }
}

/// The iPhone's own theme: the desktop's, one that follows the iPhone's appearance, or
/// one of the desktop's themes picked here.
private struct ThemePicker: View {
  @Environment(\.theme) private var theme
  @Binding var choiceRaw: String

  var body: some View {
    List {
      Section {
        row(.desktop)
        row(.system)
      }
      Section {
        ForEach(ThemeID.allCases, id: \.self) { id in
          row(.fixed(id))
        }
      } header: {
        Text("Themes")
          .font(.cera(.subheadline))
          .foregroundStyle(theme.textSecondary)
          .textCase(nil)
      }
    }
    .font(.cera(.body))
    .scrollContentBackground(.hidden)
    .background(theme.bg.ignoresSafeArea())
    .navigationTitle("Theme")
    .navigationBarTitleDisplayMode(.inline)
    .toolbarBackground(theme.bg, for: .navigationBar)
  }

  private func row(_ choice: ThemeChoice) -> some View {
    Button {
      Haptics.tap()
      choiceRaw = choice.raw
    } label: {
      HStack(spacing: 12) {
        if case .fixed(let id) = choice {
          ThemeSwatch(tokens: .tokens(for: id))
        }
        choice.summary
          .foregroundStyle(theme.ink)
        Spacer(minLength: 8)
        if ThemeChoice(raw: choiceRaw) == choice {
          Image(systemName: "checkmark")
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(theme.accent)
        }
      }
      .contentShape(Rectangle())
    }
    .buttonStyle(.plain)
    .listRowBackground(theme.surface)
  }
}

/// A theme in a dot: its background, with its accent inside.
private struct ThemeSwatch: View {
  @Environment(\.theme) private var theme
  let tokens: ThemeTokens

  var body: some View {
    Circle()
      .fill(tokens.bg)
      .overlay(Circle().fill(tokens.accent).padding(6))
      .overlay(Circle().strokeBorder(theme.lineStrong))
      .frame(width: 22, height: 22)
  }
}

extension ThemeChoice {
  /// The choice as the settings name it.
  var summary: Text {
    switch self {
    case .desktop: Text("Same as desktop")
    case .system: Text("Match iPhone")
    case .fixed(let id): Text(id.displayName)
    }
  }
}

/// A row's icon and title, the icon in a fixed column so the titles line up.
private struct RowLabel: View {
  @Environment(\.theme) private var theme
  let title: LocalizedStringKey
  let systemImage: String

  var body: some View {
    HStack(spacing: 14) {
      Image(systemName: systemImage)
        .font(.system(size: 17))
        .foregroundStyle(theme.icon)
        .frame(width: 26)
      Text(title)
        .foregroundStyle(theme.ink)
    }
  }
}

/// The user at the top of the settings: photo, name or handle, and email.
private struct UserCard: View {
  @Environment(\.theme) private var theme
  let profile: ProfileStore

  var body: some View {
    HStack(spacing: 14) {
      ProfileAvatar(profile: profile, size: 52)
      VStack(alignment: .leading, spacing: 3) {
        Text(profile.name ?? profile.username.map { "@\($0)" } ?? String(localized: "Your account"))
          .font(.cera(.headline))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
        if let email = profile.email {
          Text([profile.name != nil ? profile.username.map { "@\($0)" } : nil, email].compactMap { $0 }.joined(separator: " · "))
            .font(.cera(.subheadline))
            .foregroundStyle(theme.textSecondary)
            .lineLimit(1)
            .truncationMode(.middle)
        }
      }
    }
    .padding(.vertical, 6)
    .accessibilityElement(children: .combine)
  }
}
