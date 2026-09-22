import { describe, expect, it } from 'vitest'
import type { PlanComment } from '../../types'
import {
  buildPlanCommentThreads, canEditPlanComment, isOrphanedPlanCommentThread, sortPlanComments,
} from './planComments'

/**
 * The threading, which is where a comment can be lost without anybody noticing: a reply
 * whose parent went away, a chain that loops, two turns written in the same second. Every
 * one of those is somebody's writing dropped or reordered on a page where nothing would
 * look wrong.
 *
 * Pure vitest: no React, no jsdom, no Supabase. The suite runs on the root node_modules.
 */
function comment(overrides: Partial<PlanComment> = {}): PlanComment {
  return {
    id: 'c1',
    sessionId: 's1',
    authorId: 'u1',
    anchor: null,
    quote: 'the passage',
    body: 'a note',
    createdAt: '2026-09-22T10:00:00.000Z',
    ...overrides,
  }
}

describe('sortPlanComments', () => {
  it('orders a conversation oldest first', () => {
    const later = comment({ id: 'b', createdAt: '2026-09-22T11:00:00.000Z' })
    const earlier = comment({ id: 'a', createdAt: '2026-09-22T10:00:00.000Z' })
    expect(sortPlanComments([later, earlier]).map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('breaks a tie on id, so a refetch cannot reorder two comments of the same second', () => {
    const at = '2026-09-22T10:00:00.000Z'
    const sorted = sortPlanComments([
      comment({ id: 'z', createdAt: at }),
      comment({ id: 'a', createdAt: at }),
      comment({ id: 'm', createdAt: at }),
    ])
    expect(sorted.map((c) => c.id)).toEqual(['a', 'm', 'z'])
  })

  it('places a comment with no usable timestamp first rather than dropping it', () => {
    const sorted = sortPlanComments([
      comment({ id: 'dated', createdAt: '2026-09-22T10:00:00.000Z' }),
      comment({ id: 'undated', createdAt: undefined }),
      comment({ id: 'garbled', createdAt: 'not a date' }),
    ])
    expect(sorted.map((c) => c.id)).toEqual(['garbled', 'undated', 'dated'])
  })

  it('leaves the input alone', () => {
    const input = [comment({ id: 'b' }), comment({ id: 'a' })]
    sortPlanComments(input)
    expect(input.map((c) => c.id)).toEqual(['b', 'a'])
  })
})

describe('buildPlanCommentThreads', () => {
  it('hangs a reply under the comment it answers', () => {
    const threads = buildPlanCommentThreads([
      comment({ id: 'head' }),
      comment({ id: 'reply', parentId: 'head', createdAt: '2026-09-22T11:00:00.000Z' }),
    ])
    expect(threads).toHaveLength(1)
    expect(threads[0].head.id).toBe('head')
    expect(threads[0].replies.map((c) => c.id)).toEqual(['reply'])
  })

  it('flattens a reply to a reply onto the thread head', () => {
    const threads = buildPlanCommentThreads([
      comment({ id: 'head' }),
      comment({ id: 'r1', parentId: 'head', createdAt: '2026-09-22T11:00:00.000Z' }),
      comment({ id: 'r2', parentId: 'r1', createdAt: '2026-09-22T12:00:00.000Z' }),
    ])
    expect(threads).toHaveLength(1)
    expect(threads[0].replies.map((c) => c.id)).toEqual(['r1', 'r2'])
  })

  it('promotes a reply whose parent is not in the list rather than dropping it', () => {
    // What a deleted parent looks like from here. `on delete set null` normally turns this
    // into a null parentId, and the row must survive either spelling of it.
    const threads = buildPlanCommentThreads([comment({ id: 'orphan', parentId: 'gone' })])
    expect(threads.map((t) => t.head.id)).toEqual(['orphan'])
    expect(threads[0].replies).toEqual([])
  })

  it('does not hang on a parent cycle', () => {
    const threads = buildPlanCommentThreads([
      comment({ id: 'a', parentId: 'b' }),
      comment({ id: 'b', parentId: 'a', createdAt: '2026-09-22T11:00:00.000Z' }),
    ])
    // Neither is anybody's head, so both stand alone — the point is that it returns at all.
    expect(threads.map((t) => t.head.id).sort()).toEqual(['a', 'b'])
  })

  it('treats a comment that is its own parent as a head', () => {
    const threads = buildPlanCommentThreads([comment({ id: 'self', parentId: 'self' })])
    expect(threads.map((t) => t.head.id)).toEqual(['self'])
  })

  it('attaches a reply that was read before its parent', () => {
    // Two machines, one second of clock skew: the reply carries the earlier stamp.
    const threads = buildPlanCommentThreads([
      comment({ id: 'reply', parentId: 'head', createdAt: '2026-09-22T09:00:00.000Z' }),
      comment({ id: 'head', createdAt: '2026-09-22T10:00:00.000Z' }),
    ])
    expect(threads).toHaveLength(1)
    expect(threads[0].head.id).toBe('head')
    expect(threads[0].replies.map((c) => c.id)).toEqual(['reply'])
  })

  it('orders the threads by their head, not by their newest reply', () => {
    const threads = buildPlanCommentThreads([
      comment({ id: 'old', createdAt: '2026-09-22T10:00:00.000Z' }),
      comment({ id: 'new', createdAt: '2026-09-22T11:00:00.000Z' }),
      comment({ id: 'answer', parentId: 'old', createdAt: '2026-09-22T12:00:00.000Z' }),
    ])
    expect(threads.map((t) => t.head.id)).toEqual(['old', 'new'])
  })

  it('answers nothing for nothing', () => {
    expect(buildPlanCommentThreads([])).toEqual([])
  })
})

describe('isOrphanedPlanCommentThread', () => {
  it('leaves a thread anchored to a passage alone', () => {
    const [thread] = buildPlanCommentThreads([comment({ id: 'head', quote: 'the passage' })])
    expect(isOrphanedPlanCommentThread(thread)).toBe(false)
  })

  it('orphans the reply promoted by its head being deleted', () => {
    // The path AC5 is about, end to end. A reply is stored with no quote of its own — it
    // inherits the head's passage — and `on delete set null` promotes it to a head when its
    // author deletes theirs. It then has nothing for the view to search the spec for, so
    // without this it would be marked nowhere, counted nowhere and shown nowhere.
    const threads = buildPlanCommentThreads([
      comment({ id: 'reply', parentId: 'deleted', quote: '', createdAt: '2026-09-22T11:00:00.000Z' }),
    ])
    expect(threads.map((t) => t.head.id)).toEqual(['reply'])
    expect(isOrphanedPlanCommentThread(threads[0])).toBe(true)
  })

  it('orphans a head whose quote is nothing but whitespace', () => {
    // The same test `commentAnchorKind` makes, and it is made there rather than here: a drag
    // that caught only a blank line is a quote no search could ever recognise.
    const [thread] = buildPlanCommentThreads([comment({ id: 'head', quote: '  \n ' })])
    expect(isOrphanedPlanCommentThread(thread)).toBe(true)
  })

  it('does not orphan a thread anchored to lines rather than to a quote', () => {
    // Nothing writes a line-anchored plan comment today; the column is there for when
    // something does, and such a comment points somewhere of its own.
    const [thread] = buildPlanCommentThreads([
      comment({ id: 'head', quote: '', anchor: { side: 'new', startLine: 4, endLine: 6 } }),
    ])
    expect(isOrphanedPlanCommentThread(thread)).toBe(false)
  })
})

describe('canEditPlanComment', () => {
  it('lets a reader edit their own comment', () => {
    expect(canEditPlanComment(comment({ authorId: 'u1' }), 'u1')).toBe(true)
  })

  it('does not let a reader edit somebody else’s', () => {
    expect(canEditPlanComment(comment({ authorId: 'u2' }), 'u1')).toBe(false)
  })

  it('gives a signed-out reader nothing', () => {
    expect(canEditPlanComment(comment({ authorId: 'u1' }), undefined)).toBe(false)
  })
})
