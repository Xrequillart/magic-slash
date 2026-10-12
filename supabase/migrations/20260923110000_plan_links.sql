-- External links on a /magic:plan session: the Figma file, the Notion page, the Claude
-- artifact the plan is about — the prototypes, mock-ups and notes that live somewhere else.
--
-- A TABLE OF THEIR OWN, NOT A SECTION OF THE SPEC. The spec is the agent's document and is
-- rewritten wholesale by the next upload; a link a colleague pinned to the plan must
-- survive that, be added and removed by people who never touch the markdown, and be
-- listed beside the tickets rather than wherever it happened to be written. So it is data,
-- read and written like `plan_comments`, and the spec never mentions it.
--
-- WHO MAY DO WHAT follows `plan_comments`, which settled the same question one table over:
--   · read  — whoever can read the session (its owner, or a member of its organization);
--   · add   — the same people, under their own name only;
--   · remove — whoever added it, the plan's owner, or an admin of its organization.
-- There is no update: a link is its address, and changing the address is removing one
-- link and adding another.

create table if not exists public.plan_links (
  id uuid primary key default gen_random_uuid(),
  -- on delete cascade: a link has no meaning without the plan it is pinned to.
  session_id uuid not null references public.plan_sessions (id) on delete cascade,
  -- on delete cascade: an account being deleted takes what it added with it, the shape
  -- `plan_comments.author_id` has.
  author_id uuid not null references auth.users (id) on delete cascade,
  url text not null,
  -- The tool the link opens — `figma`, `figjam`, `notion`, `claude_artifact`, … — chosen by
  -- the reader or detected from the address. FREE TEXT behind a length cap, the way
  -- `plan_sessions.status` is: a kind this migration has not heard of is added by the app,
  -- not by the next migration, and a reader that does not know one draws a plain link.
  kind text not null default 'other',
  -- What the reader called it, when they did. NULL draws the address itself.
  title text,
  created_at timestamptz not null default now(),
  constraint plan_links_url_http check (url ~* '^https?://[^\s]+$' and char_length(url) <= 2048),
  constraint plan_links_kind_length check (char_length(kind) between 1 and 32),
  constraint plan_links_title_length check (title is null or char_length(title) <= 200)
);

comment on table public.plan_links is
  'External links pinned to a /magic:plan session — prototypes, mock-ups, notes in Figma, '
  'Notion, a Claude artifact. Kept apart from the spec, which the agent rewrites. Readable '
  'by whoever can read the session; added by the same people under their own name; removed '
  'by whoever added it, the plan''s owner or an org admin.';

comment on column public.plan_links.url is
  'http(s) only. The CHECK is what stands between a javascript: address and the page that '
  'draws the link as an anchor; the app refuses it too, but the table is the last word.';

create index if not exists idx_plan_links_session_id on public.plan_links (session_id);

alter table public.plan_links enable row level security;

grant select, insert, delete on public.plan_links to authenticated;

create policy plan_links_select on public.plan_links
  for select to authenticated
  using (
    exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_member(s.org_id)))
    )
  );

create policy plan_links_insert on public.plan_links
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_member(s.org_id)))
    )
  );

create policy plan_links_delete on public.plan_links
  for delete to authenticated
  using (
    author_id = auth.uid()
    or exists (
      select 1 from public.plan_sessions s
      where s.id = session_id
        and (s.owner_id = auth.uid() or (s.org_id is not null and public.is_org_admin(s.org_id)))
    )
  );
