/**
 * RetroWebLauncher - Grid View Component
 * Simple, working grid with size slider
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
    this._cardSize = parseInt(localStorage.getItem('rwl-card-size') || '150', 10);
  }

  connectedCallback() {
    this._render();
  }

  disconnectedCallback() {
    // Cleanup if needed
  }

  set systemId(id) {
    console.log('[GridView] systemId set to:', id);
    this._systemId = id;
    this._collectionId = null;
    this._page = 1;
    this._games = [];
    this._loadGames();
  }

  set collectionId(id) {
    console.log('[GridView] collectionId set to:', id);
    this._collectionId = id;
    this._systemId = null;
    this._page = 1;
    this._games = [];
    this._loadGames();
  }

  async _loadGames() {
    if (this._loading) return;

    console.log('[GridView] Loading games...');
    this._loading = true;
    this._showLoading();

    try {
      let response;
      if (this._systemId) {
        response = await api.getGames(this._systemId, { page: this._page, limit: 500 });
      } else if (this._collectionId) {
        response = await api.getCollection(this._collectionId);
      } else {
        console.log('[GridView] No systemId or collectionId');
        return;
      }

      console.log('[GridView] Got response:', response);
      this._games = response.games || [];
      this._totalPages = response.totalPages || 1;
      console.log('[GridView] Loaded', this._games.length, 'games');
      this._renderGames();
    } catch (error) {
      console.error('[GridView] Failed to load games:', error);
      this._showError(error.message);
    } finally {
      this._loading = false;
    }
  }

  _showLoading() {
    const grid = this.shadowRoot.getElementById('games-grid');
    if (grid) {
      grid.innerHTML = '<div class="message"><div class="spinner"></div><p>Loading games...</p></div>';
    }
  }

  _showError(message) {
    const grid = this.shadowRoot.getElementById('games-grid');
    if (grid) {
      grid.innerHTML = `<div class="message"><p>Error: ${message}</p><button onclick="location.reload()">Retry</button></div>`;
    }
  }

  _renderGames() {
    const grid = this.shadowRoot.getElementById('games-grid');
    const countEl = this.shadowRoot.getElementById('game-count');

    if (!grid) {
      console.error('[GridView] Grid element not found!');
      return;
    }

    if (this._games.length === 0) {
      grid.innerHTML = '<div class="message"><p>No games found</p></div>';
      return;
    }

    console.log('[GridView] Rendering', this._games.length, 'game cards');

    // Build HTML for all cards
    let html = '';
    for (let i = 0; i < this._games.length; i++) {
      const game = this._games[i];
      const name = String(game.name || 'Unknown');
      const hasImage = game.thumbnail || game.image || game.marquee;
      const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';

      html += `
        <div class="card" data-id="${game.id}" tabindex="0">
          <div class="card-img">
            ${imageUrl ? `<img src="${imageUrl}" alt="${name}" loading="lazy">` : '<span class="no-img">🎮</span>'}
          </div>
          <div class="card-name">${name}</div>
        </div>
      `;
    }

    grid.innerHTML = html;

    // Update count
    if (countEl) {
      countEl.textContent = `${this._games.length} games`;
    }

    // Add click handlers
    grid.querySelectorAll('.card').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.id;
        console.log('[GridView] Card clicked:', id);
        router.navigate(`/game/${id}`);
      };
      card.onkeydown = (e) => {
        if (e.key === 'Enter') {
          router.navigate(`/game/${card.dataset.id}`);
        }
      };
    });

    // Apply size
    this._applySize();
  }

  _applySize() {
    const grid = this.shadowRoot.getElementById('games-grid');
    if (grid) {
      grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${this._cardSize}px, 1fr))`;
    }
  }

  _onSliderChange(e) {
    this._cardSize = parseInt(e.target.value, 10);
    localStorage.setItem('rwl-card-size', this._cardSize);
    const label = this.shadowRoot.getElementById('size-label');
    if (label) label.textContent = `${this._cardSize}px`;
    this._applySize();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        * { box-sizing: border-box; }

        :host {
          display: block;
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          background: #0a0a0a;
        }

        #scroll-container {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 50px;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 16px;
        }

        #games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(${this._cardSize}px, 1fr));
          gap: 16px;
        }

        .card {
          background: #1a1a1a;
          border-radius: 8px;
          overflow: hidden;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
        }

        .card:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 20px rgba(255,0,102,0.3);
          z-index: 10;
          position: relative;
        }

        .card:focus {
          outline: 3px solid #ff0066;
          outline-offset: 2px;
        }

        .card-img {
          aspect-ratio: 3/4;
          background: #111;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .card-img img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-img {
          font-size: 48px;
          opacity: 0.3;
        }

        .card-name {
          padding: 8px;
          font-size: 12px;
          color: #fff;
          background: rgba(0,0,0,0.7);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        #toolbar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 50px;
          background: #141414;
          border-top: 1px solid #333;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          padding: 0 16px;
        }

        #toolbar label {
          color: #888;
          font-size: 12px;
        }

        #size-slider {
          width: 200px;
          cursor: pointer;
        }

        #size-label {
          color: #fff;
          font-size: 12px;
          min-width: 50px;
        }

        #game-count {
          color: #888;
          font-size: 12px;
          margin-left: auto;
        }

        .message {
          grid-column: 1 / -1;
          text-align: center;
          padding: 48px;
          color: #888;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #333;
          border-top-color: #ff0066;
          border-radius: 50%;
          margin: 0 auto 16px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Scrollbar */
        #scroll-container::-webkit-scrollbar { width: 8px; }
        #scroll-container::-webkit-scrollbar-track { background: #1a1a1a; }
        #scroll-container::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
        #scroll-container::-webkit-scrollbar-thumb:hover { background: #555; }
      </style>

      <div id="scroll-container">
        <div id="games-grid">
          <div class="message"><p>Select a system to view games</p></div>
        </div>
      </div>

      <div id="toolbar">
        <label>Size:</label>
        <input type="range" id="size-slider" min="80" max="280" value="${this._cardSize}">
        <span id="size-label">${this._cardSize}px</span>
        <span id="game-count"></span>
      </div>
    `;

    // Bind slider
    const slider = this.shadowRoot.getElementById('size-slider');
    if (slider) {
      slider.oninput = (e) => this._onSliderChange(e);
    }
  }
}

customElements.define('rwl-grid-view', RwlGridView);
