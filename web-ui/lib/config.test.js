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
        languages: { commit: 'en', pullRequest: 'en', jiraComment: 'en', discussion: 'en' },
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
