import { describe, expect, it } from 'vitest'
import { EMPTY_PROFILE, profileUpsertPayload, type UserProfile } from './profileShape'

/**
 * The upsert trap, held by a test.
 *
 * `saveProfile` writes the profile with `.upsert(payload, { onConflict: 'user_id' })`,
 * and PostgREST touches exactly the columns the payload names. `profiles.avatar_url` is
 * written from ONE place only — the desktop app's Account tab, which is the only process
 * that can reach Supabase Storage — while this form has no avatar control at all. So the
 * moment `avatar_url` appears in this payload, every save from the webapp overwrites the
 * photo with whatever the form is holding, which is nothing. No error, no warning: the
 * user edits their name on the site and their photo is gone.
 *
 * `ProfileUpsertPayload` is the first line of defence and the better one: adding the
 * field to the returned literal is an excess-property error, so the mistake does not
 * compile. This suite is the second, and it holds what a type cannot — that the
 * payload's VALUE carries no trace of the photo at runtime, under any spelling, out of
 * a profile that has one.
 *
 * Testing the value at all is why the payload was extracted out of the data layer:
 * `profile.ts` imports the Supabase client, and the root vitest suite runs
 * `webapp/lib/**` against the root node_modules where `@supabase/supabase-js` does not
 * exist — a test that reached it at any depth would fail to resolve. profileShape.ts is
 * importable precisely because it imports nothing of the sort. The same pair of guards,
 * for the same reason, protects `CloudStore.saveProfile` one app over.
 */

const FILLED: UserProfile = {
  name: '  Ada  ',
  role: 'dev',
  technicalLevel: 'expert',
  communicationStyle: 'technical',
  languages: ['en', 'fr'],
  freeText: '  likes concise answers  ',
  avatarUrl: 'user-1/avatar.webp',
}

describe('profileUpsertPayload', () => {
  it('never writes avatar_url, even when the profile carries a photo', () => {
    const payload = profileUpsertPayload(FILLED, 'user-1')
    expect(Object.keys(payload), 'a save from the webapp would wipe the desktop avatar').not.toContain('avatar_url')
    // Not under any other spelling either — the point is that no key of this
    // payload reaches the avatar column.
    expect(Object.keys(payload).filter((k) => /avatar/i.test(k))).toEqual([])
    expect(Object.values(payload)).not.toContain('user-1/avatar.webp')
  })

  it('writes every column the webapp does own', () => {
    expect(profileUpsertPayload(FILLED, 'user-1')).toEqual({
      user_id: 'user-1',
      name: 'Ada',
      role: 'dev',
      technical_level: 'expert',
      communication_style: 'technical',
      languages: ['en', 'fr'],
      free_text: 'likes concise answers',
    })
  })

  it('sends a cleared free text as null rather than as an empty string', () => {
    expect(profileUpsertPayload({ ...FILLED, freeText: '   ' }, 'user-1').free_text).toBeNull()
  })

  it('carries no photo out of an untouched profile either', () => {
    expect(Object.keys(profileUpsertPayload(EMPTY_PROFILE, 'user-1'))).not.toContain('avatar_url')
  })
})

describe('EMPTY_PROFILE', () => {
  it('starts with no photo', () => {
    expect(EMPTY_PROFILE.avatarUrl).toBeNull()
  })
})
