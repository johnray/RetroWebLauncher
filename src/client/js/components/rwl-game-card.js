/**
 * RetroWebLauncher - Game Card Component
 * Displays game thumbnail with info
 */

import { router } from '../router.js';
import { api } from '../api.js';
import { state } from '../state.js';

class RwlGameCard extends HTMLElement {
  static get observedAttributes() {
    return ['game-id', 'show-info', 'size'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._game = null;
    this._imageLoaded = false;
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'game-id' && newValue) {
        this._loadGame(newValue);
      } else {
        this._render();
      }
    }
  }

  set game(data) {
    this._game = data;
    this._renderContent();
  }

  get game() {
    return this._game;
  }

  async _loadGame(gameId) {
    try {
      const response = await api.getGame(gameId);
      this._game = response.game;
      this._renderContent();
    } catch (error) {
      console.error('Failed to load game:', error);
    }
  }

  _bindEvents() {
    // Click to view details
    this.shadowRoot.addEventListener('click', () => {
      if (this._game) {
        router.navigate(`/game/${this._game.id}`);
      }
    });

    // Keyboard navigation
    this.shadowRoot.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (this._game) {
          router.navigate(`/game/${this._game.id}`);
        }
      }
    });

    // Favorite toggle on middle-click or 'f' key
    this.shadowRoot.addEventListener('auxclick', (e) => {
      if (e.button === 1 && this._game) {
        e.preventDefault();
        this._toggleFavorite();
      }
    });
  }

  async _toggleFavorite() {
    if (!this._game) return;

    try {
      await api.toggleFavorite(this._game.id);
      this._game.favorite = !this._game.favorite;
      this._renderContent();
      state.emit('favoriteToggled', { gameId: this._game.id, favorite: this._game.favorite });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }

  _getImageUrl() {
    if (!this._game) return '';

    // Use game ID-based endpoint which handles thumbnail/image fallback server-side
    if (this._game.thumbnail || this._game.image || this._game.marquee) {
      return `/api/media/game/${this._game.id}/thumbnail`;
    }
    return '';
  }

  _renderContent() {
    const content = this.shadowRoot.querySelector('.card-content');
    if (!content) return;

    if (!this._game) {
      content.innerHTML = `
        <div class="placeholder">
          <span class="placeholder-icon">🎮</span>
        </div>
      `;
      return;
    }

    const imageUrl = this._getImageUrl();
    const showInfo = this.getAttribute('show-info') !== 'false';

    content.innerHTML = `
      <div class="image-container">
        ${imageUrl ? `
          <img
            src="${imageUrl}"
            alt="${this._game.name}"
            loading="lazy"
          />
        ` : `
          <div class="no-image">
            <span class="no-image-icon">🎮</span>
          </div>
        `}
        ${this._game.favorite ? '<span class="favorite-badge">❤️</span>' : ''}
        ${this._game.video ? '<span class="video-badge">▶</span>' : ''}
      </div>
      ${showInfo ? `
        <div class="info">
          <div class="name">${this._game.name}</div>
          ${this._game.releaseYear ? `<div class="year">${this._game.releaseYear}</div>` : ''}
        </div>
      ` : ''}
    `;

    // Handle image load error
    const img = content.querySelector('img');
    if (img) {
      img.onerror = () => {
        img.style.display = 'none';
        const container = img.parentElement;
        if (container && !container.querySelector('.no-image')) {
          container.innerHTML += `
            <div class="no-image">
              <span class="no-image-icon">🎮</span>
            </div>
          `;
        }
      };
    }
  }

  _render() {
    const size = this.getAttribute('size') || 'medium';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          contain: content;
        }

        .card {
          position: relative;
          border-radius: var(--radius-md, 8px);
          overflow: hidden;
          background: rgba(0,0,0,0.4);
          cursor: pointer;
          transition: transform var(--transition-fast, 150ms),
                      box-shadow var(--transition-fast, 150ms);
          height: 100%;
        }

        .card:hover {
          transform: scale(1.05);
          box-shadow: 0 8px 24px rgba(0,0,0,0.4),
                      0 0 20px rgba(255,0,102,0.3);
          z-index: 10;
        }

        .card:focus-visible {
          outline: var(--focus-ring-width, 4px) solid var(--focus-ring-color, #ff0066);
          outline-offset: 2px;
          transform: scale(1.05);
        }

        .card-content {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        .image-container {
          position: relative;
          flex: 1;
          min-height: 0;
          background: rgba(0,0,0,0.6);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .image-container img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .no-image {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(40,40,40,1) 0%, rgba(20,20,20,1) 100%);
        }

        .no-image-icon {
          font-size: 3rem;
          opacity: 0.3;
        }

        .placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.4);
        }

        .placeholder-icon {
          font-size: 2rem;
          opacity: 0.2;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.4; }
        }

        .favorite-badge {
          position: absolute;
          top: 8px;
          right: 8px;
          font-size: 1rem;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.5));
        }

        .video-badge {
          position: absolute;
          bottom: 8px;
          right: 8px;
          background: rgba(0,0,0,0.7);
          color: var(--color-primary, #ff0066);
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.625rem;
        }

        .info {
          padding: var(--spacing-sm, 0.5rem);
          background: rgba(0,0,0,0.8);
        }

        .name {
          font-size: var(--font-size-sm, 0.75rem);
          color: var(--color-text, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-weight: 500;
        }

        .year {
          font-size: var(--font-size-xs, 0.625rem);
          color: var(--color-text-muted, #888);
          margin-top: 2px;
        }

        /* Size variants */
        :host([size="small"]) .card {
          max-width: 120px;
        }

        :host([size="small"]) .no-image-icon {
          font-size: 2rem;
        }

        :host([size="large"]) .card {
          max-width: 300px;
        }

        :host([size="large"]) .name {
          font-size: var(--font-size-base, 1rem);
        }

        /* Safari optimization - hardware acceleration */
        @supports (-webkit-touch-callout: none) {
          .card {
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
          }
        }
      </style>

      <div class="card" tabindex="0" role="button" aria-label="View game details">
        <div class="card-content">
          <div class="placeholder">
            <span class="placeholder-icon">🎮</span>
          </div>
        </div>
      </div>
    `;

    this._renderContent();
  }
}

customElements.define('rwl-game-card', RwlGameCard);
