/**
 * RetroWebLauncher - Search Component
 * Search bar with on-screen keyboard support
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';

const { LitElement, html, css } = window.Lit;

class RwlSearch extends LitElement {
  static properties = {
    _query: { state: true },
    _results: { state: true },
    _loading: { state: true },
    _selectedIndex: { state: true },
    _showOnScreenKeyboard: { state: true },
    _sizeMultiplier: { state: true },
    _baseSize: { state: true },
    _iconSize: { state: true }
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
      position: relative;
    }

    /* Background layer */
    .bg-layer {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 0;
      pointer-events: none;
    }

    .bg-image {
      position: absolute;
      top: -5%; left: -5%;
      width: 110%; height: 110%;
      background-color: var(--color-background, #0a0a0a);
      background-size: cover;
      background-position: center;
      filter: blur(var(--bg-blur, 15px)) brightness(var(--bg-brightness, 0.5));
    }

    .bg-gradient {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--bg-gradient-overlay,
        radial-gradient(ellipse at center, transparent 0%, rgba(10,10,10,0.9) 70%),
        linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.8) 100%));
    }

    .search-container {
      position: relative;
      z-index: 1;
      display: flex;
      flex-direction: column;
      height: 100%;
      padding: var(--spacing-lg, 1.5rem);
      max-width: 800px;
      margin: 0 auto;
    }

    .search-header {
      margin-bottom: var(--spacing-lg, 1.5rem);
    }

    .search-title {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: var(--font-size-lg, 1.25rem);
      color: var(--color-primary, #ff0066);
      margin: 0 0 var(--spacing-md, 1rem) 0;
    }

    .search-input-wrapper {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-icon {
      position: absolute;
      left: var(--spacing-md, 1rem);
      color: var(--color-text-muted, #888);
      pointer-events: none;
    }

    .search-icon svg {
      width: 20px;
      height: 20px;
    }

    .search-input {
      width: 100%;
      padding: var(--spacing-md, 1rem) var(--spacing-md, 1rem) var(--spacing-md, 1rem) 48px;
      background: var(--content-input-background, rgba(255,255,255,0.1));
      border: 2px solid var(--content-input-border, rgba(255,255,255,0.2));
      border-radius: var(--radius-lg, 12px);
      color: var(--color-text, #fff);
      font-size: var(--font-size-lg, 1.25rem);
      outline: none;
      transition: border-color var(--transition-fast, 150ms);
    }

    .search-input:focus {
      border-color: var(--color-primary, #ff0066);
    }

    .search-input::placeholder {
      color: var(--color-text-muted, #888);
    }

    .clear-btn {
      position: absolute;
      right: var(--spacing-sm, 0.5rem);
      padding: var(--spacing-sm, 0.5rem);
      background: none;
      border: none;
      color: var(--color-text-muted, #888);
      cursor: pointer;
      opacity: 0;
      visibility: hidden;
      transition: opacity var(--transition-fast, 150ms);
    }

    .clear-btn.visible {
      opacity: 1;
      visibility: visible;
    }

    .clear-btn:hover {
      color: var(--color-text, #fff);
    }

    .clear-btn svg {
      width: 20px;
      height: 20px;
    }

    /* Results */
    .search-results {
      flex: 1;
      overflow-y: auto;
      margin-top: var(--spacing-md, 1rem);
    }

    .results-count {
      font-size: var(--font-size-sm, 0.75rem);
      color: var(--color-text-muted, #888);
      margin-bottom: var(--spacing-sm, 0.5rem);
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-xs, 0.25rem);
    }

    .result-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-md, 1rem);
      padding: var(--spacing-sm, 0.5rem);
      background: var(--content-overlay-dark, rgba(255,255,255,0.05));
      border-radius: var(--radius-md, 8px);
      cursor: pointer;
      transition: background var(--transition-fast, 150ms);
    }

    .result-item:hover {
      background: var(--selection-hover-bg, rgba(255,0,102,0.1));
    }

    .result-item.selected {
      background: var(--selection-hover-bg, rgba(255,0,102,0.2));
      box-shadow:
        inset 4px 0 0 var(--color-primary, #ff0066),
        0 0 20px var(--selection-glow-rgba, rgba(255,0,102,0.2));
    }

    .result-image {
      width: var(--result-icon-size, 60px);
      height: var(--result-icon-size, 60px);
      border-radius: var(--radius-sm, 4px);
      overflow: hidden;
      background: var(--game-card-image-bg, rgba(0,0,0,0.4));
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      position: relative;
    }

    .result-image > img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .result-image > span {
      font-size: 1.5rem;
      opacity: 0.3;
    }

    /* System badge overlay */
    .system-badge {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 25%;
      max-width: 30px;
      min-width: 16px;
      aspect-ratio: 1;
      background: var(--badge-background, rgba(0, 0, 0, 0.75));
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      border-radius: 4px;
      border: 1px solid rgba(255, 255, 255, 0.15);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      box-shadow: var(--badge-shadow, 0 2px 6px rgba(0,0,0,0.4));
    }

    .system-badge img {
      width: 80%;
      height: 80%;
      object-fit: contain;
      filter: brightness(1.1) drop-shadow(0 1px 2px rgba(0,0,0,0.3));
    }

    .system-badge.text-fallback {
      padding: 2px;
    }

    .system-badge .badge-text {
      font-size: 7px;
      font-weight: bold;
      color: var(--badge-text-color, #fff);
      text-transform: uppercase;
      letter-spacing: -0.5px;
      text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }

    .result-info {
      flex: 1;
      min-width: 0;
    }

    .result-name {
      font-size: var(--result-name-font-size, 1rem);
      color: var(--color-text, #fff);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .result-system {
      font-size: var(--result-system-font-size, 0.625rem);
      color: var(--color-text-muted, #888);
      margin-top: 2px;
    }

    .result-favorite {
      flex-shrink: 0;
    }

    .search-hint,
    .no-results,
    .loading-results {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: var(--spacing-xl, 2rem);
      text-align: center;
    }

    .no-results-icon {
      font-size: 3rem;
      margin-bottom: var(--spacing-md, 1rem);
      opacity: 0.5;
    }

    .search-hint p,
    .no-results p {
      color: var(--color-text-muted, #888);
      margin: 0;
    }

    .loading-results {
      flex-direction: row;
      gap: var(--spacing-sm, 0.5rem);
      color: var(--color-text-muted, #888);
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--spinner-track, rgba(255,255,255,0.2));
      border-top-color: var(--color-primary, #ff0066);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* On-Screen Keyboard */
    .on-screen-keyboard {
      margin-top: var(--spacing-lg, 1.5rem);
      padding: var(--spacing-md, 1rem);
      background: var(--content-overlay, rgba(0,0,0,0.6));
      border-radius: var(--radius-lg, 12px);
    }

    .osk-row {
      display: flex;
      justify-content: center;
      gap: var(--spacing-xs, 0.25rem);
      margin-bottom: var(--spacing-xs, 0.25rem);
    }

    .osk-key {
      min-width: 40px;
      height: 40px;
      padding: 0 var(--spacing-sm, 0.5rem);
      background: var(--button-secondary-bg, rgba(255,255,255,0.1));
      border: 1px solid var(--button-secondary-border, rgba(255,255,255,0.2));
      border-radius: var(--radius-sm, 4px);
      color: var(--color-text, #fff);
      font-size: var(--font-size-sm, 0.75rem);
      text-transform: uppercase;
      cursor: pointer;
      transition: all var(--transition-fast, 150ms);
    }

    .osk-key:hover {
      background: var(--button-secondary-hover, rgba(255,255,255,0.2));
    }

    .osk-key:active {
      background: var(--color-primary, #ff0066);
      transform: scale(0.95);
    }

    .osk-key.wide {
      min-width: 80px;
    }

    .osk-key.extra-wide {
      min-width: 200px;
    }

    /* Scrollbar */
    .search-results::-webkit-scrollbar {
      width: 6px;
    }

    .search-results::-webkit-scrollbar-track {
      background: transparent;
    }

    .search-results::-webkit-scrollbar-thumb {
      background: var(--content-scrollbar-thumb, rgba(255,255,255,0.2));
      border-radius: 3px;
    }

    /* Toolbar - floating palette style (matches carousel controls-bar) */
    .toolbar {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      height: auto;
      min-height: 40px;
      padding: 12px 24px;
      background: var(--controls-bar-background, var(--toolbar-background, rgba(15, 15, 15, 0.85)));
      backdrop-filter: var(--controls-bar-blur, blur(12px));
      -webkit-backdrop-filter: var(--controls-bar-blur, blur(12px));
      border: 1px solid var(--controls-bar-border, var(--toolbar-border, rgba(255, 255, 255, 0.15)));
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      z-index: 200;
      pointer-events: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }

    .toolbar label {
      color: var(--color-text-muted, #888);
      font-size: 14px;
    }

    .toolbar input[type="range"] {
      width: 150px;
      cursor: pointer;
      accent-color: var(--color-primary, #ff0066);
    }

    .game-count {
      color: var(--color-text-muted, #888);
      font-size: 12px;
      margin-left: auto;
    }

    /* Mobile */
    @media (max-width: 640px) {
      .search-container {
        padding: var(--spacing-md, 1rem);
      }

      .search-title {
        font-size: var(--font-size-base, 1rem);
      }

      .osk-key {
        min-width: 30px;
        height: 36px;
        font-size: var(--font-size-xs, 0.625rem);
      }
    }
  `;

  constructor() {
    super();
    this._query = '';
    this._results = [];
    this._loading = false;
    this._selectedIndex = -1;
    this._debounceTimer = null;
    this._searchVersion = 0; // Tracks current search to ignore stale responses
    this._showOnScreenKeyboard = false;
    this._unsubscribers = [];
    this._sizeMultiplier = 1.0;
    this._baseSize = this._calculateBaseSize();
    this._iconSize = this._baseSize;
    this._resizeObserver = null;
  }

  /**
   * Get the effective icon size (baseSize * multiplier)
   */
  get _effectiveSize() {
    return Math.round(this._baseSize * this._sizeMultiplier);
  }

  /**
   * Calculate base icon size from viewport width
   */
  _calculateBaseSize() {
    const vw = window.innerWidth;
    const minSize = 80;
    const maxSize = 120;
    // Scale: 6% of viewport for icons, clamped
    const viewportBased = vw * 0.06;
    return Math.min(maxSize, Math.max(minSize, viewportBased));
  }

  /**
   * Load size multiplier from localStorage
   */
  _loadSectionSize() {
    const storedMultiplier = localStorage.getItem('rwl-search-multiplier');
    if (storedMultiplier) {
      this._sizeMultiplier = parseFloat(storedMultiplier);
    } else {
      this._sizeMultiplier = 1.0;
    }
    this._iconSize = this._effectiveSize;
    this._applyIconSize();
  }

  /**
   * Save size multiplier to localStorage
   */
  _saveSectionSize() {
    localStorage.setItem('rwl-search-multiplier', this._sizeMultiplier);
  }

  _onSliderChange(e) {
    this._sizeMultiplier = parseFloat(e.target.value);
    this._iconSize = this._effectiveSize;
    this._saveSectionSize();
    this._applyIconSize();
  }

  _applyIconSize() {
    const container = this.shadowRoot?.querySelector('.search-container');
    if (container) {
      container.style.setProperty('--result-icon-size', `${this._iconSize}px`);

      // Font scales at 50% the rate of icons (minimum at 1.0x multiplier)
      const fontMultiplier = 1 + 0.5 * Math.max(0, this._sizeMultiplier - 1);
      // Result name: 1rem base, Result system: 0.625rem base
      container.style.setProperty('--result-name-font-size', `${1 * fontMultiplier}rem`);
      container.style.setProperty('--result-system-font-size', `${0.625 * fontMultiplier}rem`);
    }
  }

  connectedCallback() {
    super.connectedCallback();
    this._bindEvents();

    // Check if we should show on-screen keyboard (touch devices)
    this._checkTouchDevice();

    // Set up responsive sizing
    this._baseSize = this._calculateBaseSize();
    this._loadSectionSize();

    // Observe viewport changes for responsive sizing
    this._resizeObserver = new ResizeObserver(() => {
      this._baseSize = this._calculateBaseSize();
      this._iconSize = this._effectiveSize;
      this._applyIconSize();
    });
    this._resizeObserver.observe(document.body);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    clearTimeout(this._debounceTimer);
    this._searchVersion++; // Invalidate any pending searches
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];

    // Clean up resize observer
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
  }

  firstUpdated() {
    // Focus input after first render
    const input = this.shadowRoot.querySelector('.search-input');
    input?.focus();
  }

  _checkTouchDevice() {
    this._showOnScreenKeyboard = 'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
  }

  _bindEvents() {
    // Input manager
    this._unsubscribers.push(
      state.on('input:character', (char) => {
        this._appendCharacter(char);
      })
    );

    this._unsubscribers.push(
      state.on('input:back', () => {
        if (this._query.length > 0) {
          this._query = this._query.slice(0, -1);
          this._debounceSearch();
        } else {
          router.back();
        }
      })
    );

    this._unsubscribers.push(
      state.on('input:navigate', (direction) => {
        if (direction === 'down') {
          this._navigateResults(1);
        } else if (direction === 'up') {
          this._navigateResults(-1);
        }
      })
    );

    this._unsubscribers.push(
      state.on('input:select', () => {
        if (this._selectedIndex >= 0 && this._results[this._selectedIndex]) {
          this._selectGame(this._results[this._selectedIndex].id);
        }
      })
    );
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  _handleInput(e) {
    this._query = e.target.value;
    this._debounceSearch();
  }

  _handleKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this._navigateResults(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this._navigateResults(-1);
        break;
      case 'Enter':
        e.preventDefault();
        if (this._selectedIndex >= 0 && this._results[this._selectedIndex]) {
          this._selectGame(this._results[this._selectedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this._clearSearch();
        break;
    }
  }

  _handleOskKey(e) {
    const key = e.target.closest('.osk-key');
    if (!key) return;

    const keyValue = key.dataset.key;
    switch (keyValue) {
      case 'backspace':
        this._query = this._query.slice(0, -1);
        break;
      case 'space':
        this._query += ' ';
        break;
      case 'clear':
        this._query = '';
        break;
      default:
        this._query += keyValue;
    }

    this._debounceSearch();
  }

  _appendCharacter(char) {
    this._query += char;
    this._debounceSearch();
  }

  _clearSearch() {
    this._query = '';
    this._results = [];
    this._selectedIndex = -1;

    // Focus input after update
    this.updateComplete.then(() => {
      const input = this.shadowRoot.querySelector('.search-input');
      input?.focus();
    });
  }

  _debounceSearch() {
    clearTimeout(this._debounceTimer);

    // Increment version to invalidate any pending search responses
    this._searchVersion++;

    if (this._query.length < 2) {
      this._results = [];
      this._loading = false;
      return;
    }

    this._debounceTimer = setTimeout(() => {
      this._performSearch();
    }, 300);
  }

  async _performSearch() {
    if (this._query.length < 2) return;

    // Capture the current version before the async operation
    const searchVersion = this._searchVersion;
    const searchQuery = this._query;

    this._loading = true;

    try {
      const response = await api.search(searchQuery);

      // Check if a newer search has been initiated - if so, ignore this response
      if (searchVersion !== this._searchVersion) return;

      this._results = response.results || response.games || [];
      this._selectedIndex = this._results.length > 0 ? 0 : -1;
    } catch (error) {
      // Check if a newer search has been initiated
      if (searchVersion !== this._searchVersion) return;
      console.error('Search failed:', error);
      this._results = [];
    } finally {
      // Only update UI if this is still the current search
      if (searchVersion === this._searchVersion) {
        this._loading = false;
      }
    }
  }

  _navigateResults(delta) {
    if (this._results.length === 0) return;

    this._selectedIndex = Math.max(
      0,
      Math.min(this._results.length - 1, this._selectedIndex + delta)
    );

    // Scroll into view after update
    this.updateComplete.then(() => {
      const selected = this.shadowRoot.querySelector('.result-item.selected');
      selected?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  _selectGame(gameId) {
    router.navigate(`/game/${gameId}`);
  }

  _handleResultClick(e) {
    const resultItem = e.target.closest('.result-item');
    if (resultItem) {
      const gameId = resultItem.dataset.gameId;
      this._selectGame(gameId);
    }
  }

  _getImageUrl(game) {
    if (game.thumbnail || game.image) {
      return `/api/media/game/${game.id}/thumbnail`;
    }
    return '';
  }

  _handleImageError(e) {
    const systemBadge = e.target.closest('.system-badge');
    if (systemBadge) {
      systemBadge.classList.add('text-fallback');
      e.target.style.display = 'none';
      const textBadge = systemBadge.querySelector('.badge-text');
      if (textBadge) {
        textBadge.style.display = 'block';
      }
    }
  }

  _renderResultsContent() {
    if (this._loading) {
      return html`
        <div class="loading-results">
          <span class="spinner"></span>
          <span>Searching...</span>
        </div>
      `;
    }

    if (this._query.length < 2) {
      return html`
        <div class="search-hint">
          <p>Enter at least 2 characters to search</p>
        </div>
      `;
    }

    if (this._results.length === 0) {
      return html`
        <div class="no-results">
          <span class="no-results-icon">🔍</span>
          <p>No games found for "${this._escapeHtml(this._query)}"</p>
        </div>
      `;
    }

    return html`
      <div class="results-count">${this._results.length} game${this._results.length !== 1 ? 's' : ''} found</div>
      <div class="results-list">
        ${this._results.map((game, index) => {
          const imageUrl = this._getImageUrl(game);
          const safeName = this._escapeHtml(game.name || 'Unknown');
          const safeSystem = this._escapeHtml(game.systemName || 'Unknown System');
          return html`
            <div
              class="result-item ${index === this._selectedIndex ? 'selected' : ''}"
              data-game-id="${game.id}"
              tabindex="0"
            >
              <div class="result-image">
                ${imageUrl ? html`<img src="${imageUrl}" alt="" loading="lazy" />` : html`<span>🎮</span>`}
                <div class="system-badge" title="${safeSystem}">
                  <img
                    src="/api/media/system/${game.systemId}/logo"
                    alt="${safeSystem}"
                    @error=${this._handleImageError}
                  >
                  <span class="badge-text" style="display:none;">${this._escapeHtml((game.systemId || '').substring(0, 3).toUpperCase())}</span>
                </div>
              </div>
              <div class="result-info">
                <div class="result-name">${safeName}</div>
                <div class="result-system">${safeSystem}</div>
              </div>
              ${game.favorite ? html`<span class="result-favorite">❤️</span>` : ''}
            </div>
          `;
        })}
      </div>
    `;
  }

  _renderOnScreenKeyboard() {
    if (!this._showOnScreenKeyboard) return '';

    const oskRows = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];

    return html`
      <div class="on-screen-keyboard" @click=${this._handleOskKey}>
        ${oskRows.map(row => html`
          <div class="osk-row">
            ${row.map(key => html`
              <button class="osk-key" data-key="${key}">${key}</button>
            `)}
          </div>
        `)}
        <div class="osk-row">
          <button class="osk-key wide" data-key="backspace">⌫</button>
          <button class="osk-key extra-wide" data-key="space">Space</button>
          <button class="osk-key wide" data-key="clear">Clear</button>
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="bg-layer">
        <div class="bg-image"></div>
        <div class="bg-gradient"></div>
      </div>
      <div class="search-container">
        <div class="search-header">
          <h2 class="search-title">Search Games</h2>
          <div class="search-input-wrapper">
            <span class="search-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
              </svg>
            </span>
            <input
              type="text"
              class="search-input"
              placeholder="Search for games..."
              .value=${this._query}
              @input=${this._handleInput}
              @keydown=${this._handleKeydown}
              autofocus
            />
            <button class="clear-btn ${this._query.length > 0 ? 'visible' : ''}" title="Clear" @click=${this._clearSearch}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="search-results" @click=${this._handleResultClick}>
          ${this._renderResultsContent()}
        </div>

        ${this._renderOnScreenKeyboard()}
      </div>

      <div class="toolbar">
        <label>🔍</label>
        <input type="range" id="size-slider" min="0.5" max="2" step="0.1" .value=${this._sizeMultiplier} @input=${this._onSliderChange} title="Size multiplier: ${this._sizeMultiplier}x">
        <span class="game-count">${this._results.length > 0 ? `${this._results.length} results` : ''}</span>
      </div>
    `;
  }
}

customElements.define('rwl-search', RwlSearch);
