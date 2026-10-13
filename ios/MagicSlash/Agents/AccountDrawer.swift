import Supabase
import SwiftUI
import UIKit

/// What lies under the sessions list, revealed when the list slides aside: who is signed
/// in, and signing out. Pairing lives in the list's header.
///
/// It does not move and has no open state of its own: `AgentListView` slides the list over
/// it and back.
struct AccountDrawer: View {
  @Environment(\.theme) private var theme

  let client: SupabaseClient
  let onSignOut: () -> Void

  /// The name and photo the user set on the desktop (`profiles`), once read.
  @State private var name: String?
  @State private var avatar: UIImage?

  private var email: String? { client.auth.currentUser?.email }

  var body: some View {
    VStack(alignment: .leading, spacing: 28) {
      account
      Spacer(minLength: 0)
      Button(role: .destructive, action: onSignOut) {
        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
          .font(.cera(.body, .medium))
      }
      .foregroundStyle(theme.red)
    }
    .padding(.horizontal, 20)
    .padding(.top, 24)
    .padding(.bottom, 16)
    .task { await loadProfile() }
  }

  // MARK: Account

  private var account: some View {
    HStack(spacing: 12) {
      Group {
        if let avatar {
          Image(uiImage: avatar)
            .resizable()
            .scaledToFill()
        } else {
          Image(systemName: "person.crop.circle.fill")
            .resizable()
            .foregroundStyle(theme.iconMuted)
        }
      }
      .frame(width: 44, height: 44)
      .clipShape(Circle())
      .accessibilityHidden(true)

      VStack(alignment: .leading, spacing: 2) {
        Text(name ?? "Signed in as")
          .font(.cera(name == nil ? .caption : .body, name == nil ? .regular : .semibold))
          .foregroundStyle(name == nil ? theme.textSecondary : theme.ink)
          .lineLimit(1)
        Text(email ?? "Unknown account")
          .font(.cera(name == nil ? .body : .footnote, name == nil ? .semibold : .regular))
          .foregroundStyle(name == nil ? theme.ink : theme.textSecondary)
          .lineLimit(1)
          .truncationMode(.middle)
      }
    }
  }

  /// The photo lives in the private `avatars` bucket, at the path `profiles.avatar_url`
  /// holds: the user's own session may read it, as the desktop does. No photo, or any
  /// failure, keeps the plain glyph.
  private func loadProfile() async {
    guard let userId = client.auth.currentUser?.id.uuidString.lowercased() else { return }
    do {
      let rows: [JSONObject] = try await client
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", value: userId)
        .limit(1)
        .execute()
        .value
      let row = rows.first
      name = row?["name"]?.stringValue.nonEmpty
      guard let path = row?["avatar_url"]?.stringValue.nonEmpty else { return }
      let data = try await client.storage.from("avatars").download(path: path)
      avatar = UIImage(data: data)
    } catch {
      // Keep the glyph: a missing photo is not worth an error on this screen.
    }
  }
}
