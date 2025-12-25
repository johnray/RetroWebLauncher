/**
 * RetroWebLauncher - Settings Component
 * Configuration panel
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';

const { LitElement, html, css } = window.Lit;

class RwlSettings extends LitElement {
  static properties = {
    _config: { type: Object, state: true },
    _saving: { type: Boolean, state: true },
    _dirty: { type: Boolean, state: true }
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .settings-container {
      height: 100%;
      overflow-y: auto;
      background: var(--settings-background, rgba(0,0,0,0.8));
    }

    .settings-wrapper {
      max-width: 800px;
      margin: 0 auto;
      padding: var(--spacing-lg, 1.5rem);
    }

    .settings-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-md, 1rem);
      margin-bottom: var(--spacing-xl, 2rem);
    }

    .back-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--button-secondary-bg, rgba(255,255,255,0.1));
      border: none;
      border-radius: var(--radius-md, 8px);
      color: var(--color-text, #fff);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms);
    }

    .back-btn:hover {
      background: var(--button-secondary-hover, rgba(255,255,255,0.2));
    }

    .back-btn svg {
      width: 24px;
      height: 24px;
    }

    .settings-title {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: var(--font-size-xl, 1.5rem);
      color: var(--settings-title-color, var(--color-primary, #ff0066));
      margin: 0;
    }

    .settings-section {
      background: var(--settings-section-bg, rgba(255,255,255,0.05));
      border-radius: var(--radius-lg, 12px);
      padding: var(--spacing-lg, 1.5rem);
      margin-bottom: var(--spacing-lg, 1.5rem);
      border: 1px solid var(--settings-border, transparent);
    }

    .section-title {
      font-size: var(--font-size-sm, 0.75rem);
      color: var(--settings-title-color, var(--color-primary, #ff0066));
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin: 0 0 var(--spacing-lg, 1.5rem) 0;
      padding-bottom: var(--spacing-sm, 0.5rem);
      border-bottom: 1px solid var(--settings-border, rgba(255,0,102,0.3));
    }

    .setting-item {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--spacing-md, 1rem);
      margin-bottom: var(--spacing-md, 1rem);
    }

    .setting-item:last-child {
      margin-bottom: 0;
    }

    .setting-label {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .label-text {
      font-size: var(--font-size-sm, 0.75rem);
      color: var(--settings-label-color, var(--color-text, #fff));
      font-weight: 500;
    }

    .label-desc {
      font-size: var(--font-size-xs, 0.625rem);
      color: var(--settings-desc-color, var(--color-text-muted, #888));
    }

    .setting-input,
    .setting-select {
      width: 250px;
      padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
      background: var(--settings-input-bg, rgba(0,0,0,0.4));
      border: 1px solid var(--settings-input-border, rgba(255,255,255,0.2));
      border-radius: var(--radius-md, 8px);
      color: var(--color-text, #fff);
      font-size: var(--font-size-sm, 0.75rem);
      outline: none;
      transition: border-color var(--transition-fast, 150ms);
    }

    .setting-input:focus,
    .setting-select:focus {
      border-color: var(--color-primary, #ff0066);
    }

    .setting-input.small {
      width: 100px;
    }

    .setting-select {
      cursor: pointer;
    }

    /* Fix for dropdown options visibility - use explicit dark colors
       because <option> elements have limited CSS variable support */
    .setting-select option {
      background: #1a1a1a;
      color: #ffffff;
    }

    .setting-select optgroup {
      background: #1a1a1a;
      color: #888888;
    }

    /* Toggle switch */
    .toggle {
      position: relative;
      display: inline-block;
      width: 50px;
      height: 28px;
      flex-shrink: 0;
    }

    .toggle input {
      opacity: 0;
      width: 0;
      height: 0;
    }

    .toggle-slider {
      position: absolute;
      cursor: pointer;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--toggle-bg, rgba(255,255,255,0.2));
      border-radius: 28px;
      transition: background var(--transition-fast, 150ms);
    }

    .toggle-slider:before {
      position: absolute;
      content: "";
      height: 22px;
      width: 22px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: transform var(--transition-fast, 150ms);
    }

    .toggle input:checked + .toggle-slider {
      background: var(--color-primary, #ff0066);
    }

    .toggle input:checked + .toggle-slider:before {
      transform: translateX(22px);
    }

    .toggle input:focus-visible + .toggle-slider {
      outline: 2px solid var(--color-primary, #ff0066);
      outline-offset: 2px;
    }

    .action-btn {
      padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
      background: var(--button-secondary-bg, rgba(255,255,255,0.1));
      border: 1px solid var(--button-secondary-border, rgba(255,255,255,0.2));
      border-radius: var(--radius-md, 8px);
      color: var(--color-text, #fff);
      font-size: var(--font-size-sm, 0.75rem);
      cursor: pointer;
      transition: all var(--transition-fast, 150ms);
    }

    .action-btn:hover:not(:disabled) {
      background: var(--button-secondary-hover, rgba(255,255,255,0.2));
    }

    .action-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .setting-hint {
      font-size: var(--font-size-xs, 0.625rem);
      color: var(--color-text-muted, #888);
      margin-left: var(--spacing-sm, 0.5rem);
    }

    .settings-footer {
      position: sticky;
      bottom: 0;
      padding: var(--spacing-md, 1rem);
      background: var(--settings-footer-background, linear-gradient(transparent, rgba(0,0,0,0.9) 30%));
      display: flex;
      justify-content: flex-end;
    }

    .save-btn {
      padding: var(--spacing-sm, 0.5rem) var(--spacing-lg, 1.5rem);
      background: var(--color-primary, #ff0066);
      border: none;
      border-radius: var(--radius-md, 8px);
      color: var(--color-text, #fff);
      font-size: var(--font-size-sm, 0.75rem);
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast, 150ms);
    }

    .save-btn:hover:not(:disabled) {
      background: var(--color-primary-hover, #ff3388);
    }

    .save-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .about-info {
      text-align: center;
      color: var(--color-text-muted, #888);
    }

    .about-info p {
      margin: var(--spacing-xs, 0.25rem) 0;
    }

    .about-info strong {
      color: var(--color-text, #fff);
    }

    .spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid var(--spinner-track, rgba(255,255,255,0.2));
      border-top-color: currentColor;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

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

    /* Scrollbar */
    .settings-container::-webkit-scrollbar {
      width: 8px;
    }

    .settings-container::-webkit-scrollbar-track {
      background: var(--content-scrollbar-track, rgba(0,0,0,0.2));
    }

    .settings-container::-webkit-scrollbar-thumb {
      background: var(--content-scrollbar-thumb, rgba(255,255,255,0.2));
      border-radius: 4px;
    }

    /* Mobile */
    @media (max-width: 640px) {
      .setting-item {
        flex-direction: column;
        align-items: stretch;
      }

      .setting-input,
      .setting-select {
        width: 100%;
      }

      .toggle {
        align-self: flex-start;
      }
    }
  `;

  constructor() {
    super();
    this._config = {};
    this._saving = false;
    this._dirty = false;
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadConfig();
    this._bindEvents();
  }

  async _loadConfig() {
    try {
      const response = await api.getConfig();
      this._config = response.config || {};
      this.requestUpdate();

      // Wait for render to complete before querying DOM elements
      await this.updateComplete;

      // Load themes into dropdown and custom themes grid
      await this._loadThemesDropdown();
      await this._loadCustomThemes();
    } catch (error) {
      console.error('Failed to load config:', error);
      this._showError('Failed to load settings');
    }
  }

  async _loadThemesDropdown() {
    try {
      const response = await fetch('/api/themes');
      if (!response.ok) {
        console.error('Failed to fetch themes:', response.status);
        return; // Keep default options
      }

      const data = await response.json();

      const select = this.shadowRoot.querySelector('#theme');
      if (!select) return;

      // Only proceed if we have valid themes data
      if (!data.themes || !Array.isArray(data.themes) || data.themes.length === 0) {
        console.warn('No themes returned from API, keeping defaults');
        return;
      }

      // Clear existing options only if we have new data
      select.innerHTML = '';

      // Add built-in themes first
      const builtIn = data.themes.filter(t => t.isBuiltIn);
      const custom = data.themes.filter(t => !t.isBuiltIn);

      builtIn.forEach(theme => {
        const option = document.createElement('option');
        option.value = theme.id;
        option.textContent = theme.name;
        if (this._config.theme === theme.id || data.currentTheme === theme.id) {
          option.selected = true;
        }
        select.appendChild(option);
      });

      // Add custom themes if any
      if (custom.length > 0) {
        const optgroup = document.createElement('optgroup');
        optgroup.label = 'Custom Themes';

        custom.forEach(theme => {
          const option = document.createElement('option');
          option.value = theme.id;
          option.textContent = `${theme.name}${theme.isAiGenerated ? ' (AI)' : ''}`;
          if (this._config.theme === theme.id || data.currentTheme === theme.id) {
            option.selected = true;
          }
          optgroup.appendChild(option);
        });

        select.appendChild(optgroup);
      }

      console.log('Loaded themes:', data.themes.length);
    } catch (error) {
      console.error('Failed to load themes dropdown:', error);
      // Keep existing default options on error
    }
  }

  _bindEvents() {
    // Form changes
    this.shadowRoot.addEventListener('change', (e) => {
      const input = e.target;
      this._handleInputChange(input);
    });

    // Save button
    this.shadowRoot.addEventListener('click', async (e) => {
      if (e.target.closest('.save-btn')) {
        await this._saveConfig();
      }

      if (e.target.closest('.back-btn')) {
        if (this._dirty) {
          if (confirm('You have unsaved changes. Discard?')) {
            router.back();
          }
        } else {
          router.back();
        }
      }

      if (e.target.closest('.rescan-btn')) {
        await this._rescanLibrary();
      }

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
    });

    // Keyboard
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        router.back();
      } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        this._saveConfig();
      }
    });
  }

  _handleInputChange(input) {
    const key = input.name;
    let value;

    if (input.type === 'checkbox') {
      value = input.checked;
    } else if (input.type === 'number') {
      value = parseInt(input.value, 10);
    } else {
      value = input.value;
    }

    // Handle nested config (e.g., attractMode.enabled)
    if (key.includes('.')) {
      const [parent, child] = key.split('.');
      if (!this._config[parent]) {
        this._config[parent] = {};
      }
      this._config[parent][child] = value;
    } else {
      this._config[key] = value;
    }

    // Apply theme changes immediately for instant preview
    if (key === 'theme') {
      themeService.loadThemeSettings(value);
    }

    this._dirty = true;
    this._updateSaveButton();
  }

  _updateSaveButton() {
    const saveBtn = this.shadowRoot.querySelector('.save-btn');
    if (saveBtn) {
      saveBtn.disabled = !this._dirty || this._saving;
      saveBtn.textContent = this._saving ? 'Saving...' : 'Save Changes';
    }
  }

  async _saveConfig() {
    if (!this._dirty || this._saving) return;

    this._saving = true;
    this._updateSaveButton();

    try {
      await api.saveConfig(this._config);
      this._dirty = false;
      state.set('config', this._config);
      state.emit('configSaved');
      this._showSuccess('Settings saved');
    } catch (error) {
      console.error('Failed to save config:', error);
      this._showError('Failed to save settings');
    } finally {
      this._saving = false;
      this._updateSaveButton();
    }
  }

  async _rescanLibrary() {
    const rescanBtn = this.shadowRoot.querySelector('.rescan-btn');
    if (rescanBtn) {
      rescanBtn.disabled = true;
      rescanBtn.innerHTML = '<span class="spinner"></span> Scanning...';
    }

    try {
      await api.rescanLibrary();
      this._showSuccess('Library scan complete');
      state.emit('libraryUpdated');
    } catch (error) {
      console.error('Failed to rescan library:', error);
      this._showError('Failed to rescan library');
    } finally {
      if (rescanBtn) {
        rescanBtn.disabled = false;
        rescanBtn.innerHTML = 'Rescan Library';
      }
    }
  }

  _showSuccess(message) {
    state.emit('notification', { type: 'success', message });
  }

  _showError(message) {
    state.emit('notification', { type: 'error', message });
  }

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

  render() {
    const config = this._config;

    return html`
      <div class="settings-container">
        <div class="settings-wrapper">
          <div class="settings-header">
            <button class="back-btn" title="Back">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
            <h1 class="settings-title">Settings</h1>
          </div>

          <div class="settings-content">
            ${Object.keys(config).length === 0 ? html`
              <div class="loading-state">
                <span class="spinner"></span>
                <p>Loading settings...</p>
              </div>
            ` : html`
              <!-- General Settings -->
              <section class="settings-section">
                <h3 class="section-title">General</h3>

                <div class="setting-item">
                  <label class="setting-label" for="arcadeName">
                    <span class="label-text">Arcade Name</span>
                    <span class="label-desc">Display name shown throughout the UI</span>
                  </label>
                  <input
                    type="text"
                    id="arcadeName"
                    name="arcadeName"
                    class="setting-input"
                    .value="${config.arcadeName || 'RetroWebLauncher'}"
                    placeholder="My Arcade"
                  />
                </div>

                <div class="setting-item">
                  <label class="setting-label" for="theme">
                    <span class="label-text">Theme</span>
                    <span class="label-desc">Visual theme for the interface</span>
                  </label>
                  <select id="theme" name="theme" class="setting-select">
                    <option value="classic-arcade" ?selected="${config.theme === 'classic-arcade'}">Classic Arcade</option>
                    <option value="dark-modern" ?selected="${config.theme === 'dark-modern'}">Dark & Modern</option>
                    <option value="synthwave" ?selected="${config.theme === 'synthwave'}">Synthwave</option>
                    <option value="clean-light" ?selected="${config.theme === 'clean-light'}">Clean Light</option>
                  </select>
                </div>
              </section>

              <!-- Library Settings -->
              <section class="settings-section">
                <h3 class="section-title">Library</h3>

                <div class="setting-item">
                  <label class="setting-label" for="retrobatPath">
                    <span class="label-text">Retrobat Path</span>
                    <span class="label-desc">Location of your Retrobat installation</span>
                  </label>
                  <input
                    type="text"
                    id="retrobatPath"
                    name="retrobatPath"
                    class="setting-input"
                    .value="${config.retrobatPath || ''}"
                    placeholder="E:\\Emulators-and-Launchers\\RetroBat"
                  />
                </div>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-text">Show Hidden Games</span>
                    <span class="label-desc">Display games marked as hidden in gamelists</span>
                  </label>
                  <label class="toggle">
                    <input
                      type="checkbox"
                      name="showHiddenGames"
                      ?checked="${config.showHiddenGames}"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>

                <div class="setting-item">
                  <button class="rescan-btn action-btn">Rescan Library</button>
                  <span class="setting-hint">Re-scan all systems and games from Retrobat</span>
                </div>
              </section>

              <!-- Attract Mode -->
              <section class="settings-section">
                <h3 class="section-title">Attract Mode (Screensaver)</h3>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-text">Enable Attract Mode</span>
                    <span class="label-desc">Show screensaver after idle timeout</span>
                  </label>
                  <label class="toggle">
                    <input
                      type="checkbox"
                      name="attractMode.enabled"
                      ?checked="${config.attractMode?.enabled}"
                    />
                    <span class="toggle-slider"></span>
                  </label>
                </div>

                <div class="setting-item">
                  <label class="setting-label" for="idleTimeout">
                    <span class="label-text">Idle Timeout</span>
                    <span class="label-desc">Seconds before attract mode starts</span>
                  </label>
                  <input
                    type="number"
                    id="idleTimeout"
                    name="attractMode.idleTimeout"
                    class="setting-input small"
                    .value="${config.attractMode?.idleTimeout || 300}"
                    min="60"
                    max="3600"
                  />
                </div>
              </section>

              <!-- AI Features -->
              <section class="settings-section">
                <h3 class="section-title">AI Features (Optional)</h3>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-text">Enable AI Features</span>
                    <span class="label-desc">Natural language search, smart collections, and theme generation</span>
                  </label>
                  <label class="toggle">
                    <input
                      type="checkbox"
                      name="ai.enabled"
                      ?checked="${config.ai?.enabled}"
                    />
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

              <!-- Network -->
              <section class="settings-section">
                <h3 class="section-title">Network</h3>

                <div class="setting-item">
                  <label class="setting-label" for="port">
                    <span class="label-text">Server Port</span>
                    <span class="label-desc">Port for the web server (requires restart)</span>
                  </label>
                  <input
                    type="number"
                    id="port"
                    name="port"
                    class="setting-input small"
                    .value="${config.port || 3000}"
                    min="1024"
                    max="65535"
                  />
                </div>
              </section>

              <!-- About -->
              <section class="settings-section about">
                <h3 class="section-title">About</h3>
                <div class="about-info">
                  <p><strong>RetroWebLauncher</strong></p>
                  <p class="version">Version ${config.version || '1.0.0'}</p>
                  <p class="credits">A modern web frontend for Retrobat</p>
                </div>
              </section>
            `}
          </div>
        </div>

        <div class="settings-footer">
          <button class="save-btn" ?disabled="${!this._dirty || this._saving}">
            ${this._saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-settings', RwlSettings);
