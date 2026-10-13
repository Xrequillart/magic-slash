import SwiftUI

/// Lucide's `message-circle-text`, drawn rather than loaded: the asset catalog's SVG
/// renderer drops the outline's arcs. Same 24-unit grid as the original, stroked at 2.
struct SessionGlyph: Shape {
  func path(in rect: CGRect) -> Path {
    var path = Path()
    // The bubble: most of a circle (radius 10 around the centre), and a tail at the
    // bottom left.
    path.move(to: CGPoint(x: 3.086, y: 17.509))
    path.addLine(to: CGPoint(x: 2.992, y: 16.342))
    path.addArc(
      center: CGPoint(x: 12, y: 12), radius: 10,
      startAngle: .radians(atan2(4.342, -9.008)), endAngle: .radians(atan2(9.061, -4.231)),
      clockwise: false
    )
    path.addLine(to: CGPoint(x: 6.670, y: 20.969))
    path.addLine(to: CGPoint(x: 3.257, y: 21.967))
    path.addQuadCurve(to: CGPoint(x: 2.021, y: 20.799), control: CGPoint(x: 1.85, y: 22.35))
    path.closeSubpath()
    // The three lines of text.
    for (y, length) in [(8.0, 7.0), (12.0, 9.0), (16.0, 5.0)] {
      path.move(to: CGPoint(x: 8, y: y))
      path.addLine(to: CGPoint(x: 8 + length, y: y))
    }
    let scale = min(rect.width, rect.height) / 24
    return path
      .applying(CGAffineTransform(scaleX: scale, y: scale))
      .strokedPath(StrokeStyle(lineWidth: 2 * scale, lineCap: .round, lineJoin: .round))
      .offsetBy(dx: rect.minX, dy: rect.minY)
  }
}

/// A session's mark in the list: where its agent stands on the paired Mac, as the desktop's
/// sidebar shows it (`StateGlyph` in design-system/desktop/Agent.tsx). The chat mark when it
/// is idle, or when no online Mac reports it: a last known state would claim work that may
/// have stopped.
struct SessionStateMark: View {
  @Environment(\.theme) private var theme
  /// `TerminalState`, nil when no online Mac reports the agent.
  let state: String?

  var body: some View {
    Group {
      switch state {
      case "working":
        WaveLoader(size: 20).foregroundStyle(theme.accent)
      case "waiting":
        Image(systemName: "questionmark.bubble")
          .font(.system(size: 17, weight: .medium))
          .foregroundStyle(theme.orange)
      case "completed":
        Image(systemName: "checkmark")
          .font(.system(size: 16, weight: .semibold))
          .foregroundStyle(theme.green)
      case "error":
        Image(systemName: "xmark.circle")
          .font(.system(size: 17, weight: .medium))
          .foregroundStyle(theme.red)
      default:
        SessionGlyph().fill(theme.ink)
      }
    }
    .frame(width: 20, height: 20)
    .accessibilityLabel(state.map(RuntimeStyle.label) ?? "Session")
  }
}

/// The desktop's `Loader` wave (design-system/desktop/Loader.tsx): three bars in the
/// current colour, the middle one tallest, each scaling on a 1.2 s ease-in-out loop 0.15 s
/// after the one before. Every measure is the desktop's fraction of the box. Still under
/// Reduce Motion: three bars at rest.
struct WaveLoader: View {
  @Environment(\.accessibilityReduceMotion) private var reduceMotion
  var size: CGFloat = 16

  var body: some View {
    if reduceMotion {
      bars(at: nil)
    } else {
      TimelineView(.animation) { context in
        bars(at: context.date.timeIntervalSinceReferenceDate)
      }
    }
  }

  private func bars(at time: TimeInterval?) -> some View {
    HStack(spacing: size * 0.125) {
      ForEach(0..<3, id: \.self) { index in
        RoundedRectangle(cornerRadius: size * 0.0625)
          .frame(width: size * 0.125, height: size * (index == 1 ? 0.8125 : 0.375))
          .scaleEffect(x: 1, y: time.map { Self.scale(at: $0 - Double(index) * 0.15) } ?? 1)
      }
    }
    .frame(width: size, height: size)
  }

  /// `ds-loader-wave`'s keyframes: 1 at 0 and 100%, 0.55 at 35%, 1.1 at 70%, eased.
  private static func scale(at time: TimeInterval) -> CGFloat {
    let t = (time / 1.2).truncatingRemainder(dividingBy: 1)
    let p = t < 0 ? t + 1 : t
    let stops: [(CGFloat, CGFloat)] = [(0, 1), (0.35, 0.55), (0.7, 1.1), (1, 1)]
    for i in 1..<stops.count where CGFloat(p) <= stops[i].0 {
      let (t0, v0) = stops[i - 1], (t1, v1) = stops[i]
      let local = (CGFloat(p) - t0) / (t1 - t0)
      let eased = local < 0.5 ? 2 * local * local : 1 - pow(-2 * local + 2, 2) / 2
      return v0 + (v1 - v0) * eased
    }
    return 1
  }
}
