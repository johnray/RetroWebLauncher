/**
 * RetroWebLauncher - Game Detail Component
 * Full game information panel with launch capability
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';

const { LitElement, html, css } = window.Lit;

class RwlGameDetail extends LitElement {
  static properties = {
    gameId: { type: String, attribute: 'game-id' },
    _game: { state: true },
    _launching: { state: true },
    _activeMediaTab: { state: true },
    _currentImageIndex: { state: true }
  };

  static styles = css`
    :host {
      display: block;
      height: 100%;
      overflow: hidden;
    }

    .detail-container {
      height: 100%;
      overflow-y: auto;
      background: var(--content-background, rgba(0,0,0,0.8));
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

    .game-title {
      font-family: var(--font-display, 'VT323', monospace);
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
      background: var(--button-secondary-bg, rgba(255,255,255,0.1));
      border: none;
      border-radius: var(--radius-sm, 4px) var(--radius-sm, 4px) 0 0;
      color: var(--color-text-muted, #888);
      font-size: var(--font-size-sm, 0.75rem);
      cursor: pointer;
      transition: all var(--transition-fast, 150ms);
    }

    .media-tab:hover {
      background: var(--button-secondary-hover, rgba(255,255,255,0.15));
      color: var(--color-text, #fff);
    }

    .media-tab.active {
      background: var(--button-active-bg, rgba(255,0,102,0.3));
      color: var(--color-primary, #ff0066);
    }

    .media-content {
      flex: 1;
      background: var(--content-surface, rgba(0,0,0,0.4));
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

    /* Image Gallery */
    .image-gallery {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
      gap: var(--spacing-md, 1rem);
    }

    .gallery-image-container {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 0;
      width: 100%;
    }

    .gallery-image-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }

    .gallery-controls {
      display: flex;
      align-items: center;
      gap: var(--spacing-md, 1rem);
      padding: var(--spacing-sm, 0.5rem);
      background: var(--content-surface, rgba(0,0,0,0.4));
      border-radius: var(--radius-md, 8px);
    }

    .gallery-nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      background: var(--button-secondary-bg, rgba(255,255,255,0.1));
      border: none;
      border-radius: var(--radius-sm, 4px);
      color: var(--color-text, #fff);
      font-size: 1.2rem;
      cursor: pointer;
      transition: all var(--transition-fast, 150ms);
    }

    .gallery-nav-btn:hover:not(:disabled) {
      background: var(--button-secondary-hover, rgba(255,255,255,0.2));
    }

    .gallery-nav-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .gallery-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      min-width: 100px;
    }

    .gallery-type {
      font-size: var(--font-size-sm, 0.75rem);
      color: var(--color-primary, #ff0066);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .gallery-counter {
      font-size: var(--font-size-xs, 0.625rem);
      color: var(--color-text-muted, #888);
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

    /* CRT Frame Styling */
    .crt-frame {
      background: var(--crt-frame-background, linear-gradient(145deg, #2a2a2a, #1a1a1a));
      border: 3px solid var(--crt-frame-border, transparent);
      border-radius: 20px;
      padding: 20px;
      box-shadow:
        0 10px 40px rgba(0, 0, 0, 0.5),
        inset 0 2px 0 rgba(255, 255, 255, 0.1);
      position: relative;
      width: 100%;
      max-width: 640px;
    }

    .crt-screen {
      background: var(--crt-screen-background, #000);
      border-radius: 12px;
      overflow: hidden;
      position: relative;
      aspect-ratio: 4/3;
    }

    .crt-screen::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.15) 0px,
        rgba(0, 0, 0, 0.15) 1px,
        transparent 1px,
        transparent 3px
      );
      pointer-events: none;
      border-radius: 12px;
    }

    .crt-screen rwl-video-player {
      display: block;
      width: 100%;
      height: 100%;
    }

    .crt-details {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      padding: 0 8px;
    }

    .crt-led {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--crt-led-on, #0f0);
      box-shadow: 0 0 8px var(--crt-led-on, #0f0);
      animation: led-blink 2s ease-in-out infinite;
    }

    @keyframes led-blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    .crt-brand {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 0.7rem;
      color: var(--color-text-muted, #888);
      letter-spacing: 0.1em;
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
      background: var(--button-secondary-bg, rgba(255,255,255,0.1));
      border: 1px solid var(--button-secondary-border, rgba(255,255,255,0.2));
      border-radius: var(--radius-md, 8px);
      color: var(--color-text, #fff);
      font-size: var(--font-size-sm, 0.75rem);
      cursor: pointer;
      transition: all var(--transition-fast, 150ms);
    }

    .favorite-btn:hover {
      background: var(--button-secondary-hover, rgba(255,255,255,0.2));
    }

    .favorite-btn.active {
      border-color: var(--button-active-border, rgba(255,0,102,0.5));
      background: var(--button-active-bg, rgba(255,0,102,0.2));
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
      border: 2px solid var(--spinner-track, rgba(255,255,255,0.2));
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
      background: var(--content-scrollbar-track, rgba(0,0,0,0.2));
    }

    .detail-container::-webkit-scrollbar-thumb {
      background: var(--content-scrollbar-thumb, rgba(255,255,255,0.2));
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
  `;

  constructor() {
    super();
    this._game = null;
    this._launching = false;
    this._unsubscribers = [];
    this._activeMediaTab = 'video';
    this._currentImageIndex = 0;
    this._launchTimeout = null; // Track timeout for cleanup
  }

  connectedCallback() {
    super.connectedCallback();
    this._bindEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    // Clear any pending launch timeout
    if (this._launchTimeout) {
      clearTimeout(this._launchTimeout);
      this._launchTimeout = null;
    }

    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  updated(changedProperties) {
    if (changedProperties.has('gameId') && this.gameId) {
      this._loadGame(this.gameId);
    }
  }

  set game(data) {
    this._game = data;
  }

  get game() {
    return this._game;
  }

  async _loadGame(gameId) {
    try {
      const response = await api.getGame(gameId);
      this._game = response.game;

      // Set default media tab
      const hasVideo = !!this._game.video;
      this._activeMediaTab = hasVideo ? 'video' : 'image';
    } catch (error) {
      console.error('Failed to load game:', error);
      this._game = { error: 'Failed to load game details' };
    }
  }

  _bindEvents() {
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
      } else if (e.key === 'ArrowLeft' && this._activeMediaTab === 'image') {
        e.preventDefault();
        this._navigateImage(-1);
      } else if (e.key === 'ArrowRight' && this._activeMediaTab === 'image') {
        e.preventDefault();
        this._navigateImage(1);
      }
    });

    // Listen for input manager
    this._unsubscribers.push(
      state.on('input:select', () => this._launchGame())
    );
    this._unsubscribers.push(
      state.on('input:back', () => router.back())
    );
  }

  async _launchGame() {
    if (!this._game || this._launching) return;

    this._launching = true;

    try {
      await api.launchGame(this._game.id);
      state.emit('gameLaunched', this._game);

      // Reset button after delay - track timeout for cleanup
      if (this._launchTimeout) {
        clearTimeout(this._launchTimeout);
      }
      this._launchTimeout = setTimeout(() => {
        this._launchTimeout = null;
        if (this.isConnected) {
          this._launching = false;
        }
      }, 3000);
    } catch (error) {
      console.error('Failed to launch game:', error);
      this._launching = false;
      state.emit('error', { message: 'Failed to launch game' });
    }
  }

  async _toggleFavorite() {
    if (!this._game) return;

    try {
      await api.toggleFavorite(this._game.id);
      this._game = { ...this._game, favorite: !this._game.favorite };
      state.emit('favoriteToggled', { gameId: this._game.id, favorite: this._game.favorite });
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  }

  _handleBack() {
    router.back();
  }

  _switchMediaTab(tab) {
    this._activeMediaTab = tab;
    // Reset image index when switching to image tab
    if (tab === 'image') {
      this._currentImageIndex = 0;
    }
  }

  /**
   * Get array of available image types for the current game
   * @returns {Array<{type: string, label: string}>}
   */
  _getAvailableImages() {
    if (!this._game) return [];

    const images = [];

    // Order matters - this is the display order
    if (this._game.image) {
      images.push({ type: 'image', label: 'Box Art' });
    }
    if (this._game.thumbnail) {
      images.push({ type: 'thumbnail', label: 'Thumbnail' });
    }
    if (this._game.marquee) {
      images.push({ type: 'marquee', label: 'Marquee' });
    }
    if (this._game.fanart) {
      images.push({ type: 'fanart', label: 'Fan Art' });
    }

    return images;
  }

  /**
   * Navigate to previous/next image in gallery
   * @param {number} direction - -1 for previous, 1 for next
   */
  _navigateImage(direction) {
    const images = this._getAvailableImages();
    if (images.length <= 1) return;

    let newIndex = this._currentImageIndex + direction;

    // Wrap around
    if (newIndex < 0) {
      newIndex = images.length - 1;
    } else if (newIndex >= images.length) {
      newIndex = 0;
    }

    this._currentImageIndex = newIndex;
  }

  /**
   * Render the image gallery with navigation
   * @param {Object} game - Game object
   * @returns {TemplateResult}
   */
  _renderImageGallery(game) {
    const images = this._getAvailableImages();

    if (images.length === 0) {
      return html`<img src="${this._getMediaUrl('image')}" alt="${game.name}" />`;
    }

    // Ensure index is within bounds
    const safeIndex = Math.min(this._currentImageIndex, images.length - 1);
    const currentImage = images[safeIndex];
    const showControls = images.length > 1;

    return html`
      <div class="image-gallery">
        <div class="gallery-image-container">
          <img
            src="${this._getMediaUrl(currentImage.type)}"
            alt="${game.name} - ${currentImage.label}"
          />
        </div>
        ${showControls ? html`
          <div class="gallery-controls">
            <button
              class="gallery-nav-btn"
              @click=${() => this._navigateImage(-1)}
              title="Previous image"
            >◀</button>
            <div class="gallery-info">
              <span class="gallery-type">${currentImage.label}</span>
              <span class="gallery-counter">${safeIndex + 1} / ${images.length}</span>
            </div>
            <button
              class="gallery-nav-btn"
              @click=${() => this._navigateImage(1)}
              title="Next image"
            >▶</button>
          </div>
        ` : html`
          <div class="gallery-controls">
            <div class="gallery-info">
              <span class="gallery-type">${currentImage.label}</span>
            </div>
          </div>
        `}
      </div>
    `;
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

  render() {
    if (!this._game) {
      return html`
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

    if (this._game.error) {
      return html`
        <div class="detail-container">
          <div class="detail-content">
            <div class="error-state">
              <span class="error-icon">⚠️</span>
              <p>${this._game.error}</p>
              <button class="back-btn" @click=${this._handleBack}>Go Back</button>
            </div>
          </div>
        </div>
      `;
    }

    const game = this._game;
    const hasVideo = !!game.video;
    const hasImage = game.image || game.thumbnail || game.screenshot;
    const hasManual = !!game.manual;

    return html`
      <div class="detail-container">
        <div class="detail-content">
          <div class="detail-header">
            <button class="back-btn" title="Back (Escape)" @click=${this._handleBack}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
            <h1 class="game-title">${game.name}</h1>
          </div>

          <div class="detail-body">
            <div class="media-section">
              <div class="media-tabs">
                ${hasVideo ? html`
                  <button
                    class="media-tab ${this._activeMediaTab === 'video' ? 'active' : ''}"
                    data-tab="video"
                    @click=${() => this._switchMediaTab('video')}
                  >Video</button>
                ` : ''}
                ${hasImage ? html`
                  <button
                    class="media-tab ${this._activeMediaTab === 'image' ? 'active' : ''}"
                    data-tab="image"
                    @click=${() => this._switchMediaTab('image')}
                  >Image</button>
                ` : ''}
                ${hasManual ? html`
                  <button
                    class="media-tab ${this._activeMediaTab === 'manual' ? 'active' : ''}"
                    data-tab="manual"
                    @click=${() => this._switchMediaTab('manual')}
                  >Manual</button>
                ` : ''}
              </div>

              <div class="media-content">
                ${hasVideo ? html`
                  <div class="media-panel ${this._activeMediaTab === 'video' ? 'active' : ''}" data-panel="video">
                    <div class="crt-frame">
                      <div class="crt-screen">
                        <rwl-video-player .src=${this._getMediaUrl('video')} autoplay></rwl-video-player>
                      </div>
                      <div class="crt-details">
                        <div class="crt-led"></div>
                        <div class="crt-brand">RetroTV</div>
                      </div>
                    </div>
                  </div>
                ` : ''}

                ${hasImage ? html`
                  <div class="media-panel ${this._activeMediaTab === 'image' ? 'active' : ''}" data-panel="image">
                    ${this._renderImageGallery(game)}
                  </div>
                ` : ''}

                ${hasManual ? html`
                  <div class="media-panel ${this._activeMediaTab === 'manual' ? 'active' : ''}" data-panel="manual">
                    <rwl-pdf-viewer src="${this._getMediaUrl('manual')}"></rwl-pdf-viewer>
                  </div>
                ` : ''}

                ${!hasImage && !hasVideo ? html`
                  <div class="media-panel active no-media">
                    <span class="no-media-icon">🎮</span>
                    <p>No media available</p>
                  </div>
                ` : ''}
              </div>
            </div>

            <div class="info-section">
              <div class="action-buttons">
                <button
                  class="launch-btn primary"
                  title="Launch Game (Enter)"
                  ?disabled=${this._launching}
                  @click=${this._launchGame}
                >
                  ${this._launching ? html`
                    <span class="spinner"></span>
                    <span>Launching...</span>
                  ` : html`
                    <span class="play-icon">▶</span>
                    <span>Play</span>
                  `}
                </button>
                <button
                  class="favorite-btn ${game.favorite ? 'active' : ''}"
                  title="Toggle Favorite (F)"
                  @click=${this._toggleFavorite}
                >
                  <span>${game.favorite ? '❤️' : '🤍'}</span>
                  <span>${game.favorite ? 'Favorited' : 'Favorite'}</span>
                </button>
              </div>

              <div class="game-metadata">
                ${game.description ? html`
                  <div class="meta-group description">
                    <h3>Description</h3>
                    <p>${game.description}</p>
                  </div>
                ` : ''}

                <div class="meta-grid">
                  ${game.releaseYear ? html`
                    <div class="meta-item">
                      <span class="meta-label">Release Year</span>
                      <span class="meta-value">${game.releaseYear}</span>
                    </div>
                  ` : ''}

                  ${game.developer ? html`
                    <div class="meta-item">
                      <span class="meta-label">Developer</span>
                      <span class="meta-value">${game.developer}</span>
                    </div>
                  ` : ''}

                  ${game.publisher ? html`
                    <div class="meta-item">
                      <span class="meta-label">Publisher</span>
                      <span class="meta-value">${game.publisher}</span>
                    </div>
                  ` : ''}

                  ${game.genre ? html`
                    <div class="meta-item">
                      <span class="meta-label">Genre</span>
                      <span class="meta-value">${game.genre}</span>
                    </div>
                  ` : ''}

                  ${game.playersString ? html`
                    <div class="meta-item">
                      <span class="meta-label">Players</span>
                      <span class="meta-value">${game.playersString}</span>
                    </div>
                  ` : ''}

                  ${game.rating ? html`
                    <div class="meta-item">
                      <span class="meta-label">Rating</span>
                      <span class="meta-value">${(parseFloat(game.rating) * 10).toFixed(1)} / 10</span>
                    </div>
                  ` : ''}

                  ${game.playCount ? html`
                    <div class="meta-item">
                      <span class="meta-label">Times Played</span>
                      <span class="meta-value">${game.playCount}</span>
                    </div>
                  ` : ''}

                  ${game.lastPlayed ? html`
                    <div class="meta-item">
                      <span class="meta-label">Last Played</span>
                      <span class="meta-value">${this._formatLastPlayed(game.lastPlayed)}</span>
                    </div>
                  ` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-game-detail', RwlGameDetail);
