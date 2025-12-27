/**
 * RetroWebLauncher - Settings Component
 * Configuration panel
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';
import { RwlScreensaver, SCREENSAVERS } from './rwl-screensaver.js';

const { LitElement, html, css } = window.Lit;

class RwlSettings extends LitElement {
  static properties = {
    _config: { type: Object, state: true },
    _saving: { type: Boolean, state: true },
    _dirty: { type: Boolean, state: true },
    _screensaverTimeout: { type: Number, state: true },
    _screensaverType: { type: String, state: true }
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
      border: 2px solid var(--settings-input-border, rgba(255,255,255,0.2));
      border-radius: var(--radius-md, 8px);
      color: var(--settings-input-color, var(--color-text, #fff));
      font-size: var(--font-size-sm, 0.75rem);
      outline: none;
      transition: border-color var(--transition-fast, 150ms);
      box-shadow: var(--settings-input-shadow, none);
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
    // Load screensaver timeout from localStorage (client-side setting)
    const storedTimeout = localStorage.getItem('rwl-screensaver-timeout');
    this._screensaverTimeout = storedTimeout ? parseInt(storedTimeout, 10) : 60;
    // Load screensaver type
    this._screensaverType = RwlScreensaver.getCurrentScreensaver();
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

      // Load themes into dropdown
      await this._loadThemesDropdown();
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

  _handleScreensaverTimeoutChange(e) {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value >= 10 && value <= 3600) {
      this._screensaverTimeout = value;
      this._dirty = true;
      this._updateSaveButton();
    }
  }

  _handleScreensaverTypeChange(e) {
    const value = e.target.value;
    this._screensaverType = value;
    RwlScreensaver.setScreensaver(value);
    // This is saved immediately to localStorage via RwlScreensaver.setScreensaver
    // No need to mark dirty since it's a client-side preference
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

      // Save screensaver timeout to localStorage (client-side setting)
      localStorage.setItem('rwl-screensaver-timeout', this._screensaverTimeout.toString());

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
                  <label class="setting-label" for="screensaverType">
                    <span class="label-text">Screensaver Style</span>
                    <span class="label-desc">Visual style for the screensaver</span>
                  </label>
                  <select
                    id="screensaverType"
                    class="setting-select"
                    @change="${this._handleScreensaverTypeChange}"
                  >
                    ${RwlScreensaver.getAvailableScreensavers().map(ss => html`
                      <option
                        value="${ss.id}"
                        ?selected="${this._screensaverType === ss.id}"
                        title="${ss.description}"
                      >${ss.name}</option>
                    `)}
                  </select>
                </div>

                <div class="setting-item">
                  <label class="setting-label" for="idleTimeout">
                    <span class="label-text">Idle Timeout</span>
                    <span class="label-desc">Seconds before attract mode starts</span>
                  </label>
                  <input
                    type="number"
                    id="idleTimeout"
                    name="screensaverTimeout"
                    class="setting-input small"
                    .value="${this._screensaverTimeout}"
                    min="10"
                    max="3600"
                    @change="${this._handleScreensaverTimeoutChange}"
                  />
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
