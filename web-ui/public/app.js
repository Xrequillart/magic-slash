// Magic Slash Web UI - Frontend Application

// ===========================================
// State
// ===========================================
let config = {
  version: 'unknown',
  repositories: {},
  languages: {}
};

let currentPage = 'home';
let currentRepo = null;
let pathValidationTimeout = null;

// ===========================================
// DOM Elements
// ===========================================
const elements = {
  app: document.getElementById('app'),
  versionBadge: document.getElementById('version-badge'),
  closeBtn: document.getElementById('close-btn'),
  addModal: document.getElementById('add-modal'),
  addModalClose: document.getElementById('add-modal-close'),
  addForm: document.getElementById('add-form'),
  addName: document.getElementById('add-name'),
  addPath: document.getElementById('add-path'),
  addKeywords: document.getElementById('add-keywords'),
  addNameError: document.getElementById('add-name-error'),
  addPathError: document.getElementById('add-path-error'),
  addPathStatus: document.getElementById('add-path-status'),
  addCancel: document.getElementById('add-cancel'),
  addSave: document.getElementById('add-save'),
  deleteModal: document.getElementById('delete-modal'),
  deleteModalClose: document.getElementById('delete-modal-close'),
  deleteRepoName: document.getElementById('delete-repo-name'),
  deleteCancel: document.getElementById('delete-cancel'),
  deleteConfirm: document.getElementById('delete-confirm'),
  toastContainer: document.getElementById('toast-container')
};

// ===========================================
// API
// ===========================================
const api = {
  async getConfig() {
    const response = await fetch('/api/config');
    if (!response.ok) throw new Error('Failed to fetch config');
    return response.json();
  },

  async addRepository(name, path, keywords) {
    const response = await fetch('/api/repositories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, path, keywords })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to add repository');
    return data;
  },

  async updateRepository(name, updates) {
    const response = await fetch(`/api/repositories/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update repository');
    return data;
  },

  async deleteRepository(name) {
    const response = await fetch(`/api/repositories/${encodeURIComponent(name)}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to delete repository');
    return data;
  },

  async updateLanguages(languages) {
    const response = await fetch('/api/languages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(languages)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update languages');
    return data;
  },

  async updateRepositoryLanguages(name, languages) {
    const response = await fetch(`/api/repositories/${encodeURIComponent(name)}/languages`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(languages)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update repository languages');
    return data;
  },

  async updateRepositoryCommitSettings(name, settings) {
    const response = await fetch(`/api/repositories/${encodeURIComponent(name)}/commit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update commit settings');
    return data;
  },

  async updateRepositoryPullRequestSettings(name, settings) {
    const response = await fetch(`/api/repositories/${encodeURIComponent(name)}/pull-request`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update pull request settings');
    return data;
  },

  async updateRepositoryIssuesSettings(name, settings) {
    const response = await fetch(`/api/repositories/${encodeURIComponent(name)}/issues`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update issues settings');
    return data;
  },

  async validatePath(path) {
    const response = await fetch('/api/validate-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path })
    });
    return response.json();
  },

  async getPRTemplate(name) {
    const response = await fetch(`/api/repositories/${encodeURIComponent(name)}/pr-template`);
    return response.json();
  },

  async createPRTemplate(name, language) {
    const response = await fetch(`/api/repositories/${encodeURIComponent(name)}/pr-template`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to create PR template');
    return data;
  },

  async updatePRTemplate(name, content) {
    const response = await fetch(`/api/repositories/${encodeURIComponent(name)}/pr-template`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Failed to update PR template');
    return data;
  },

  async shutdown() {
    const response = await fetch('/api/shutdown', { method: 'POST' });
    return response.json();
  }
};

// ===========================================
// Router
// ===========================================
function navigate(hash) {
  window.location.hash = hash;
}

function parseRoute() {
  const hash = window.location.hash || '#/';

  if (hash === '#/' || hash === '#') {
    return { page: 'home', params: {} };
  }

  const repoMatch = hash.match(/^#\/repo\/(.+)$/);
  if (repoMatch) {
    return { page: 'repo', params: { name: decodeURIComponent(repoMatch[1]) } };
  }

  if (hash === '#/settings') {
    return { page: 'settings', params: {} };
  }

  return { page: 'home', params: {} };
}

function handleRoute() {
  const route = parseRoute();
  currentPage = route.page;

  if (route.page === 'home') {
    currentRepo = null;
    renderHomePage();
  } else if (route.page === 'repo') {
    currentRepo = route.params.name;
    renderRepoPage(route.params.name);
  } else if (route.page === 'settings') {
    currentRepo = null;
    renderSettingsPage();
  }
}

// ===========================================
// Toast Notifications
// ===========================================
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const iconPaths = {
    success: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/>',
    error: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>'
  };

  toast.innerHTML = `
    <svg class="toast-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      ${iconPaths[type]}
    </svg>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
      </svg>
    </button>
  `;

  elements.toastContainer.appendChild(toast);

  const closeToast = () => {
    toast.classList.add('hiding');
    setTimeout(() => toast.remove(), 300);
  };

  toast.querySelector('.toast-close').addEventListener('click', closeToast);
  setTimeout(closeToast, 4000);
}

// ===========================================
// Utility Functions
// ===========================================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function generateCommitExample(format, style, includeTicketId) {
  const examples = {
    'conventional': { type: 'feat', msg: 'add user authentication' },
    'angular': { type: 'feat', scope: 'auth', msg: 'add user authentication' },
    'gitmoji': { emoji: '\u2728', msg: 'add user authentication' },
    'none': { msg: 'Add user authentication' }
  };

  const bodyText = 'Implement login flow with session management';
  const ticketId = '[PROJ-123]';

  // Get the example data for this format
  const example = examples[format] || examples['conventional'];

  // Build the first line based on format
  let firstLine = '';
  switch (format) {
    case 'angular':
      firstLine = `${example.type}(${example.scope}): ${example.msg}`;
      break;
    case 'gitmoji':
      firstLine = `${example.emoji} ${example.msg}`;
      break;
    case 'none':
      firstLine = example.msg;
      break;
    case 'conventional':
    default:
      firstLine = `${example.type}: ${example.msg}`;
      break;
  }

  // Add ticket ID if enabled
  if (includeTicketId) {
    firstLine += ` ${ticketId}`;
  }

  // Add body for multi-line style
  if (style === 'multi-line') {
    return `${firstLine}\n\n${bodyText}`;
  }

  return firstLine;
}

function updateCommitPreview() {
  const previewEl = document.getElementById('commit-preview-content');
  if (!previewEl) return;

  const styleSelect = document.getElementById('commit-style');
  const formatSelect = document.getElementById('commit-format');
  const ticketIdToggle = document.getElementById('commit-ticket-id');

  if (!styleSelect || !formatSelect || !ticketIdToggle) return;

  // Get values, handling 'default' values
  let style = styleSelect.value;
  if (style === 'default') style = 'single-line';

  let format = formatSelect.value;
  if (format === 'default') format = 'angular';

  const includeTicketId = ticketIdToggle.checked;

  const example = generateCommitExample(format, style, includeTicketId);
  previewEl.textContent = example;
}

function getLanguageLabel(code) {
  return code === 'fr' ? 'Français' : 'English';
}

function countCustomLanguages(repoName) {
  const repo = config.repositories[repoName];
  return Object.keys(repo?.languages || {}).length;
}

function countCustomSettings(repoName) {
  const repo = config.repositories[repoName];
  if (!repo) return 0;

  let count = 0;

  // Count custom languages
  count += Object.keys(repo.languages || {}).length;

  // Count custom commit settings
  count += Object.keys(repo.commit || {}).length;

  // Count custom pull request settings
  count += Object.keys(repo.pullRequest || {}).length;

  // Count custom issues settings
  count += Object.keys(repo.issues || {}).length;

  return count;
}

function hasCustomSettings(repoName) {
  return countCustomSettings(repoName) > 0;
}

// ===========================================
// Home Page
// ===========================================
function renderHomePage() {
  const repos = Object.entries(config.repositories || {});

  elements.app.innerHTML = `
    <div class="page page-home">
      <div class="page-header">
        <h1 class="page-title">Repositories</h1>
        <button class="btn btn-primary btn-rounded" id="btn-add-repo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 5v14"/><path d="M5 12h14"/>
          </svg>
          Add repository
        </button>
      </div>

      ${repos.length === 0 ? `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
            <path d="M9 18c-4.51 2-5-2-7-2"/>
          </svg>
          <p>No repositories configured yet</p>
          <p class="empty-state-hint">Add your first repository to get started</p>
        </div>
      ` : `
        <div class="repo-list">
          ${repos.map(([name, repo]) => {
            const customCount = countCustomSettings(name);
            return `
              <a href="#/repo/${encodeURIComponent(name)}" class="repo-list-item">
                <div class="repo-list-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                    <path d="M9 18c-4.51 2-5-2-7-2"/>
                  </svg>
                </div>
                <div class="repo-list-content">
                  <div class="repo-list-name">${escapeHtml(name)}</div>
                  <div class="repo-list-path">${escapeHtml(repo.path)}</div>
                </div>
                <div class="repo-list-meta">
                  ${customCount > 0 ? `<span class="custom-badge">${customCount} custom</span>` : ''}
                  <svg class="repo-list-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m9 18 6-6-6-6"/>
                  </svg>
                </div>
              </a>
            `;
          }).join('')}
        </div>
      `}

      <div class="settings-link-card">
        <a href="#/settings" class="settings-link">
          <div class="settings-link-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/>
              <path d="m22 22-5-10-5 10"/><path d="M14 18h6"/>
            </svg>
          </div>
          <div class="settings-link-content">
            <div class="settings-link-title">Default Languages</div>
            <div class="settings-link-desc">Configure global language settings</div>
          </div>
          <svg class="settings-link-arrow" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </a>
      </div>
    </div>
  `;

  // Event listeners
  document.getElementById('btn-add-repo')?.addEventListener('click', openAddModal);
}

// ===========================================
// Repository Detail Page
// ===========================================
function renderRepoPage(name) {
  const repo = config.repositories[name];

  if (!repo) {
    elements.app.innerHTML = `
      <div class="page page-not-found">
        <h1>Repository not found</h1>
        <p>The repository "${escapeHtml(name)}" does not exist.</p>
        <a href="#/" class="btn btn-primary">Back to repositories</a>
      </div>
    `;
    return;
  }

  const globalLangs = config.languages || {};
  const repoLangs = repo.languages || {};
  const commitSettings = repo.commit || {};
  const globalCommit = config.commit || {};

  const langOptions = (key) => {
    const globalVal = globalLangs[key] || 'en';
    const globalLabel = getLanguageLabel(globalVal);
    const currentVal = repoLangs[key] || 'default';

    return `
      <option value="default" ${currentVal === 'default' ? 'selected' : ''}>Default (${globalLabel})</option>
      <option value="en" ${currentVal === 'en' ? 'selected' : ''}>English</option>
      <option value="fr" ${currentVal === 'fr' ? 'selected' : ''}>Français</option>
    `;
  };

  const styleVal = commitSettings.style || 'default';
  const formatVal = commitSettings.format || 'default';
  const coAuthorVal = commitSettings.coAuthor !== undefined ? commitSettings.coAuthor : 'default';
  const includeTicketIdVal = commitSettings.includeTicketId !== undefined ? commitSettings.includeTicketId : 'default';

  const prSettings = repo.pullRequest || {};
  // Default is true for autoLinkTickets
  const autoLinkTicketsVal = prSettings.autoLinkTickets !== undefined ? prSettings.autoLinkTickets : true;

  const issuesSettings = repo.issues || {};
  // Default is true for commentOnPR
  const commentOnPRVal = issuesSettings.commentOnPR !== undefined ? issuesSettings.commentOnPR : true;

  elements.app.innerHTML = `
    <div class="page page-repo">
      <div class="page-breadcrumb">
        <a href="#/" class="breadcrumb-link">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Repositories
        </a>
      </div>

      <div class="page-header">
        <h1 class="page-title repo-title">${escapeHtml(name)}</h1>
        <button class="btn btn-danger-outline" id="btn-delete-repo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
          </svg>
          Delete
        </button>
      </div>

      <!-- General Section -->
      <section class="detail-section">
        <h2 class="detail-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v6m0 6v10"/><path d="m4.93 4.93 4.24 4.24m5.66 5.66 4.24 4.24"/><path d="M1 12h6m6 0h10"/><path d="m4.93 19.07 4.24-4.24m5.66-5.66 4.24-4.24"/>
          </svg>
          General
        </h2>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Path</label>
            <p class="setting-desc">Local path to the repository</p>
          </div>
          <div class="setting-control setting-control-wide">
            <input type="text" class="form-input" id="repo-path" value="${escapeHtml(repo.path)}">
            <div id="repo-path-status" class="path-status" style="display: none;"></div>
            <button class="btn btn-secondary btn-save-inline" id="btn-save-path" style="display: none;">Save</button>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Keywords</label>
            <p class="setting-desc">Auto-detection keywords (comma-separated)</p>
          </div>
          <div class="setting-control setting-control-wide">
            <input type="text" class="form-input" id="repo-keywords" value="${escapeHtml((repo.keywords || []).join(', '))}">
            <button class="btn btn-secondary btn-save-inline" id="btn-save-keywords" style="display: none;">Save</button>
          </div>
        </div>
      </section>

      <!-- Commit Section -->
      <section class="detail-section">
        <h2 class="detail-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="4"/><line x1="1.05" x2="7" y1="12" y2="12"/><line x1="17.01" x2="22.96" y1="12" y2="12"/>
          </svg>
          Commit
        </h2>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Language</label>
            <p class="setting-desc">Language for commit messages</p>
          </div>
          <div class="setting-control">
            <select class="setting-select" id="commit-lang" data-lang-key="commit">
              ${langOptions('commit')}
            </select>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Style</label>
            <p class="setting-desc">Single line or multi-line with body</p>
          </div>
          <div class="setting-control">
            <select class="setting-select" id="commit-style" data-commit-key="style">
              <option value="default" ${styleVal === 'default' ? 'selected' : ''}>Default (Single line)</option>
              <option value="single-line" ${styleVal === 'single-line' ? 'selected' : ''}>Single line</option>
              <option value="multi-line" ${styleVal === 'multi-line' ? 'selected' : ''}>Multi-line (with body)</option>
            </select>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Format</label>
            <p class="setting-desc">Commit message format/convention</p>
          </div>
          <div class="setting-control">
            <select class="setting-select" id="commit-format" data-commit-key="format">
              <option value="default" ${formatVal === 'default' ? 'selected' : ''}>Default (Angular)</option>
              <option value="conventional" ${formatVal === 'conventional' ? 'selected' : ''}>Conventional (type: description)</option>
              <option value="angular" ${formatVal === 'angular' ? 'selected' : ''}>Angular (type(scope): description)</option>
              <option value="gitmoji" ${formatVal === 'gitmoji' ? 'selected' : ''}>Gitmoji (emoji + description)</option>
              <option value="none" ${formatVal === 'none' ? 'selected' : ''}>None (free form)</option>
            </select>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Co-Author</label>
            <p class="setting-desc">Add Claude as co-author in commits</p>
          </div>
          <div class="setting-control">
            <label class="toggle-switch">
              <input type="checkbox" id="commit-coauthor" data-commit-toggle="coAuthor" ${coAuthorVal === true ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Include Ticket ID</label>
            <p class="setting-desc">Add ticket ID from branch name in commit message</p>
          </div>
          <div class="setting-control">
            <label class="toggle-switch">
              <input type="checkbox" id="commit-ticket-id" data-commit-toggle="includeTicketId" ${includeTicketIdVal === true ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="commit-preview">
          <div class="commit-preview-header">
            <span class="commit-preview-label">Example</span>
          </div>
          <code class="commit-preview-content" id="commit-preview-content"></code>
        </div>
      </section>

      <!-- Pull Request Section -->
      <section class="detail-section">
        <h2 class="detail-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>
          </svg>
          Pull Request
        </h2>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Language</label>
            <p class="setting-desc">Language for PR title and description</p>
          </div>
          <div class="setting-control">
            <select class="setting-select" id="pr-lang" data-lang-key="pullRequest">
              ${langOptions('pullRequest')}
            </select>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Auto-link Tickets</label>
            <p class="setting-desc">Add Jira/GitHub ticket links in PR description</p>
          </div>
          <div class="setting-control">
            <label class="toggle-switch">
              <input type="checkbox" id="pr-auto-link" data-pr-toggle="autoLinkTickets" ${autoLinkTicketsVal === true ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-row setting-row-template">
          <div class="setting-info">
            <label class="setting-label">PR Template</label>
            <p class="setting-desc">Template used when creating pull requests</p>
          </div>
          <div class="setting-control">
            <div id="pr-template-status" class="template-status loading">
              <div class="spinner-small"></div>
              <span>Checking...</span>
            </div>
          </div>
        </div>

        <div id="pr-template-container" class="template-container" style="display: none;">
          <div class="template-header">
            <span class="template-path" id="pr-template-path"></span>
            <button class="btn btn-secondary btn-small" id="btn-save-template" style="display: none;">Save</button>
          </div>
          <textarea class="template-editor" id="pr-template-content" placeholder="PR template content..."></textarea>
        </div>
      </section>

      <!-- Discussion Section -->
      <section class="detail-section">
        <h2 class="detail-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
          </svg>
          Discussion with Claude
        </h2>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Language</label>
            <p class="setting-desc">Language Claude uses to communicate</p>
          </div>
          <div class="setting-control">
            <select class="setting-select" id="discussion-lang" data-lang-key="discussion">
              ${langOptions('discussion')}
            </select>
          </div>
        </div>
      </section>

      <!-- Jira / GitHub Section -->
      <section class="detail-section">
        <h2 class="detail-section-title">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
            <path d="M9 18c-4.51 2-5-2-7-2"/>
          </svg>
          Jira / GitHub Issues
        </h2>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Comment Language</label>
            <p class="setting-desc">Language for comments on tickets/issues</p>
          </div>
          <div class="setting-control">
            <select class="setting-select" id="jira-lang" data-lang-key="jiraComment">
              ${langOptions('jiraComment')}
            </select>
          </div>
        </div>

        <div class="setting-row">
          <div class="setting-info">
            <label class="setting-label">Comment on PR Creation</label>
            <p class="setting-desc">Add a comment with PR link when creating a pull request</p>
          </div>
          <div class="setting-control">
            <label class="toggle-switch">
              <input type="checkbox" id="issues-comment-pr" data-issues-toggle="commentOnPR" ${commentOnPRVal === true ? 'checked' : ''}>
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>
    </div>
  `;

  // Event listeners
  const pathInput = document.getElementById('repo-path');
  const keywordsInput = document.getElementById('repo-keywords');
  const savePathBtn = document.getElementById('btn-save-path');
  const saveKeywordsBtn = document.getElementById('btn-save-keywords');
  const pathStatus = document.getElementById('repo-path-status');

  // Track original values
  let originalPath = repo.path;
  let originalKeywords = (repo.keywords || []).join(', ');

  // Path change handler
  pathInput.addEventListener('input', () => {
    const changed = pathInput.value !== originalPath;
    savePathBtn.style.display = changed ? 'inline-flex' : 'none';

    clearTimeout(pathValidationTimeout);
    pathValidationTimeout = setTimeout(async () => {
      const result = await api.validatePath(pathInput.value);
      pathStatus.style.display = 'flex';

      if (!result.exists) {
        pathStatus.className = 'path-status warning';
        pathStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span>Directory does not exist</span>`;
      } else if (!result.isGit) {
        pathStatus.className = 'path-status warning';
        pathStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span>Not a git repository</span>`;
      } else {
        pathStatus.className = 'path-status valid';
        pathStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg><span>Valid git repository</span>`;
      }
    }, 500);
  });

  // Keywords change handler
  keywordsInput.addEventListener('input', () => {
    const changed = keywordsInput.value !== originalKeywords;
    saveKeywordsBtn.style.display = changed ? 'inline-flex' : 'none';
  });

  // Save path
  savePathBtn.addEventListener('click', async () => {
    try {
      const result = await api.updateRepository(name, { path: pathInput.value });
      config = result.config;
      originalPath = pathInput.value;
      savePathBtn.style.display = 'none';
      showToast('Path updated');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  // Save keywords
  saveKeywordsBtn.addEventListener('click', async () => {
    try {
      const keywords = keywordsInput.value.split(',').map(k => k.trim()).filter(k => k);
      const result = await api.updateRepository(name, { keywords });
      config = result.config;
      originalKeywords = keywordsInput.value;
      saveKeywordsBtn.style.display = 'none';
      showToast('Keywords updated');
    } catch (error) {
      showToast(error.message, 'error');
    }
  });

  // Language selects
  document.querySelectorAll('[data-lang-key]').forEach(select => {
    select.addEventListener('change', async () => {
      const key = select.dataset.langKey;
      const value = select.value === 'default' ? null : select.value;

      try {
        const result = await api.updateRepositoryLanguages(name, { [key]: value });
        config = result.config;
        showToast('Language updated');
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  // Commit settings selects
  document.querySelectorAll('[data-commit-key]').forEach(select => {
    select.addEventListener('change', async () => {
      const key = select.dataset.commitKey;
      let value = select.value;

      // Convert string to appropriate type
      if (value === 'default') {
        value = null;
      } else if (value === 'true') {
        value = true;
      } else if (value === 'false') {
        value = false;
      }

      try {
        const result = await api.updateRepositoryCommitSettings(name, { [key]: value });
        config = result.config;
        showToast('Setting updated');
        updateCommitPreview();
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });

  // Commit settings toggles
  document.querySelectorAll('[data-commit-toggle]').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const key = toggle.dataset.commitToggle;
      // When unchecked, remove the setting (default is false)
      const value = toggle.checked ? true : null;

      try {
        const result = await api.updateRepositoryCommitSettings(name, { [key]: value });
        config = result.config;
        showToast('Setting updated');
        updateCommitPreview();
      } catch (error) {
        showToast(error.message, 'error');
        toggle.checked = !toggle.checked; // Revert on error
      }
    });
  });

  // Pull request settings toggles (default is true, so unchecked saves false)
  document.querySelectorAll('[data-pr-toggle]').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const key = toggle.dataset.prToggle;
      // Default is true, so when checked we remove the setting, when unchecked we save false
      const value = toggle.checked ? null : false;

      try {
        const result = await api.updateRepositoryPullRequestSettings(name, { [key]: value });
        config = result.config;
        showToast('Setting updated');
      } catch (error) {
        showToast(error.message, 'error');
        toggle.checked = !toggle.checked; // Revert on error
      }
    });
  });

  // Issues settings toggles (default is true, so unchecked saves false)
  document.querySelectorAll('[data-issues-toggle]').forEach(toggle => {
    toggle.addEventListener('change', async () => {
      const key = toggle.dataset.issuesToggle;
      // Default is true, so when checked we remove the setting, when unchecked we save false
      const value = toggle.checked ? null : false;

      try {
        const result = await api.updateRepositoryIssuesSettings(name, { [key]: value });
        config = result.config;
        showToast('Setting updated');
      } catch (error) {
        showToast(error.message, 'error');
        toggle.checked = !toggle.checked; // Revert on error
      }
    });
  });

  // Delete button
  document.getElementById('btn-delete-repo').addEventListener('click', () => {
    openDeleteModal(name);
  });

  // Load PR template
  loadPRTemplate(name);

  // Initialize commit preview
  updateCommitPreview();
}

// Load and display PR template
async function loadPRTemplate(repoName) {
  const statusEl = document.getElementById('pr-template-status');
  const containerEl = document.getElementById('pr-template-container');
  const pathEl = document.getElementById('pr-template-path');
  const contentEl = document.getElementById('pr-template-content');
  const saveBtn = document.getElementById('btn-save-template');

  if (!statusEl) return;

  try {
    const template = await api.getPRTemplate(repoName);
    console.log('[PR Template] API response:', template);

    if (template.exists) {
      // Template exists - show it
      statusEl.className = 'template-status exists';
      statusEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        <span>Template found</span>
      `;

      pathEl.textContent = template.path;
      contentEl.value = template.content;
      containerEl.style.display = 'block';

      // Track original content
      let originalContent = template.content;

      // Show save button on change
      contentEl.addEventListener('input', () => {
        const changed = contentEl.value !== originalContent;
        saveBtn.style.display = changed ? 'inline-flex' : 'none';
      });

      // Save button handler
      saveBtn.addEventListener('click', async () => {
        try {
          await api.updatePRTemplate(repoName, contentEl.value);
          originalContent = contentEl.value;
          saveBtn.style.display = 'none';
          showToast('PR template updated');
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    } else {
      // No template - show generate button
      statusEl.className = 'template-status missing';
      statusEl.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 8v8"/>
          <path d="M8 12h8"/>
        </svg>
        <button class="btn btn-primary btn-small" id="btn-generate-template">Generate template</button>
      `;

      // Generate button handler
      document.getElementById('btn-generate-template').addEventListener('click', async () => {
        try {
          const lang = config.repositories[repoName]?.languages?.pullRequest ||
                       config.languages?.pullRequest || 'en';
          await api.createPRTemplate(repoName, lang);
          showToast('PR template created');
          // Reload the template section
          loadPRTemplate(repoName);
        } catch (error) {
          showToast(error.message, 'error');
        }
      });
    }
  } catch (error) {
    statusEl.className = 'template-status error';
    statusEl.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="m15 9-6 6"/>
        <path d="m9 9 6 6"/>
      </svg>
      <span>Error loading template</span>
    `;
  }
}

// ===========================================
// Settings Page
// ===========================================
function renderSettingsPage() {
  const langs = config.languages || {};

  elements.app.innerHTML = `
    <div class="page page-settings">
      <div class="page-breadcrumb">
        <a href="#/" class="breadcrumb-link">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
          Repositories
        </a>
      </div>

      <div class="page-header">
        <h1 class="page-title">Default Languages</h1>
      </div>

      <p class="page-description">These settings apply to all repositories unless overridden individually.</p>

      <section class="detail-section">
        <div class="lang-grid">
          <div class="lang-item">
            <label class="lang-label" for="global-commit">Commit messages</label>
            <select class="lang-select" id="global-commit" data-key="commit">
              <option value="en" ${langs.commit !== 'fr' ? 'selected' : ''}>English</option>
              <option value="fr" ${langs.commit === 'fr' ? 'selected' : ''}>Français</option>
            </select>
          </div>

          <div class="lang-item">
            <label class="lang-label" for="global-pr">Pull Request</label>
            <select class="lang-select" id="global-pr" data-key="pullRequest">
              <option value="en" ${langs.pullRequest !== 'fr' ? 'selected' : ''}>English</option>
              <option value="fr" ${langs.pullRequest === 'fr' ? 'selected' : ''}>Français</option>
            </select>
          </div>

          <div class="lang-item">
            <label class="lang-label" for="global-jira">Jira comments</label>
            <select class="lang-select" id="global-jira" data-key="jiraComment">
              <option value="en" ${langs.jiraComment !== 'fr' ? 'selected' : ''}>English</option>
              <option value="fr" ${langs.jiraComment === 'fr' ? 'selected' : ''}>Français</option>
            </select>
          </div>

          <div class="lang-item">
            <label class="lang-label" for="global-discussion">Discussion (Claude)</label>
            <select class="lang-select" id="global-discussion" data-key="discussion">
              <option value="en" ${langs.discussion !== 'fr' ? 'selected' : ''}>English</option>
              <option value="fr" ${langs.discussion === 'fr' ? 'selected' : ''}>Français</option>
            </select>
          </div>
        </div>
      </section>
    </div>
  `;

  // Language select handlers
  document.querySelectorAll('.lang-select').forEach(select => {
    select.addEventListener('change', async () => {
      const key = select.dataset.key;
      const value = select.value;

      try {
        const result = await api.updateLanguages({ [key]: value });
        config = result.config;
        showToast('Language updated');
      } catch (error) {
        showToast(error.message, 'error');
      }
    });
  });
}

// ===========================================
// Modals
// ===========================================
function openAddModal() {
  elements.addModal.classList.add('open');
  elements.addName.value = '';
  elements.addPath.value = '';
  elements.addKeywords.value = '';
  elements.addNameError.textContent = '';
  elements.addPathError.textContent = '';
  elements.addPathStatus.style.display = 'none';
  elements.addName.focus();
}

function closeAddModal() {
  elements.addModal.classList.remove('open');
}

function openDeleteModal(name) {
  currentRepo = name;
  elements.deleteRepoName.textContent = name;
  elements.deleteModal.classList.add('open');
}

function closeDeleteModal() {
  elements.deleteModal.classList.remove('open');
}

// ===========================================
// Validation
// ===========================================
function validateAddName(name) {
  if (!name) {
    elements.addNameError.textContent = '';
    return false;
  }

  const pattern = /^[a-zA-Z0-9_-]+$/;
  if (!pattern.test(name)) {
    elements.addNameError.textContent = 'Only letters, numbers, hyphens and underscores allowed';
    return false;
  }

  if (config.repositories && config.repositories[name]) {
    elements.addNameError.textContent = `Repository '${name}' already exists`;
    return false;
  }

  elements.addNameError.textContent = '';
  return true;
}

async function validateAddPath(path) {
  if (!path) {
    elements.addPathStatus.style.display = 'none';
    return true;
  }

  try {
    const result = await api.validatePath(path);
    elements.addPathStatus.style.display = 'flex';

    if (!result.exists) {
      elements.addPathStatus.className = 'path-status warning';
      elements.addPathStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span>Directory does not exist</span>`;
    } else if (!result.isGit) {
      elements.addPathStatus.className = 'path-status warning';
      elements.addPathStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg><span>Not a git repository</span>`;
    } else {
      elements.addPathStatus.className = 'path-status valid';
      elements.addPathStatus.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg><span>Valid git repository</span>`;
    }
    return true;
  } catch (error) {
    return true;
  }
}

// ===========================================
// Handlers
// ===========================================
async function handleAddRepository() {
  const name = elements.addName.value.trim();
  const path = elements.addPath.value.trim();
  const keywords = elements.addKeywords.value.trim();

  if (!name) {
    elements.addNameError.textContent = 'Name is required';
    elements.addName.focus();
    return;
  }

  if (!validateAddName(name)) {
    elements.addName.focus();
    return;
  }

  if (!path) {
    elements.addPathError.textContent = 'Path is required';
    elements.addPath.focus();
    return;
  }

  try {
    const result = await api.addRepository(
      name,
      path,
      keywords ? keywords.split(',').map(k => k.trim()).filter(k => k) : []
    );

    config = result.config;

    if (result.warning) {
      showToast(`Repository '${name}' added (${result.warning})`, 'warning');
    } else {
      showToast(`Repository '${name}' added`);
    }

    closeAddModal();
    navigate(`#/repo/${encodeURIComponent(name)}`);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleDeleteRepository() {
  if (!currentRepo) return;

  try {
    const result = await api.deleteRepository(currentRepo);
    config = result.config;
    showToast(`Repository '${currentRepo}' deleted`);
    closeDeleteModal();
    navigate('#/');
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function handleClose() {
  try {
    await api.shutdown();

    // Show shutdown message immediately
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; flex-direction: column; gap: 16px; color: #a1a1aa; background: #0a0a0b;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 6 9 17l-5-5"/>
        </svg>
        <p style="font-size: 18px; color: #fff;">Server stopped</p>
        <p>You can close this tab</p>
        <kbd style="margin-top: 8px; padding: 6px 12px; background: #1c1c1f; border-radius: 6px; font-family: monospace; color: #a1a1aa;">⌘W</kbd>
      </div>
    `;

    // Try to close (works only if opened via window.open)
    setTimeout(() => window.close(), 100);
  } catch (error) {
    showToast('Failed to shutdown server', 'error');
  }
}

// ===========================================
// Event Listeners
// ===========================================
function setupEventListeners() {
  // Close button
  elements.closeBtn.addEventListener('click', handleClose);

  // Add modal
  elements.addModalClose.addEventListener('click', closeAddModal);
  elements.addCancel.addEventListener('click', closeAddModal);
  elements.addSave.addEventListener('click', handleAddRepository);
  elements.addModal.addEventListener('click', (e) => {
    if (e.target === elements.addModal) closeAddModal();
  });

  // Add form validation
  elements.addName.addEventListener('input', () => validateAddName(elements.addName.value.trim()));
  elements.addPath.addEventListener('input', () => {
    clearTimeout(pathValidationTimeout);
    pathValidationTimeout = setTimeout(() => validateAddPath(elements.addPath.value.trim()), 500);
  });
  elements.addForm.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddRepository();
    }
  });

  // Delete modal
  elements.deleteModalClose.addEventListener('click', closeDeleteModal);
  elements.deleteCancel.addEventListener('click', closeDeleteModal);
  elements.deleteConfirm.addEventListener('click', handleDeleteRepository);
  elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) closeDeleteModal();
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (elements.addModal.classList.contains('open')) closeAddModal();
      if (elements.deleteModal.classList.contains('open')) closeDeleteModal();
    }
  });

  // Hash change (routing)
  window.addEventListener('hashchange', handleRoute);
}

// ===========================================
// Initialize
// ===========================================
async function init() {
  try {
    config = await api.getConfig();
    elements.versionBadge.textContent = `v${config.version}`;
    setupEventListeners();
    handleRoute();
  } catch (error) {
    console.error('Failed to load config:', error);
    showToast('Failed to load configuration', 'error');
    elements.app.innerHTML = `
      <div class="error-state">
        <p>Failed to load configuration</p>
        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Start the app
init();
