/**
 * RetroWebLauncher - Wheel View Component (Carousel)
 * Horizontal carousel at bottom, details panel with CRT video above
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';

const { LitElement, html, css } = window.Lit;

class RwlWheelView extends LitElement {
  static properties = {
    systemId: { type: String },
    _games: { type: Array, state: true },
    _currentIndex: { type: Number, state: true },
    _loading: { type: Boolean, state: true },
    _letterIndex: { type: Object, state: true },
    _currentLetter: { type: String, state: true },
    _cardSize: { type: Number, state: true }
  };

  static styles = css`
    :host {
      display: block;
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      overflow: hidden;
    }

    .wheel-view {
      position: relative;
      display: flex;
      flex-direction: column;
      height: 100%;
    }

    /* Background */
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
      filter: blur(20px) brightness(var(--bg-brightness, 0.4));
      transition: background-image 0.5s ease;
    }

    .bg-gradient {
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: var(--bg-gradient-overlay,
        radial-gradient(ellipse at center bottom, transparent 0%, rgba(10,10,10,0.9) 70%),
        linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.8) 100%));
    }

    /* Top: Details Panel */
    .details-panel {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 25px 40px;
      z-index: 1;
      gap: 40px;
    }

    /* CRT TV */
    .crt-container {
      flex-shrink: 0;
      width: 320px;
    }

    .crt-frame {
      background: var(--crt-frame-background, linear-gradient(145deg, #2a2a2a, #1a1a1a));
      border: 1px solid var(--crt-frame-border, transparent);
      border-radius: 20px;
      padding: 12px;
      box-shadow:
        0 10px 40px rgba(0,0,0,0.5),
        inset 0 2px 0 rgba(255,255,255,0.1);
    }

    .crt-screen {
      position: relative;
      background: var(--crt-screen-background, #000);
      border-radius: 10px;
      overflow: hidden;
      aspect-ratio: 4/3;
    }

    .crt-screen::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        rgba(0,0,0,0.15) 0px,
        rgba(0,0,0,0.15) 1px,
        transparent 1px,
        transparent 2px
      );
      pointer-events: none;
      z-index: 10;
    }

    .crt-screen::after {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%);
      pointer-events: none;
      z-index: 11;
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
      margin-top: 10px;
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
      font-size: 0.65rem;
      color: var(--color-text-muted, #888);
      letter-spacing: 0.1em;
    }

    /* Details content */
    .details-content {
      flex: 1;
      max-width: 500px;
    }

    .game-title {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 1.1rem;
      color: var(--color-text, #fff);
      margin: 0 0 12px 0;
      text-shadow: 0 0 20px var(--selection-glow-rgba, rgba(255, 0, 102, 0.5));
      line-height: 1.5;
    }

    .game-meta {
      display: flex;
      gap: 12px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }

    .meta-item {
      font-size: 0.85rem;
      color: var(--color-text-muted, rgba(255,255,255,0.7));
      padding: 4px 10px;
      background: var(--content-overlay-dark, rgba(255,255,255,0.1));
      border-radius: 4px;
    }

    .details-row {
      display: flex;
      gap: 20px;
      margin-bottom: 15px;
      flex-wrap: wrap;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .detail-item .label {
      font-size: 0.65rem;
      color: var(--color-text-muted, rgba(255,255,255,0.5));
      text-transform: uppercase;
    }

    .detail-item .value {
      font-size: 0.85rem;
      color: var(--color-text, #fff);
    }

    .rating-stars {
      color: var(--rating-star-color, #ffcc00);
      font-size: 0.9rem;
    }

    .game-desc {
      font-size: 0.8rem;
      color: var(--color-text-muted, rgba(255,255,255,0.6));
      line-height: 1.5;
      margin: 0;
      max-height: 60px;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }

    /* Bottom: Carousel */
    .carousel-area {
      position: relative;
      height: ${this._getCarouselHeight()}px;
      overflow: visible;
      z-index: 1;
      margin-bottom: 80px;
    }

    .carousel {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .carousel-track {
      display: flex;
      gap: ${this._getGap()}px;
      transition: transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
      height: 100%;
      align-items: center;
      padding: 20px 0 40px;
    }

    .card {
      flex-shrink: 0;
      background: var(--game-card-background, #1a1a1a);
      border: 1px solid var(--game-card-border, transparent);
      border-radius: 12px;
      overflow: hidden;
      cursor: pointer;
      transition: all 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
      transform: scale(0.85);
      opacity: 0.5;
      filter: brightness(0.6);
      position: relative;
    }

    .card.active {
      transform: scale(1.1);
      opacity: 1;
      filter: brightness(1);
      z-index: 10;
      border: var(--selection-border-width, 3px) solid var(--selection-border-color, #ff0066);
      box-shadow:
        0 0 60px var(--selection-glow-rgba, rgba(255, 0, 102, 0.4)),
        0 20px 40px rgba(0, 0, 0, 0.6);
    }

    .card.prev, .card.next {
      transform: scale(0.95);
      opacity: 0.8;
      filter: brightness(0.8);
    }

    .card:hover:not(.active) {
      transform: scale(0.9);
      opacity: 0.9;
    }

    .card-image {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--game-card-image-bg, linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%));
    }

    .card-image img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: var(--game-card-image-bg, linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%));
    }

    .no-img {
      font-size: 4rem;
      opacity: 0.2;
    }

    .badge {
      position: absolute;
      top: 10px;
      right: 10px;
      font-size: 1.2rem;
    }

    /* Reflection */
    .carousel::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 80px;
      background: var(--carousel-reflection-gradient, linear-gradient(0deg, rgba(10, 10, 10, 1) 0%, transparent 100%));
      pointer-events: none;
    }

    /* Controls bar */
    .controls-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 60px;
      background: var(--toolbar-background, rgba(15, 15, 15, 0.95));
      border-top: 1px solid var(--toolbar-border, #333);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 30px;
      z-index: 10;
    }

    .nav-controls {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .nav-btn {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: var(--nav-btn-bg, rgba(255, 0, 102, 0.15));
      border: 2px solid var(--nav-btn-border, rgba(255, 0, 102, 0.4));
      color: var(--nav-btn-color, #ff0066);
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .nav-btn:hover {
      background: var(--nav-btn-hover-bg, rgba(255, 0, 102, 0.3));
      transform: scale(1.1);
    }

    .counter {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 0.6rem;
      color: var(--counter-color, #ff0066);
      min-width: 100px;
      text-align: center;
    }

    .size-control {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .size-control label {
      color: var(--color-text-muted, #666);
      font-size: 14px;
    }

    .size-control input[type="range"] {
      width: calc(33vw - 200px);
      min-width: 150px;
      max-width: 300px;
      cursor: pointer;
      accent-color: var(--color-primary, #ff0066);
    }

    .game-count {
      color: var(--color-text-muted, #666);
      font-size: 11px;
    }

    /* Alphabet bar - uses theme variables for automatic adaptation */
    .alphabet-bar {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 6px 4px;
      background: var(--alphabet-bar-background, rgba(0, 0, 0, 0.8));
      border: 1px solid var(--alphabet-bar-border, transparent);
      border-radius: 8px;
      backdrop-filter: blur(8px);
      z-index: 100;
      max-height: calc(100% - 150px);
      overflow-y: auto;
      scrollbar-width: none;
    }

    .alphabet-bar::-webkit-scrollbar { display: none; }

    .alpha-letter {
      width: 20px;
      height: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      font-weight: 600;
      background: transparent;
      border: none;
      color: var(--alphabet-letter-muted, var(--color-text-muted, rgba(255, 255, 255, 0.25)));
      cursor: default;
      border-radius: 3px;
      transition: all 0.15s ease;
      padding: 0;
    }

    .alpha-letter.has-games {
      color: var(--alphabet-letter-color, var(--color-text, rgba(255, 255, 255, 0.7)));
      cursor: pointer;
    }

    .alpha-letter.has-games:hover {
      background: var(--selection-hover-bg, rgba(255, 0, 102, 0.3));
      color: var(--alphabet-letter-active-color, var(--color-text, #fff));
    }

    .alpha-letter.active {
      background: var(--alphabet-letter-active-bg, var(--color-primary, #ff0066));
      color: var(--alphabet-letter-active-color, #fff);
      box-shadow: 0 0 8px var(--selection-glow-rgba, rgba(255, 0, 102, 0.5));
    }

    /* State messages */
    .state-message {
      text-align: center;
      padding: 40px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }

    .state-message .icon {
      font-size: 4rem;
      display: block;
      margin-bottom: 20px;
      opacity: 0.5;
    }

    .state-message p {
      color: var(--color-text-muted, #888);
      font-size: 1rem;
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid var(--spinner-track, #333);
      border-top-color: var(--color-primary, #ff0066);
      border-radius: 50%;
      margin-bottom: 20px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Responsive */
    @media (max-width: 900px) {
      .details-panel {
        flex-direction: column;
        gap: 20px;
        padding: 15px;
      }

      .crt-container {
        width: 250px;
      }

      .game-title {
        font-size: 0.9rem;
      }

      .game-desc {
        display: none;
      }
    }

    @media (max-width: 600px) {
      .crt-container {
        display: none;
      }

      .details-content {
        text-align: center;
      }
    }
  `;

  constructor() {
    super();
    this._games = [];
    this.systemId = null;
    this._currentIndex = 0;
    this._loading = false;
    this._letterIndex = {};
    this._currentLetter = '#';
    this._unsubscribers = [];
    this._cardSize = 330; // Will be loaded per-section when systemId is set
  }

  /**
   * Get the storage key for this section
   */
  _getSectionKey() {
    return this.systemId || 'default';
  }

  /**
   * Load card size for this section from localStorage, with theme default fallback
   */
  _loadSectionSize() {
    const key = this._getSectionKey();
    const stored = localStorage.getItem(`rwl-wheel-size-${key}`);
    if (stored) {
      this._cardSize = parseInt(stored, 10);
    } else {
      // Fall back to theme default
      const carouselSettings = themeService.getCarouselSettings();
      this._cardSize = carouselSettings?.sizing?.defaultCardSize || 330;
    }
    this.requestUpdate();
  }

  /**
   * Save card size for this section to localStorage
   */
  _saveSectionSize() {
    const key = this._getSectionKey();
    localStorage.setItem(`rwl-wheel-size-${key}`, this._cardSize);
  }

  /**
   * Get carousel height based on card size
   */
  _getCarouselHeight() {
    return Math.round(this._cardSize * 1.36) + 80;
  }

  /**
   * Get gap size based on card size
   */
  _getGap() {
    return Math.round(this._cardSize * 0.09);
  }

  connectedCallback() {
    super.connectedCallback();
    this._bindEvents();

    const savedPos = sessionStorage.getItem(`rwl-wheel-pos-${this.systemId}`);
    if (savedPos) {
      this._currentIndex = parseInt(savedPos, 10);
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this.systemId && this._games.length > 0) {
      sessionStorage.setItem(`rwl-wheel-pos-${this.systemId}`, this._currentIndex);
    }

    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
    document.removeEventListener('keydown', this._keyHandler);
    this._stopVideo();
  }

  willUpdate(changedProperties) {
    if (changedProperties.has('systemId') && this.systemId) {
      const savedPos = sessionStorage.getItem(`rwl-wheel-pos-${this.systemId}`);
      this._currentIndex = savedPos ? parseInt(savedPos, 10) : 0;
      this._loadSectionSize();
      this._loadGames();
    }
  }

  updated(changedProperties) {
    if (changedProperties.has('_games') && this._games.length > 0) {
      this._applyCardSize();
      this._updateCarousel();
    }

    if (changedProperties.has('_currentIndex')) {
      this._updateCarousel();
    }

    if (changedProperties.has('_cardSize')) {
      this._applyCardSize();
    }
  }

  get selectedGame() {
    return this._games[this._currentIndex] || null;
  }

  async _loadGames() {
    if (this._loading) return;

    this._loading = true;

    try {
      const response = await api.getGames(this.systemId, { page: 1, limit: 10000 });
      this._games = response.games || [];
      this._buildLetterIndex();

      if (this._currentIndex >= this._games.length) {
        this._currentIndex = Math.max(0, this._games.length - 1);
      }
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      this._loading = false;
    }
  }

  _bindEvents() {
    this._keyHandler = (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this._navigate(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this._navigate(1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this._selectCurrent();
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        this._navigate(-5);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        this._navigate(5);
      } else if (e.key === 'Home') {
        e.preventDefault();
        this._currentIndex = 0;
        this.requestUpdate();
      } else if (e.key === 'End') {
        e.preventDefault();
        this._currentIndex = this._games.length - 1;
        this.requestUpdate();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        this._jumpToLetter(e.key.toUpperCase());
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    this._unsubscribers.push(
      state.on('input:navigate', (direction) => {
        if (direction === 'left') this._navigate(-1);
        if (direction === 'right') this._navigate(1);
      })
    );

    this._unsubscribers.push(
      state.on('input:select', () => this._selectCurrent())
    );
  }

  _navigate(delta) {
    if (this._games.length === 0) return;

    this._currentIndex = (this._currentIndex + delta + this._games.length) % this._games.length;
    this.requestUpdate();

    const game = this.selectedGame;
    if (game) {
      state.emit('gameSelected', game);
    }
  }

  _selectCurrent() {
    const game = this.selectedGame;
    if (game) {
      sessionStorage.setItem(`rwl-wheel-pos-${this.systemId}`, this._currentIndex);
      router.navigate(`/game/${game.id}`);
    }
  }

  _buildLetterIndex() {
    this._letterIndex = {};
    this._games.forEach((game, index) => {
      if (!game.name) return;
      let firstChar = game.name.charAt(0).toUpperCase();
      if (!/[A-Z]/.test(firstChar)) firstChar = '#';
      if (!(firstChar in this._letterIndex)) {
        this._letterIndex[firstChar] = index;
      }
    });
  }

  _jumpToLetter(letter) {
    if (letter in this._letterIndex) {
      this._currentIndex = this._letterIndex[letter];
      this._currentLetter = letter;
      this.requestUpdate();
    }
  }

  _updateCurrentLetter() {
    const game = this._games[this._currentIndex];
    if (!game?.name) return;

    let letter = game.name.charAt(0).toUpperCase();
    if (!/[A-Z]/.test(letter)) letter = '#';

    if (letter !== this._currentLetter) {
      this._currentLetter = letter;
    }
  }

  _stopVideo() {
    const videoPlayer = this.shadowRoot.querySelector('rwl-video-player');
    if (videoPlayer) {
      videoPlayer.pause();
      videoPlayer.removeAttribute('src');
    }
  }

  _formatRating(rating) {
    if (!rating) return null;
    const stars = Math.round(parseFloat(rating) * 5);
    return { filled: stars, empty: 5 - stars };
  }

  _renderCard(game, index) {
    const hasImage = game.thumbnail || game.image;
    const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';
    const isActive = index === this._currentIndex;
    const isPrev = index === this._currentIndex - 1;
    const isNext = index === this._currentIndex + 1;

    const classes = ['card'];
    if (isActive) classes.push('active');
    if (isPrev) classes.push('prev');
    if (isNext) classes.push('next');

    return html`
      <div class="${classes.join(' ')}"
           data-index="${index}"
           @click=${() => this._handleCardClick(index)}
           style="width: ${this._cardSize}px; height: ${Math.round(this._cardSize * 1.36)}px;">
        <div class="card-image">
          ${imageUrl ? html`<img src="${imageUrl}" alt="${game.name}" loading="lazy">` : html`<span class="no-img">🎮</span>`}
        </div>
        ${game.favorite ? html`<span class="badge favorite">❤</span>` : ''}
      </div>
    `;
  }

  _handleCardClick(index) {
    if (index === this._currentIndex) {
      this._selectCurrent();
    } else {
      this._currentIndex = index;
      this.requestUpdate();
    }
  }

  _renderAlphabetBar() {
    if (this._games.length < 20) return '';

    const letters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

    return html`
      <div class="alphabet-bar">
        ${letters.map(letter => html`
          <button
            class="alpha-letter ${letter in this._letterIndex ? 'has-games' : ''} ${letter === this._currentLetter ? 'active' : ''}"
            data-letter="${letter}"
            title="${letter}"
            @click=${() => letter in this._letterIndex && this._jumpToLetter(letter)}
          >${letter}</button>
        `)}
      </div>
    `;
  }

  _updateCarousel() {
    // Update current letter
    this._updateCurrentLetter();

    // Update transform on next render
    this.updateComplete.then(() => {
      const track = this.shadowRoot.querySelector('.carousel-track');
      if (!track) return;

      const cardWidth = this._cardSize;
      const gap = this._getGap();
      const carousel = this.shadowRoot.querySelector('.carousel');
      const containerWidth = carousel?.offsetWidth || 800;
      const centerOffset = (containerWidth / 2) - (cardWidth / 2);
      const translateX = centerOffset - (this._currentIndex * (cardWidth + gap));

      track.style.transform = `translateX(${translateX}px)`;

      // Update game details
      this._updateGameDetails();
    });
  }

  _updateGameDetails() {
    const game = this.selectedGame;
    if (!game) return;

    this.updateComplete.then(() => {
      const bgImage = this.shadowRoot.querySelector('.bg-image');
      const videoPlayer = this.shadowRoot.querySelector('rwl-video-player');

      if (bgImage) {
        // Use preloader to gracefully handle missing images
        this._loadBackgroundImage(bgImage, game.id);
      }

      if (videoPlayer) {
        const videoUrl = `/api/media/game/${game.id}/video`;
        videoPlayer.src = videoUrl;
      }
    });
  }

  /**
   * Load background image with graceful fallbacks
   * Tries: fanart -> screenshot -> solid color
   */
  _loadBackgroundImage(bgElement, gameId) {
    const fanartUrl = `/api/media/game/${gameId}/fanart`;
    const screenshotUrl = `/api/media/game/${gameId}/screenshot`;

    // Try fanart first
    const fanartImg = new Image();
    fanartImg.onload = () => {
      bgElement.style.backgroundImage = `url('${fanartUrl}')`;
      bgElement.classList.add('visible');
    };
    fanartImg.onerror = () => {
      // Fanart failed, try screenshot
      const screenshotImg = new Image();
      screenshotImg.onload = () => {
        bgElement.style.backgroundImage = `url('${screenshotUrl}')`;
        bgElement.classList.add('visible');
      };
      screenshotImg.onerror = () => {
        // Both failed, use fallback gradient (already in CSS)
        bgElement.style.backgroundImage = 'none';
        bgElement.classList.remove('visible');
      };
      screenshotImg.src = screenshotUrl;
    };
    fanartImg.src = fanartUrl;
  }

  _onSliderChange(e) {
    this._cardSize = parseInt(e.target.value, 10);
    this._saveSectionSize();
    this.requestUpdate();
  }

  _applyCardSize() {
    this.updateComplete.then(() => {
      const track = this.shadowRoot.querySelector('.carousel-track');
      if (track) {
        track.style.gap = `${this._getGap()}px`;
      }
    });
  }

  _handleWheel(e) {
    e.preventDefault();
    this._navigate(e.deltaY > 0 ? 1 : -1);
  }

  _renderGameDetails() {
    const game = this.selectedGame;
    if (!game) {
      return html`<h2 class="game-title">Select a game</h2>`;
    }

    const rating = this._formatRating(game.rating);
    const ratingHtml = rating
      ? html`<div class="detail-item"><span class="rating-stars">${'★'.repeat(rating.filled)}${'☆'.repeat(rating.empty)}</span></div>`
      : '';

    return html`
      <h2 class="game-title">${game.name || 'Unknown'}</h2>
      <div class="game-meta">
        ${game.releaseYear ? html`<span class="meta-item">${game.releaseYear}</span>` : ''}
        ${game.genre ? html`<span class="meta-item">${game.genre}</span>` : ''}
        ${game.developer ? html`<span class="meta-item">${game.developer}</span>` : ''}
      </div>
      <div class="details-row">
        ${game.publisher ? html`<div class="detail-item"><span class="label">Publisher</span><span class="value">${game.publisher}</span></div>` : ''}
        ${game.players ? html`<div class="detail-item"><span class="label">Players</span><span class="value">${game.players}</span></div>` : ''}
        ${game.region ? html`<div class="detail-item"><span class="label">Region</span><span class="value">${game.region}</span></div>` : ''}
        ${ratingHtml}
        ${game.playCount ? html`<div class="detail-item"><span class="label">Plays</span><span class="value">${game.playCount}</span></div>` : ''}
      </div>
      ${game.description ? html`<p class="game-desc">${game.description}</p>` : ''}
    `;
  }

  _renderCarouselContent() {
    if (this._loading) {
      return html`
        <div class="state-message">
          <div class="spinner"></div>
          <p>Loading games...</p>
        </div>
      `;
    }

    if (this._games.length === 0) {
      return html`
        <div class="state-message">
          <span class="icon">🎮</span>
          <p>${this.systemId ? 'No games found' : 'Select a system to browse games'}</p>
        </div>
      `;
    }

    return html`
      <div class="carousel" @wheel=${this._handleWheel}>
        <div class="carousel-track">
          ${this._games.map((game, index) => this._renderCard(game, index))}
        </div>
      </div>
    `;
  }

  render() {
    return html`
      <div class="wheel-view">
        <div class="bg-layer">
          <div class="bg-image"></div>
          <div class="bg-gradient"></div>
        </div>

        <div class="details-panel">
          <div class="crt-container">
            <div class="crt-frame">
              <div class="crt-screen">
                <rwl-video-player autoplay loop muted></rwl-video-player>
              </div>
              <div class="crt-details">
                <div class="crt-led"></div>
                <div class="crt-brand">RetroTV</div>
              </div>
            </div>
          </div>
          <div class="details-content">
            ${this._renderGameDetails()}
          </div>
        </div>

        <div class="carousel-area">
          ${this._renderCarouselContent()}
        </div>

        <div class="controls-bar">
          <div class="nav-controls">
            <button class="nav-btn prev" aria-label="Previous" @click=${() => this._navigate(-1)}>◀</button>
            <span class="counter">${this._currentIndex + 1} / ${this._games.length}</span>
            <button class="nav-btn next" aria-label="Next" @click=${() => this._navigate(1)}>▶</button>
          </div>
          <div class="size-control">
            <label>🔍</label>
            <input type="range" id="size-slider"
                   min="95" max="125"
                   .value=${Math.min(this._cardSize, 125).toString()}
                   @input=${this._onSliderChange}
                   title="Adjust size">
          </div>
          <span class="game-count">${this._games.length} games</span>
        </div>

        ${this._renderAlphabetBar()}
      </div>
    `;
  }
}

customElements.define('rwl-wheel-view', RwlWheelView);
