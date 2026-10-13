import Observation
import Supabase
import SwiftUI
import UIKit

/// The signed-in user as the desktop shows them: handle, name and photo (`profiles`),
/// read once for the header's avatar button and the account sheet behind it.
@MainActor
@Observable
final class ProfileStore {
  private(set) var username: String?
  private(set) var name: String?
  private(set) var avatar: UIImage?

  @ObservationIgnored let client: SupabaseClient
  @ObservationIgnored private var loaded = false

  init(client: SupabaseClient) {
    self.client = client
  }

  var email: String? { client.auth.currentUser?.email }

  /// The photo lives in the private `avatars` bucket, at the path `profiles.avatar_url`
  /// holds: the user's own session may read it, as the desktop does. No photo, or any
  /// failure, keeps the plain glyph.
  func load() async {
    guard !loaded, let userId = client.auth.currentUser?.id.uuidString.lowercased() else { return }
    loaded = true
    do {
      let rows: [JSONObject] = try await client
        .from("profiles")
        .select("username, name, avatar_url")
        .eq("user_id", value: userId)
        .limit(1)
        .execute()
        .value
      let row = rows.first
      username = row?["username"]?.stringValue.nonEmpty
      name = row?["name"]?.stringValue.nonEmpty
      guard let path = row?["avatar_url"]?.stringValue.nonEmpty else { return }
      let data = try await client.storage.from("avatars").download(path: path)
      avatar = UIImage(data: data)
    } catch {
      // Keep the glyph: a missing photo is not worth an error.
      loaded = false
    }
  }
}

/// The user's photo in a circle, or the plain person glyph without one.
struct ProfileAvatar: View {
  @Environment(\.theme) private var theme
  let profile: ProfileStore
  var size: CGFloat = 32

  var body: some View {
    Group {
      if let avatar = profile.avatar {
        Image(uiImage: avatar)
          .resizable()
          .scaledToFill()
      } else {
        Image(systemName: "person.crop.circle.fill")
          .resizable()
          .foregroundStyle(theme.iconMuted)
      }
    }
    .frame(width: size, height: size)
    .clipShape(Circle())
  }
}

/// The sheet behind the header's avatar: a card with the user's photo, handle and email,
/// the desktop settings, and signing out.
struct AccountSheet: View {
  @Environment(\.theme) private var theme
  let profile: ProfileStore
  let onSettings: () -> Void
  let onSignOut: () -> Void

  var body: some View {
    VStack(spacing: 16) {
      VStack(spacing: 14) {
        ProfileAvatar(profile: profile, size: 72)
        VStack(spacing: 4) {
          Text(profile.username.map { "@\($0)" } ?? profile.name ?? "Your account")
            .font(.cera(.title3, .bold))
            .foregroundStyle(theme.ink)
            .lineLimit(1)
          if let email = profile.email {
            Text(email)
              .font(.cera(.subheadline))
              .foregroundStyle(theme.textSecondary)
              .lineLimit(1)
              .truncationMode(.middle)
          }
        }
        Button {
          Haptics.tap()
          onSettings()
        } label: {
          Label("Settings", systemImage: "gearshape")
            .font(.cera(.body, .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
        }
        .buttonStyle(.bordered)
        .tint(theme.ink)
        .padding(.top, 6)
        Button(role: .destructive) {
          Haptics.destructive()
          onSignOut()
        } label: {
          Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
            .font(.cera(.body, .semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 6)
        }
        .buttonStyle(.bordered)
        .tint(theme.red)
      }
      .padding(20)
      .frame(maxWidth: .infinity)
      .background(theme.surface, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
    }
    .padding(.horizontal, 16)
    .padding(.top, 28)
    .frame(maxHeight: .infinity, alignment: .top)
    .background(theme.bg.ignoresSafeArea())
    .presentationDetents([.height(352)])
    .presentationDragIndicator(.visible)
    .presentationBackground(theme.bg)
  }
}
