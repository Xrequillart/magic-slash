const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const config = require('./lib/config');
const validation = require('./lib/validation');

const app = express();
const PORT = 3847;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

// GET /api/config - Read full configuration
app.get('/api/config', (req, res) => {
  try {
    const configData = config.readConfig();
    res.json(configData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read configuration' });
  }
});

// POST /api/repositories - Add a new repository
app.post('/api/repositories', (req, res) => {
  try {
    const { name, path: repoPath, keywords } = req.body;

    // Validate name
    const nameValidation = validation.validateRepoName(name);
    if (!nameValidation.valid) {
      return res.status(400).json({ error: nameValidation.error });
    }

    // Check if name already exists
    const currentConfig = config.readConfig();
    if (currentConfig.repositories && currentConfig.repositories[name]) {
      return res.status(400).json({ error: `Repository '${name}' already exists` });
    }

    // Validate path
    const pathValidation = validation.validateRepoPath(repoPath);
    if (!pathValidation.valid) {
      return res.status(400).json({ error: pathValidation.error });
    }

    // Parse keywords
    const keywordsList = Array.isArray(keywords)
      ? keywords
      : validation.parseKeywords(keywords);

    // Add repository
    const updatedConfig = config.addRepository(name, pathValidation.expandedPath, keywordsList);

    res.json({
      success: true,
      warning: pathValidation.warning,
      config: updatedConfig
    });
  } catch (error) {
    console.error('Error adding repository:', error);
    res.status(500).json({ error: 'Failed to add repository' });
  }
});

// PUT /api/repositories/:name - Update a repository
app.put('/api/repositories/:name', (req, res) => {
  try {
    const { name } = req.params;
    const { path: repoPath, keywords } = req.body;

    const updates = {};

    // Validate and set path if provided
    if (repoPath !== undefined) {
      const pathValidation = validation.validateRepoPath(repoPath);
      if (!pathValidation.valid) {
        return res.status(400).json({ error: pathValidation.error });
      }
      updates.path = pathValidation.expandedPath;
    }

    // Parse and set keywords if provided
    if (keywords !== undefined) {
      updates.keywords = Array.isArray(keywords)
        ? keywords
        : validation.parseKeywords(keywords);
    }

    const updatedConfig = config.updateRepository(name, updates);
    res.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error('Error updating repository:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update repository' });
    }
  }
});

// DELETE /api/repositories/:name - Delete a repository
app.delete('/api/repositories/:name', (req, res) => {
  try {
    const { name } = req.params;
    const updatedConfig = config.deleteRepository(name);
    res.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error('Error deleting repository:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to delete repository' });
    }
  }
});

// PUT /api/languages - Update global language settings
app.put('/api/languages', (req, res) => {
  try {
    const languages = req.body;
    const updatedConfig = config.updateLanguages(languages);
    res.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error('Error updating languages:', error);
    res.status(500).json({ error: 'Failed to update language settings' });
  }
});

// PUT /api/repositories/:name/languages - Update repository-specific language settings
app.put('/api/repositories/:name/languages', (req, res) => {
  try {
    const { name } = req.params;
    const languages = req.body;
    const updatedConfig = config.updateRepositoryLanguages(name, languages);
    res.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error('Error updating repository languages:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update repository language settings' });
    }
  }
});

// PUT /api/repositories/:name/commit - Update repository-specific commit settings
app.put('/api/repositories/:name/commit', (req, res) => {
  try {
    const { name } = req.params;
    const settings = req.body;
    const updatedConfig = config.updateRepositoryCommitSettings(name, settings);
    res.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error('Error updating repository commit settings:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update repository commit settings' });
    }
  }
});

// PUT /api/repositories/:name/pull-request - Update repository-specific pull request settings
app.put('/api/repositories/:name/pull-request', (req, res) => {
  try {
    const { name } = req.params;
    const settings = req.body;
    const updatedConfig = config.updateRepositoryPullRequestSettings(name, settings);
    res.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error('Error updating repository pull request settings:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update repository pull request settings' });
    }
  }
});

// PUT /api/repositories/:name/issues - Update repository-specific issues settings
app.put('/api/repositories/:name/issues', (req, res) => {
  try {
    const { name } = req.params;
    const settings = req.body;
    const updatedConfig = config.updateRepositoryIssuesSettings(name, settings);
    res.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error('Error updating repository issues settings:', error);
    if (error.message.includes('not found')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to update repository issues settings' });
    }
  }
});

// POST /api/validate-path - Validate if a path is a git repository
app.post('/api/validate-path', (req, res) => {
  try {
    const { path: repoPath } = req.body;

    if (!repoPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const result = validation.isGitRepository(repoPath);
    res.json(result);
  } catch (error) {
    console.error('Error validating path:', error);
    res.status(500).json({ error: 'Failed to validate path' });
  }
});

// GET /api/repositories/:name/pr-template - Get PR template for a repository
app.get('/api/repositories/:name/pr-template', (req, res) => {
  try {
    const { name } = req.params;
    const currentConfig = config.readConfig();

    if (!currentConfig.repositories || !currentConfig.repositories[name]) {
      return res.status(404).json({ error: `Repository '${name}' not found` });
    }

    const repoPath = currentConfig.repositories[name].path;
    const result = validation.getPRTemplate(repoPath);
    res.json(result);
  } catch (error) {
    console.error('Error getting PR template:', error);
    res.status(500).json({ error: 'Failed to get PR template' });
  }
});

// POST /api/repositories/:name/pr-template - Create PR template for a repository
app.post('/api/repositories/:name/pr-template', (req, res) => {
  try {
    const { name } = req.params;
    const { content, language } = req.body;
    const currentConfig = config.readConfig();

    if (!currentConfig.repositories || !currentConfig.repositories[name]) {
      return res.status(404).json({ error: `Repository '${name}' not found` });
    }

    const repoPath = currentConfig.repositories[name].path;
    const result = validation.createPRTemplate(repoPath, content, language || 'en');
    res.json(result);
  } catch (error) {
    console.error('Error creating PR template:', error);
    res.status(500).json({ error: 'Failed to create PR template' });
  }
});

// PUT /api/repositories/:name/pr-template - Update PR template for a repository
app.put('/api/repositories/:name/pr-template', (req, res) => {
  try {
    const { name } = req.params;
    const { content } = req.body;
    const currentConfig = config.readConfig();

    if (!currentConfig.repositories || !currentConfig.repositories[name]) {
      return res.status(404).json({ error: `Repository '${name}' not found` });
    }

    const repoPath = currentConfig.repositories[name].path;
    const template = validation.getPRTemplate(repoPath);

    if (!template.exists) {
      return res.status(404).json({ error: 'No PR template found' });
    }

    const fs = require('fs');
    fs.writeFileSync(template.fullPath, content);
    res.json({ success: true, path: template.path });
  } catch (error) {
    console.error('Error updating PR template:', error);
    res.status(500).json({ error: 'Failed to update PR template' });
  }
});

// POST /api/shutdown - Shutdown the server
app.post('/api/shutdown', (req, res) => {
  res.json({ success: true, message: 'Server shutting down...' });

  // Give time for the response to be sent
  setTimeout(() => {
    console.log('\nServer stopped by user request.');
    process.exit(0);
  }, 500);
});

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`\nMagic Slash Web UI running at http://localhost:${PORT}`);
  console.log('Press Ctrl+C to stop the server\n');

  // Open browser (macOS)
  if (process.platform === 'darwin') {
    exec(`open http://localhost:${PORT}`);
  } else if (process.platform === 'linux') {
    exec(`xdg-open http://localhost:${PORT}`);
  } else if (process.platform === 'win32') {
    exec(`start http://localhost:${PORT}`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server stopped.');
    process.exit(0);
  });
});
