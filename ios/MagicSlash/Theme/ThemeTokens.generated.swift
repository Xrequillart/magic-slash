// GENERATED from desktop/src/themes.ts by `npm run ios:theme`. Do not hand-edit.
// `npm test` fails when this file no longer matches the desktop registry.

import SwiftUI

enum ThemeID: String, CaseIterable, Sendable {
  case dark
  case midnight
  case espresso
  case highContrast = "high-contrast"
  case light
  case mist
  case sepia
  case daylight

  static let fallback: ThemeID = .dark

  /// The theme the desktop stored, or the fallback when it is missing or unknown.
  init(raw: String?) {
    self = raw.flatMap(ThemeID.init(rawValue:)) ?? .fallback
  }
}

struct ThemeTokens: Sendable {
  let isDark: Bool
  let bg: Color
  let bgSecondary: Color
  let bgTertiary: Color
  let ink: Color
  let textSecondary: Color
  let onBrand: Color
  let icon: Color
  let iconMuted: Color
  let surfaceSubtle: Color
  let surface: Color
  let surfaceStrong: Color
  let surfaceSunken: Color
  let surfaceSunkenSoft: Color
  let plateLift: Double
  let lineSubtle: Color
  let lineField: Color
  let line: Color
  let lineStrong: Color
  let border: Color
  let accent: Color
  let accentHover: Color
  let purple: Color
  let green: Color
  let red: Color
  let yellow: Color
  let blue: Color
  let orange: Color
  let cyan: Color
  let teal: Color

  static func tokens(for id: ThemeID) -> ThemeTokens {
    switch id {
    case .dark: return dark
    case .midnight: return midnight
    case .espresso: return espresso
    case .highContrast: return highContrast
    case .light: return light
    case .mist: return mist
    case .sepia: return sepia
    case .daylight: return daylight
    }
  }

  private static func rgb(_ red: Double, _ green: Double, _ blue: Double, _ opacity: Double = 1) -> Color {
    Color(.sRGB, red: red / 255, green: green / 255, blue: blue / 255, opacity: opacity)
  }

  private static let dark = ThemeTokens(
    isDark: true,
    bg: rgb(11, 12, 14),
    bgSecondary: rgb(21, 22, 25),
    bgTertiary: rgb(29, 31, 35),
    ink: rgb(255, 255, 255),
    textSecondary: rgb(160, 164, 174),
    onBrand: rgb(255, 255, 255),
    icon: rgb(137, 141, 151),
    iconMuted: rgb(100, 104, 113),
    surfaceSubtle: rgb(255, 255, 255, 0.04),
    surface: rgb(255, 255, 255, 0.06),
    surfaceStrong: rgb(255, 255, 255, 0.1),
    surfaceSunken: rgb(0, 0, 0, 0.3),
    surfaceSunkenSoft: rgb(0, 0, 0, 0.2),
    plateLift: 0.09,
    lineSubtle: rgb(255, 255, 255, 0.05),
    lineField: rgb(255, 255, 255, 0.08),
    line: rgb(255, 255, 255, 0.1),
    lineStrong: rgb(255, 255, 255, 0.15),
    border: rgb(40, 42, 47),
    accent: rgb(0, 122, 252),
    accentHover: rgb(51, 149, 253),
    purple: rgb(168, 85, 247),
    green: rgb(34, 197, 94),
    red: rgb(239, 68, 68),
    yellow: rgb(234, 179, 8),
    blue: rgb(59, 130, 246),
    orange: rgb(249, 115, 22),
    cyan: rgb(34, 211, 238),
    teal: rgb(45, 212, 191)
  )

  private static let midnight = ThemeTokens(
    isDark: true,
    bg: rgb(7, 16, 31),
    bgSecondary: rgb(12, 24, 45),
    bgTertiary: rgb(18, 33, 59),
    ink: rgb(234, 242, 252),
    textSecondary: rgb(142, 162, 192),
    onBrand: rgb(255, 255, 255),
    icon: rgb(122, 141, 170),
    iconMuted: rgb(88, 106, 134),
    surfaceSubtle: rgb(255, 255, 255, 0.045),
    surface: rgb(255, 255, 255, 0.07),
    surfaceStrong: rgb(255, 255, 255, 0.12),
    surfaceSunken: rgb(2, 7, 18, 0.35),
    surfaceSunkenSoft: rgb(2, 7, 18, 0.22),
    plateLift: 0.04,
    lineSubtle: rgb(255, 255, 255, 0.06),
    lineField: rgb(255, 255, 255, 0.09),
    line: rgb(255, 255, 255, 0.12),
    lineStrong: rgb(255, 255, 255, 0.17),
    border: rgb(33, 51, 82),
    accent: rgb(0, 122, 252),
    accentHover: rgb(51, 149, 253),
    purple: rgb(192, 132, 252),
    green: rgb(52, 211, 153),
    red: rgb(248, 113, 113),
    yellow: rgb(250, 204, 21),
    blue: rgb(96, 165, 250),
    orange: rgb(251, 146, 60),
    cyan: rgb(34, 211, 238),
    teal: rgb(45, 212, 191)
  )

  private static let espresso = ThemeTokens(
    isDark: true,
    bg: rgb(32, 33, 36),
    bgSecondary: rgb(41, 42, 46),
    bgTertiary: rgb(50, 52, 57),
    ink: rgb(238, 239, 242),
    textSecondary: rgb(172, 175, 183),
    onBrand: rgb(255, 255, 255),
    icon: rgb(148, 151, 159),
    iconMuted: rgb(112, 115, 123),
    surfaceSubtle: rgb(255, 255, 255, 0.045),
    surface: rgb(255, 255, 255, 0.07),
    surfaceStrong: rgb(255, 255, 255, 0.12),
    surfaceSunken: rgb(18, 19, 21, 0.35),
    surfaceSunkenSoft: rgb(18, 19, 21, 0.22),
    plateLift: 0.09,
    lineSubtle: rgb(255, 255, 255, 0.06),
    lineField: rgb(255, 255, 255, 0.09),
    line: rgb(255, 255, 255, 0.12),
    lineStrong: rgb(255, 255, 255, 0.17),
    border: rgb(63, 65, 71),
    accent: rgb(0, 122, 252),
    accentHover: rgb(51, 149, 253),
    purple: rgb(192, 132, 252),
    green: rgb(52, 211, 153),
    red: rgb(248, 113, 113),
    yellow: rgb(250, 204, 21),
    blue: rgb(96, 165, 250),
    orange: rgb(251, 146, 60),
    cyan: rgb(34, 211, 238),
    teal: rgb(45, 212, 191)
  )

  private static let highContrast = ThemeTokens(
    isDark: true,
    bg: rgb(0, 0, 0),
    bgSecondary: rgb(0, 0, 0),
    bgTertiary: rgb(18, 18, 18),
    ink: rgb(255, 255, 255),
    textSecondary: rgb(224, 224, 224),
    onBrand: rgb(0, 0, 0),
    icon: rgb(224, 224, 224),
    iconMuted: rgb(176, 176, 176),
    surfaceSubtle: rgb(255, 255, 255, 0.08),
    surface: rgb(255, 255, 255, 0.12),
    surfaceStrong: rgb(255, 255, 255, 0.2),
    surfaceSunken: rgb(0, 0, 0, 0.6),
    surfaceSunkenSoft: rgb(0, 0, 0, 0.45),
    plateLift: 0.09,
    lineSubtle: rgb(255, 255, 255, 0.35),
    lineField: rgb(255, 255, 255, 0.55),
    line: rgb(255, 255, 255, 0.65),
    lineStrong: rgb(255, 255, 255, 0.85),
    border: rgb(212, 212, 216),
    accent: rgb(77, 163, 255),
    accentHover: rgb(133, 192, 255),
    purple: rgb(216, 180, 254),
    green: rgb(74, 222, 128),
    red: rgb(255, 123, 123),
    yellow: rgb(253, 224, 71),
    blue: rgb(125, 179, 255),
    orange: rgb(253, 168, 94),
    cyan: rgb(103, 232, 249),
    teal: rgb(94, 234, 212)
  )

  private static let light = ThemeTokens(
    isDark: false,
    bg: rgb(255, 255, 255),
    bgSecondary: rgb(250, 250, 249),
    bgTertiary: rgb(244, 244, 245),
    ink: rgb(24, 24, 27),
    textSecondary: rgb(82, 82, 91),
    onBrand: rgb(255, 255, 255),
    icon: rgb(108, 108, 116),
    iconMuted: rgb(151, 151, 157),
    surfaceSubtle: rgb(0, 0, 0, 0.03),
    surface: rgb(0, 0, 0, 0.045),
    surfaceStrong: rgb(0, 0, 0, 0.08),
    surfaceSunken: rgb(0, 0, 0, 0.05),
    surfaceSunkenSoft: rgb(0, 0, 0, 0.035),
    plateLift: 0.09,
    lineSubtle: rgb(0, 0, 0, 0.07),
    lineField: rgb(0, 0, 0, 0.12),
    line: rgb(0, 0, 0, 0.14),
    lineStrong: rgb(0, 0, 0, 0.2),
    border: rgb(228, 228, 231),
    accent: rgb(0, 122, 252),
    accentHover: rgb(0, 104, 214),
    purple: rgb(147, 51, 234),
    green: rgb(21, 128, 61),
    red: rgb(220, 38, 38),
    yellow: rgb(161, 98, 7),
    blue: rgb(37, 99, 235),
    orange: rgb(194, 65, 12),
    cyan: rgb(12, 99, 121),
    teal: rgb(14, 102, 96)
  )

  private static let mist = ThemeTokens(
    isDark: false,
    bg: rgb(238, 246, 255),
    bgSecondary: rgb(246, 250, 255),
    bgTertiary: rgb(228, 239, 252),
    ink: rgb(12, 27, 48),
    textSecondary: rgb(64, 86, 116),
    onBrand: rgb(255, 255, 255),
    icon: rgb(92, 112, 140),
    iconMuted: rgb(138, 155, 178),
    surfaceSubtle: rgb(12, 40, 80, 0.035),
    surface: rgb(12, 40, 80, 0.05),
    surfaceStrong: rgb(12, 40, 80, 0.09),
    surfaceSunken: rgb(12, 40, 80, 0.055),
    surfaceSunkenSoft: rgb(12, 40, 80, 0.04),
    plateLift: 0.09,
    lineSubtle: rgb(12, 40, 80, 0.08),
    lineField: rgb(12, 40, 80, 0.13),
    line: rgb(12, 40, 80, 0.15),
    lineStrong: rgb(12, 40, 80, 0.21),
    border: rgb(196, 216, 240),
    accent: rgb(0, 122, 252),
    accentHover: rgb(0, 104, 214),
    purple: rgb(126, 34, 206),
    green: rgb(21, 128, 61),
    red: rgb(220, 38, 38),
    yellow: rgb(161, 98, 7),
    blue: rgb(29, 78, 216),
    orange: rgb(194, 65, 12),
    cyan: rgb(21, 94, 117),
    teal: rgb(17, 94, 89)
  )

  private static let sepia = ThemeTokens(
    isDark: false,
    bg: rgb(250, 246, 238),
    bgSecondary: rgb(246, 240, 229),
    bgTertiary: rgb(240, 232, 217),
    ink: rgb(43, 35, 26),
    textSecondary: rgb(109, 94, 76),
    onBrand: rgb(255, 255, 255),
    icon: rgb(130, 117, 100),
    iconMuted: rgb(165, 155, 141),
    surfaceSubtle: rgb(74, 54, 28, 0.035),
    surface: rgb(74, 54, 28, 0.05),
    surfaceStrong: rgb(74, 54, 28, 0.09),
    surfaceSunken: rgb(74, 54, 28, 0.055),
    surfaceSunkenSoft: rgb(74, 54, 28, 0.04),
    plateLift: 0.09,
    lineSubtle: rgb(74, 54, 28, 0.09),
    lineField: rgb(74, 54, 28, 0.14),
    line: rgb(74, 54, 28, 0.16),
    lineStrong: rgb(74, 54, 28, 0.22),
    border: rgb(226, 214, 195),
    accent: rgb(0, 122, 252),
    accentHover: rgb(0, 104, 214),
    purple: rgb(126, 34, 206),
    green: rgb(21, 115, 71),
    red: rgb(185, 28, 28),
    yellow: rgb(146, 64, 14),
    blue: rgb(29, 78, 216),
    orange: rgb(154, 52, 18),
    cyan: rgb(21, 94, 117),
    teal: rgb(17, 94, 89)
  )

  private static let daylight = ThemeTokens(
    isDark: false,
    bg: rgb(255, 255, 255),
    bgSecondary: rgb(255, 255, 255),
    bgTertiary: rgb(245, 245, 245),
    ink: rgb(0, 0, 0),
    textSecondary: rgb(38, 38, 38),
    onBrand: rgb(255, 255, 255),
    icon: rgb(71, 71, 71),
    iconMuted: rgb(125, 125, 125),
    surfaceSubtle: rgb(0, 0, 0, 0.06),
    surface: rgb(0, 0, 0, 0.09),
    surfaceStrong: rgb(0, 0, 0, 0.14),
    surfaceSunken: rgb(0, 0, 0, 0.07),
    surfaceSunkenSoft: rgb(0, 0, 0, 0.05),
    plateLift: 0.09,
    lineSubtle: rgb(0, 0, 0, 0.45),
    lineField: rgb(0, 0, 0, 0.6),
    line: rgb(0, 0, 0, 0.7),
    lineStrong: rgb(0, 0, 0, 0.85),
    border: rgb(82, 82, 82),
    accent: rgb(0, 88, 184),
    accentHover: rgb(0, 65, 138),
    purple: rgb(88, 28, 135),
    green: rgb(20, 83, 45),
    red: rgb(153, 27, 27),
    yellow: rgb(113, 63, 18),
    blue: rgb(30, 58, 138),
    orange: rgb(124, 45, 18),
    cyan: rgb(22, 78, 99),
    teal: rgb(19, 78, 74)
  )
}
