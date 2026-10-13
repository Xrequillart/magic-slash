import SwiftUI

/// Label and tone of a runtime state, after `stateLabel` in
/// desktop/src/renderer/pages/TrayPopover/index.tsx (`agentState.*` in desktop/src/i18n/en.ts).
enum RuntimeStyle {
  static func label(_ state: String) -> String {
    switch state {
    case "working": String(localized: "Working")
    case "waiting": String(localized: "Waiting for input")
    case "idle": String(localized: "Idle")
    case "completed": String(localized: "Completed")
    case "error": String(localized: "Error")
    // A state this build does not know still shows, as sent.
    default: state
    }
  }

  static func tone(_ state: String) -> StatusTone {
    switch state {
    case "working": .yellow
    case "waiting": .orange
    case "completed": .green
    case "error": .red
    default: .neutral
    }
  }
}

