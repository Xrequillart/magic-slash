import SwiftUI

/// The second step for an account enrolled in TOTP: the 6-digit code from the
/// authenticator app.
struct TOTPView: View {
  @Environment(\.theme) private var theme
  let auth: AuthModel

  @State private var code = ""
  @FocusState private var focused: Bool

  private var digits: String { code.filter(\.isNumber) }
  private var canSubmit: Bool { digits.count == 6 && !auth.isBusy }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        VStack(alignment: .leading, spacing: 6) {
          Text("Two-factor code")
            .font(.cera(.title, .bold))
            .foregroundStyle(theme.ink)
          Text("Enter the 6-digit code from your authenticator app.")
            .font(.cera(.subheadline))
            .foregroundStyle(theme.textSecondary)
        }

        TextField("123456", text: $code)
          .textContentType(.oneTimeCode)
          .keyboardType(.numberPad)
          .font(.title2.monospacedDigit())
          .focused($focused)
          .modifier(ThemedFieldStyle())
          .onChange(of: code) { _, newValue in
            let trimmed = String(newValue.filter(\.isNumber).prefix(6))
            if trimmed != newValue { code = trimmed }
            if trimmed.count == 6 { submit() }
          }

        if let error = auth.errorMessage {
          Text(error)
            .font(.cera(.footnote))
            .foregroundStyle(theme.red)
        }

        Button(action: submit) {
          if auth.isBusy {
            ProgressView().tint(theme.onBrand)
          } else {
            Text("Verify")
          }
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(!canSubmit)

        Button("Use another account") {
          Haptics.tap()
          Task { await auth.signOut() }
        }
        .font(.cera(.subheadline))
        .foregroundStyle(theme.textSecondary)
        .frame(maxWidth: .infinity)
      }
      .padding(24)
      .padding(.top, 48)
    }
    .background(theme.bg.ignoresSafeArea())
    .onAppear { focused = true }
  }

  private func submit() {
    Haptics.tap()
    guard canSubmit else { return }
    Task { await auth.verifyTOTP(code: digits) }
  }
}
