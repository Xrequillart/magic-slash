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
