import Foundation
import Observation
import Supabase

enum AuthState: Equatable {
  /// Reading the stored session at launch.
  case restoring
  case signedOut
  /// Password accepted, but the account has a verified TOTP factor and the session is
  /// still at aal1. Nothing is readable until the code is entered.
  case needsTOTP
  case signedIn(userId: UUID)
}

/// Sign-in, the second factor, and sign-out. Mirrors the desktop's rule: an account
/// enrolled in MFA is not signed in until its session reaches aal2.
@MainActor
@Observable
final class AuthModel {
  let client: SupabaseClient

  private(set) var state: AuthState = .restoring
  private(set) var isBusy = false
  var errorMessage: String?

  @ObservationIgnored private var totpFactorId: String?
  @ObservationIgnored private var listener: Task<Void, Never>?

  init(client: SupabaseClient) {
    self.client = client
  }

  /// Restores the stored session at launch and keeps watching for a sign-out that
  /// happens elsewhere (a revoked refresh token, for instance).
  func start() async {
    listener?.cancel()
    listener = Task { [weak self, client] in
      for await change in client.auth.authStateChanges {
        guard let self else { return }
        if change.event == .signedOut { self.resetToSignedOut() }
      }
    }

    do {
      // `session` refreshes an expired token, and throws when there is nothing to restore.
      let session = try await client.auth.session
      await resolveAssurance(userId: session.user.id)
    } catch {
      state = .signedOut
    }
  }

  func signIn(email: String, password: String) async {
    guard !isBusy else { return }
    isBusy = true
    errorMessage = nil
    defer { isBusy = false }

    do {
      let session = try await client.auth.signIn(
        email: email.trimmingCharacters(in: .whitespacesAndNewlines),
        password: password
      )
      await resolveAssurance(userId: session.user.id)
    } catch {
      errorMessage = Self.describe(error)
    }
  }

  func verifyTOTP(code: String) async {
    guard !isBusy, let factorId = totpFactorId else { return }
    isBusy = true
    errorMessage = nil
    defer { isBusy = false }

    do {
      _ = try await client.auth.mfa.challengeAndVerify(
        params: MFAChallengeAndVerifyParams(factorId: factorId, code: code)
      )
      let session = try await client.auth.session
      totpFactorId = nil
      state = .signedIn(userId: session.user.id)
    } catch {
      errorMessage = Self.describe(error)
    }
  }

  /// Signs this device out only. The default `.global` scope would also end the
  /// desktop's session, which a read-only companion has no business doing.
  func signOut() async {
    try? await client.auth.signOut(scope: .local)
    resetToSignedOut()
  }

  private func resetToSignedOut() {
    totpFactorId = nil
    isBusy = false
    state = .signedOut
  }

  private func resolveAssurance(userId: UUID) async {
    do {
      let aal = try await client.auth.mfa.getAuthenticatorAssuranceLevel()
      guard aal.nextLevel == "aal2", aal.currentLevel != aal.nextLevel else {
        state = .signedIn(userId: userId)
        return
      }

      let factors = try await client.auth.mfa.listFactors()
      guard let factor = factors.totp.first else {
        errorMessage = String(localized: "This account requires a second factor this app does not support.")
        await signOut()
        return
      }
      totpFactorId = factor.id
      state = .needsTOTP
    } catch {
      errorMessage = Self.describe(error)
      state = .signedOut
    }
  }

  private static func describe(_ error: any Error) -> String {
    if let authError = error as? AuthError {
      return authError.message
    }
    if (error as? URLError) != nil {
      return String(localized: "Could not reach the server. Check your connection and try again.")
    }
    return error.localizedDescription
  }
}
