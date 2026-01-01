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
    _screensaverType: { type: String, state: true },
    // Bulk View Settings
    _systems: { type: Array, state: true },
    _bulkGameCountRange: { type: Number, state: true },
    _bulkZoomPercent: { type: Number, state: true },
    _bulkViewType: { type: String, state: true },
    _bulkPreviewCount: { type: Number, state: true },
    _applyingBulk: { type: Boolean, state: true }
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
      /* iOS requires 16px minimum to prevent zoom on focus */
      font-size: max(var(--font-size-sm, 0.75rem), 16px);
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

    /* Bulk View Settings */
    .bulk-controls {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-md, 1rem);
    }

    .bulk-row {
      display: flex;
      align-items: center;
      gap: var(--spacing-md, 1rem);
      flex-wrap: wrap;
    }

    .bulk-label {
      min-width: 100px;
      font-size: var(--font-size-sm, 0.75rem);
      color: var(--settings-label-color, var(--color-text, #fff));
    }

    .bulk-range-select {
      flex: 1;
      max-width: 200px;
    }

    .zoom-slider-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm, 0.5rem);
      flex: 1;
    }

    .zoom-slider {
      flex: 1;
      max-width: 200px;
      accent-color: var(--color-primary, #ff0066);
    }

    .zoom-value {
      min-width: 45px;
      font-size: var(--font-size-sm, 0.75rem);
      color: var(--color-text-muted, #888);
    }

    /* View type selector buttons */
    .view-type-selector {
      display: flex;
      gap: 4px;
    }

    .view-type-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--button-secondary-bg, rgba(255, 255, 255, 0.05));
      border: 1px solid var(--button-secondary-border, rgba(255, 255, 255, 0.1));
      border-radius: 6px;
      color: var(--color-text-muted, #888);
      font-size: 16px;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .view-type-btn:hover {
      background: var(--button-secondary-hover, rgba(255, 255, 255, 0.1));
      color: var(--color-text, #fff);
    }

    .view-type-btn.active {
      background: var(--button-active-bg, rgba(255, 0, 102, 0.2));
      border-color: var(--button-active-border, rgba(255, 0, 102, 0.5));
      color: var(--color-primary, #ff0066);
    }

    .preview-badge {
      display: inline-flex;
      align-items: center;
      padding: 4px 10px;
      background: var(--color-primary, #ff0066);
      color: var(--color-text, #fff);
      border-radius: 12px;
      font-size: var(--font-size-xs, 0.625rem);
      font-weight: 600;
    }

    .bulk-actions {
      display: flex;
      gap: var(--spacing-sm, 0.5rem);
      margin-top: var(--spacing-sm, 0.5rem);
    }

    .apply-btn {
      padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
      background: var(--color-primary, #ff0066);
      border: none;
      border-radius: var(--radius-md, 8px);
      color: var(--color-text, #fff);
      font-size: var(--font-size-sm, 0.75rem);
      font-weight: 600;
      cursor: pointer;
      transition: all var(--transition-fast, 150ms);
    }

    .apply-btn:hover:not(:disabled) {
      background: var(--color-primary-hover, #ff3388);
    }

    .apply-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }

    .reset-btn {
      padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
      background: transparent;
      border: 1px solid var(--color-danger, #dc3545);
      border-radius: var(--radius-md, 8px);
      color: var(--color-danger, #dc3545);
      font-size: var(--font-size-sm, 0.75rem);
      cursor: pointer;
      transition: all var(--transition-fast, 150ms);
    }

    .reset-btn:hover:not(:disabled) {
      background: var(--color-danger, #dc3545);
      color: #fff;
    }

    .reset-btn:disabled {
      opacity: 0.5;
      cursor: default;
    }

    /* Toast notification */
    .toast {
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      padding: var(--spacing-sm, 0.5rem) var(--spacing-lg, 1.5rem);
      background: var(--toast-bg, rgba(0, 0, 0, 0.9));
      border: 1px solid var(--toast-border, rgba(255, 255, 255, 0.2));
      border-radius: var(--radius-md, 8px);
      color: var(--color-text, #fff);
      font-size: var(--font-size-sm, 0.75rem);
      opacity: 0;
      pointer-events: none;
      transition: all 0.3s ease;
      z-index: 1000;
    }

    .toast.show {
      transform: translateX(-50%) translateY(0);
      opacity: 1;
    }

    .toast.success {
      border-color: var(--color-success, #28a745);
    }

    .toast.error {
      border-color: var(--color-danger, #dc3545);
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

      .bulk-row {
        flex-direction: column;
        align-items: stretch;
      }

      .bulk-range-select,
      .zoom-slider-container {
        max-width: none;
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
    this._boundKeydownHandler = this._handleKeydown.bind(this); // Bound handler for cleanup

    // Bulk View Settings
    this._systems = [];
    this._bulkGameCountRange = 0;  // >0 games (all)
    this._bulkZoomPercent = 100;   // 100% = 1.0 multiplier (default)
    this._bulkViewType = 'wheel';  // Default view
    this._bulkPreviewCount = 0;
    this._applyingBulk = false;

    // View types with icons (same as rwl-view-toggle)
    this._viewTypes = [
      { id: 'grid', icon: '⊞', label: 'Grid' },
      { id: 'wheel', icon: '◎', label: 'Carousel' },
      { id: 'spin', icon: '🎡', label: 'Spin Wheel' },
      { id: 'spinner', icon: '◔', label: 'Wheel of Fortune' },
      { id: 'list', icon: '☰', label: 'List' }
    ];

    // Game count ranges
    this._gameCountRanges = [
      { value: 0, label: 'All (>0 games)' },
      { value: 5, label: '>5 games' },
      { value: 10, label: '>10 games' },
      { value: 25, label: '>25 games' },
      { value: 50, label: '>50 games' },
      { value: 100, label: '>100 games' },
      { value: 500, label: '>500 games' },
      { value: 1000, label: '>1000 games' }
    ];
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadConfig();
    this._bindEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    // Remove keydown listener
    this.removeEventListener('keydown', this._boundKeydownHandler);
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

      // Load systems for bulk view settings
      await this._loadSystems();
    } catch (error) {
      console.error('Failed to load config:', error);
      this._showError('Failed to load settings');
    }
  }

  async _loadSystems() {
    try {
      const response = await api.getSystems();
      // Filter to only systems with games
      this._systems = (response.systems || []).filter(s => s.gameCount > 0);
      this._updateBulkPreviewCount();
    } catch (error) {
      console.error('Failed to load systems:', error);
      this._systems = [];
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

    // Keyboard (use bound handler for proper cleanup)
    this.addEventListener('keydown', this._boundKeydownHandler);
  }

  _handleKeydown(e) {
    if (e.key === 'Escape') {
      router.back();
    } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      this._saveConfig();
    }
  }

  _handleInputChange(input) {
    const key = input.name;

    // Skip inputs without a name (client-side only settings like screensaverType)
    if (!key) {
      return;
    }

    // Skip screensaverTimeout - it's handled separately and saved to localStorage
    if (key === 'screensaverTimeout') {
      return;
    }

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

  // ==========================================
  // Bulk View Settings Methods
  // ==========================================

  /**
   * Get matching systems/collections based on game count range
   */
  _getMatchingSections() {
    const sections = [];

    // Add systems that match the game count filter
    for (const system of this._systems) {
      if (system.gameCount > this._bulkGameCountRange) {
        sections.push({
          id: system.id,
          name: system.fullname || system.name,
          gameCount: system.gameCount,
          type: 'system'
        });
      }
    }

    // Add special collections (they always match >0)
    if (this._bulkGameCountRange === 0) {
      sections.push({ id: 'favorites', name: 'Favorites', type: 'collection' });
      sections.push({ id: 'recent', name: 'Recently Played', type: 'collection' });
    }

    return sections;
  }

  /**
   * Update the preview count when settings change
   */
  _updateBulkPreviewCount() {
    this._bulkPreviewCount = this._getMatchingSections().length;
  }

  /**
   * Handle game count range change
   */
  _handleBulkRangeChange(e) {
    this._bulkGameCountRange = parseInt(e.target.value, 10);
    this._updateBulkPreviewCount();
  }

  /**
   * Handle zoom slider change
   */
  _handleBulkZoomChange(e) {
    this._bulkZoomPercent = parseInt(e.target.value, 10);
  }

  /**
   * Handle view type selection
   */
  _handleBulkViewTypeSelect(viewId) {
    this._bulkViewType = viewId;
  }

  /**
   * Convert zoom percentage to multiplier
   * 50% = 0.5, 100% = 1.0, 200% = 2.0
   */
  _zoomPercentToMultiplier(percent) {
    return percent / 100;
  }

  /**
   * Apply bulk settings to all matching sections
   */
  async _applyBulkSettings() {
    if (this._applyingBulk) return;

    const sections = this._getMatchingSections();
    if (sections.length === 0) {
      this._showToast('No matching systems found', 'error');
      return;
    }

    this._applyingBulk = true;

    try {
      const multiplier = this._zoomPercentToMultiplier(this._bulkZoomPercent);

      // View type prefixes for different views
      const viewPrefixes = {
        grid: 'grid',
        wheel: 'wheel',
        spin: 'spin',
        spinner: 'spinner',
        list: 'list'
      };

      for (const section of sections) {
        const key = section.id;

        // Set view type
        localStorage.setItem(`rwl-view-type-${key}`, this._bulkViewType);

        // Set zoom multiplier for the selected view type
        // The carousel views store multiplier per-view, so we set it for the selected view
        const prefix = viewPrefixes[this._bulkViewType] || this._bulkViewType;
        localStorage.setItem(`rwl-${prefix}-multiplier-${key}`, multiplier.toString());
      }

      this._showToast(`Applied settings to ${sections.length} sections`, 'success');

      // Emit event so other components can refresh if needed
      state.emit('bulkViewSettingsApplied');
    } catch (error) {
      console.error('Failed to apply bulk settings:', error);
      this._showToast('Failed to apply settings', 'error');
    } finally {
      this._applyingBulk = false;
    }
  }

  /**
   * Reset all view settings to defaults
   */
  _resetAllViewSettings() {
    if (!confirm('Reset all view preferences to defaults? This will clear all custom view types and zoom levels for all systems and collections.')) {
      return;
    }

    try {
      // Find and remove all view-related localStorage keys
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('rwl-view-type-') ||
          key.startsWith('rwl-grid-multiplier-') ||
          key.startsWith('rwl-wheel-multiplier-') ||
          key.startsWith('rwl-spin-multiplier-') ||
          key.startsWith('rwl-spinner-multiplier-') ||
          key.startsWith('rwl-list-multiplier-')
        )) {
          keysToRemove.push(key);
        }
      }

      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }

      this._showToast(`Reset ${keysToRemove.length} view preferences`, 'success');

      // Emit event so other components can refresh
      state.emit('viewSettingsReset');
    } catch (error) {
      console.error('Failed to reset view settings:', error);
      this._showToast('Failed to reset settings', 'error');
    }
  }

  /**
   * Show a toast notification
   */
  _showToast(message, type = 'success') {
    const toast = this.shadowRoot.querySelector('.toast');
    if (toast) {
      toast.textContent = message;
      toast.className = `toast ${type} show`;

      // Auto-hide after 3 seconds
      setTimeout(() => {
        toast.classList.remove('show');
      }, 3000);
    }
  }

  _showSuccess(message) {
    state.emit('notification', { type: 'success', message });
    // Also show toast for settings
    this._showToast(message, 'success');
  }

  _showError(message) {
    state.emit('notification', { type: 'error', message });
    // Also show toast for errors
    this._showToast(message, 'error');
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

              <!-- Bulk View Settings -->
              <section class="settings-section">
                <h3 class="section-title">Bulk View Settings</h3>

                <div class="setting-item">
                  <label class="setting-label">
                    <span class="label-text">Set Default View & Zoom</span>
                    <span class="label-desc">Apply view preferences to multiple systems at once</span>
                  </label>
                </div>

                <div class="bulk-controls">
                  <!-- Game Count Range -->
                  <div class="bulk-row">
                    <span class="bulk-label">Systems with:</span>
                    <select
                      class="setting-select bulk-range-select"
                      @change="${this._handleBulkRangeChange}"
                    >
                      ${this._gameCountRanges.map(range => html`
                        <option
                          value="${range.value}"
                          ?selected="${this._bulkGameCountRange === range.value}"
                        >${range.label}</option>
                      `)}
                    </select>
                    <span class="preview-badge">${this._bulkPreviewCount} matching</span>
                  </div>

                  <!-- Zoom Slider -->
                  <div class="bulk-row">
                    <span class="bulk-label">Zoom:</span>
                    <div class="zoom-slider-container">
                      <input
                        type="range"
                        class="zoom-slider"
                        min="50"
                        max="200"
                        step="10"
                        .value="${this._bulkZoomPercent}"
                        @input="${this._handleBulkZoomChange}"
                      />
                      <span class="zoom-value">${this._bulkZoomPercent}%</span>
                    </div>
                  </div>

                  <!-- View Type Selector -->
                  <div class="bulk-row">
                    <span class="bulk-label">View Type:</span>
                    <div class="view-type-selector">
                      ${this._viewTypes.map(v => html`
                        <button
                          type="button"
                          class="view-type-btn ${v.id === this._bulkViewType ? 'active' : ''}"
                          @click="${() => this._handleBulkViewTypeSelect(v.id)}"
                          title="${v.label}"
                          aria-label="${v.label} view"
                        >${v.icon}</button>
                      `)}
                    </div>
                  </div>

                  <!-- Action Buttons -->
                  <div class="bulk-actions">
                    <button
                      type="button"
                      class="apply-btn"
                      ?disabled="${this._applyingBulk || this._bulkPreviewCount === 0}"
                      @click="${this._applyBulkSettings}"
                    >
                      ${this._applyingBulk ? 'Applying...' : `Apply to ${this._bulkPreviewCount} Systems`}
                    </button>
                    <button
                      type="button"
                      class="reset-btn"
                      @click="${this._resetAllViewSettings}"
                    >
                      Reset All to Defaults
                    </button>
                  </div>
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

        <!-- Toast notification -->
        <div class="toast"></div>
      </div>
    `;
  }
}

customElements.define('rwl-settings', RwlSettings);
