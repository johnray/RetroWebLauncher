/**
 * RetroWebLauncher - Search Component
 * Search bar with on-screen keyboard support
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';

class RwlSearch extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._query = '';
    this._results = [];
    this._loading = false;
    this._selectedIndex = -1;
    this._debounceTimer = null;
    this._showOnScreenKeyboard = false;
  }

  connectedCallback() {
    this._render();
    this._bindEvents();

    // Check if we should show on-screen keyboard (touch devices)
    this._checkTouchDevice();
  }

  _checkTouchDevice() {
    this._showOnScreenKeyboard = 'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      window.matchMedia('(pointer: coarse)').matches;
  }

  _bindEvents() {
    const input = this.shadowRoot.querySelector('.search-input');
    const clearBtn = this.shadowRoot.querySelector('.clear-btn');
    const resultsContainer = this.shadowRoot.querySelector('.search-results');

    // Input events
    input?.addEventListener('input', (e) => {
      this._query = e.target.value;
      this._debounceSearch();
    });

    input?.addEventListener('keydown', (e) => {
      this._handleKeydown(e);
    });

    // Clear button
    clearBtn?.addEventListener('click', () => {
      this._clearSearch();
    });

    // Result click
    resultsContainer?.addEventListener('click', (e) => {
      const resultItem = e.target.closest('.result-item');
      if (resultItem) {
        const gameId = resultItem.dataset.gameId;
        this._selectGame(gameId);
      }
    });

    // On-screen keyboard
    this.shadowRoot.addEventListener('click', (e) => {
      const key = e.target.closest('.osk-key');
      if (key) {
        this._handleOskKey(key.dataset.key);
      }
    });

    // Input manager
    state.on('input:character', (char) => {
      this._appendCharacter(char);
    });

    state.on('input:back', () => {
      if (this._query.length > 0) {
        this._query = this._query.slice(0, -1);
        this._updateInput();
        this._debounceSearch();
      } else {
        router.back();
      }
    });

    state.on('input:navigate', (direction) => {
      if (direction === 'down') {
        this._navigateResults(1);
      } else if (direction === 'up') {
        this._navigateResults(-1);
      }
    });

    state.on('input:select', () => {
      if (this._selectedIndex >= 0 && this._results[this._selectedIndex]) {
        this._selectGame(this._results[this._selectedIndex].id);
      }
    });
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

  _handleOskKey(key) {
    switch (key) {
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
        this._query += key;
    }

    this._updateInput();
    this._debounceSearch();
  }

  _appendCharacter(char) {
    this._query += char;
    this._updateInput();
    this._debounceSearch();
  }

  _updateInput() {
    const input = this.shadowRoot.querySelector('.search-input');
    if (input) {
      input.value = this._query;
    }

    const clearBtn = this.shadowRoot.querySelector('.clear-btn');
    if (clearBtn) {
      clearBtn.classList.toggle('visible', this._query.length > 0);
    }
  }

  _clearSearch() {
    this._query = '';
    this._results = [];
    this._selectedIndex = -1;
    this._updateInput();
    this._renderResults();

    const input = this.shadowRoot.querySelector('.search-input');
    input?.focus();
  }

  _debounceSearch() {
    clearTimeout(this._debounceTimer);

    if (this._query.length < 2) {
      this._results = [];
      this._renderResults();
      return;
    }

    this._debounceTimer = setTimeout(() => {
      this._performSearch();
    }, 300);
  }

  async _performSearch() {
    if (this._query.length < 2) return;

    this._loading = true;
    this._renderResults();

    try {
      const response = await api.search(this._query);
      this._results = response.results || response.games || [];
      this._selectedIndex = this._results.length > 0 ? 0 : -1;
    } catch (error) {
      console.error('Search failed:', error);
      this._results = [];
    } finally {
      this._loading = false;
      this._renderResults();
    }
  }

  _navigateResults(delta) {
    if (this._results.length === 0) return;

    this._selectedIndex = Math.max(
      0,
      Math.min(this._results.length - 1, this._selectedIndex + delta)
    );

    this._renderResults();

    // Scroll into view
    const selected = this.shadowRoot.querySelector('.result-item.selected');
    selected?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  _selectGame(gameId) {
    router.navigate(`/game/${gameId}`);
  }

  _getImageUrl(game) {
    if (game.thumbnail || game.image) {
      return `/api/media/game/${game.id}/thumbnail`;
    }
    return '';
  }

  _renderResults() {
    const container = this.shadowRoot.querySelector('.search-results');
    if (!container) return;

    if (this._loading) {
      container.innerHTML = `
        <div class="loading-results">
          <span class="spinner"></span>
          <span>Searching...</span>
        </div>
      `;
      return;
    }

    if (this._query.length < 2) {
      container.innerHTML = `
        <div class="search-hint">
          <p>Enter at least 2 characters to search</p>
        </div>
      `;
      return;
    }

    if (this._results.length === 0) {
      container.innerHTML = `
        <div class="no-results">
          <span class="no-results-icon">🔍</span>
          <p>No games found for "${this._query}"</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="results-count">${this._results.length} game${this._results.length !== 1 ? 's' : ''} found</div>
      <div class="results-list">
        ${this._results.map((game, index) => {
          const imageUrl = this._getImageUrl(game);
          return `
            <div
              class="result-item ${index === this._selectedIndex ? 'selected' : ''}"
              data-game-id="${game.id}"
              tabindex="0"
            >
              <div class="result-image">
                ${imageUrl ? `<img src="${imageUrl}" alt="" loading="lazy" />` : '<span>🎮</span>'}
              </div>
              <div class="result-info">
                <div class="result-name">${game.name}</div>
                <div class="result-system">${game.systemName || 'Unknown System'}</div>
              </div>
              ${game.favorite ? '<span class="result-favorite">❤️</span>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  _render() {
    const oskRows = [
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm']
    ];

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
        }

        .search-container {
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
          font-family: var(--font-display, 'Press Start 2P', monospace);
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
          background: rgba(255,255,255,0.1);
          border: 2px solid rgba(255,255,255,0.2);
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
          background: rgba(255,255,255,0.05);
          border-radius: var(--radius-md, 8px);
          cursor: pointer;
          transition: background var(--transition-fast, 150ms);
        }

        .result-item:hover,
        .result-item.selected {
          background: rgba(255,0,102,0.2);
        }

        .result-item.selected {
          outline: 2px solid var(--color-primary, #ff0066);
        }

        .result-image {
          width: 60px;
          height: 60px;
          border-radius: var(--radius-sm, 4px);
          overflow: hidden;
          background: rgba(0,0,0,0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .result-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .result-image span {
          font-size: 1.5rem;
          opacity: 0.3;
        }

        .result-info {
          flex: 1;
          min-width: 0;
        }

        .result-name {
          font-size: var(--font-size-base, 1rem);
          color: var(--color-text, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-system {
          font-size: var(--font-size-xs, 0.625rem);
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
          border: 2px solid rgba(255,255,255,0.2);
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
          background: rgba(0,0,0,0.6);
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
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: var(--radius-sm, 4px);
          color: var(--color-text, #fff);
          font-size: var(--font-size-sm, 0.75rem);
          text-transform: uppercase;
          cursor: pointer;
          transition: all var(--transition-fast, 150ms);
        }

        .osk-key:hover {
          background: rgba(255,255,255,0.2);
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
          background: rgba(255,255,255,0.2);
          border-radius: 3px;
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
      </style>

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
              autofocus
            />
            <button class="clear-btn" title="Clear">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="search-results">
          <div class="search-hint">
            <p>Enter at least 2 characters to search</p>
          </div>
        </div>

        ${this._showOnScreenKeyboard ? `
          <div class="on-screen-keyboard">
            ${oskRows.map(row => `
              <div class="osk-row">
                ${row.map(key => `
                  <button class="osk-key" data-key="${key}">${key}</button>
                `).join('')}
              </div>
            `).join('')}
            <div class="osk-row">
              <button class="osk-key wide" data-key="backspace">⌫</button>
              <button class="osk-key extra-wide" data-key="space">Space</button>
              <button class="osk-key wide" data-key="clear">Clear</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('rwl-search', RwlSearch);
