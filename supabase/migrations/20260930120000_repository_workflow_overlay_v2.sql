-- Migration: a repository's workflow overlay becomes a graph (version 2)
--
-- The workflow editor now draws the flow on a free canvas: cards are dragged anywhere and
-- linked to one another, and a custom step may be linked to nothing yet. The overlay the
-- app stores (desktop/src/workflow/overlay.ts) grows accordingly:
--
--   { "version": 2,
--     "steps": [{ "skill", "mode": "blocking"|"advisory" }],
--     "links": [{ "from", "to", "kind": "auto"|"suggest", "outcome"? }],
--     "kinds": { "<from>><to>": "auto"|"suggest" },
--     "positions": { "<node id>": { "x", "y" } } }
--
-- `kinds` now only overrides the kind of a DEFAULT link; the links an admin draws carry their
-- own. The built-in steps and their default links are still never stored, so no write can
-- remove one.
--
-- VERSION 1 STAYS ACCEPTED. Rows saved before this migration are v1, and the app reads them
-- and upgrades them in memory; the first save from the editor rewrites them as v2. An older
-- app that still writes v1 keeps working too. What an older app does with a v2 row is what
-- it does with any row it does not understand: it serves the default flow, with a warning.
--
-- THE SAME ENVELOPE-ONLY CHECK as 20260930090000, for the same reasons (the app is the one
-- judge of what is inside), and NOT VALID for the same reason: it guards writes from now on
-- and leaves any hand-written row alone. `coalesce(…, false)` because a CHECK that
-- evaluates to NULL passes.

alter table public.repository_workflows
  drop constraint if exists repository_workflows_definition_overlay;
alter table public.repository_workflows
  add constraint repository_workflows_definition_overlay check (
    coalesce(
      jsonb_typeof(definition) = 'object'
      and jsonb_typeof(definition->'steps') = 'array'
      and jsonb_typeof(definition->'kinds') = 'object'
      and (
        definition->'version' = '1'::jsonb
        or (
          definition->'version' = '2'::jsonb
          and jsonb_typeof(definition->'links') = 'array'
          and jsonb_typeof(definition->'positions') = 'object'
        )
      ),
      false
    )
  ) not valid;

comment on table public.repository_workflows is
  'The workflow overlay of a repository: the custom steps, links, link kinds and card '
  'positions its owner or an org admin added to the default flow the magic skills follow. '
  'Built-in steps and default links are never stored. No row = the default flow. Readable '
  'by whoever can see the repository; writable by its owner or an admin of its org.';
