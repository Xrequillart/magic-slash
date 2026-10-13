import SwiftUI

/// Pairing with a Mac (PROTOCOL.md §7): scan its QR, confirm with Face ID, then approve on
/// the Mac. The Mac is saved only once it answers `pair-accepted`.
struct PairingView: View {
  @Environment(\.theme) private var theme
  @Environment(\.dismiss) private var dismiss

  let relay: RelayStore

  @State private var scanError: String?
  #if DEBUG && targetEnvironment(simulator)
    /// The Simulator has no camera: paste the QR's text instead (copy it from the desktop).
    @State private var pasted = ""
  #endif

  var body: some View {
    NavigationStack {
      content
        .padding(20)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        .background(theme.bg.ignoresSafeArea())
        .navigationTitle("Pair a Mac")
        .navigationBarTitleDisplayMode(.inline)
        .toolbarBackground(theme.bg, for: .navigationBar)
        .toolbar {
          ToolbarItem(placement: .cancellationAction) {
            Button(isFinished ? "Done" : "Cancel") {
              Haptics.tap()
              dismiss()
            }
              .foregroundStyle(theme.accent)
          }
        }
    }
    .onDisappear { relay.endPairing() }
  }

  private var isFinished: Bool {
    if case .accepted = relay.pairing?.phase { return true }
    return false
  }

  @ViewBuilder
  private var content: some View {
    switch relay.pairing?.phase {
    case nil:
      scanner
    case .preparing:
      progress("Confirm with Face ID…")
    case .waiting(let code):
      waiting(code: code, macName: relay.pairing?.offer.name ?? "your Mac")
    case .accepted(let macName):
      outcome(
        icon: "checkmark.circle.fill",
        color: theme.green,
        title: "Paired with \(macName)",
        message: "Your agents' live state now shows on this iPhone while the Mac has remote access on."
      )
    case .rejected(let message), .failed(let message):
      VStack(spacing: 20) {
        outcome(icon: "xmark.circle.fill", color: theme.red, title: "Not paired", message: message)
        Button("Scan again") {
          Haptics.tap()
          scanError = nil
          relay.endPairing()
        }
        .buttonStyle(PrimaryButtonStyle())
      }
    }
  }

  // MARK: Scanner

  private var scanner: some View {
    VStack(alignment: .leading, spacing: 16) {
      Text("On your Mac, open Magic Slash settings, then Remote access. Turn it on, click Pair, and scan the code it shows.")
        .font(.cera(.subheadline))
        .foregroundStyle(theme.textSecondary)

      CameraScanner { handle($0) }
        .aspectRatio(1, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(theme.lineSubtle))

      if let scanError {
        Label(scanError, systemImage: "exclamationmark.triangle")
          .font(.cera(.footnote))
          .foregroundStyle(theme.red)
      }

      #if DEBUG && targetEnvironment(simulator)
        VStack(alignment: .leading, spacing: 8) {
          Text("Simulator: paste the QR's text")
            .font(.cera(.caption, .semibold))
            .foregroundStyle(theme.textSecondary)
          TextField("{\"v\":1,\"macId\":…}", text: $pasted, axis: .vertical)
            .font(.caption.monospaced())
            .lineLimit(3...6)
            .textInputAutocapitalization(.never)
            .autocorrectionDisabled()
            .modifier(ThemedFieldStyle())
          Button("Pair") { handle(pasted) }
            .buttonStyle(PrimaryButtonStyle())
            .disabled(pasted.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
      #endif
    }
  }

  private func handle(_ code: String) {
    Haptics.tap()
    do {
      let offer = try PairingOffer(qr: code)
      scanError = nil
      Task { await relay.beginPairing(offer) }
    } catch {
      scanError = error == .expired
        ? "This code has expired. Your Mac shows a fresh one every minute: scan it again."
        : "This is not a Magic Slash pairing code."
    }
  }

  // MARK: States

  private func waiting(code: String, macName: String) -> some View {
    VStack(spacing: 18) {
      Spacer(minLength: 12)
      Text("Approve on your Mac")
        .font(.cera(.title3, .semibold))
        .foregroundStyle(theme.ink)
      Text(code)
        .font(.system(size: 56, weight: .bold, design: .monospaced))
        .tracking(8)
        .foregroundStyle(theme.ink)
        .padding(.vertical, 16)
        .padding(.horizontal, 24)
        .background(RoundedRectangle(cornerRadius: 16).fill(theme.surface))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(theme.lineSubtle))
        .accessibilityLabel("Code \(code.map(String.init).joined(separator: " "))")
      Text("Check that \(macName) shows the same code, then approve the pairing there.")
        .font(.cera(.subheadline))
        .foregroundStyle(theme.textSecondary)
        .multilineTextAlignment(.center)
      HStack(spacing: 8) {
        ProgressView().tint(theme.textSecondary)
        Text("Waiting for your Mac…")
          .font(.cera(.footnote))
          .foregroundStyle(theme.textSecondary)
      }
      Spacer(minLength: 12)
    }
    .frame(maxWidth: .infinity)
  }

  private func progress(_ text: String) -> some View {
    VStack(spacing: 12) {
      ProgressView().tint(theme.textSecondary)
      Text(text)
        .font(.cera(.subheadline))
        .foregroundStyle(theme.textSecondary)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
  }

  private func outcome(icon: String, color: Color, title: String, message: String) -> some View {
    VStack(spacing: 12) {
      Image(systemName: icon)
        .font(.system(size: 44))
        .foregroundStyle(color)
      Text(title)
        .font(.cera(.headline))
        .foregroundStyle(theme.ink)
        .multilineTextAlignment(.center)
      Text(message)
        .font(.cera(.subheadline))
        .foregroundStyle(theme.textSecondary)
        .multilineTextAlignment(.center)
    }
    .frame(maxWidth: .infinity)
    .padding(.top, 32)
  }
}

/// The paired Macs, each with its presence, and "Forget" (this iPhone only).
struct PairedMacsView: View {
  @Environment(\.theme) private var theme
  @Environment(\.dismiss) private var dismiss

  let relay: RelayStore
  let onPair: () -> Void

  @State private var forgetting: RelayStore.MacStatus?

  var body: some View {
    NavigationStack {
      List {
        Section {
          let statuses = relay.statuses()
          if statuses.isEmpty {
            EmptyLine(text: "No Mac paired yet")
              .listRowBackground(theme.surface)
          }
          ForEach(statuses) { status in
            HStack(spacing: 10) {
              Circle()
                .fill(status.isOnline ? theme.green : theme.textSecondary.opacity(0.5))
                .frame(width: 8, height: 8)
              VStack(alignment: .leading, spacing: 2) {
                Text(status.name)
                  .font(.cera(.body, .semibold))
                  .foregroundStyle(theme.ink)
                Text("Paired \(status.mac.pairedAt.formatted(date: .abbreviated, time: .omitted)), \(status.isOnline ? "online" : "offline")")
                  .font(.cera(.caption))
                  .foregroundStyle(theme.textSecondary)
              }
              Spacer(minLength: 4)
              Button("Forget", role: .destructive) {
                Haptics.tap()
                forgetting = status
              }
                .font(.cera(.subheadline, .semibold))
                .foregroundStyle(theme.red)
                .buttonStyle(.borderless)
            }
            .listRowBackground(theme.surface)
          }
        } footer: {
          Text("Forgetting a Mac only removes it from this iPhone. To stop the Mac sending to it, revoke this iPhone in the Mac's settings too.")
            .foregroundStyle(theme.textSecondary)
        }

        Section {
          Button("Pair a Mac", systemImage: "qrcode.viewfinder") {
            Haptics.tap()
            onPair()
          }
            .foregroundStyle(theme.accent)
            .listRowBackground(theme.surface)
        }
      }
      .scrollContentBackground(.hidden)
      .background(theme.bg.ignoresSafeArea())
      .navigationTitle("Paired Macs")
      .navigationBarTitleDisplayMode(.inline)
      .toolbarBackground(theme.bg, for: .navigationBar)
      .toolbar {
        ToolbarItem(placement: .confirmationAction) {
          Button("Done") {
            Haptics.tap()
            dismiss()
          }
            .foregroundStyle(theme.accent)
        }
      }
      .confirmationDialog(
        "Forget \(forgetting?.name ?? "this Mac")?",
        isPresented: Binding(get: { forgetting != nil }, set: { if !$0 { forgetting = nil } }),
        titleVisibility: .visible,
        presenting: forgetting
      ) { status in
        Button("Forget", role: .destructive) {
          Haptics.destructive()
          relay.forget(status.mac.macId)
        }
      } message: { _ in
        Text("Its agents' live state stops showing here. Pair again to see it.")
      }
    }
  }
}
