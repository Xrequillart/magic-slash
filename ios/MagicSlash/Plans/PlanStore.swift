import Foundation
import Observation
import Supabase

/// The plan an agent works from, read from `plan_sessions`.
///
/// Every outcome is a state of its own so the spec section never spins forever: a
/// planner that has not saved a spec yet is `.none`, a spec too large for the desktop
/// to sync is `.oversize`, and any error (RLS included) is `.unavailable`.
@MainActor
@Observable
final class PlanStore {
  struct Plan: Equatable, Sendable {
    let id: String
    let number: Int?
    let title: String?
    let status: String?
    let spec: String?
  }

  enum State: Equatable {
    case loading
    case loaded(Plan)
    case none
    case oversize(Plan)
    case unavailable
  }

  private(set) var state: State = .loading

  @ObservationIgnored private let client: SupabaseClient

  init(client: SupabaseClient) {
    self.client = client
  }

  /// Loads the plan, then reloads it whenever its row changes, until the calling task is
  /// cancelled (the screen goes away, or the agent's link to its plan changes).
  func watch(_ agent: Agent) async {
    await load(for: agent)
    guard !Task.isCancelled, let planId = currentPlanId else { return }

    let channel = client.channel("ios-plan-\(planId)")
    let changes = channel.postgresChange(
      UpdateAction.self,
      table: "plan_sessions",
      filter: RealtimePostgresFilter.eq("id", value: planId)
    )
    try? await channel.subscribeWithError()
    for await _ in changes {
      await load(for: agent)
    }
    await client.removeChannel(channel)
  }

  private var currentPlanId: String? {
    switch state {
    case .loaded(let plan), .oversize(let plan): plan.id
    case .loading, .none, .unavailable: nil
    }
  }

  func load(for agent: Agent) async {
    // A coder with no linked plan has no spec to look up.
    guard agent.planId != nil || agent.type == .planner else {
      state = .none
      return
    }

    do {
      var query = client
        .from("plan_sessions")
        .select("id, number, title, status, spec, spec_oversize")
      if let planId = agent.planId {
        query = query.eq("id", value: planId)
      } else {
        query = query.eq("agent_id", value: agent.id)
      }
      let rows: [AnyJSON] = try await query.limit(1).execute().value

      guard let row = rows.first?.objectValue, let id = row["id"]?.stringValue else {
        state = .none
        return
      }
      let plan = Plan(
        id: id,
        number: row["number"]?.number.map { Int($0) },
        title: row["title"]?.stringValue.nonEmpty,
        status: row["status"]?.stringValue.nonEmpty,
        spec: row["spec"]?.stringValue.nonEmpty
      )
      state = row["spec_oversize"]?.boolValue == true ? .oversize(plan) : .loaded(plan)
    } catch {
      state = .unavailable
    }
  }
}
