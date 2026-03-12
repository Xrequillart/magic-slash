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

  it('updateLanguages sets valid languages', async () => {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { updateLanguages, readConfig } = require('./config');

    const before = readConfig();
    const config = updateLanguages({ commit: 'fr', pullRequest: 'en' });
    expect(config.languages.commit).toBe('fr');
    expect(config.languages.pullRequest).toBe('en');

    // Restore
    updateLanguages(before.languages || {});
  });

  it('updateLanguages ignores invalid keys and values', async () => {
    const { createRequire } = await import('module');
    const require = createRequire(import.meta.url);
    const { updateLanguages, readConfig } = require('./config');

    const before = readConfig();
    const config = updateLanguages({ invalid: 'fr', commit: 'de' });
    // invalid key and invalid value should not appear
    expect(config.languages.invalid).toBeUndefined();
    // 'de' is not a valid value, so commit should retain its previous value
    expect(config.languages.commit).toBe(before.languages?.commit ?? undefined);
  });
});
