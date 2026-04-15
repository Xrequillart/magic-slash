# Strategy Brief: Pattern resilience under Sidebar refactoring

## Current State
- **Score**: 4.3/10
- **Target**: 8.0/10
- **Status**: OK
- **Iteration**: 1

## Pattern — Why This Topic Is Low
Step 4.2 uses an exact className string match (`<span className="opacity-60">v`) that is tightly coupled to the current Sidebar.tsx markup, while Step 4.1 already demonstrates a hardened regex approach for SKILL.md files. The inconsistency shows the Sidebar pattern was never upgraded during the v0.30.3 hardening pass.

## North Star — What 9-10/10 Looks Like
The skill uses a version-regex pattern (e.g., `v[0-9]+\.[0-9]+\.[0-9]+`) in the footer section of Sidebar.tsx with surrounding-context anchoring or a semantic marker, plus a fallback cascade if the primary pattern fails, and asks the user for help as a last resort via AskUserQuestion.

## Cross-Examiner's Recommended Strategy
1. Replace the exact className match with a regex-based search: look for `v[0-9]+\.[0-9]+\.[0-9]+` within the footer section of Sidebar.tsx (anchor using the `{/* Footer */}` comment or surrounding `Docs`/`Changelog` links).
2. Add a fallback cascade: try primary pattern, then broader regex, then AskUserQuestion to let the user point to the version location if all patterns fail.
3. Add a semantic anchor in Sidebar.tsx (e.g., a `{/* version-display */}` comment or `data-version` attribute) as a stable reference point for the skill.

## Key Issues

### Confirmed
- Exact className string match breaks on any class change | ROOT CAUSE: Pattern tied to exact Tailwind class list. | FIX: Replace with regex `v[0-9]+\.[0-9]+\.[0-9]+` scoped to footer.
- No fallback patterns or multi-pattern cascade | ROOT CAUSE: Single pattern with no alternatives. | FIX: Implement cascade: className -> regex -> AskUserQuestion.
- Inconsistent approach vs Step 4.1 which was already hardened | ROOT CAUSE: v0.30.3 hardening pass missed Step 4.2. | FIX: Apply same regex-first pattern philosophy.

### New (found by cross-examination)
None

## User Context (from situational questioning)
- Pattern has never broken in practice — this is preventive hardening, not fixing a live issue.
- Lower priority than T1 and T2 which address daily pain points.
- Signal: keep changes lightweight, focus on resilience without over-engineering.

## Refined Strategy (from Phase 2)
1. Replace the exact className match (`<span className="opacity-60">v`) with a regex-based search: look for `v[0-9]+\.[0-9]+\.[0-9]+` in Sidebar.tsx, using the footer context (surrounding links to Docs/Changelog) to disambiguate.
2. Add a lightweight fallback: if the primary regex doesn't match, warn the user and use AskUserQuestion to ask for the correct location, rather than silently continuing.
3. Add the Sidebar.tsx verification to the Step 7.1 verification script (it's already there but could be strengthened with the regex approach). Skip the "semantic anchor" approach — it would require modifying Sidebar.tsx which is outside the skill's scope.

## Confirmation Status
Confirmed — "C'est bon" — proceeding with refined strategy as-is.
