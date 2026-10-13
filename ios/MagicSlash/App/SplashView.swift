import SwiftUI

/// The launch splash, as on the desktop (desktop/index.html): white ground, the rabbit,
/// and under it a spinner with "Loading…" while the app gets ready. Once it is, the
/// loader fades, the rabbit squashes, hops and dashes off to the upper right, and the
/// app shows through behind it.
///
/// It takes over from the static launch screen (`UILaunchScreen` in Info.plist), which
/// draws the same rabbit at the same size and place, so the hand-off is invisible.
struct SplashView: View {
  /// Flips to true once the app knows what to show; only then does the rabbit go.
  let ready: Bool
  /// Called when the splash has fully faded out, to remove it.
  let onFinished: () -> Void

  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  @State private var leaving = false
  @State private var statusOpacity = 1.0
  @State private var opacity = 1.0

  /// The rabbit's width, and the size the launch screen draws it at (Rabbit.svg).
  static let rabbitWidth: CGFloat = 200
  private static let rabbitHeight = rabbitWidth * 1791 / 2630.5

  var body: some View {
    GeometryReader { proxy in
      let screen = proxy.size
      ZStack {
        Color.white

        rabbit(screen: screen)
          .overlay(alignment: .top) {
            // Out of the flow, so the rabbit stays dead centre and does not move when
            // it goes.
            status
              .fixedSize()
              .offset(y: Self.rabbitHeight + 40)
              .opacity(statusOpacity)
          }
      }
    }
    .ignoresSafeArea()
    .opacity(opacity)
    .accessibilityHidden(true)
    .onChange(of: ready, initial: true) { _, isReady in
      if isReady { leave() }
    }
  }

  private func rabbit(screen: CGSize) -> some View {
    Image(.rabbit)
      .resizable()
      .scaledToFit()
      .frame(width: Self.rabbitWidth, height: Self.rabbitHeight)
      .keyframeAnimator(initialValue: Pose(), trigger: leaving && !reduceMotion) { content, pose in
        // Same order as the CSS transform list, applied right to left, around the
        // bottom centre (`transform-origin: 50% 100%`).
        content
          .rotationEffect(.degrees(pose.rotation), anchor: .bottom)
          .scaleEffect(x: pose.scaleX, y: pose.scaleY, anchor: .bottom)
          .offset(x: pose.x, y: pose.y)
          .blur(radius: pose.blur)
      } keyframes: { _ in
        Self.flight(screen: screen)
      }
  }

  private var status: some View {
    VStack(spacing: 12) {
      Spinner()
      Text("Loading…")
        .font(.cera(size: 13))
        .foregroundStyle(Color(red: 0x8a / 255, green: 0x8a / 255, blue: 0x93 / 255))
    }
  }

  private func leave() {
    guard !leaving else { return }
    leaving = true
    let ease = { (duration: Double) in Animation.timingCurve(0.25, 0.1, 0.25, 1, duration: duration) }
    withAnimation(ease(0.25)) { statusOpacity = 0 }
    let fadeDelay = reduceMotion ? 0.25 : 1.5
    let fadeDuration = reduceMotion ? 0.2 : 0.35
    withAnimation(ease(fadeDuration).delay(fadeDelay)) { opacity = 0 }
    Task {
      try? await Task.sleep(for: .seconds(fadeDelay + fadeDuration))
      onFinished()
    }
  }

  // MARK: - Flight

  /// One frame of the rabbit: the components of the CSS transforms, plus the blur.
  struct Pose {
    var scaleX = 1.0
    var scaleY = 1.0
    var x: CGFloat = 0
    var y: CGFloat = 0
    var rotation = 0.0
    var blur: CGFloat = 0
  }

  /// `splash-hop` (0.95 s after the loader's 0.25 s fade), then `splash-dash` (0.55 s).
  /// CSS applies the timing function to each segment between keyframes, so each
  /// segment below carries it.
  @KeyframesBuilder<Pose>
  private static func flight(screen: CGSize) -> some Keyframes<Pose> {
    let hop = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.3, y: 0), endControlPoint: UnitPoint(x: 0.2, y: 1))
    let dash = UnitCurve.bezier(startControlPoint: UnitPoint(x: 0.5, y: 0), endControlPoint: UnitPoint(x: 0.75, y: 0))
    // Segment lengths: the keyframe percentages times each animation's duration.
    let wait = 0.25
    let (h1, h2, h3, h4) = (0.22 * 0.95, 0.33 * 0.95, 0.29 * 0.95, 0.16 * 0.95)
    let (d1, d2) = (0.18 * 0.55, 0.82 * 0.55)

    KeyframeTrack(\.scaleX) {
      LinearKeyframe(1, duration: wait)
      LinearKeyframe(1.1, duration: h1, timingCurve: hop)
      LinearKeyframe(0.94, duration: h2, timingCurve: hop)
      LinearKeyframe(1.12, duration: h3, timingCurve: hop)
      LinearKeyframe(1, duration: h4, timingCurve: hop)
      LinearKeyframe(1.06, duration: d1, timingCurve: dash)
      LinearKeyframe(1.15, duration: d2, timingCurve: dash)
    }
    KeyframeTrack(\.scaleY) {
      LinearKeyframe(1, duration: wait)
      LinearKeyframe(0.82, duration: h1, timingCurve: hop)
      LinearKeyframe(1.08, duration: h2, timingCurve: hop)
      LinearKeyframe(0.84, duration: h3, timingCurve: hop)
      LinearKeyframe(1, duration: h4, timingCurve: hop)
      LinearKeyframe(0.9, duration: d1, timingCurve: dash)
      LinearKeyframe(0.9, duration: d2, timingCurve: dash)
    }
    KeyframeTrack(\.y) {
      LinearKeyframe(0, duration: wait + h1)
      LinearKeyframe(-0.26 * rabbitHeight, duration: h2, timingCurve: hop)
      LinearKeyframe(0, duration: h3, timingCurve: hop)
      LinearKeyframe(0, duration: h4 + d1)
      LinearKeyframe(-0.45 * screen.height, duration: d2, timingCurve: dash)
    }
    KeyframeTrack(\.x) {
      LinearKeyframe(0, duration: wait + h1 + h2 + h3 + h4)
      LinearKeyframe(-0.04 * rabbitWidth, duration: d1, timingCurve: dash)
      LinearKeyframe(0.75 * screen.width, duration: d2, timingCurve: dash)
    }
    KeyframeTrack(\.rotation) {
      LinearKeyframe(0, duration: wait + h1)
      LinearKeyframe(-4, duration: h2, timingCurve: hop)
      LinearKeyframe(0, duration: h3, timingCurve: hop)
      LinearKeyframe(0, duration: h4 + d1)
      LinearKeyframe(-8, duration: d2, timingCurve: dash)
    }
    KeyframeTrack(\.blur) {
      LinearKeyframe(0, duration: wait + h1 + h2 + h3 + h4 + d1)
      LinearKeyframe(3, duration: d2, timingCurve: dash)
    }
  }
}

/// The desktop's loader: a 26 pt ring, its top quarter in the accent blue, turning
/// once every 0.8 s.
private struct Spinner: View {
  private static let blue = Color(red: 0, green: 122 / 255, blue: 252 / 255)

  var body: some View {
    TimelineView(.animation) { context in
      let turn = context.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: 0.8) / 0.8
      ZStack {
        Circle().stroke(Self.blue.opacity(0.18), lineWidth: 3)
        Circle()
          .trim(from: 0, to: 0.25)
          .stroke(Self.blue, lineWidth: 3)
          // The arc starts at 3 o'clock; centre it on 12 o'clock like `border-top`.
          .rotationEffect(.degrees(-135))
      }
      .rotationEffect(.degrees(turn * 360))
    }
    .frame(width: 23, height: 23)
  }
}
