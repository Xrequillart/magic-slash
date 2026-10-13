import SwiftUI

/// The left-hand drawer behind the list's menu button: who is signed in, whether this
/// iPhone is paired with a Mac, and the account actions that go with them.
///
/// Drawn over the whole screen rather than pushed: it slides in from the leading edge on
/// a dimmed scrim, and a tap on the scrim or a swipe back to the left closes it.
struct AccountDrawer: View {
  @Environment(\.theme) private var theme

  @Binding var isOpen: Bool
  let email: String?
  let relay: RelayStore
  let onPair: () -> Void
  let onPairedMacs: () -> Void
  let onSignOut: () -> Void

  /// How far a drag has pulled the open drawer back to the left.
  @GestureState private var drag: CGFloat = 0

  var body: some View {
    GeometryReader { proxy in
      let width = min(proxy.size.width * 0.82, 340)
      ZStack(alignment: .leading) {
        if isOpen {
          Color.black.opacity(0.4)
            .ignoresSafeArea()
            .onTapGesture { close() }
            .transition(.opacity)
            .accessibilityLabel("Close")
            .accessibilityAddTraits(.isButton)

          panel
            .frame(width: width)
            .frame(maxHeight: .infinity)
            .background(theme.bg.ignoresSafeArea())
            .offset(x: min(0, drag))
            .gesture(
              DragGesture()
                .updating($drag) { value, state, _ in state = value.translation.width }
                .onEnded { value in
                  if value.translation.width < -width / 3 { close() }
                }
            )
            .transition(.move(edge: .leading))
        }
      }
    }
  }

  private func close() {
    withAnimation(.snappy(duration: 0.28)) { isOpen = false }
  }

  private var isPaired: Bool {
    !relay.macs.isEmpty && !relay.needsRepair
  }

  private var panel: some View {
    VStack(alignment: .leading, spacing: 28) {
      account
      pairing
      Spacer(minLength: 0)
      Button(role: .destructive) {
        close()
        onSignOut()
      } label: {
        Label("Sign out", systemImage: "rectangle.portrait.and.arrow.right")
          .font(.body.weight(.medium))
      }
      .foregroundStyle(theme.red)
    }
    .padding(.horizontal, 20)
    .padding(.top, 24)
    .padding(.bottom, 16)
  }

  // MARK: Account

  private var account: some View {
    HStack(spacing: 12) {
      Image(systemName: "person.crop.circle.fill")
        .font(.system(size: 40))
        .foregroundStyle(theme.iconMuted)
      VStack(alignment: .leading, spacing: 2) {
        Text("Signed in as")
          .font(.caption)
          .foregroundStyle(theme.textSecondary)
        Text(email ?? "Unknown account")
          .font(.body.weight(.semibold))
          .foregroundStyle(theme.ink)
          .lineLimit(1)
          .truncationMode(.middle)
      }
    }
  }

  // MARK: Pairing

  private var pairing: some View {
    VStack(alignment: .leading, spacing: 12) {
      Text("Mac")
        .font(.footnote.weight(.semibold))
        .foregroundStyle(theme.textSecondary)

      if isPaired {
        HStack(spacing: 8) {
          Image(systemName: "checkmark.circle.fill")
            .foregroundStyle(theme.green)
          Text("Paired")
            .font(.body.weight(.semibold))
            .foregroundStyle(theme.ink)
        }
        ForEach(relay.statuses()) { status in
          MacLine(status: status, now: relay.now)
        }
        lockNotice
        Button("Paired Macs", systemImage: "laptopcomputer", action: onPairedMacs)
          .font(.subheadline.weight(.medium))
          .foregroundStyle(theme.accent)
      } else {
        HStack(spacing: 8) {
          Image(systemName: "link.badge.plus")
            .foregroundStyle(theme.textSecondary)
          Text(relay.needsRepair ? "Pair your Mac again" : "Not paired")
            .font(.body.weight(.semibold))
            .foregroundStyle(theme.ink)
        }
        if relay.needsRepair {
          Text("Face ID changed on this iPhone, so its Macs were unpaired.")
            .font(.footnote)
            .foregroundStyle(theme.textSecondary)
        }
        Button(action: onPair) {
          Label("Pair a Mac", systemImage: "qrcode.viewfinder")
            .font(.body.weight(.semibold))
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
        }
        .buttonStyle(.borderedProminent)
        .tint(theme.accent)
      }
    }
  }

  /// The link's keys are locked behind Face ID until the iPhone unlocks them.
  @ViewBuilder
  private var lockNotice: some View {
    switch relay.keyState {
    case .locked(let message):
      VStack(alignment: .leading, spacing: 6) {
        Text(message)
          .font(.footnote)
          .foregroundStyle(theme.textSecondary)
        Button("Unlock") { Task { await relay.unlock() } }
          .font(.footnote.weight(.semibold))
          .foregroundStyle(theme.accent)
      }
    case .unavailable(let message):
      Text(message)
        .font(.footnote)
        .foregroundStyle(theme.textSecondary)
    case .unlocking, .idle, .unlocked:
      EmptyView()
    }
  }
}
