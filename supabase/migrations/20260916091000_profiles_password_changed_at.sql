-- Migration: profiles.password_changed_at — when the password was last changed
--
-- WHY THIS IS A COLUMN AND NOT A READ OF auth.users
-- ---------------------------------------------------------------------------
-- The account card wants to say, under the password line, when it last changed. GoTrue
-- does not record that. `auth.users` carries `encrypted_password` and no companion
-- timestamp, and the three columns that look like one are each about something else:
--
--   * `updated_at` moves on EVERY user update. The card one line above offers an email
--     change, so reading it here would announce "password changed today" to somebody who
--     changed their address. Wrong, and wrong in the direction that matters: a security
--     fact that reassures when it should not.
--   * `recovery_sent_at` is when a reset EMAIL was sent. A mail nobody clicked sets it.
--   * `last_sign_in_at` is a sign-in, with whatever password was already in place.
--
-- So the app records it, and this is where. The write happens wherever a password
-- actually changes — see `desktop/src/main/cloud/password-stamp.ts`, which is the one
-- spelling all three call sites share.
--
-- WHAT NULL MEANS, and it is the honest half of this feature: no change has been
-- RECORDED. That is not the same claim as "the password has never changed" — every row
-- existing when this migration runs is NULL, including accounts whose owner changed
-- their password last week. The UI is written to say exactly that and no more ("no
-- change recorded since the account was created on …"), because the stronger sentence
-- is one this column cannot support and never will for those rows.
--
-- NOT A SECURITY CONTROL. Nothing reads this to decide anything: it is not a rotation
-- deadline, it does not gate a session, and a client that lied about it would gain
-- nothing. It is a line of text under a button. That is why it sits on `profiles`,
-- behind the ordinary own-rows policies, rather than needing a definer function.

alter table public.profiles
  add column if not exists password_changed_at timestamptz;

comment on column public.profiles.password_changed_at is
  'When this user last changed their password, as recorded by the app at the moment '
  'it happened. NULL = no change has been RECORDED, which is weaker than "never '
  'changed": every row predating this column is NULL regardless of history. GoTrue '
  'stores no password timestamp of its own — auth.users.updated_at moves on any user '
  'update and recovery_sent_at only means an email was sent — so this is the only '
  'source. Display only; nothing authorizes on it.';
