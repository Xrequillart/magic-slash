import SwiftUI

struct SignInView: View {
  @Environment(\.theme) private var theme
  let auth: AuthModel

  @State private var email = ""
  @State private var password = ""
  @State private var revealsPassword = false
  @FocusState private var focus: Field?

  private enum Field { case email, password }

  private var canSubmit: Bool {
    !email.trimmingCharacters(in: .whitespaces).isEmpty && !password.isEmpty && !auth.isBusy
  }

  var body: some View {
    ScrollView {
      VStack(spacing: 32) {
        // The site's mark (webapp/public/img/logo-black.svg), drawn in the theme's ink.
        Image("Logo")
          .renderingMode(.template)
          .resizable()
          .scaledToFit()
          .frame(height: 64)
          .foregroundStyle(theme.ink)
          .accessibilityLabel("Magic Slash")

        VStack(spacing: 8) {
          Text("Welcome back")
            .font(.cera(.title2, .bold))
            .foregroundStyle(theme.ink)
          Text("Sign in with the account you use on the desktop app.")
            .font(.cera(.subheadline))
            .foregroundStyle(theme.textSecondary)
            .multilineTextAlignment(.center)
        }

        VStack(spacing: 12) {
          SignInField(systemImage: "envelope", isFocused: focus == .email) {
            TextField("Email", text: $email)
              .textContentType(.username)
              .keyboardType(.emailAddress)
              .textInputAutocapitalization(.never)
              .autocorrectionDisabled()
              .submitLabel(.next)
              .focused($focus, equals: .email)
              .onSubmit { focus = .password }
          }

          SignInField(systemImage: "lock", isFocused: focus == .password) {
            Group {
              if revealsPassword {
                TextField("Password", text: $password)
                  .textInputAutocapitalization(.never)
                  .autocorrectionDisabled()
              } else {
                SecureField("Password", text: $password)
              }
            }
            .textContentType(.password)
            .submitLabel(.go)
            .focused($focus, equals: .password)
            .onSubmit(submit)

            Button(revealsPassword ? "Hide password" : "Show password",
                   systemImage: revealsPassword ? "eye.slash" : "eye") {
              Haptics.tap()
              revealsPassword.toggle()
            }
            .labelStyle(.iconOnly)
            .font(.system(size: 15))
            .foregroundStyle(theme.iconMuted)
          }
        }

        if let error = auth.errorMessage {
          HStack(alignment: .firstTextBaseline, spacing: 8) {
            Image(systemName: "exclamationmark.circle.fill")
            Text(error)
              .fixedSize(horizontal: false, vertical: true)
          }
          .font(.cera(.footnote))
          .foregroundStyle(theme.red)
          .padding(12)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(RoundedRectangle(cornerRadius: 12).fill(theme.red.opacity(0.1)))
        }

        Button(action: submit) {
          if auth.isBusy {
            ProgressView().tint(theme.onBrand)
          } else {
            HStack(spacing: 8) {
              Text("Sign in")
              Image(systemName: "arrow.right")
                .font(.system(size: 15, weight: .semibold))
            }
          }
        }
        .buttonStyle(PrimaryButtonStyle())
        .disabled(!canSubmit)
      }
      .padding(.horizontal, 24)
      .frame(maxWidth: 440)
      .frame(maxWidth: .infinity)
      // In the middle of the screen while the keyboard is down, scrolling once it is up.
      .containerRelativeFrame(.vertical) { height, _ in height }
    }
    .scrollDismissesKeyboard(.interactively)
    .scrollBounceBehavior(.basedOnSize)
    .background(theme.bg.ignoresSafeArea())
    .animation(.easeOut(duration: 0.2), value: auth.errorMessage)
  }

  private func submit() {
    Haptics.tap()
    guard canSubmit else { return }
    Task { await auth.signIn(email: email, password: password) }
  }
}

/// A sign-in field: its icon on the left, whatever trails it on the right, and an accent
/// border while it has the focus.
private struct SignInField<Content: View>: View {
  @Environment(\.theme) private var theme
  let systemImage: String
  let isFocused: Bool
  @ViewBuilder var content: Content

  var body: some View {
    HStack(spacing: 12) {
      Image(systemName: systemImage)
        .font(.system(size: 16))
        .foregroundStyle(isFocused ? theme.accent : theme.iconMuted)
        .frame(width: 20)
      content
    }
    .font(.cera(.body))
    .foregroundStyle(theme.ink)
    .padding(.horizontal, 16)
    .frame(minHeight: 52)
    .background(RoundedRectangle(cornerRadius: 14).fill(theme.surfaceSunken))
    .overlay(
      RoundedRectangle(cornerRadius: 14)
        .strokeBorder(isFocused ? theme.accent : theme.lineField, lineWidth: isFocused ? 1.5 : 1)
    )
    .animation(.easeOut(duration: 0.15), value: isFocused)
  }
}
