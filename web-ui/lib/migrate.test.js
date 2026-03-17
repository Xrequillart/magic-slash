import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { migrateConfig, deepMergeDefaults, createDefaultMetadata } = require('./migrate');

describe('migrateConfig', () => {
  let mockReadConfig;
  let mockWriteConfig;

  beforeEach(() => {
    mockWriteConfig = vi.fn();
  });

  function run(config) {
    mockReadConfig = vi.fn(() => config);
    return migrateConfig({ readConfig: mockReadConfig, writeConfig: mockWriteConfig });
  }

  it('no-op when config has no repositories', () => {
    const changed = run({ version: '1.0', repositories: {} });
    expect(changed).toBe(false);
    expect(mockWriteConfig).not.toHaveBeenCalled();
  });

  it('adds all defaults to a minimal repo (path + keywords only)', () => {
    const changed = run({
      version: '1.0',
      repositories: {
        myrepo: { path: '/tmp/myrepo', keywords: ['myrepo'] }
      }
    });

    expect(changed).toBe(true);
    expect(mockWriteConfig).toHaveBeenCalledTimes(1);

    const repo = mockWriteConfig.mock.calls[0][0].repositories.myrepo;
    expect(repo.path).toBe('/tmp/myrepo');
    expect(repo.keywords).toEqual(['myrepo']);
    expect(repo.color).toBe('#3B82F6');
    expect(repo.languages).toEqual({ commit: 'en', pullRequest: 'en', jiraComment: 'en', discussion: 'en' });
    expect(repo.commit).toEqual({ style: 'single-line', format: 'angular', coAuthor: true, includeTicketId: true });
    expect(repo.resolve).toEqual({
      commitMode: 'new', format: 'angular', style: 'single-line',
      useCommitConfig: true, replyToComments: true, replyLanguage: 'en'
    });
    expect(repo.pullRequest).toEqual({ autoLinkTickets: true });
    expect(repo.issues).toEqual({ commentOnPR: true, jiraUrl: '', githubIssuesUrl: '' });
    expect(repo.branches).toEqual({ development: '' });
  });

  it('preserves existing values and only fills missing fields', () => {
    const changed = run({
      version: '1.0',
      repositories: {
        myrepo: {
          path: '/tmp/myrepo',
          keywords: ['myrepo'],
          color: '#FF0000',
          commit: { style: 'multi-line' }
        }
      }
    });

    expect(changed).toBe(true);
    const repo = mockWriteConfig.mock.calls[0][0].repositories.myrepo;

    expect(repo.color).toBe('#FF0000');
    expect(repo.commit.style).toBe('multi-line');
    expect(repo.commit.format).toBe('angular');
    expect(repo.commit.coAuthor).toBe(true);
    expect(repo.commit.includeTicketId).toBe(true);
    expect(repo.languages).toEqual({ commit: 'en', pullRequest: 'en', jiraComment: 'en', discussion: 'en' });
  });

  it('does not write when repo is already complete', () => {
    const changed = run({
      version: '1.0',
      repositories: {
        myrepo: {
          path: '/tmp/myrepo',
          keywords: ['myrepo'],
          color: '#3B82F6',
          languages: { commit: 'en', pullRequest: 'en', jiraComment: 'en', discussion: 'en' },
          commit: { style: 'single-line', format: 'angular', coAuthor: true, includeTicketId: true },
          resolve: {
            commitMode: 'new', format: 'angular', style: 'single-line',
            useCommitConfig: true, replyToComments: true, replyLanguage: 'en'
          },
          pullRequest: { autoLinkTickets: true },
          issues: { commentOnPR: true, jiraUrl: '', githubIssuesUrl: '' },
          branches: { development: '' }
        }
      }
    });

    expect(changed).toBe(false);
    expect(mockWriteConfig).not.toHaveBeenCalled();
  });

  it('adds default metadata to agent without metadata', () => {
    const changed = run({
      version: '1.0',
      repositories: {},
      agents: [{ id: 'agent-1', name: 'Test Agent', repositories: ['/tmp/repo'] }]
    });

    expect(changed).toBe(true);
    const agent = mockWriteConfig.mock.calls[0][0].agents[0];
    expect(agent.metadata).toEqual(createDefaultMetadata());
  });

  it('adds empty repositories array to agent without one', () => {
    const changed = run({
      version: '1.0',
      repositories: {},
      agents: [{ id: 'agent-1', name: 'Test Agent', metadata: createDefaultMetadata() }]
    });

    expect(changed).toBe(true);
    expect(mockWriteConfig.mock.calls[0][0].agents[0].repositories).toEqual([]);
  });

  it('normalizes multiple repos at once', () => {
    const changed = run({
      version: '1.0',
      repositories: {
        repo1: { path: '/tmp/repo1', keywords: ['r1'] },
        repo2: { path: '/tmp/repo2', keywords: ['r2'], color: '#000000' }
      }
    });

    expect(changed).toBe(true);
    const written = mockWriteConfig.mock.calls[0][0];
    expect(written.repositories.repo1.commit).toBeDefined();
    expect(written.repositories.repo1.resolve).toBeDefined();
    expect(written.repositories.repo2.color).toBe('#000000');
    expect(written.repositories.repo2.commit).toBeDefined();
  });
});

describe('deepMergeDefaults', () => {
  it('adds missing top-level keys', () => {
    const result = deepMergeDefaults({ a: 1, b: 2 }, { a: 10 });
    expect(result).toEqual({ a: 10, b: 2 });
  });

  it('deep merges nested objects', () => {
    const result = deepMergeDefaults(
      { nested: { x: 1, y: 2 } },
      { nested: { x: 10 } }
    );
    expect(result).toEqual({ nested: { x: 10, y: 2 } });
  });

  it('does not overwrite arrays', () => {
    const result = deepMergeDefaults(
      { arr: [1, 2] },
      { arr: [3] }
    );
    expect(result).toEqual({ arr: [3] });
  });
});
