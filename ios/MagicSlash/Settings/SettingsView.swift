import SwiftUI

/// The account menu, laid out as a settings screen: the user's card on top, then the
/// iPhone's own settings, its link to the Macs, the app's version, and signing out.
///
/// Only the iPhone's settings live here (`AppPreferences`). The desktop's are changed on the
/// desktop; the iPhone follows the three it needs (`DesktopSettingsStore`).
struct SettingsView: View {
  @Environment(\.theme) private var theme
  @Environment(\.dismiss) private var dismiss

  let relay: RelayStore
  let profile: ProfileStore
  let onPair: () -> Void
  let onSignOut: () -> Void

  @AppStorage(AppPreferences.hapticsKey) private var haptics = true
  @State private var path: [Page] = []
  @State private var confirmingSignOut = false

  enum Page: Hashable {
    case macs
  }

  var body: some View {
    NavigationStack(path: $path) {
      List {
        Section {
          UserCard(profile: profile)
            .listRowBackground(theme.surface)
        }

        Section {
          Toggle(isOn: $haptics) {
            RowLabel(title: "Haptic feedback", systemImage: "hand.tap")
          }
          .tint(theme.accent)
          .listRowBackground(theme.surface)
        } header: {
          header("App")
        } footer: {
          Text("A light tap under the finger on every button.")
            .foregroundStyle(theme.textSecondary)
        }

        Section {
          Button {
            Haptics.tap()
            path.append(.macs)
          } label: {
            HStack(spacing: 14) {
              RowLabel(title: "Paired Macs", systemImage: "laptopcomputer")
              Spacer(minLength: 8)
              Text(macsSummary)
                .foregroundStyle(theme.textSecondary)
              Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(theme.iconMuted)
            }
            .contentShape(Rectangle())
          }
          .buttonStyle(.plain)
          .listRowBackground(theme.surface)
          if !relay.macs.isEmpty {
            ReconnectButton(relay: relay)
              .listRowBackground(theme.surface)
          }
        } header: {
          header("Connection")
        } footer: {
          if !relay.macs.isEmpty {
            Text("Reconnect when a Mac that is on shows offline here.")
              .foregroundStyle(theme.textSecondary)
          }
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
        ToolbarItem(placement: .topBarLeading) {
          Button("Close", systemImage: "xmark") {
            Haptics.tap()
            dismiss()
          }
          .tint(theme.ink)
        }
      }
      .navigationDestination(for: Page.self) { page in
        switch page {
        case .macs: PairedMacsList(relay: relay, onPair: onPair)
        }
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

  /// How many Macs, and how many of them are online.
  private var macsSummary: String {
    let statuses = relay.statuses()
    guard !statuses.isEmpty else { return "None" }
    let online = statuses.filter(\.isOnline).count
    return online == statuses.count ? "\(online) online" : "\(online) of \(statuses.count) online"
  }

  private func header(_ title: String) -> some View {
    Text(title)
      .font(.cera(.subheadline))
      .foregroundStyle(theme.textSecondary)
      .textCase(nil)
  }
}

/// A row's icon and title, the icon in a fixed column so the titles line up.
private struct RowLabel: View {
  @Environment(\.theme) private var theme
  let title: String
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
        Text(profile.name ?? profile.username.map { "@\($0)" } ?? "Your account")
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
