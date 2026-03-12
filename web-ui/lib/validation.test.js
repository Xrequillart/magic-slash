import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { validateRepoName, expandPath, parseKeywords, validateRepoPath } = require('./validation');

describe('validateRepoName', () => {
  it('rejects empty or missing name', () => {
    expect(validateRepoName('')).toEqual({ valid: false, error: 'Name is required' });
    expect(validateRepoName(null)).toEqual({ valid: false, error: 'Name is required' });
    expect(validateRepoName(undefined)).toEqual({ valid: false, error: 'Name is required' });
  });

  it('rejects whitespace-only name', () => {
    expect(validateRepoName('   ')).toEqual({ valid: false, error: 'Name cannot be empty' });
  });

  it('rejects names longer than 50 characters', () => {
    const longName = 'a'.repeat(51);
    expect(validateRepoName(longName).valid).toBe(false);
    expect(validateRepoName(longName).error).toMatch(/50 characters/);
  });

  it('rejects names with special characters', () => {
    expect(validateRepoName('my repo').valid).toBe(false);
    expect(validateRepoName('my/repo').valid).toBe(false);
    expect(validateRepoName('my.repo').valid).toBe(false);
  });

  it('accepts valid names', () => {
    expect(validateRepoName('my-repo')).toEqual({ valid: true });
    expect(validateRepoName('my_repo')).toEqual({ valid: true });
    expect(validateRepoName('MyRepo123')).toEqual({ valid: true });
  });
});

describe('expandPath', () => {
  it('expands ~ to home directory', () => {
    const result = expandPath('~/projects');
    expect(result).toBe(path.join(os.homedir(), 'projects'));
  });

  it('returns absolute paths unchanged', () => {
    expect(expandPath('/usr/local/bin')).toBe('/usr/local/bin');
  });

  it('returns falsy values unchanged', () => {
    expect(expandPath('')).toBe('');
    expect(expandPath(null)).toBe(null);
    expect(expandPath(undefined)).toBe(undefined);
  });
});

describe('parseKeywords', () => {
  it('splits comma-separated keywords', () => {
    expect(parseKeywords('api,backend,server')).toEqual(['api', 'backend', 'server']);
  });

  it('trims whitespace', () => {
    expect(parseKeywords('  api , backend , server  ')).toEqual(['api', 'backend', 'server']);
  });

  it('filters empty entries', () => {
    expect(parseKeywords('api,,backend,')).toEqual(['api', 'backend']);
  });

  it('returns empty array for falsy input', () => {
    expect(parseKeywords('')).toEqual([]);
    expect(parseKeywords(null)).toEqual([]);
    expect(parseKeywords(undefined)).toEqual([]);
  });
});

describe('validateRepoPath', () => {
  it('rejects empty or missing path', () => {
    expect(validateRepoPath('')).toEqual({ valid: false, error: 'Path is required', expandedPath: '' });
    expect(validateRepoPath(null)).toEqual({ valid: false, error: 'Path is required', expandedPath: '' });
  });

  it('warns for non-existent directories', () => {
    const result = validateRepoPath('/tmp/non-existent-dir-xyz-123');
    expect(result.valid).toBe(true);
    expect(result.warning).toMatch(/does not exist/);
  });

  it('expands tilde in path', () => {
    const result = validateRepoPath('~/non-existent-dir-xyz-123');
    expect(result.expandedPath).toBe(path.join(os.homedir(), 'non-existent-dir-xyz-123'));
  });
});
