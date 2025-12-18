/**
 * RetroWebLauncher - Themes API Routes
 * AI-powered theme generation and management
 */

const express = require('express');
const router = express.Router();
const themeGenerator = require('../ai/theme-generator');
const ai = require('../ai');
const config = require('../config');

/**
 * GET /api/themes
 * List all available themes
 */
router.get('/', (req, res) => {
  try {
    const themes = themeGenerator.getAvailableThemes();
    res.json({
      themes,
      currentTheme: config.get('theme') || 'classic-arcade',
      aiEnabled: ai.isAvailable()
    });
  } catch (error) {
    console.error('Error getting themes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/themes/generate
 * Generate a new theme using AI
 */
router.post('/generate', async (req, res) => {
  try {
    const { description, name } = req.body;

    if (!description || !name) {
      return res.status(400).json({
        error: 'Both description and name are required'
      });
    }

    // Check if AI is available
    if (!ai.isAvailable()) {
      return res.status(503).json({
        error: 'AI features are not enabled. Enable AI in settings first.',
        aiEnabled: false
      });
    }

    // Get the AI provider
    const aiConfig = config.get('ai');
    const providerName = aiConfig?.provider || 'ollama';

    let provider;
    if (providerName === 'openai') {
      provider = require('../ai/providers/openai');
    } else {
      provider = require('../ai/providers/ollama');
    }

    // Generate the theme
    const theme = await themeGenerator.generateTheme(description, name, provider);

    // Save the theme
    const saved = await themeGenerator.saveTheme(theme);

    res.json({
      success: true,
      theme: {
        id: theme.themeName,
        name: theme.displayName,
        fileName: saved.fileName,
        isAiGenerated: true
      },
      message: `Theme "${theme.displayName}" generated successfully`
    });
  } catch (error) {
    console.error('Error generating theme:', error);
    res.status(500).json({
      error: error.message,
      details: 'Theme generation failed. Try a different description or check AI provider settings.'
    });
  }
});

/**
 * POST /api/themes/preview
 * Preview a theme without saving
 */
router.post('/preview', async (req, res) => {
  try {
    const { description, name } = req.body;

    if (!description || !name) {
      return res.status(400).json({
        error: 'Both description and name are required'
      });
    }

    if (!ai.isAvailable()) {
      return res.status(503).json({
        error: 'AI features are not enabled',
        aiEnabled: false
      });
    }

    const aiConfig = config.get('ai');
    const providerName = aiConfig?.provider || 'ollama';

    let provider;
    if (providerName === 'openai') {
      provider = require('../ai/providers/openai');
    } else {
      provider = require('../ai/providers/ollama');
    }

    const css = await themeGenerator.previewTheme(description, name, provider);

    res.json({
      success: true,
      css,
      themeName: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    });
  } catch (error) {
    console.error('Error previewing theme:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/themes/:id
 * Delete a custom theme
 */
router.delete('/:id', (req, res) => {
  try {
    const themeName = req.params.id;
    const deleted = themeGenerator.deleteTheme(themeName);

    if (deleted) {
      res.json({
        success: true,
        message: `Theme "${themeName}" deleted`
      });
    } else {
      res.status(404).json({
        error: 'Theme not found'
      });
    }
  } catch (error) {
    console.error('Error deleting theme:', error);

    if (error.message.includes('built-in')) {
      return res.status(403).json({ error: error.message });
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/themes/:id/css
 * Get CSS for a specific theme
 */
router.get('/:id/css', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const themeName = req.params.id;
    const themesDir = path.join(__dirname, '..', '..', 'client', 'css', 'themes');
    const filePath = path.join(themesDir, `${themeName}.css`);

    if (fs.existsSync(filePath)) {
      const css = fs.readFileSync(filePath, 'utf-8');
      res.type('text/css').send(css);
    } else {
      res.status(404).json({ error: 'Theme not found' });
    }
  } catch (error) {
    console.error('Error getting theme CSS:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
