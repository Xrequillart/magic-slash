const { readConfig, writeConfig } = require('./config');

const DEFAULT_REPOSITORY_FIELDS = {
  color: '#3B82F6',
  languages: {
    commit: 'en',
    pullRequest: 'en',
    jiraComment: 'en',
    discussion: 'en'
  },
  commit: {
    style: 'single-line',
    format: 'angular',
    coAuthor: true,
    includeTicketId: true
  },
  resolve: {
    commitMode: 'new',
    format: 'angular',
    style: 'single-line',
    useCommitConfig: true,
    replyToComments: true,
    replyLanguage: 'en'
  },
  pullRequest: {
    autoLinkTickets: true
  },
  issues: {
    commentOnPR: true,
    jiraUrl: '',
    githubIssuesUrl: ''
  },
  branches: {
    development: ''
  }
};

function createDefaultMetadata() {
  return {
    title: '',
    branchName: '',
    ticketId: '',
    description: '',
    status: '',
    fullStackTaskId: '',
    relatedWorktrees: [],
    repositoryMetadata: {}
  };
}

function deepMergeDefaults(defaults, existing) {
  const result = { ...existing };
  for (const key of Object.keys(defaults)) {
    if (!(key in result)) {
      result[key] = typeof defaults[key] === 'object' && defaults[key] !== null && !Array.isArray(defaults[key])
        ? { ...defaults[key] }
        : defaults[key];
    } else if (
      typeof defaults[key] === 'object' &&
      defaults[key] !== null &&
      !Array.isArray(defaults[key]) &&
      typeof result[key] === 'object' &&
      result[key] !== null &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMergeDefaults(defaults[key], result[key]);
    }
  }
  return result;
}

function migrateConfig(deps = {}) {
  const read = deps.readConfig || readConfig;
  const write = deps.writeConfig || writeConfig;
  const config = read();
  let changed = false;

  // Migrate repositories
  if (config.repositories) {
    for (const name of Object.keys(config.repositories)) {
      const repo = config.repositories[name];
      const merged = deepMergeDefaults(DEFAULT_REPOSITORY_FIELDS, repo);
      if (JSON.stringify(merged) !== JSON.stringify(repo)) {
        config.repositories[name] = merged;
        changed = true;
      }
    }
  }

  // Migrate agents
  if (config.agents && Array.isArray(config.agents)) {
    for (const agent of config.agents) {
      if (!agent.repositories) {
        agent.repositories = [];
        changed = true;
      }
      const defaultMeta = createDefaultMetadata();
      const mergedMeta = { ...defaultMeta, ...agent.metadata };
      if (JSON.stringify(mergedMeta) !== JSON.stringify(agent.metadata)) {
        agent.metadata = mergedMeta;
        changed = true;
      }
    }
  }

  if (changed) {
    write(config);
  }

  return changed;
}

module.exports = {
  DEFAULT_REPOSITORY_FIELDS,
  migrateConfig,
  deepMergeDefaults,
  createDefaultMetadata
};
