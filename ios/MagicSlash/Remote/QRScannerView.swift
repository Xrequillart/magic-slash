@preconcurrency import AVFoundation
import SwiftUI
import UIKit

/// The camera, reading QR codes. Calls `onCode` with each new code's text, on the main actor.
struct QRScannerView: UIViewControllerRepresentable {
  let onCode: (String) -> Void

  func makeUIViewController(context: Context) -> ScannerViewController {
    let controller = ScannerViewController()
    controller.onCode = onCode
    return controller
  }

  func updateUIViewController(_ controller: ScannerViewController, context: Context) {
    controller.onCode = onCode
  }

  static func dismantleUIViewController(_ controller: ScannerViewController, coordinator: ()) {
    controller.stop()
  }
}

/// AVCaptureSession is safe to start and stop from any thread, and must not be started on
/// the main one (it blocks): this box carries it to the session queue.
private final class SessionBox: @unchecked Sendable {
  let session = AVCaptureSession()
}

final class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
  var onCode: ((String) -> Void)?

  private let box = SessionBox()
  private let queue = DispatchQueue(label: "io.magic-slash.ios.scanner")
  private var preview: AVCaptureVideoPreviewLayer?
  private var lastCode: String?
  private var configured = false

  override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .black
  }

  override func viewDidLayoutSubviews() {
    super.viewDidLayoutSubviews()
    preview?.frame = view.bounds
  }

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)
    if !configured {
      configured = true
      configure()
    }
    let box = box
    queue.async { if !box.session.isRunning { box.session.startRunning() } }
  }

  override func viewWillDisappear(_ animated: Bool) {
    super.viewWillDisappear(animated)
    stop()
  }

  func stop() {
    let box = box
    queue.async { if box.session.isRunning { box.session.stopRunning() } }
  }

  private func configure() {
    let session = box.session
    guard let device = AVCaptureDevice.default(for: .video),
          let input = try? AVCaptureDeviceInput(device: device),
          session.canAddInput(input)
    else { return }
    session.beginConfiguration()
    session.addInput(input)
    let output = AVCaptureMetadataOutput()
    if session.canAddOutput(output) {
      session.addOutput(output)
      // Main queue: the delegate below hops onto the main actor without a suspension.
      output.setMetadataObjectsDelegate(self, queue: .main)
      if output.availableMetadataObjectTypes.contains(.qr) {
        output.metadataObjectTypes = [.qr]
      }
    }
    session.commitConfiguration()

    let layer = AVCaptureVideoPreviewLayer(session: session)
    layer.videoGravity = .resizeAspectFill
    layer.frame = view.bounds
    view.layer.addSublayer(layer)
    preview = layer
  }

  nonisolated func metadataOutput(
    _ output: AVCaptureMetadataOutput,
    didOutput metadataObjects: [AVMetadataObject],
    from connection: AVCaptureConnection
  ) {
    let codes = metadataObjects.compactMap { ($0 as? AVMetadataMachineReadableCodeObject)?.stringValue }
    guard let code = codes.first else { return }
    // Delivered on the main queue, as set up in `configure`.
    MainActor.assumeIsolated {
      // The camera reports the same code many times a second: pass on each one once.
      guard code != lastCode else { return }
      lastCode = code
      onCode?(code)
    }
  }
}

/// The camera, or why there is none: permission asked on first appearance.
struct CameraScanner: View {
  @Environment(\.theme) private var theme
  @Environment(\.openURL) private var openURL

  let onCode: (String) -> Void

  @State private var access: AVAuthorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)

  var body: some View {
    Group {
      if AVCaptureDevice.default(for: .video) == nil {
        notice("No camera available on this device.")
      } else {
        switch access {
        case .authorized:
          QRScannerView(onCode: onCode)
        case .notDetermined:
          ProgressView().tint(theme.textSecondary)
            .task {
              _ = await AVCaptureDevice.requestAccess(for: .video)
              access = AVCaptureDevice.authorizationStatus(for: .video)
            }
        default:
          VStack(spacing: 12) {
            notice("Magic Slash needs the camera to scan the code your Mac shows.")
            Button("Open Settings") {
              Haptics.tap()
              if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
            }
            .foregroundStyle(theme.accent)
          }
        }
      }
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity)
    .background(theme.surfaceSunken)
  }

  private func notice(_ text: LocalizedStringKey) -> some View {
    Text(text)
      .font(.cera(.subheadline))
      .foregroundStyle(theme.textSecondary)
      .multilineTextAlignment(.center)
      .padding(24)
  }
}
