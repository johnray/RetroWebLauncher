/**
 * RetroWebLauncher - Game Detail Component
 * Full game information panel with launch capability
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';

class RwlGameDetail extends HTMLElement {
  static get observedAttributes() {
    return ['game-id'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._game = null;
    this._launching = false;
  }

  connectedCallback() {
    this._render();
    this._bindEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'game-id' && newValue && newValue !== oldValue) {
      this._loadGame(newValue);
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
      this._showLoading();
      const response = await api.getGame(gameId);
      this._game = response.game;
      this._renderContent();
    } catch (error) {
      console.error('Failed to load game:', error);
      this._showError('Failed to load game details');
    }
  }

  _bindEvents() {
    // Launch button
    this.shadowRoot.addEventListener('click', async (e) => {
      if (e.target.closest('.launch-btn')) {
        await this._launchGame();
      }

      if (e.target.closest('.favorite-btn')) {
        await this._toggleFavorite();
      }

      if (e.target.closest('.back-btn')) {
        router.back();
      }

      if (e.target.closest('.media-tab')) {
        const tab = e.target.closest('.media-tab');
        this._switchMediaTab(tab.dataset.tab);
      }
    });

    // Keyboard shortcuts
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this._launchGame();
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        e.preventDefault();
        router.back();
      } else if (e.key === 'f' || e.key === 'F') {
        this._toggleFavorite();
      }
    });

    // Listen for input manager
    state.on('input:select', () => this._launchGame());
    state.on('input:back', () => router.back());
  }

  async _launchGame() {
    if (!this._game || this._launching) return;

    this._launching = true;
    const launchBtn = this.shadowRoot.querySelector('.launch-btn');
    if (launchBtn) {
      launchBtn.disabled = true;
      launchBtn.innerHTML = `
        <span class="spinner"></span>
        <span>Launching...</span>
      `;
    }

    try {
      await api.launchGame(this._game.id);
      state.emit('gameLaunched', this._game);

      // Reset button after delay
      setTimeout(() => {
        this._launching = false;
        if (launchBtn) {
          launchBtn.disabled = false;
          launchBtn.innerHTML = `
            <span class="play-icon">▶</span>
            <span>Play</span>
          `;
        }
      }, 3000);
    } catch (error) {
      console.error('Failed to launch game:', error);
      this._launching = false;
      if (launchBtn) {
        launchBtn.disabled = false;
        launchBtn.innerHTML = `
          <span class="play-icon">▶</span>
          <span>Play</span>
        `;
      }
      state.emit('error', { message: 'Failed to launch game' });
    }
  }

  async _toggleFavorite() {
    if (!this._game) return;

    try {
      await api.toggleFavorite(this._game.id);
      this._game.favorite = !this._game.favorite;
      this._updateFavoriteButton();
      state.emit('favoriteToggled', { gameId: this._game.id, favorite: this._game.favorite });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }

  _updateFavoriteButton() {
    const btn = this.shadowRoot.querySelector('.favorite-btn');
    if (btn) {
      btn.innerHTML = this._game.favorite
        ? '<span>❤️</span><span>Favorited</span>'
        : '<span>🤍</span><span>Favorite</span>';
      btn.classList.toggle('active', this._game.favorite);
    }
  }

  _switchMediaTab(tab) {
    const tabs = this.shadowRoot.querySelectorAll('.media-tab');
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));

    const panels = this.shadowRoot.querySelectorAll('.media-panel');
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === tab));
  }

  _getMediaUrl(type = 'image') {
    if (!this._game) return '';
    return `/api/media/game/${this._game.id}/${type}`;
  }

  _formatLastPlayed(dateStr) {
    if (!dateStr) return 'Unknown';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  }

  _showLoading() {
    const content = this.shadowRoot.querySelector('.detail-content');
    if (content) {
      content.innerHTML = `
        <div class="loading-state">
          <span class="spinner large"></span>
          <p>Loading game details...</p>
        </div>
      `;
    }
  }

  _showError(message) {
    const content = this.shadowRoot.querySelector('.detail-content');
    if (content) {
      content.innerHTML = `
        <div class="error-state">
          <span class="error-icon">⚠️</span>
          <p>${message}</p>
          <button class="back-btn">Go Back</button>
        </div>
      `;
    }
  }

  _renderContent() {
    const content = this.shadowRoot.querySelector('.detail-content');
    if (!content || !this._game) return;

    const game = this._game;
    const hasVideo = !!game.video;
    const hasImage = game.image || game.thumbnail || game.screenshot;
    const hasManual = !!game.manual;

    content.innerHTML = `
      <div class="detail-header">
        <button class="back-btn" title="Back (Escape)">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <h1 class="game-title">${game.name}</h1>
      </div>

      <div class="detail-body">
        <div class="media-section">
          <div class="media-tabs">
            ${hasImage ? '<button class="media-tab active" data-tab="image">Image</button>' : ''}
            ${hasVideo ? '<button class="media-tab" data-tab="video">Video</button>' : ''}
            ${hasManual ? '<button class="media-tab" data-tab="manual">Manual</button>' : ''}
          </div>

          <div class="media-content">
            ${hasImage ? `
              <div class="media-panel active" data-panel="image">
                <img
                  src="${this._getMediaUrl('image')}"
                  alt="${game.name}"
                />
              </div>
            ` : ''}

            ${hasVideo ? `
              <div class="media-panel" data-panel="video">
                <rwl-video-player src="${this._getMediaUrl('video')}"></rwl-video-player>
              </div>
            ` : ''}

            ${hasManual ? `
              <div class="media-panel" data-panel="manual">
                <rwl-pdf-viewer src="${this._getMediaUrl('manual')}"></rwl-pdf-viewer>
              </div>
            ` : ''}

            ${!hasImage && !hasVideo ? `
              <div class="media-panel active no-media">
                <span class="no-media-icon">🎮</span>
                <p>No media available</p>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="info-section">
          <div class="action-buttons">
            <button class="launch-btn primary" title="Launch Game (Enter)">
              <span class="play-icon">▶</span>
              <span>Play</span>
            </button>
            <button class="favorite-btn ${game.favorite ? 'active' : ''}" title="Toggle Favorite (F)">
              <span>${game.favorite ? '❤️' : '🤍'}</span>
              <span>${game.favorite ? 'Favorited' : 'Favorite'}</span>
            </button>
          </div>

          <div class="game-metadata">
            ${game.description ? `
              <div class="meta-group description">
                <h3>Description</h3>
                <p>${game.description}</p>
              </div>
            ` : ''}

            <div class="meta-grid">
              ${game.releaseYear ? `
                <div class="meta-item">
                  <span class="meta-label">Release Year</span>
                  <span class="meta-value">${game.releaseYear}</span>
                </div>
              ` : ''}

              ${game.developer ? `
                <div class="meta-item">
                  <span class="meta-label">Developer</span>
                  <span class="meta-value">${game.developer}</span>
                </div>
              ` : ''}

              ${game.publisher ? `
                <div class="meta-item">
                  <span class="meta-label">Publisher</span>
                  <span class="meta-value">${game.publisher}</span>
                </div>
              ` : ''}

              ${game.genre ? `
                <div class="meta-item">
                  <span class="meta-label">Genre</span>
                  <span class="meta-value">${game.genre}</span>
                </div>
              ` : ''}

              ${game.playersString ? `
                <div class="meta-item">
                  <span class="meta-label">Players</span>
                  <span class="meta-value">${game.playersString}</span>
                </div>
              ` : ''}

              ${game.rating ? `
                <div class="meta-item">
                  <span class="meta-label">Rating</span>
                  <span class="meta-value">${(parseFloat(game.rating) * 10).toFixed(1)} / 10</span>
                </div>
              ` : ''}

              ${game.playCount ? `
                <div class="meta-item">
                  <span class="meta-label">Times Played</span>
                  <span class="meta-value">${game.playCount}</span>
                </div>
              ` : ''}

              ${game.lastPlayed ? `
                <div class="meta-item">
                  <span class="meta-label">Last Played</span>
                  <span class="meta-value">${this._formatLastPlayed(game.lastPlayed)}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          overflow: hidden;
        }

        .detail-container {
          height: 100%;
          overflow-y: auto;
          background: rgba(0,0,0,0.8);
        }

        .detail-content {
          max-width: 1400px;
          margin: 0 auto;
          padding: var(--spacing-lg, 1.5rem);
        }

        .detail-header {
          display: flex;
          align-items: center;
          gap: var(--spacing-md, 1rem);
          margin-bottom: var(--spacing-lg, 1.5rem);
        }

        .back-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: var(--radius-md, 8px);
          color: var(--color-text, #fff);
          cursor: pointer;
          transition: background var(--transition-fast, 150ms);
        }

        .back-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .back-btn svg {
          width: 24px;
          height: 24px;
        }

        .game-title {
          font-family: var(--font-display, 'Press Start 2P', monospace);
          font-size: var(--font-size-xl, 1.5rem);
          color: var(--color-primary, #ff0066);
          margin: 0;
          text-shadow: 0 0 20px rgba(255,0,102,0.5);
        }

        .detail-body {
          display: grid;
          grid-template-columns: 1fr 400px;
          gap: var(--spacing-xl, 2rem);
        }

        /* Media Section */
        .media-section {
          display: flex;
          flex-direction: column;
        }

        .media-tabs {
          display: flex;
          gap: var(--spacing-xs, 0.25rem);
          margin-bottom: var(--spacing-md, 1rem);
        }

        .media-tab {
          padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: var(--radius-sm, 4px) var(--radius-sm, 4px) 0 0;
          color: var(--color-text-muted, #888);
          font-size: var(--font-size-sm, 0.75rem);
          cursor: pointer;
          transition: all var(--transition-fast, 150ms);
        }

        .media-tab:hover {
          background: rgba(255,255,255,0.15);
          color: var(--color-text, #fff);
        }

        .media-tab.active {
          background: rgba(255,0,102,0.3);
          color: var(--color-primary, #ff0066);
        }

        .media-content {
          flex: 1;
          background: rgba(0,0,0,0.4);
          border-radius: var(--radius-lg, 12px);
          overflow: hidden;
          min-height: 400px;
        }

        .media-panel {
          display: none;
          width: 100%;
          height: 100%;
        }

        .media-panel.active {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .media-panel img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .no-media {
          flex-direction: column;
          gap: var(--spacing-md, 1rem);
        }

        .no-media-icon {
          font-size: 5rem;
          opacity: 0.3;
        }

        .no-media p {
          color: var(--color-text-muted, #888);
        }

        /* Info Section */
        .info-section {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg, 1.5rem);
        }

        .action-buttons {
          display: flex;
          gap: var(--spacing-md, 1rem);
        }

        .launch-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-sm, 0.5rem);
          padding: var(--spacing-md, 1rem);
          background: var(--color-primary, #ff0066);
          border: none;
          border-radius: var(--radius-md, 8px);
          color: var(--color-text, #fff);
          font-size: var(--font-size-lg, 1.25rem);
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast, 150ms);
        }

        .launch-btn:hover:not(:disabled) {
          background: var(--color-primary-hover, #ff3388);
          transform: scale(1.02);
          box-shadow: 0 0 30px rgba(255,0,102,0.5);
        }

        .launch-btn:disabled {
          opacity: 0.7;
          cursor: wait;
        }

        .launch-btn:focus-visible {
          outline: var(--focus-ring-width, 4px) solid var(--focus-ring-color, #ff0066);
          outline-offset: 2px;
        }

        .play-icon {
          font-size: 1.5rem;
        }

        .favorite-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs, 0.25rem);
          padding: var(--spacing-md, 1rem);
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: var(--radius-md, 8px);
          color: var(--color-text, #fff);
          font-size: var(--font-size-sm, 0.75rem);
          cursor: pointer;
          transition: all var(--transition-fast, 150ms);
        }

        .favorite-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .favorite-btn.active {
          border-color: rgba(255,0,102,0.5);
          background: rgba(255,0,102,0.2);
        }

        .game-metadata {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-lg, 1.5rem);
        }

        .meta-group h3 {
          font-size: var(--font-size-sm, 0.75rem);
          color: var(--color-primary, #ff0066);
          margin: 0 0 var(--spacing-sm, 0.5rem) 0;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .meta-group p {
          font-size: var(--font-size-sm, 0.75rem);
          color: var(--color-text, #fff);
          line-height: 1.6;
          margin: 0;
        }

        .meta-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--spacing-md, 1rem);
        }

        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .meta-label {
          font-size: var(--font-size-xs, 0.625rem);
          color: var(--color-text-muted, #888);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .meta-value {
          font-size: var(--font-size-sm, 0.75rem);
          color: var(--color-text, #fff);
        }

        /* Loading/Error states */
        .loading-state,
        .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 60vh;
          gap: var(--spacing-md, 1rem);
        }

        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(255,255,255,0.2);
          border-top-color: var(--color-primary, #ff0066);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .spinner.large {
          width: 40px;
          height: 40px;
          border-width: 3px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-icon {
          font-size: 4rem;
        }

        .error-state p {
          color: var(--color-text-muted, #888);
        }

        /* Scrollbar */
        .detail-container::-webkit-scrollbar {
          width: 8px;
        }

        .detail-container::-webkit-scrollbar-track {
          background: rgba(0,0,0,0.2);
        }

        .detail-container::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.2);
          border-radius: 4px;
        }

        /* Mobile */
        @media (max-width: 900px) {
          .detail-body {
            grid-template-columns: 1fr;
          }

          .game-title {
            font-size: var(--font-size-lg, 1.25rem);
          }

          .meta-grid {
            grid-template-columns: 1fr;
          }
        }
      </style>

      <div class="detail-container">
        <div class="detail-content">
          <div class="loading-state">
            <span class="spinner large"></span>
            <p>Loading...</p>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-game-detail', RwlGameDetail);
