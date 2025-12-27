# AI Enhancement Features (Deferred)

This document contains specifications for AI-powered features that were removed from the settings panel for later implementation.

## Overview

RetroWebLauncher supports optional AI features for enhanced functionality:
- Natural language search
- Smart collections
- AI-generated custom themes

## AI Features Section

### Settings UI

The AI Features section in settings includes:

```html
<!-- AI Features -->
<section class="settings-section">
  <h3 class="section-title">AI Features (Optional)</h3>

  <div class="setting-item">
    <label class="setting-label">
      <span class="label-text">Enable AI Features</span>
      <span class="label-desc">Natural language search, smart collections, and theme generation</span>
    </label>
    <label class="toggle">
      <input type="checkbox" name="ai.enabled" ?checked="${config.ai?.enabled}" />
      <span class="toggle-slider"></span>
    </label>
  </div>

  <div class="setting-item">
    <label class="setting-label" for="aiProvider">
      <span class="label-text">AI Provider</span>
      <span class="label-desc">Service to use for AI features</span>
    </label>
    <select id="aiProvider" name="ai.provider" class="setting-select">
      <option value="ollama" ?selected="${config.ai?.provider === 'ollama'}">Ollama (Local)</option>
      <option value="openai" ?selected="${config.ai?.provider === 'openai'}">OpenAI</option>
    </select>
  </div>
</section>
```

### Config Structure

```javascript
config.ai = {
  enabled: boolean,  // Enable/disable AI features
  provider: 'ollama' | 'openai'  // AI service provider
};
```

## AI Theme Generator Section

### Settings UI

```html
<!-- AI Theme Generator -->
<section class="settings-section theme-generator-section">
  <h3 class="section-title">AI Theme Generator</h3>
  <p class="section-desc">Create custom themes using natural language descriptions. Requires AI features to be enabled.</p>

  <div class="setting-item">
    <label class="setting-label" for="themeName">
      <span class="label-text">Theme Name</span>
      <span class="label-desc">A short name for your theme</span>
    </label>
    <input
      type="text"
      id="themeName"
      class="setting-input theme-name-input"
      placeholder="e.g., Ocean Breeze"
      maxlength="30"
    />
  </div>

  <div class="setting-item column">
    <label class="setting-label" for="themeDescription">
      <span class="label-text">Theme Description</span>
      <span class="label-desc">Describe your desired theme in detail</span>
    </label>
    <textarea
      id="themeDescription"
      class="setting-textarea theme-desc-input"
      placeholder="e.g., A calming ocean theme with deep blue backgrounds, teal accents, and wave-like gradients. Use soft, rounded corners and gentle animations. The primary color should be a bright cyan, with sandy beige as an accent color."
      rows="4"
    ></textarea>
  </div>

  <div class="setting-item">
    <button class="generate-theme-btn action-btn primary" ?disabled="${!config.ai?.enabled}">
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
      </svg>
      Generate Theme
    </button>
    <span class="setting-hint" id="themeGenHint">${config.ai?.enabled ? 'Uses AI to create pixel-perfect CSS' : 'Enable AI features first'}</span>
  </div>

  <div class="theme-preview" id="themePreview" style="display: none;">
    <h4>Preview</h4>
    <div class="preview-colors"></div>
    <div class="preview-actions">
      <button class="action-btn save-theme-btn">Save Theme</button>
      <button class="action-btn cancel-theme-btn">Cancel</button>
    </div>
  </div>

  <div class="custom-themes-list" id="customThemesList">
    <h4>Custom Themes</h4>
    <div class="themes-grid"></div>
  </div>
</section>
```

### CSS Styles

```css
/* Theme generator styles */
.section-desc {
  font-size: var(--font-size-xs, 0.625rem);
  color: var(--color-text-muted, #888);
  margin: 0 0 var(--spacing-md, 1rem) 0;
}

.setting-item.column {
  flex-direction: column;
  align-items: stretch;
}

.setting-textarea {
  width: 100%;
  padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
  background: var(--settings-input-bg, rgba(0,0,0,0.4));
  border: 1px solid var(--settings-input-border, rgba(255,255,255,0.2));
  border-radius: var(--radius-md, 8px);
  color: var(--color-text, #fff);
  font-size: var(--font-size-sm, 0.75rem);
  font-family: var(--font-body);
  resize: vertical;
  min-height: 80px;
  outline: none;
  transition: border-color var(--transition-fast, 150ms);
}

.setting-textarea:focus {
  border-color: var(--color-primary, #ff0066);
}

.action-btn.primary {
  background: var(--color-primary, #ff0066);
  border-color: var(--color-primary, #ff0066);
  display: inline-flex;
  align-items: center;
  gap: var(--spacing-xs, 0.25rem);
}

.action-btn.primary:hover:not(:disabled) {
  background: var(--color-primary-hover, #ff3388);
}

.action-btn.primary svg {
  width: 16px;
  height: 16px;
}

.theme-preview {
  margin-top: var(--spacing-md, 1rem);
  padding: var(--spacing-md, 1rem);
  background: var(--settings-preview-bg, rgba(0,0,0,0.3));
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--settings-border, rgba(255,255,255,0.1));
}

.theme-preview h4 {
  font-size: var(--font-size-sm, 0.75rem);
  color: var(--color-text, #fff);
  margin: 0 0 var(--spacing-sm, 0.5rem) 0;
}

.preview-colors {
  display: flex;
  gap: var(--spacing-xs, 0.25rem);
  margin-bottom: var(--spacing-md, 1rem);
}

.preview-color {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm, 4px);
  border: 1px solid var(--settings-border, rgba(255,255,255,0.2));
}

.preview-actions {
  display: flex;
  gap: var(--spacing-sm, 0.5rem);
}

.custom-themes-list {
  margin-top: var(--spacing-lg, 1.5rem);
}

.custom-themes-list h4 {
  font-size: var(--font-size-sm, 0.75rem);
  color: var(--color-text-muted, #888);
  margin: 0 0 var(--spacing-sm, 0.5rem) 0;
}

.themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: var(--spacing-sm, 0.5rem);
}

.theme-card {
  position: relative;
  padding: var(--spacing-sm, 0.5rem);
  background: var(--settings-card-bg, rgba(255,255,255,0.05));
  border-radius: var(--radius-md, 8px);
  border: 1px solid var(--settings-border, rgba(255,255,255,0.1));
  cursor: pointer;
  transition: all var(--transition-fast, 150ms);
}

.theme-card:hover {
  border-color: var(--color-primary, #ff0066);
}

.theme-card.active {
  border-color: var(--color-primary, #ff0066);
  background: var(--theme-card-active-bg, rgba(255,0,102,0.1));
}

.theme-card-name {
  font-size: var(--font-size-sm, 0.75rem);
  color: var(--color-text, #fff);
  margin-bottom: var(--spacing-xs, 0.25rem);
}

.theme-card-colors {
  display: flex;
  gap: 2px;
}

.theme-card-color {
  width: 20px;
  height: 20px;
  border-radius: 2px;
}

.theme-card-badge {
  font-size: 8px;
  color: var(--color-text-muted, #888);
  margin-top: var(--spacing-xs, 0.25rem);
}

.theme-card-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  background: var(--delete-button-bg, rgba(255,0,0,0.8));
  border: none;
  border-radius: 50%;
  width: 20px;
  height: 20px;
  color: var(--delete-button-color, white);
  cursor: pointer;
  display: none;
}

.theme-card:hover .theme-card-delete {
  display: block;
}
```

### JavaScript Methods

```javascript
async _generateTheme() {
  const nameInput = this.shadowRoot.querySelector('.theme-name-input');
  const descInput = this.shadowRoot.querySelector('.theme-desc-input');
  const genBtn = this.shadowRoot.querySelector('.generate-theme-btn');

  const name = nameInput?.value?.trim();
  const description = descInput?.value?.trim();

  if (!name || !description) {
    this._showError('Please enter both a theme name and description');
    return;
  }

  genBtn.disabled = true;
  genBtn.innerHTML = '<span class="spinner"></span> Generating...';

  try {
    const response = await fetch('/api/themes/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate theme');
    }

    this._showSuccess(`Theme "${data.theme.name}" created successfully!`);
    nameInput.value = '';
    descInput.value = '';

    // Reload themes list
    await this._loadCustomThemes();

  } catch (error) {
    console.error('Theme generation failed:', error);
    this._showError(error.message);
  } finally {
    genBtn.disabled = !this._config.ai?.enabled;
    genBtn.innerHTML = `
      <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
        <path d="M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z"/>
      </svg>
      Generate Theme
    `;
  }
}

async _loadCustomThemes() {
  try {
    const response = await fetch('/api/themes');
    if (!response.ok) {
      console.error('Failed to fetch themes:', response.status);
      return;
    }

    const data = await response.json();

    const grid = this.shadowRoot.querySelector('.themes-grid');
    if (!grid) return;

    // Handle missing or invalid themes data
    if (!data.themes || !Array.isArray(data.themes)) {
      grid.innerHTML = '<p class="no-themes">Unable to load themes</p>';
      return;
    }

    const customThemes = data.themes.filter(t => !t.isBuiltIn);

    if (customThemes.length === 0) {
      grid.innerHTML = '<p class="no-themes">No custom themes yet. Create one above!</p>';
      return;
    }

    grid.innerHTML = customThemes.map(theme => `
      <div class="theme-card ${data.currentTheme === theme.id ? 'active' : ''}" data-theme-id="${theme.id}">
        <div class="theme-card-name">${theme.name}</div>
        <div class="theme-card-badge">${theme.isAiGenerated ? 'AI Generated' : 'Custom'}</div>
        <button class="theme-card-delete" title="Delete theme">×</button>
      </div>
    `).join('');

  } catch (error) {
    console.error('Failed to load themes:', error);
  }
}

async _deleteTheme(themeId) {
  if (!confirm(`Delete theme "${themeId}"?`)) return;

  try {
    const response = await fetch(`/api/themes/${themeId}`, {
      method: 'DELETE'
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to delete theme');
    }

    this._showSuccess('Theme deleted');
    await this._loadCustomThemes();

  } catch (error) {
    console.error('Failed to delete theme:', error);
    this._showError(error.message);
  }
}

_cancelThemePreview() {
  const preview = this.shadowRoot.querySelector('#themePreview');
  if (preview) preview.style.display = 'none';
}

async _saveGeneratedTheme() {
  // Theme is already saved during generation, just close preview
  this._cancelThemePreview();
  this._showSuccess('Theme saved!');
}
```

### Event Handlers in _bindEvents()

```javascript
if (e.target.closest('.generate-theme-btn')) {
  await this._generateTheme();
}

if (e.target.closest('.save-theme-btn')) {
  await this._saveGeneratedTheme();
}

if (e.target.closest('.cancel-theme-btn')) {
  this._cancelThemePreview();
}

if (e.target.closest('.theme-card-delete')) {
  const card = e.target.closest('.theme-card');
  if (card) {
    await this._deleteTheme(card.dataset.themeId);
  }
}
```

### In _loadConfig()

```javascript
// Load themes into dropdown and custom themes grid
await this._loadThemesDropdown();
await this._loadCustomThemes();  // <-- AI-related call
```

## API Endpoints

### POST /api/themes/generate

Generate a new theme using AI.

**Request Body:**
```json
{
  "name": "Ocean Breeze",
  "description": "A calming ocean theme with deep blue backgrounds..."
}
```

**Response:**
```json
{
  "theme": {
    "id": "ocean-breeze",
    "name": "Ocean Breeze",
    "isAiGenerated": true
  }
}
```

### DELETE /api/themes/:themeId

Delete a custom theme.

**Response:**
```json
{
  "success": true
}
```

## Server-Side Implementation

The AI features are implemented in:
- `src/server/ai/index.js` - AI availability check
- `src/server/ai/theme-generator.js` - AI theme generation
- `src/server/ai/providers/` - Ollama/OpenAI integrations
- `src/server/themes/theme-compiler.js` - JSON config -> CSS compiler

## Re-enabling AI Features

To restore AI features:

1. Add the CSS styles above to the `static styles` block in `rwl-settings.js`
2. Add the HTML sections to the `render()` method
3. Add the JavaScript methods to the class
4. Add the event handlers to `_bindEvents()`
5. Add `await this._loadCustomThemes();` back to `_loadConfig()`
6. Ensure the server-side AI endpoints are active
