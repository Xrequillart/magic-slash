import SwiftUI

struct SignInView: View {
  @Environment(\.theme) private var theme
  let auth: AuthModel

  @State private var email = ""
  @State private var password = ""
  @FocusState private var focus: Field?

  private enum Field { case email, password }

  private var canSubmit: Bool {
    !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty && !auth.isBusy
  }

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 24) {
        VStack(alignment: .leading, spacing: 6) {
          Text("Magic Slash")
            .font(.cera(.largeTitle, .bold))
            .foregroundStyle(theme.ink)
          Text("Sign in with the account you use on the desktop app.")
            .font(.cera(.subheadline))
            .foregroundStyle(theme.textSecondary)
        }

        VStack(spacing: 12) {
          TextField("Email", text: $email)
            .textContentType(.username)
            .keyboardType(.emailAddress)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .submitLabel(.next)
            .focused($focus, equals: .email)
            .onSubmit { focus = .password }
            .modifier(ThemedFieldStyle())

          SecureField("Password", text: $password)
            .textContentType(.password)
            .submitLabel(.go)
            .focused($focus, equals: .password)
            .onSubmit(submit)
            .modifier(ThemedFieldStyle())
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
            Text("Sign in")
          }
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(!canSubmit)
      }
      .padding(24)
      .padding(.top, 48)
    }
    .scrollDismissesKeyboard(.interactively)
    .background(theme.bg.ignoresSafeArea())
  }

  private func submit() {
    guard canSubmit else { return }
    Task { await auth.signIn(email: email, password: password) }
  }
}
