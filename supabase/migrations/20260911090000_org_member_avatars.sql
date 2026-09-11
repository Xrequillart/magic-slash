-- Migration: a member sees their teammates' faces
--
-- 20260910090100 made the `avatars` bucket strictly own-folder, and that was right for
-- what existed then: the photo had exactly one reader, the person in it, on the Account
-- tab. The org members list now draws each member's face beside their email, so the
-- photo has as many readers as the org has members — and nothing in the current schema
-- lets one of them read another's, by design.
--
-- TWO things are missing, and they are missing for two different reasons.
--
--   1. WHICH members even have a photo. `profiles.avatar_url` holds that, and
--      `profiles_select` (20260724130000) is `user_id = auth.uid()` — own rows only.
--   2. The BYTES. `avatars_select` is own-folder only.
--
-- The first is NOT fixed by widening `profiles_select`. That policy guards one row per
-- user carrying `name`, `role`, `technical_level`, `communication_style`, `languages`
-- and `free_text` — the whole of what a person wrote about themselves for the skills to
-- read. Opening all of it org-wide to surface one nullable text column would be a
-- privacy change nobody asked for, dressed as a feature. `list_org_members` is already
-- the SECURITY DEFINER window through which a member learns about their co-members (it
-- exists because `auth.users.email` is likewise unreadable), and its `returns table` is
-- an allowlist. Adding one column to that allowlist widens exactly one column, to
-- exactly the callers that could already list the membership. So that is what happens
-- below, and `profiles_select` is left alone.
--
-- The second needs the storage policy widened, and it is widened NARROWLY — see the
-- asymmetry at `avatars_select`.

-- ---------------------------------------------------------------------------
-- shares_org_with: is that user a co-member of mine?
-- ---------------------------------------------------------------------------
-- The membership question the storage policy asks, in the established shape of
-- `is_org_member` / `is_org_member_of` (20260723090100): SECURITY DEFINER with a locked
-- search_path, because a policy that queried `memberships` directly would be filtered
-- by that table's own RLS, and `stable` so the planner may call it once per scan.
--
-- Archived orgs do not count, matching `is_org_member` since 20260723120000: archiving
-- removes an org from every read path, and a face is a read path.
--
-- IT TAKES text, NOT uuid, and that is the one surprising thing here. The caller is
-- `(storage.foldername(name))[1]` — the first path segment of a Storage key, which is a
-- uuid only by the convention the write policies enforce going forward. An object
-- predating that, or written by any route that is not this app, can be named anything;
-- `'not-a-uuid'::uuid` raises 22P02, and an exception inside a policy does not evaluate
-- to false, it aborts the statement. A bucket-wide `select` would then fail for
-- EVERYONE because one row has a malformed name. Comparing `user_id::text` instead is
-- total: a segment that is not a uuid simply matches no membership. `memberships` is
-- small and read constantly, so the cast on the indexed side costs nothing worth
-- naming next to that.
create or replace function public.shares_org_with(target_user text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1
    from public.memberships mine
    join public.memberships theirs on theirs.org_id = mine.org_id
    join public.organizations o on o.id = mine.org_id
    where mine.user_id = auth.uid()
      and theirs.user_id::text = target_user
      and o.archived_at is null
  );
$$;

-- Postgres grants EXECUTE to PUBLIC by default; revoke it so the definer function is
-- callable only by authenticated sessions, like its three siblings.
revoke execute on function public.shares_org_with(text) from public;
grant execute on function public.shares_org_with(text) to authenticated;

-- ---------------------------------------------------------------------------
-- avatars_select: own folder entirely, a co-member's blessed key and nothing else
-- ---------------------------------------------------------------------------
-- Only SELECT changes. `avatars_insert`, `avatars_update` and `avatars_delete` keep the
-- definitions 20260910090100 gave them: a face becomes readable by the team, never
-- writable or deletable by it.
--
-- The two branches are deliberately NOT symmetric, and re-read the note in
-- 20260910090100 for why the own-folder branch is a folder test: an object may exist
-- under some other name — written before the writes were pinned, or by any route that
-- is not the app — and such a stray must stay readable and above all DELETABLE by its
-- owner and by `delete_account()`.
--
-- A CO-MEMBER gets no such latitude. Their branch is pinned to the one blessed key,
-- `<uid>/avatar.webp`, because a teammate has business with the current avatar and with
-- nothing else that has ever been in that folder. If a stray does exist there, it is by
-- definition something the app did not put there and cannot describe; making it
-- org-readable would turn `avatars` into a small shared file drop keyed on a uuid
-- anyone in the org already knows. The name is rebuilt from the folder segment rather
-- than matched with a `like`, so no wildcard and no second segment can satisfy it.
--
-- The own-folder test stays FIRST and stays a plain string comparison, so the common
-- case — a user reading their own photo, which is still every read on the Account tab —
-- short-circuits before the definer function is ever called.
drop policy if exists avatars_select on storage.objects;
create policy avatars_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or (
        name = (storage.foldername(name))[1] || '/avatar.webp'
        and public.shares_org_with((storage.foldername(name))[1])
      )
    )
  );

-- ---------------------------------------------------------------------------
-- list_org_members: + avatar_url
-- ---------------------------------------------------------------------------
-- DROP then CREATE, not `create or replace`: changing a function's `returns table`
-- changes its return type, which `create or replace` refuses (42P13). The drop takes
-- the grants with it, so they are re-applied below — the pattern 20260826090000
-- established for the same reason.
--
-- `profiles` is LEFT joined, exactly as `admin_list_org_members` (20260729120000) does
-- and for the same reason: a membership can precede a profile row entirely (an invitee
-- who accepted but never opened the Profile tab), and an inner join would drop those
-- members from the roster instead of listing them with no photo. The column is the
-- Storage object PATH, never a URL — the bucket is private, so the client turns it into
-- bytes at read time under the policy above. NULL means no photo, which is what lets a
-- client skip the download entirely rather than discover the absence with a 404.
--
-- Everything else is unchanged from 20260723120000, verbatim: the auth guard, the
-- membership guard, the join to auth.users for the email, the ordering.
drop function if exists public.list_org_members(uuid);

create function public.list_org_members(p_org_id uuid)
returns table (
  user_id    uuid,
  email      text,
  role       public.membership_role,
  created_at timestamptz,
  avatar_url text
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then
    raise exception 'list_org_members requires an authenticated user';
  end if;

  if not public.is_org_member(p_org_id) then
    raise exception 'not a member of this organization';
  end if;

  return query
    select m.user_id, u.email::text, m.role, m.created_at, p.avatar_url
    from public.memberships m
    join auth.users u on u.id = m.user_id
    left join public.profiles p on p.user_id = m.user_id
    where m.org_id = p_org_id
    order by m.created_at asc;
end;
$$;

revoke execute on function public.list_org_members(uuid) from public;
grant execute on function public.list_org_members(uuid) to authenticated;
