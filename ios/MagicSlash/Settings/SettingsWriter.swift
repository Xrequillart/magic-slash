import Foundation
import Supabase

/// The only code in the app that writes to `user_settings`.
///
/// Each write is a partial upsert of one column: the user id and that column, nothing
/// else. The column is an `EditableSetting`, generated from the desktop's classification,
/// so a sensitive column (launch mode, default model, workflows…) cannot be named here at
/// all. The RLS lets the user write their whole row: this type, and the scan in
/// ios/settings/settingsWrites.test.ts, are what keep the iPhone to its share of it.
enum SettingsWriter {
  /// Upserts `value` into `column` of the user's row, creating the row if the user never
  /// changed anything on the desktop. The other columns are left as they are.
  static func write(
    _ column: EditableSetting,
    _ value: AnyJSON,
    client: SupabaseClient,
    userId: UUID
  ) async throws {
    let row: JSONObject = [
      "user_id": .string(userId.uuidString.lowercased()),
      column.rawValue: value,
    ]
    try await client
      .from("user_settings")
      .upsert(row, onConflict: "user_id")
      .execute()
  }
}
