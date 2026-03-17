import { describe, it, expect } from 'vitest';

describe('config module integration', () => {
  it('addRepository returns correct structure', async () => {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { addRepository, deleteRepository } = require('./config');

    const testName = `__test_repo_${Date.now()}`;

    try {
      const config = addRepository(testName, '/tmp/test-path', ['test', 'unit']);
      expect(config.repositories[testName]).toEqual({
        path: '/tmp/test-path',
        keywords: ['test', 'unit'],
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
      });
    } finally {
      // Clean up: delete the test repo
      try { deleteRepository(testName); } catch { /* ignore */ }
    }
  });

  it('addRepository uses name as default keyword', async () => {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { addRepository, deleteRepository } = require('./config');

    const testName = `__test_repo_${Date.now()}`;

    try {
      const config = addRepository(testName, '/tmp/test-path');
      expect(config.repositories[testName].keywords).toEqual([testName]);
    } finally {
      try { deleteRepository(testName); } catch { /* ignore */ }
    }
  });

  it('deleteRepository removes the repo', async () => {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { addRepository, deleteRepository } = require('./config');

    const testName = `__test_repo_${Date.now()}`;
    addRepository(testName, '/tmp/test-path');
    const config = deleteRepository(testName);
    expect(config.repositories[testName]).toBeUndefined();
  });

  it('deleteRepository throws for unknown repo', async () => {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { deleteRepository } = require('./config');

    expect(() => deleteRepository('__nonexistent_repo__')).toThrow(/not found/);
  });

});
