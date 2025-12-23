/**
 * RetroWebLauncher - Game Card Component (Lit)
 * Displays game thumbnail with info
 */

import { router } from '../router.js';
import { api } from '../api.js';
import { state } from '../state.js';

const { LitElement, html, css } = window.Lit;

class RwlGameCard extends LitElement {
  static properties = {
    gameId: { type: String, attribute: 'game-id' },
    showInfo: { type: Boolean, attribute: 'show-info' },
    size: { type: String, reflect: true },
    _game: { state: true },
    _imageLoaded: { state: true }
  };

  static styles = css`
    :host {
      display: block;
      contain: content;
    }

    .card {
      position: relative;
      border-radius: var(--radius-md, 8px);
      overflow: hidden;
      background: var(--game-card-background, rgba(0,0,0,0.4));
      border: 1px solid var(--game-card-border, transparent);
      cursor: pointer;
      transition: transform var(--transition-fast, 150ms),
                  box-shadow var(--transition-fast, 150ms);
      height: 100%;
      box-shadow: var(--game-card-shadow, none);
    }

    .card:hover {
      transform: scale(var(--grid-hover-scale, 1.05));
      box-shadow: var(--game-card-hover-shadow, 0 8px 24px rgba(0,0,0,0.4)),
                  0 0 20px var(--selection-glow-color, rgba(255,0,102,0.3));
      z-index: 10;
    }

    .card:focus-visible {
      outline: var(--selection-border-width, 4px) solid var(--selection-border-color, #ff0066);
      outline-offset: 2px;
      transform: scale(var(--grid-hover-scale, 1.05));
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
      background: var(--game-card-image-bg, rgba(0,0,0,0.6));
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .image-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.2s ease;
    }

    .image-container img.loaded {
      opacity: 1;
    }

    .no-image {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      background: var(--game-card-no-image-bg, linear-gradient(135deg, rgba(40,40,40,1) 0%, rgba(20,20,20,1) 100%));
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
      background: var(--game-card-image-bg, rgba(0,0,0,0.4));
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
      background: var(--badge-background, rgba(0,0,0,0.7));
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
      background: var(--game-card-title-bg, rgba(0,0,0,0.8));
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

    @supports (-webkit-touch-callout: none) {
      .card {
        -webkit-transform: translateZ(0);
        transform: translateZ(0);
      }
    }
  `;

  constructor() {
    super();
    this._game = null;
    this._imageLoaded = false;
    this.showInfo = true;
    this.size = 'medium';
  }

  set game(data) {
    this._game = data;
  }

  get game() {
    return this._game;
  }

  updated(changedProperties) {
    if (changedProperties.has('gameId') && this.gameId) {
      this._loadGame(this.gameId);
    }
  }

  async _loadGame(gameId) {
    try {
      const response = await api.getGame(gameId);
      this._game = response.game;
    } catch (error) {
      console.error('Failed to load game:', error);
    }
  }

  _handleClick() {
    if (this._game) {
      router.navigate(`/game/${this._game.id}`);
    }
  }

  _handleKeydown(e) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this._handleClick();
    }
  }

  async _toggleFavorite(e) {
    e?.stopPropagation();
    if (!this._game) return;

    try {
      await api.toggleFavorite(this._game.id);
      this._game = { ...this._game, favorite: !this._game.favorite };
      state.emit('favoriteToggled', { gameId: this._game.id, favorite: this._game.favorite });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }

  _getImageUrl() {
    if (!this._game) return '';
    if (this._game.thumbnail || this._game.image || this._game.marquee) {
      return `/api/media/game/${this._game.id}/thumbnail`;
    }
    return '';
  }

  _handleImageLoad(e) {
    const img = e.target;
    if ('decode' in img) {
      img.decode().then(() => {
        img.classList.add('loaded');
      }).catch(() => {
        this._imageLoaded = false;
      });
    } else {
      img.classList.add('loaded');
    }
  }

  _handleImageError(e) {
    e.target.style.display = 'none';
    this._imageLoaded = false;
  }

  render() {
    const imageUrl = this._getImageUrl();

    return html`
      <div class="card" tabindex="0" role="button" aria-label="View game details"
           @click=${this._handleClick}
           @keydown=${this._handleKeydown}
           @auxclick=${(e) => e.button === 1 && this._toggleFavorite(e)}>
        <div class="card-content">
          ${!this._game ? html`
            <div class="placeholder">
              <span class="placeholder-icon">🎮</span>
            </div>
          ` : html`
            <div class="image-container">
              ${imageUrl ? html`
                <img
                  src="${imageUrl}"
                  alt="${this._game.name}"
                  loading="lazy"
                  @load=${this._handleImageLoad}
                  @error=${this._handleImageError}
                />
              ` : html`
                <div class="no-image">
                  <span class="no-image-icon">🎮</span>
                </div>
              `}
              ${this._game.favorite ? html`<span class="favorite-badge">❤️</span>` : ''}
              ${this._game.video ? html`<span class="video-badge">▶</span>` : ''}
            </div>
            ${this.showInfo !== false ? html`
              <div class="info">
                <div class="name">${this._game.name}</div>
                ${this._game.releaseYear ? html`<div class="year">${this._game.releaseYear}</div>` : ''}
              </div>
            ` : ''}
          `}
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-game-card', RwlGameCard);
