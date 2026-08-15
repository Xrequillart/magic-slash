-- Migration: usage_events model identity and context window
--
-- The session snapshot only kept the model's display name ("Opus 4.8"), which is
-- a label that Anthropic can reword between releases and that nothing can be
-- grouped on reliably. model_id stores the stable id from the statusLine payload
-- (model.id, e.g. claude-opus-4-8) next to it; model stays the display name,
-- unchanged, because that is what the UI shows.
--
-- context_window_size was already parsed by the client and then thrown away.
-- It is persisted here even though tokens stays null on purpose: tokens would be
-- a cumulative session counter, and all the client has is a point-in-time context
-- gauge that must not be passed off as one. context_window_size is not a counter
-- at all — it is a capacity of the model that was in use, a constant for a given
-- model, so recording it says nothing false about the session.
--
-- model_ids is the ordered set of every model.id seen during the session, in
-- order of first appearance. A /model mid-session makes the single-model columns
-- an approximation, and the row has to be able to say so itself:
-- array_length(model_ids, 1) > 1 marks a snapshot whose cost cannot be attributed
-- to one model. NULL means no model id was ever reported (an older client, or a
-- session that never got a statusLine).

alter table public.usage_events
  add column if not exists model_id text,
  add column if not exists context_window_size integer,
  add column if not exists model_ids text[];

comment on column public.usage_events.model is
  'Display name of the model in use at SESSION END (e.g. "Opus 4.8"), not the model of the whole session — see model_ids.';

comment on column public.usage_events.model_id is
  'Stable id of the model in use at SESSION END (statusLine model.id, e.g. "claude-opus-4-8"). Group on this, not on model.';

comment on column public.usage_events.context_window_size is
  'Context window of the model in use at SESSION END, in tokens. A model capacity, not a cumulative counter — which is why it is recorded while tokens stays null.';

comment on column public.usage_events.model_ids is
  'Every model.id seen during the session, ordered by first appearance. array_length(model_ids, 1) > 1 = a /model switch mid-session, so model/model_id/context_window_size describe only the last one.';
