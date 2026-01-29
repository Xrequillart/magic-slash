const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Validate repository name
 * @param {string} name Repository name
 * @returns {Object} Validation result { valid: boolean, error?: string }
 */
function validateRepoName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return { valid: false, error: 'Name cannot be empty' };
  }

  if (trimmed.length > 50) {
    return { valid: false, error: 'Name must be 50 characters or less' };
  }

  const validPattern = /^[a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, numbers, hyphens and underscores' };
  }

  return { valid: true };
}

/**
 * Expand ~ to home directory
 * @param {string} inputPath Path to expand
 * @returns {string} Expanded path
 */
function expandPath(inputPath) {
  if (!inputPath) return inputPath;

  if (inputPath.startsWith('~')) {
    return path.join(os.homedir(), inputPath.slice(1));
  }
  return inputPath;
}

/**
 * Validate repository path
 * @param {string} repoPath Repository path
 * @returns {Object} Validation result { valid: boolean, error?: string, warning?: string, expandedPath: string }
 */
function validateRepoPath(repoPath) {
  if (!repoPath || typeof repoPath !== 'string') {
    return { valid: false, error: 'Path is required', expandedPath: '' };
  }

  const expandedPath = expandPath(repoPath.trim());

  if (expandedPath.length === 0) {
    return { valid: false, error: 'Path cannot be empty', expandedPath };
  }

  // Check if directory exists
  if (!fs.existsSync(expandedPath)) {
    return {
      valid: true,
      warning: 'Directory does not exist',
      expandedPath
    };
  }

  // Check if it's a directory
  const stats = fs.statSync(expandedPath);
  if (!stats.isDirectory()) {
    return {
      valid: false,
      error: 'Path is not a directory',
      expandedPath
    };
  }

  // Check if it's a git repository
  const gitPath = path.join(expandedPath, '.git');
  if (!fs.existsSync(gitPath)) {
    return {
      valid: true,
      warning: 'Not a git repository',
      expandedPath
    };
  }

  return { valid: true, expandedPath };
}

/**
 * Validate if a path is a git repository
 * @param {string} repoPath Repository path
 * @returns {Object} Validation result
 */
function isGitRepository(repoPath) {
  const expandedPath = expandPath(repoPath);

  if (!fs.existsSync(expandedPath)) {
    return { isGit: false, exists: false };
  }

  const gitPath = path.join(expandedPath, '.git');
  const isGit = fs.existsSync(gitPath);

  return { isGit, exists: true, expandedPath };
}

/**
 * Parse keywords from comma-separated string
 * @param {string} keywordsInput Comma-separated keywords
 * @returns {string[]} Array of keywords
 */
function parseKeywords(keywordsInput) {
  if (!keywordsInput || typeof keywordsInput !== 'string') {
    return [];
  }

  return keywordsInput
    .split(',')
    .map(k => k.trim())
    .filter(k => k.length > 0);
}

/**
 * Check if a PR template exists in the repository
 * @param {string} repoPath Repository path
 * @returns {Object} { exists: boolean, path?: string, content?: string }
 */
function getPRTemplate(repoPath) {
  const expandedPath = expandPath(repoPath);

  // Common PR template locations
  const templatePaths = [
    '.github/PULL_REQUEST_TEMPLATE.md',
    '.github/pull_request_template.md',
    'docs/pull_request_template.md',
    'PULL_REQUEST_TEMPLATE.md',
    'pull_request_template.md'
  ];

  for (const templatePath of templatePaths) {
    const fullPath = path.join(expandedPath, templatePath);
    if (fs.existsSync(fullPath)) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        return {
          exists: true,
          path: templatePath,
          fullPath,
          content
        };
      } catch (error) {
        console.error('Error reading PR template:', error);
      }
    }
  }

  return { exists: false };
}

/**
 * Create a PR template in the repository
 * @param {string} repoPath Repository path
 * @param {string} content Template content
 * @param {string} language Language for default template ('en' or 'fr')
 * @returns {Object} { success: boolean, path: string }
 */
function createPRTemplate(repoPath, content, language = 'en') {
  const expandedPath = expandPath(repoPath);
  const githubDir = path.join(expandedPath, '.github');
  const templatePath = path.join(githubDir, 'PULL_REQUEST_TEMPLATE.md');

  // Create .github directory if it doesn't exist
  if (!fs.existsSync(githubDir)) {
    fs.mkdirSync(githubDir, { recursive: true });
  }

  // Default templates
  const defaultTemplates = {
    en: `## Summary

<!-- Briefly describe what this PR does -->

## Changes

<!-- List the main changes -->

-

## How to test

<!-- Step-by-step instructions to test -->

1.
2.
3.

## Checklist

- [ ] Code follows project conventions
- [ ] Tests added/updated
- [ ] Documentation updated (if needed)
`,
    fr: `## Résumé

<!-- Décrivez brièvement ce que fait cette PR -->

## Changements

<!-- Listez les principaux changements -->

-

## Comment tester

<!-- Instructions étape par étape pour tester -->

1.
2.
3.

## Checklist

- [ ] Le code respecte les conventions du projet
- [ ] Tests ajoutés/mis à jour
- [ ] Documentation mise à jour (si nécessaire)
`
  };

  const templateContent = content || defaultTemplates[language] || defaultTemplates.en;

  try {
    fs.writeFileSync(templatePath, templateContent);
    return {
      success: true,
      path: '.github/PULL_REQUEST_TEMPLATE.md',
      fullPath: templatePath
    };
  } catch (error) {
    console.error('Error creating PR template:', error);
    throw error;
  }
}

module.exports = {
  validateRepoName,
  validateRepoPath,
  isGitRepository,
  expandPath,
  parseKeywords,
  getPRTemplate,
  createPRTemplate
};
