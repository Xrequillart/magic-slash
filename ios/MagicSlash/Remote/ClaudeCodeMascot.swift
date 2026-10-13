import SwiftUI

/// Claude Code's pixel robot, alive: the empty chat's mark, which every few seconds waves,
/// hops, dances, says hello or dozes off in a pixel speech bubble, picked at random.
/// The desktop's `ClaudeCodeMascot` (design-system/desktop/ClaudeCodeMascot.tsx), move for
/// move: the same 16-unit drawing, the same timings, and the same keyframes, played here
/// off a clock rather than by CSS. Under Reduce Motion it is simply the mark.
struct ClaudeCodeMascot: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  /// What the bubble says when the robot says hello.
  var greeting = "Hello!"

  private enum Move: CaseIterable {
    case wave, hop, hello, dance, sleep

    /// How long each move runs, so the next one never starts on top of it.
    var duration: TimeInterval {
      switch self {
      case .wave: 1.6
      case .hop: 0.9
      case .hello: 2.6
      case .dance: 2.0
      case .sleep: 3.6
      }
    }
  }

  /// Time between two moves.
  private static let every: TimeInterval = 5
  private static let snore = "zZzZzz"
  static let coral = Color(red: 0xD9 / 255, green: 0x77 / 255, blue: 0x57 / 255)

  @State private var move: Move?
  @State private var startedAt = Date()

  var body: some View {
    TimelineView(.animation(paused: move == nil)) { context in
      let t = move == nil ? 0 : context.date.timeIntervalSince(startedAt)
      GeometryReader { proxy in
        let size = proxy.size.width
        ZStack(alignment: .topLeading) {
          Robot(pose: pose(at: t))
            .frame(width: size, height: size)
            .modifier(BodyMotion(transform: bodyTransform(at: t), size: size))
          if let bubble = bubble(at: t) {
            Bubble(text: bubble.text, reveal: bubble.reveal, width: bubble.width)
              .scaleEffect(bubble.scale, anchor: .bottomLeading)
              .opacity(bubble.opacity)
              // `bottom-[82%] left-[88%]`: its bottom 18% down the robot, its left edge
              // just short of the right one.
              .frame(width: 0, height: size * 0.18, alignment: .bottomLeading)
              .offset(x: size * 0.88)
          }
        }
      }
    }
    .aspectRatio(1, contentMode: .fit)
    .accessibilityHidden(true)
    .task(id: reduceMotion) {
      guard !reduceMotion else { return }
      var last: Move?
      while !Task.isCancelled {
        try? await Task.sleep(for: .seconds(Self.every))
        guard !Task.isCancelled else { return }
        let next = Move.allCases.filter { $0 != last }.randomElement() ?? .wave
        last = next
        startedAt = Date()
        move = next
        try? await Task.sleep(for: .seconds(next.duration))
        if move == next { move = nil }
      }
    }
  }

  // MARK: Frames

  /// Which half of a `period` the clock is in: `steps(1)`'s first and second halves.
  private func firstHalf(_ t: TimeInterval, period: TimeInterval) -> Bool {
    t.truncatingRemainder(dividingBy: period) < period / 2
  }

  private func pose(at t: TimeInterval) -> Robot.Pose {
    switch move {
    case .wave where t < 1.6, .hello where t < 2.4:
      return Robot.Pose(right: firstHalf(t, period: 0.4) ? .up : .out, left: .rest, eyes: helloEyes(t))
    case .dance where t < 2.0:
      let first = firstHalf(t, period: 0.5)
      return Robot.Pose(right: first ? .up : .rest, left: first ? .rest : .up, eyes: 1)
    case .sleep:
      return Robot.Pose(right: .rest, left: .rest, eyes: 0.15)
    default:
      return Robot.Pose(right: .rest, left: .rest, eyes: move == .hello ? helloEyes(t) : 1)
    }
  }

  /// The blink of `hello`: shut from 50% to 60% of a 0.5 s run that starts at 0.9 s.
  private func helloEyes(_ t: TimeInterval) -> CGFloat {
    guard move == .hello else { return 1 }
    let local = (t - 0.9) / 0.5
    return local >= 0.5 && local < 0.6 ? 0.15 : 1
  }

  private struct Transform {
    var scaleX: CGFloat = 1
    var scaleY: CGFloat = 1
    /// Fractions of the size.
    var x: CGFloat = 0
    var y: CGFloat = 0
  }

  private func bodyTransform(at t: TimeInterval) -> Transform {
    switch move {
    case .hop where t < 0.9:
      // ds-ccm-hop, eased between its keyframes.
      let p = Self.ease(t / 0.9)
      let keys: [(CGFloat, Transform)] = [
        (0, Transform()),
        (0.18, Transform(scaleX: 1.12, scaleY: 0.84)),
        (0.5, Transform(scaleX: 0.94, scaleY: 1.08, y: -0.28)),
        (0.8, Transform(scaleX: 1.1, scaleY: 0.88)),
        (1, Transform()),
      ]
      return Self.interpolate(keys, at: p)
    case .dance where t < 2.0:
      // ds-ccm-dance: four positions, stepped.
      let step = Int(t.truncatingRemainder(dividingBy: 0.5) / 0.125)
      return [Transform(x: -0.07), Transform(y: -0.07), Transform(x: 0.07), Transform(y: -0.07)][min(step, 3)]
    case .sleep:
      // ds-ccm-breathe, three slow breaths.
      guard t < 3.6 else { return Transform() }
      let phase = (1 - cos(t.truncatingRemainder(dividingBy: 1.2) / 1.2 * 2 * .pi)) / 2
      return Transform(scaleX: 1 + 0.03 * phase, scaleY: 1 - 0.05 * phase)
    default:
      return Transform()
    }
  }

  private struct BubbleFrame {
    let text: String
    let reveal: Int
    let width: Int
    let scale: CGFloat
    let opacity: Double
  }

  private func bubble(at t: TimeInterval) -> BubbleFrame? {
    let duration: TimeInterval
    let text: String
    let reveal: Int
    switch move {
    case .hello:
      duration = 2.6
      text = greeting
      reveal = greeting.count
    case .sleep:
      duration = 3.6
      text = Self.snore
      // ds-ccm-type: typed out letter by letter over 1.6 s, twice.
      reveal = min(Int(t.truncatingRemainder(dividingBy: 1.6) / 1.6 * Double(Self.snore.count)) + 1, Self.snore.count)
    default:
      return nil
    }
    guard t < duration else { return nil }
    // ds-ccm-bubble: pops in to 1.1, settles, holds, and fades out at the end.
    let p = t / duration
    let scale: CGFloat = p < 0.08 ? 0.4 + 0.7 * CGFloat(p / 0.08) : p < 0.14 ? 1.1 - 0.1 * CGFloat((p - 0.08) / 0.06) : 1
    let opacity = p < 0.08 ? p / 0.08 : p > 0.88 ? max(0, 1 - (p - 0.88) / 0.12) : 1
    return BubbleFrame(text: text, reveal: reveal, width: text.count, scale: scale, opacity: opacity)
  }

  /// `cubic-bezier(.3, 0, .2, 1)`, near enough: a quick rise and a soft landing.
  private static func ease(_ x: Double) -> CGFloat {
    let x = min(max(x, 0), 1)
    return CGFloat(x < 0.5 ? 4 * x * x * x : 1 - pow(-2 * x + 2, 3) / 2)
  }

  private static func interpolate(_ keys: [(CGFloat, Transform)], at p: CGFloat) -> Transform {
    for i in 1..<keys.count where p <= keys[i].0 {
      let (p0, a) = keys[i - 1], (p1, b) = keys[i]
      let f = (p - p0) / (p1 - p0)
      return Transform(
        scaleX: a.scaleX + (b.scaleX - a.scaleX) * f,
        scaleY: a.scaleY + (b.scaleY - a.scaleY) * f,
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f
      )
    }
    return Transform()
  }

  private struct BodyMotion: ViewModifier {
    let transform: Transform
    let size: CGFloat

    func body(content: Content) -> some View {
      content
        .scaleEffect(x: transform.scaleX, y: transform.scaleY, anchor: .bottom)
        .offset(x: transform.x * size, y: transform.y * size)
    }
  }
}

/// The robot on its 16-unit grid, in Claude's coral: the body with its eyes cut out, its
/// four legs, and each arm at rest, raised, or (the right one) raised and held out.
private struct Robot: View {
  enum Arm { case rest, up, out }

  struct Pose: Equatable {
    var right: Arm
    var left: Arm
    /// How open the eyes are, 1 open, 0.15 shut.
    var eyes: CGFloat
  }

  let pose: Pose

  var body: some View {
    Canvas { context, size in
      let u = size.width / 16
      func rect(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> Path {
        Path(CGRect(x: x * u, y: y * u, width: w * u, height: h * u))
      }
      let coral = GraphicsContext.Shading.color(ClaudeCodeMascot.coral)
      context.drawLayer { layer in
        layer.fill(rect(2, 3.25, 12, 8), with: coral)
        for x in [3.0, 5, 10, 12] { layer.fill(rect(x, 11.25, 1, 2), with: coral) }
        // The eyes are holes, shut by squashing them about their middle.
        layer.blendMode = .destinationOut
        let eyeHeight = 1.9 * pose.eyes
        for x in [4.0, 11] {
          layer.fill(rect(x, 5.4 + (1.9 - eyeHeight) / 2, 1, eyeHeight), with: .color(.black))
        }
      }
      switch pose.left {
      case .rest:
        context.fill(rect(0, 7.25, 2, 2), with: coral)
      case .up, .out:
        context.fill(rect(0, 5.25, 2, 2), with: coral)
        context.fill(rect(0, 2.25, 1, 3), with: coral)
      }
      switch pose.right {
      case .rest:
        context.fill(rect(14, 7.25, 2, 2), with: coral)
      case .up:
        context.fill(rect(14, 5.25, 2, 2), with: coral)
        context.fill(rect(15, 2.25, 1, 3), with: coral)
      case .out:
        context.fill(rect(14, 5.25, 2, 2), with: coral)
        context.fill(rect(16, 3.25, 1, 2), with: coral)
      }
    }
  }
}

/// A pixel speech bubble with a two-pixel tail, its width reserved for the whole text so
/// a snore being typed does not grow it.
private struct Bubble: View {
  @Environment(\.theme) private var theme
  let text: String
  let reveal: Int
  let width: Int

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      ZStack(alignment: .leading) {
        Text(text).hidden()
        Text(String(text.prefix(reveal)))
      }
      .font(.system(size: 12, weight: .bold, design: .monospaced))
      .foregroundStyle(theme.ink)
      .fixedSize()
      .padding(.horizontal, 8)
      .padding(.vertical, 4)
      .background(theme.bgSecondary)
      .overlay(Rectangle().strokeBorder(ClaudeCodeMascot.coral, lineWidth: 2).padding(-2))
      .padding(2)
      VStack(alignment: .leading, spacing: 0) {
        Rectangle().fill(ClaudeCodeMascot.coral).frame(width: 4, height: 4).padding(.leading, 4)
        Rectangle().fill(ClaudeCodeMascot.coral).frame(width: 4, height: 4)
      }
    }
    .fixedSize()
  }
}
