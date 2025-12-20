/**
 * RetroWebLauncher - Grid View Component
 * Responsive grid with size slider and scrolling
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';

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
    this._cardSize = 150; // Default card width in pixels
    this._unsubscribers = [];
  }

  connectedCallback() {
    this._render();
    this._bindEvents();

    // Load saved card size preference
    const savedSize = localStorage.getItem('rwl-card-size');
    if (savedSize) {
      this._cardSize = parseInt(savedSize, 10);
      this._updateCardSize();
    }
  }

  disconnectedCallback() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
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

  async _loadGames() {
    if (this._loading) return;

    this._loading = true;
    this._showLoading();

    try {
      let response;
      if (this._systemId) {
        response = await api.getGames(this._systemId, { page: this._page, limit: 500 });
      } else if (this._collectionId) {
        response = await api.getCollection(this._collectionId);
      } else {
        return;
      }

      if (this._page === 1) {
        this._games = response.games || [];
      } else {
        this._games = [...this._games, ...(response.games || [])];
      }

      this._totalPages = response.totalPages || 1;
      this._renderGames();
    } catch (error) {
      console.error('Failed to load games:', error);
      this._showError(`Failed to load games: ${error.message || 'Unknown error'}`);
    } finally {
      this._loading = false;
    }
  }

  _bindEvents() {
    // Size slider
    const slider = this.shadowRoot.querySelector('.size-slider');
    if (slider) {
      slider.addEventListener('input', (e) => {
        this._cardSize = parseInt(e.target.value, 10);
        this._updateCardSize();
        localStorage.setItem('rwl-card-size', this._cardSize);
      });
    }

    // Scroll for infinite loading
    const container = this.shadowRoot.querySelector('.grid-container');
    if (container) {
      container.addEventListener('scroll', () => {
        this._checkInfiniteScroll(container);
      }, { passive: true });
    }

    // Listen for navigation events
    this._unsubscribers.push(
      state.on('input:navigate', (direction) => this._navigate(direction))
    );
    this._unsubscribers.push(
      state.on('input:select', () => this._selectCurrent())
    );
  }

  _updateCardSize() {
    const grid = this.shadowRoot.querySelector('.games-grid');
    const slider = this.shadowRoot.querySelector('.size-slider');
    const sizeLabel = this.shadowRoot.querySelector('.size-label');

    if (grid) {
      grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${this._cardSize}px, 1fr))`;
    }
    if (slider) {
      slider.value = this._cardSize;
    }
    if (sizeLabel) {
      sizeLabel.textContent = `${this._cardSize}px`;
    }
  }

  _checkInfiniteScroll(container) {
    if (this._loading || this._page >= this._totalPages) return;

    const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (scrollBottom < 500) {
      this._page++;
      this._loadGames();
    }
  }

  _navigate(direction) {
    const cards = this.shadowRoot.querySelectorAll('.game-card');
    if (!cards.length) return;

    const grid = this.shadowRoot.querySelector('.games-grid');
    const gridStyle = getComputedStyle(grid);
    const columns = gridStyle.gridTemplateColumns.split(' ').length;

    const oldIndex = this._selectedIndex;

    switch (direction) {
      case 'up':
        this._selectedIndex = Math.max(0, this._selectedIndex - columns);
        break;
      case 'down':
        this._selectedIndex = Math.min(this._games.length - 1, this._selectedIndex + columns);
        break;
      case 'left':
        this._selectedIndex = Math.max(0, this._selectedIndex - 1);
        break;
      case 'right':
        this._selectedIndex = Math.min(this._games.length - 1, this._selectedIndex + 1);
        break;
    }

    if (oldIndex !== this._selectedIndex) {
      this._focusCard(this._selectedIndex);
    }
  }

  _focusCard(index) {
    const cards = this.shadowRoot.querySelectorAll('.game-card');
    cards.forEach((card, i) => {
      card.classList.toggle('selected', i === index);
    });
    if (cards[index]) {
      cards[index].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  _selectCurrent() {
    const game = this._games[this._selectedIndex];
    if (game) {
      router.navigate(`/game/${game.id}`);
    }
  }

  _showLoading() {
    const grid = this.shadowRoot.querySelector('.games-grid');
    if (!grid) return;

    grid.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading games...</p>
      </div>
    `;
  }

  _showError(message) {
    const grid = this.shadowRoot.querySelector('.games-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="error-state">
          <p>${message}</p>
          <button class="retry-btn">Retry</button>
        </div>
      `;
      grid.querySelector('.retry-btn')?.addEventListener('click', () => this._loadGames());
    }
  }

  _getImageUrl(game) {
    if (game.thumbnail || game.image || game.marquee) {
      return `/api/media/game/${game.id}/thumbnail`;
    }
    return '';
  }

  _renderGames() {
    const grid = this.shadowRoot.querySelector('.games-grid');
    if (!grid) return;

    if (this._games.length === 0) {
      grid.innerHTML = `
        <div class="empty-state">
          <p>No games found</p>
        </div>
      `;
      return;
    }

    grid.innerHTML = this._games.map((game, index) => {
      const imageUrl = this._getImageUrl(game);
      const name = game.name || 'Unknown Game';

      return `
        <div class="game-card" data-index="${index}" data-game-id="${game.id}" tabindex="0">
          <div class="card-image">
            ${imageUrl
              ? `<img src="${imageUrl}" alt="${name}" loading="lazy" />`
              : `<div class="no-image">🎮</div>`
            }
          </div>
          <div class="card-title">${name}</div>
        </div>
      `;
    }).join('');

    // Bind click events to cards
    grid.querySelectorAll('.game-card').forEach(card => {
      card.addEventListener('click', () => {
        const gameId = card.dataset.gameId;
        if (gameId) {
          router.navigate(`/game/${gameId}`);
        }
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const gameId = card.dataset.gameId;
          if (gameId) {
            router.navigate(`/game/${gameId}`);
          }
        }
      });
    });

    // Apply current card size
    this._updateCardSize();
    this._updateGameCount();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .grid-container {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 1rem;
          padding-bottom: 60px;
        }

        .games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
          gap: 1rem;
          align-content: start;
        }

        .game-card {
          background: rgba(30, 30, 30, 0.8);
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          display: flex;
          flex-direction: column;
        }

        .game-card:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4), 0 0 20px rgba(255,0,102,0.3);
          z-index: 10;
        }

        .game-card:focus {
          outline: 3px solid #ff0066;
          outline-offset: 2px;
        }

        .game-card.selected {
          outline: 3px solid #ff0066;
        }

        .card-image {
          aspect-ratio: 3/4;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .card-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image {
          font-size: 3rem;
          opacity: 0.3;
        }

        .card-title {
          padding: 0.5rem;
          font-size: 0.75rem;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          background: rgba(0,0,0,0.6);
        }

        /* Slider toolbar at bottom */
        .slider-toolbar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50px;
          background: rgba(20, 20, 20, 0.95);
          border-top: 1px solid rgba(255,255,255,0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 0 1rem;
          backdrop-filter: blur(10px);
          z-index: 100;
        }

        .slider-label {
          color: #888;
          font-size: 0.75rem;
        }

        .size-slider {
          width: 200px;
          height: 4px;
          -webkit-appearance: none;
          appearance: none;
          background: rgba(255,255,255,0.2);
          border-radius: 2px;
          outline: none;
        }

        .size-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #ff0066;
          border-radius: 50%;
          cursor: pointer;
        }

        .size-slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #ff0066;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        .size-label {
          color: #fff;
          font-size: 0.75rem;
          min-width: 50px;
        }

        .game-count {
          color: #888;
          font-size: 0.75rem;
          margin-left: auto;
        }

        /* States */
        .loading-state,
        .empty-state,
        .error-state {
          grid-column: 1 / -1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          color: #888;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.1);
          border-top-color: #ff0066;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .retry-btn {
          margin-top: 1rem;
          padding: 0.5rem 1.5rem;
          background: #ff0066;
          border: none;
          border-radius: 4px;
          color: #fff;
          cursor: pointer;
        }

        .retry-btn:hover {
          background: #ff3388;
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
            grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
            gap: 0.5rem;
          }
          .grid-container {
            padding: 0.5rem;
          }
          .slider-toolbar {
            height: 44px;
          }
          .size-slider {
            width: 120px;
          }
        }
      </style>

      <div class="grid-container">
        <div class="games-grid">
          <div class="empty-state">
            <p>Select a system to view games</p>
          </div>
        </div>
      </div>

      <div class="slider-toolbar">
        <span class="slider-label">Size:</span>
        <input type="range" class="size-slider" min="80" max="250" value="${this._cardSize}" />
        <span class="size-label">${this._cardSize}px</span>
        <span class="game-count"></span>
      </div>
    `;

    // Update game count when games are loaded
    this._updateGameCount();
  }

  _updateGameCount() {
    const countEl = this.shadowRoot.querySelector('.game-count');
    if (countEl && this._games.length > 0) {
      countEl.textContent = `${this._games.length} games`;
    }
  }
}

customElements.define('rwl-grid-view', RwlGridView);
