const fs = require('fs');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.config', 'magic-slash');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

/**
 * Read the configuration file
 * @returns {Object} Configuration object
 */
function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return {
        version: 'unknown',
        repositories: {},
        languages: {}
      };
    }
    const content = fs.readFileSync(CONFIG_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error reading config:', error);
    return {
      version: 'unknown',
      repositories: {},
      languages: {}
    };
  }
}

/**
 * Write the configuration file
 * @param {Object} config Configuration object
 */
function writeConfig(config) {
  try {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error writing config:', error);
    throw error;
  }
}

/**
 * Add a repository to the configuration
 * @param {string} name Repository name
 * @param {string} repoPath Repository path
 * @param {string[]} keywords Keywords for auto-detection
 */
function addRepository(name, repoPath, keywords = []) {
  const config = readConfig();
  config.repositories = config.repositories || {};
  config.repositories[name] = {
    path: repoPath,
    keywords: keywords.length > 0 ? keywords : [name]
  };
  writeConfig(config);
  return config;
}

/**
 * Update a repository in the configuration
 * @param {string} name Repository name
 * @param {Object} updates Updates to apply (path, keywords, languages)
 */
function updateRepository(name, updates) {
  const config = readConfig();
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`);
  }

  if (updates.path !== undefined) {
    config.repositories[name].path = updates.path;
  }
  if (updates.keywords !== undefined) {
    config.repositories[name].keywords = updates.keywords;
  }
  if (updates.languages !== undefined) {
    config.repositories[name].languages = updates.languages;
  }

  writeConfig(config);
  return config;
}

/**
 * Update language settings for a specific repository
 * @param {string} name Repository name
 * @param {Object} languages Language settings object
 */
function updateRepositoryLanguages(name, languages) {
  const config = readConfig();
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`);
  }

  const validKeys = ['commit', 'pullRequest', 'jiraComment', 'discussion'];
  const validValues = ['en', 'fr', null]; // null means "use global default"

  config.repositories[name].languages = config.repositories[name].languages || {};

  for (const [key, value] of Object.entries(languages)) {
    if (validKeys.includes(key)) {
      if (value === null || value === 'default') {
        // Remove the key to use global default
        delete config.repositories[name].languages[key];
      } else if (validValues.includes(value)) {
        config.repositories[name].languages[key] = value;
      }
    }
  }

  // Clean up empty languages object
  if (Object.keys(config.repositories[name].languages).length === 0) {
    delete config.repositories[name].languages;
  }

  writeConfig(config);
  return config;
}

/**
 * Update commit settings for a specific repository
 * @param {string} name Repository name
 * @param {Object} settings Commit settings object
 */
function updateRepositoryCommitSettings(name, settings) {
  const config = readConfig();
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`);
  }

  config.repositories[name].commit = config.repositories[name].commit || {};

  // Validate and set style
  if (settings.style !== undefined) {
    if (settings.style === 'default' || settings.style === null) {
      delete config.repositories[name].commit.style;
    } else if (['single-line', 'multi-line'].includes(settings.style)) {
      config.repositories[name].commit.style = settings.style;
    }
  }

  // Validate and set format
  if (settings.format !== undefined) {
    if (settings.format === 'default' || settings.format === null) {
      delete config.repositories[name].commit.format;
    } else if (['conventional', 'angular', 'gitmoji', 'none'].includes(settings.format)) {
      config.repositories[name].commit.format = settings.format;
    }
  }

  // Validate and set coAuthor
  if (settings.coAuthor !== undefined) {
    if (settings.coAuthor === 'default' || settings.coAuthor === null) {
      delete config.repositories[name].commit.coAuthor;
    } else if (typeof settings.coAuthor === 'boolean') {
      config.repositories[name].commit.coAuthor = settings.coAuthor;
    }
  }

  // Validate and set includeTicketId
  if (settings.includeTicketId !== undefined) {
    if (settings.includeTicketId === 'default' || settings.includeTicketId === null) {
      delete config.repositories[name].commit.includeTicketId;
    } else if (typeof settings.includeTicketId === 'boolean') {
      config.repositories[name].commit.includeTicketId = settings.includeTicketId;
    }
  }

  // Clean up empty commit object
  if (Object.keys(config.repositories[name].commit).length === 0) {
    delete config.repositories[name].commit;
  }

  writeConfig(config);
  return config;
}

/**
 * Update pull request settings for a specific repository
 * @param {string} name Repository name
 * @param {Object} settings Pull request settings object
 */
function updateRepositoryPullRequestSettings(name, settings) {
  const config = readConfig();
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`);
  }

  config.repositories[name].pullRequest = config.repositories[name].pullRequest || {};

  // Validate and set autoLinkTickets
  if (settings.autoLinkTickets !== undefined) {
    if (settings.autoLinkTickets === 'default' || settings.autoLinkTickets === null) {
      delete config.repositories[name].pullRequest.autoLinkTickets;
    } else if (typeof settings.autoLinkTickets === 'boolean') {
      config.repositories[name].pullRequest.autoLinkTickets = settings.autoLinkTickets;
    }
  }

  // Clean up empty pullRequest object
  if (Object.keys(config.repositories[name].pullRequest).length === 0) {
    delete config.repositories[name].pullRequest;
  }

  writeConfig(config);
  return config;
}

/**
 * Update issues settings for a specific repository
 * @param {string} name Repository name
 * @param {Object} settings Issues settings object
 */
function updateRepositoryIssuesSettings(name, settings) {
  const config = readConfig();
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`);
  }

  config.repositories[name].issues = config.repositories[name].issues || {};

  // Validate and set commentOnPR
  if (settings.commentOnPR !== undefined) {
    if (settings.commentOnPR === 'default' || settings.commentOnPR === null) {
      delete config.repositories[name].issues.commentOnPR;
    } else if (typeof settings.commentOnPR === 'boolean') {
      config.repositories[name].issues.commentOnPR = settings.commentOnPR;
    }
  }

  // Clean up empty issues object
  if (Object.keys(config.repositories[name].issues).length === 0) {
    delete config.repositories[name].issues;
  }

  writeConfig(config);
  return config;
}

/**
 * Delete a repository from the configuration
 * @param {string} name Repository name
 */
function deleteRepository(name) {
  const config = readConfig();
  if (!config.repositories || !config.repositories[name]) {
    throw new Error(`Repository '${name}' not found`);
  }

  delete config.repositories[name];
  writeConfig(config);
  return config;
}

/**
 * Update language settings
 * @param {Object} languages Language settings object
 */
function updateLanguages(languages) {
  const config = readConfig();
  config.languages = config.languages || {};

  const validKeys = ['commit', 'pullRequest', 'jiraComment', 'discussion'];
  const validValues = ['en', 'fr'];

  for (const [key, value] of Object.entries(languages)) {
    if (validKeys.includes(key) && validValues.includes(value)) {
      config.languages[key] = value;
    }
  }

  writeConfig(config);
  return config;
}

module.exports = {
  readConfig,
  writeConfig,
  addRepository,
  updateRepository,
  deleteRepository,
  updateLanguages,
  updateRepositoryLanguages,
  updateRepositoryCommitSettings,
  updateRepositoryPullRequestSettings,
  updateRepositoryIssuesSettings,
  CONFIG_FILE
};
