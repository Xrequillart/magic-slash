-- Migration: team repositories are admin-writable only
--
-- Until now a team repo was collaboratively editable: `repositories_update`
-- accepted any member of the owning org. A repo's settings (name, commit
-- format, branches, languages…) drive what every member's agents do, so a
-- single member could change how the whole team commits. Editing is now a
-- privilege of the org's admins.
--
-- The creator keeps their rights: `owner_id = auth.uid()` stays in the policy,
-- so someone who created a repo and shared it to an org still administers it
-- even as a plain member. That mirrors the DELETE policy, which already read
-- "owner or org admin" — only UPDATE was looser, and this closes the gap.
--
-- Personal repos (org_id null) are unaffected: their owner is the only one who
-- can see them at all.
--
-- Local paths are untouched. `repository_paths` is own-rows-only for every
-- verb, so every member — admin or not — keeps binding their own local folder
-- on their own machine, which is exactly what the read-only repository page in
-- the desktop app still lets a non-admin do.

drop policy if exists repositories_update on public.repositories;

create policy repositories_update on public.repositories
  for update to authenticated
  using (
    owner_id = auth.uid()
    or (org_id is not null and public.is_org_admin(org_id))
  )
  with check (
    -- The row must still be one you may write *after* the change. Unsharing
    -- (org_id → null) stays open to the admin who could edit it: the repo
    -- reverts to its owner, the same escape hatch the previous policy allowed.
    -- What this forbids is pushing someone else's repo into an org where you
    -- are a plain member — you would be handing it to people who can't edit it.
    (owner_id = auth.uid() or org_id is null or public.is_org_admin(org_id))
    -- Sharing still targets one of your own orgs (unchanged).
    and (org_id is null or public.is_org_member(org_id))
  );
