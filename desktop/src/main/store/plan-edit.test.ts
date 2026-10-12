import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import type { Agent, PlanSession } from '../../types'

/**
 * The editor's save, end to end on this side of the bridge: cloud first, then — for the
 * author only, and only when it holds nothing the cloud lacks — the spec file on disk.
 *
 * The cloud module is mocked (it would reach `@supabase/supabase-js`, which the root
 * `node_modules` this suite runs on does not hold); the FILE is real, because what
 * matters is what ends up on disk. Who may write the ROW is RLS's to prove, in
 * `supabase/tests/plan_sessions.test.sql`.
 */
const config = vi.hoisted(() => ({ repositories: {} as Record<string, unknown> }))
vi.mock('../config/config', () => ({
  readConfig: () => config,
  CONFIG_DIR: `${process.env.TMPDIR ?? '/tmp'}/magic-slash-plan-edit-test-config`,
}))
const agents = vi.hoisted(() => ({ list: [] as Agent[] }))
vi.mock('../config/agents', () => ({ readAgents: () => agents.list }))
const who = vi.hoisted(() => ({ uid: 'owner-uid' as string | undefined }))
vi.mock('../cloud/session-store', () => ({ loadSession: () => (who.uid ? { user: { id: who.uid } } : null) }))
vi.mock('./outbox', () => ({ enqueue: vi.fn() }))

const cloud = vi.hoisted(() => ({
  read: vi.fn(),
  update: vi.fn(),
}))
vi.mock('../cloud/plans', () => ({
  readPlanSessionForEdit: (...args: unknown[]) => cloud.read(...args),
  updatePlanSpec: (...args: unknown[]) => cloud.update(...args),
}))

import { resolveLocalSpecPath, saveEditedPlanSpec } from './plan-edit'
import { specKeyFor } from './plan-sync'
import { MAX_SPEC_BYTES } from './spec-file'

const TMP = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'magic-slash-plan-edit-')))
const SPEC = path.join(TMP, '.magic', 'spec-edit-20260922-101500.md')
const ID = '11111111-1111-4111-8111-111111111111'
const REPO_ID = '22222222-2222-4222-8222-222222222222'
/** Microseconds, as PostgREST serialises them: the value must survive untouched. */
const UPDATED_AT = '2026-09-22T10:00:00.123456+00:00'
const LOADED = '# Spec\n\n## Idea\n\nBefore.\n'
const EDITED = '# Spec\n\n## Idea\n\nAfter.\n'

function session(overrides: Partial<PlanSession> = {}): PlanSession {
  return {
    id: ID,
    ownerId: 'owner-uid',
    slug: 'edit-20260922-101500',
    specKey: specKeyFor(SPEC),
    spec: LOADED,
    specOversize: false,
    status: 'planning',
    repoId: REPO_ID,
    specSyncedAt: '2026-09-22T09:00:00.000000+00:00',
    updatedAt: UPDATED_AT,
    editPolicy: 'org',
    viewerCanEdit: true,
    viewerCanManage: true,
    ...overrides,
  }
}

beforeEach(() => {
  fs.rmSync(path.join(TMP, '.magic'), { recursive: true, force: true })
  fs.mkdirSync(path.dirname(SPEC), { recursive: true })
  fs.writeFileSync(SPEC, LOADED)
  // Modified after the last sync, so only the CONTENT test can let the write through —
  // the "unchanged since" branch has its own case below.
  const later = new Date('2026-09-22T09:30:00Z')
  fs.utimesSync(SPEC, later, later)
  agents.list = [{ id: 'agent-1', metadata: { specPath: SPEC } } as unknown as Agent]
  config.repositories = { repo: { id: REPO_ID, path: TMP, keywords: [] } }
  who.uid = 'owner-uid'
  cloud.read.mockReset().mockResolvedValue({ session: session(), failed: false })
  cloud.update.mockReset().mockResolvedValue({ status: 'saved', updatedAt: '2026-09-22T10:05:00.654321+00:00' })
})

afterAll(() => {
  fs.rmSync(TMP, { recursive: true, force: true })
})

const save = (spec = EDITED, expectedUpdatedAt = UPDATED_AT) =>
  saveEditedPlanSpec({ id: ID, spec, expectedUpdatedAt })

describe('saveEditedPlanSpec — the author', () => {
  it('saves the row, then rewrites the spec file on this machine', async () => {
    expect(await save()).toEqual({
      status: 'saved', updatedAt: '2026-09-22T10:05:00.654321+00:00', fileWritten: true,
    })
    expect(fs.readFileSync(SPEC, 'utf-8')).toBe(EDITED)
  })

  it('stamps spec_synced_at and sets the file mtime just before it, so reconcile skips it', async () => {
    await save()
    const sent = cloud.update.mock.calls[0][0] as { syncedAt?: string; idea?: string; expectedUpdatedAt: string }
    expect(sent.syncedAt).toBeDefined()
    // The comparison `reconcilePlanSpecs` makes to decide there is nothing to upload.
    expect(Date.parse(sent.syncedAt!)).toBeGreaterThanOrEqual(fs.statSync(SPEC).mtimeMs)
    expect(sent.idea).toBe('After.')
    // The guard goes back EXACTLY as it came in, microseconds and all.
    expect(sent.expectedUpdatedAt).toBe(UPDATED_AT)
  })

  it('keeps a file holding local work, and does not stamp the row', async () => {
    fs.writeFileSync(SPEC, `${LOADED}\n## Written a second ago\n`)
    const later = new Date('2026-09-22T09:30:00Z')
    fs.utimesSync(SPEC, later, later)
    expect(await save()).toMatchObject({ status: 'saved', fileWritten: false, fileSkipReason: 'diverged' })
    expect(fs.readFileSync(SPEC, 'utf-8')).toContain('Written a second ago')
    // An unstamped row is what lets that local work upload at the next launch.
    expect(cloud.update.mock.calls[0][0].syncedAt).toBeUndefined()
  })

  it('replaces a stale file untouched since the last sync, after a colleague edited the cloud copy', async () => {
    fs.writeFileSync(SPEC, 'what was last uploaded, before the colleague edited it')
    const before = new Date('2026-09-22T08:00:00Z')
    fs.utimesSync(SPEC, before, before)
    expect(await save()).toMatchObject({ status: 'saved', fileWritten: true })
    expect(fs.readFileSync(SPEC, 'utf-8')).toBe(EDITED)
  })

  it('saves the row alone when no agent on this machine points at the spec', async () => {
    agents.list = []
    expect(await save()).toMatchObject({ status: 'saved', fileWritten: false, fileSkipReason: 'no_file' })
    expect(fs.readFileSync(SPEC, 'utf-8')).toBe(LOADED)
  })
})

describe('saveEditedPlanSpec — a colleague', () => {
  it('saves the row and never touches a file, even one with the same key', async () => {
    who.uid = 'colleague-uid'
    expect(await save()).toMatchObject({ status: 'saved', fileWritten: false, fileSkipReason: 'not_owner' })
    expect(fs.readFileSync(SPEC, 'utf-8')).toBe(LOADED)
    // Never the author's sync stamp: the guard trigger would refuse it anyway.
    expect(cloud.update.mock.calls[0][0].syncedAt).toBeUndefined()
  })
})

describe('saveEditedPlanSpec — nothing is overwritten', () => {
  it('reports a conflict without writing when the row moved since the editor opened', async () => {
    cloud.read.mockResolvedValue({ session: session({ updatedAt: '2026-09-22T10:01:00.000001+00:00' }), failed: false })
    expect(await save()).toEqual({ status: 'conflict' })
    expect(cloud.update).not.toHaveBeenCalled()
    expect(fs.readFileSync(SPEC, 'utf-8')).toBe(LOADED)
  })

  it('passes a conflict from the UPDATE itself through, and leaves the file alone', async () => {
    cloud.update.mockResolvedValue({ status: 'conflict' })
    expect(await save()).toEqual({ status: 'conflict' })
    expect(fs.readFileSync(SPEC, 'utf-8')).toBe(LOADED)
  })

  it.each([['denied'], ['failed']] as const)('passes %s through, and leaves the file alone', async (status) => {
    cloud.update.mockResolvedValue({ status })
    expect(await save()).toEqual({ status })
    expect(fs.readFileSync(SPEC, 'utf-8')).toBe(LOADED)
  })

  it('answers denied for a plan the reader can no longer see', async () => {
    cloud.read.mockResolvedValue({ session: null, failed: false })
    expect(await save()).toEqual({ status: 'denied' })
    expect(cloud.update).not.toHaveBeenCalled()
  })

  it('answers failed when the row could not be read', async () => {
    cloud.read.mockResolvedValue({ session: null, failed: true })
    expect(await save()).toEqual({ status: 'failed' })
    expect(cloud.update).not.toHaveBeenCalled()
  })

  it('refuses a spec past the uploader ceiling before reaching the cloud', async () => {
    expect(await save('x'.repeat(MAX_SPEC_BYTES + 1))).toEqual({ status: 'failed' })
    expect(cloud.read).not.toHaveBeenCalled()
  })
})

describe('resolveLocalSpecPath: where /magic:plan-change can be launched on this plan', () => {
  it('finds the file through the agent that planned it, with its repository root', async () => {
    expect(await resolveLocalSpecPath(ID)).toEqual({ ok: true, path: SPEC, repoPath: TMP })
  })

  it('finds it in the plan repository once the planner is archived', async () => {
    agents.list = []
    expect(await resolveLocalSpecPath(ID)).toEqual({ ok: true, path: SPEC, repoPath: TMP })
  })

  it('refuses a namesake whose path does not hash to the plan key', async () => {
    agents.list = []
    // Same slug, another folder: the file exists, but it is not the one that was uploaded.
    const other = path.join(TMP, 'other')
    fs.mkdirSync(path.join(other, '.magic'), { recursive: true })
    fs.writeFileSync(path.join(other, '.magic', 'spec-edit-20260922-101500.md'), LOADED)
    config.repositories = { repo: { id: REPO_ID, path: other, keywords: [] } }
    expect(await resolveLocalSpecPath(ID)).toEqual({ ok: false, reason: 'no_file' })
  })

  it('answers no_file when the file is gone from disk', async () => {
    fs.rmSync(SPEC)
    expect(await resolveLocalSpecPath(ID)).toEqual({ ok: false, reason: 'no_file' })
  })

  it('answers no_file when the repository is no longer bound to a folder here', async () => {
    config.repositories = { repo: { id: REPO_ID, path: '', needsLocalPath: true, keywords: [] } }
    expect(await resolveLocalSpecPath(ID)).toEqual({ ok: false, reason: 'no_file' })
  })

  it('answers not_owner on a colleague plan, without looking for a file', async () => {
    who.uid = 'colleague-uid'
    expect(await resolveLocalSpecPath(ID)).toEqual({ ok: false, reason: 'not_owner' })
  })

  it('answers failed when the row could not be read, and no_file when it is not visible', async () => {
    cloud.read.mockResolvedValueOnce({ session: null, failed: true })
    expect(await resolveLocalSpecPath(ID)).toEqual({ ok: false, reason: 'failed' })
    cloud.read.mockResolvedValueOnce({ session: null, failed: false })
    expect(await resolveLocalSpecPath(ID)).toEqual({ ok: false, reason: 'no_file' })
  })
})
