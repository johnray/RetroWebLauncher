/**
 * RetroWebLauncher - Grid View Component
 * Responsive grid with virtual scrolling for large game lists
 */

import { state } from '../state.js';
import { api } from '../api.js';

class RwlGridView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._games = [];
    this._systemId = null;
    this._collectionId = null;
    this._page = 1;
    this._totalPages = 1;
    this._loading = false;
    this._selectedIndex = 0;
    this._columns = 4;
    this._resizeObserver = null;
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
    this._setupResizeObserver();
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  set systemId(id) {
    this._systemId = id;
    this._collectionId = null;
    this._page = 1;
    this._games = [];
    this._loadGames();
  }

  set collectionId(id) {
    this._collectionId = id;
    this._systemId = null;
    this._page = 1;
    this._games = [];
    this._loadGames();
  }

  set games(data) {
    this._games = data || [];
    this._renderGames();
  }

  async _loadGames() {
    if (this._loading) return;

    this._loading = true;
    this._showLoading();

    try {
      let response;
      if (this._systemId) {
        response = await api.getGames(this._systemId, this._page, 100);
      } else if (this._collectionId) {
        response = await api.getCollectionGames(this._collectionId, this._page, 100);
      } else {
        return;
      }

      if (this._page === 1) {
        this._games = response.games || [];
      } else {
        this._games = [...this._games, ...(response.games || [])];
      }

      this._totalPages = response.pagination?.totalPages || 1;
      this._renderGames();
    } catch (error) {
      console.error('Failed to load games:', error);
      this._showError('Failed to load games');
    } finally {
      this._loading = false;
    }
  }

  _setupResizeObserver() {
    this._resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        this._calculateColumns(entry.contentRect.width);
      }
    });

    this._resizeObserver.observe(this);
  }

  _calculateColumns(width) {
    const cardMinWidth = 180;
    const gap = 16;
    const newColumns = Math.max(2, Math.floor((width + gap) / (cardMinWidth + gap)));

    if (newColumns !== this._columns) {
      this._columns = newColumns;
      this._updateGridStyle();
    }
  }

  _updateGridStyle() {
    const grid = this.shadowRoot.querySelector('.games-grid');
    if (grid) {
      grid.style.gridTemplateColumns = `repeat(${this._columns}, 1fr)`;
    }
  }

  _bindEvents() {
    // Infinite scroll
    const container = this.shadowRoot.querySelector('.grid-container');
    if (container) {
      container.addEventListener('scroll', () => {
        this._checkInfiniteScroll(container);
      });
    }

    // Keyboard navigation
    this.addEventListener('keydown', (e) => this._handleKeyboard(e));

    // Listen for game focus events from input manager
    state.on('input:navigate', (direction) => {
      this._navigate(direction);
    });

    state.on('input:select', () => {
      this._selectCurrent();
    });
  }

  _checkInfiniteScroll(container) {
    if (this._loading || this._page >= this._totalPages) return;

    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (scrollBottom < 500) {
      this._page++;
      this._loadGames();
    }
  }

  _handleKeyboard(e) {
    const moves = {
      'ArrowUp': 'up',
      'ArrowDown': 'down',
      'ArrowLeft': 'left',
      'ArrowRight': 'right'
    };

    if (moves[e.key]) {
      e.preventDefault();
      this._navigate(moves[e.key]);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._selectCurrent();
    } else if (e.key === 'Home') {
      e.preventDefault();
      this._selectedIndex = 0;
      this._focusSelected();
    } else if (e.key === 'End') {
      e.preventDefault();
      this._selectedIndex = this._games.length - 1;
      this._focusSelected();
    } else if (e.key === 'PageUp') {
      e.preventDefault();
      this._selectedIndex = Math.max(0, this._selectedIndex - this._columns * 3);
      this._focusSelected();
    } else if (e.key === 'PageDown') {
      e.preventDefault();
      this._selectedIndex = Math.min(this._games.length - 1, this._selectedIndex + this._columns * 3);
      this._focusSelected();
    }
  }

  _navigate(direction) {
    const oldIndex = this._selectedIndex;

    switch (direction) {
      case 'up':
        this._selectedIndex = Math.max(0, this._selectedIndex - this._columns);
        break;
      case 'down':
        this._selectedIndex = Math.min(this._games.length - 1, this._selectedIndex + this._columns);
        break;
      case 'left':
        this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        break;
      case 'right':
        this._selectedIndex = Math.min(this._games.length - 1, this._selectedIndex + 1);
        break;
    }

    if (oldIndex !== this._selectedIndex) {
      this._focusSelected();
    }
  }

  _focusSelected() {
    const cards = this.shadowRoot.querySelectorAll('rwl-game-card');
    if (cards[this._selectedIndex]) {
      cards[this._selectedIndex].focus();
      cards[this._selectedIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      state.emit('gameSelected', this._games[this._selectedIndex]);
    }
  }

  _selectCurrent() {
    const game = this._games[this._selectedIndex];
    if (game) {
      state.emit('gameActivated', game);
    }
  }

  _showLoading() {
    const grid = this.shadowRoot.querySelector('.games-grid');
    if (!grid) return;

    if (this._page === 1) {
      grid.innerHTML = `
        <div class="loading-placeholder">
          ${Array(12).fill().map(() => `
            <div class="loading-card"></div>
          `).join('')}
        </div>
      `;
    }
  }

  _showError(message) {
    const grid = this.shadowRoot.querySelector('.games-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="error-message">
          <span class="error-icon">⚠️</span>
          <p>${message}</p>
          <button class="retry-btn">Retry</button>
        </div>
      `;

      grid.querySelector('.retry-btn')?.addEventListener('click', () => {
        this._loadGames();
      });
    }
  }

  _renderGames() {
    const grid = this.shadowRoot.querySelector('.games-grid');
    if (!grid) return;

    if (this._games.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🎮</span>
          <p>No games found</p>
        </div>
      `;
      return;
    }

    // Create or update game cards
    grid.innerHTML = this._games.map((game, index) => `
      <rwl-game-card
        tabindex="${index === this._selectedIndex ? '0' : '-1'}"
        data-index="${index}"
      ></rwl-game-card>
    `).join('');

    // Set game data on cards
    const cards = grid.querySelectorAll('rwl-game-card');
    cards.forEach((card, index) => {
      card.game = this._games[index];
    });

    // Update grid columns
    this._updateGridStyle();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          overflow: hidden;
        }

        .grid-container {
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          padding: var(--spacing-md, 1rem);
        }

        .games-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--spacing-md, 1rem);
          min-height: 100%;
        }

        rwl-game-card {
          aspect-ratio: 3/4;
        }

        .loading-placeholder {
          display: contents;
        }

        .loading-card {
          aspect-ratio: 3/4;
          background: linear-gradient(
            90deg,
            rgba(255,255,255,0.05) 0%,
            rgba(255,255,255,0.1) 50%,
            rgba(255,255,255,0.05) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          border-radius: var(--radius-md, 8px);
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .empty-state,
        .error-message {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: var(--spacing-xl, 3rem);
          text-align: center;
        }

        .empty-icon,
        .error-icon {
          font-size: 4rem;
          margin-bottom: var(--spacing-md, 1rem);
          opacity: 0.5;
        }

        .empty-state p,
        .error-message p {
          color: var(--color-text-muted, #888);
          font-size: var(--font-size-lg, 1.25rem);
          margin: 0;
        }

        .retry-btn {
          margin-top: var(--spacing-md, 1rem);
          padding: var(--spacing-sm, 0.5rem) var(--spacing-lg, 1.5rem);
          background: var(--color-primary, #ff0066);
          border: none;
          border-radius: var(--radius-md, 8px);
          color: var(--color-text, #fff);
          font-size: var(--font-size-sm, 0.75rem);
          cursor: pointer;
          transition: background var(--transition-fast, 150ms);
        }

        .retry-btn:hover {
          background: var(--color-primary-hover, #ff3388);
        }

        /* Scrollbar */
        .grid-container::-webkit-scrollbar {
          width: 8px;
        }

        .grid-container::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }

        .grid-container::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
        }

        .grid-container::-webkit-scrollbar-thumb:hover {
          background: rgba(255,255,255,0.3);
        }

        /* Mobile */
        @media (max-width: 640px) {
          .games-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: var(--spacing-sm, 0.5rem);
          }

          .grid-container {
            padding: var(--spacing-sm, 0.5rem);
          }
        }
      </style>

      <div class="grid-container">
        <div class="games-grid">
          <div class="empty-state">
            <span class="empty-icon">🎮</span>
            <p>Select a system to view games</p>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-grid-view', RwlGridView);
