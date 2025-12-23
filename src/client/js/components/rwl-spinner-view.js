/**
 * RetroWebLauncher - Spinner View Component (Wheel of Fortune)
 * Half-clock wheel layout - selection at 9 o'clock position
 * Details on left with CRT video, wheel on right, controls at bottom
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';

const { LitElement, html, css } = window.Lit;

class RwlSpinnerView extends LitElement {
  static properties = {
    systemId: { type: String },
    _games: { state: true },
    _currentIndex: { state: true },
    _loading: { state: true },
    _letterIndex: { state: true },
    _currentLetter: { state: true },
    _wheelSize: { state: true },
    _visibleItems: { state: true }
  };

  static styles = css`
    :host {
      display: block;
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      overflow: hidden;
    }

    .spinner-view {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
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
        linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 50%, rgba(0,0,0,0.7) 100%),
        linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%));
    }

    /* Left side - Details Panel */
    .details-panel {
      position: relative;
      width: 45%;
      height: calc(100% - 70px);
      z-index: 5;
      display: flex;
      flex-direction: column;
      padding: 30px 40px;
      overflow: hidden;
    }

    /* CRT TV Frame */
    .crt-container {
      position: relative;
      width: 100%;
      max-width: 380px;
      margin-bottom: 25px;
      flex-shrink: 0;
    }

    .crt-frame {
      position: relative;
      background: var(--crt-frame-background, linear-gradient(145deg, #2a2a2a, #1a1a1a));
      border: 1px solid var(--crt-frame-border, transparent);
      border-radius: 20px;
      padding: 15px;
      box-shadow:
        0 10px 40px rgba(0,0,0,0.5),
        inset 0 2px 0 rgba(255,255,255,0.1);
    }

    .crt-screen {
      position: relative;
      background: var(--crt-screen-background, #000);
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 4/3;
    }

    .crt-screen::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background:
        repeating-linear-gradient(
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
      overflow-y: auto;
      padding-right: 10px;
    }

    .details-content::-webkit-scrollbar {
      width: 4px;
    }

    .details-content::-webkit-scrollbar-thumb {
      background: var(--content-scrollbar-thumb, rgba(255,255,255,0.2));
      border-radius: 2px;
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
      gap: 15px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .meta-item {
      font-size: 0.9rem;
      color: var(--color-text-muted, rgba(255,255,255,0.7));
      padding: 4px 10px;
      background: var(--content-overlay-dark, rgba(255,255,255,0.1));
      border-radius: 4px;
    }

    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px 20px;
      margin-bottom: 20px;
    }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .detail-label {
      font-size: 0.7rem;
      color: var(--color-text-muted, rgba(255,255,255,0.5));
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .detail-value {
      font-size: 0.9rem;
      color: var(--color-text, #fff);
    }

    .rating-stars {
      color: var(--rating-star-color, #ffcc00);
      font-size: 0.9rem;
    }

    .game-desc {
      font-size: 0.85rem;
      color: var(--color-text-muted, rgba(255,255,255,0.7));
      line-height: 1.6;
      margin: 0;
    }

    /* Right side - Wheel */
    .wheel-container {
      position: relative;
      flex: 1;
      height: calc(100% - 70px);
      z-index: 1;
      overflow: hidden;
    }

    .wheel-arc {
      position: absolute;
      right: 50px;
      top: 50%;
      transform: translateY(-50%);
      width: 100%;
      height: 100%;
    }

    .wheel-item {
      position: absolute;
      right: 0;
      top: 50%;
      transform-origin: center center;
      cursor: pointer;
      transition: all 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
    }

    .wheel-item.hidden {
      visibility: hidden;
      pointer-events: none;
    }

    .item-card {
      position: relative;
      width: 90px;
      height: 125px;
      margin-left: -45px;
      margin-top: -62px;
      border-radius: 8px;
      overflow: hidden;
      background: var(--game-card-background, rgba(20, 20, 30, 0.9));
      border: 3px solid var(--game-card-border, rgba(255, 255, 255, 0.15));
      box-shadow: var(--game-card-shadow, 0 8px 30px rgba(0, 0, 0, 0.5));
      transition: all 0.3s ease;
    }

    .wheel-item.active .item-card {
      border-color: var(--selection-border-color, #ff0066);
      border-width: var(--selection-border-width, 4px);
      box-shadow:
        0 0 0 4px var(--selection-glow-rgba, rgba(255, 0, 102, 0.3)),
        0 0 50px var(--selection-glow-rgba, rgba(255, 0, 102, 0.5)),
        0 15px 50px rgba(0, 0, 0, 0.5);
    }

    .item-card img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .item-card .no-img {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      opacity: 0.3;
      background: var(--game-card-no-image-bg, linear-gradient(135deg, #1a1a2e, #0f0f1a));
    }

    /* Selection pointer - REMOVED per user request */
    .selection-pointer {
      display: none;
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
      z-index: 300;
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

    /* Bottom controls */
    .controls-bar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 70px;
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
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--nav-btn-bg, rgba(255, 0, 102, 0.15));
      border: 2px solid var(--nav-btn-border, rgba(255, 0, 102, 0.4));
      color: var(--nav-btn-color, #ff0066);
      font-size: 1.1rem;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
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

    /* State messages */
    .state-message {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      padding: 40px;
    }

    .state-message .icon {
      font-size: 4rem;
      margin-bottom: 20px;
      opacity: 0.5;
    }

    .state-message p {
      color: var(--color-text-muted, #888);
      font-size: 1rem;
    }

    .loading-spinner {
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
    @media (max-width: 1000px) {
      .details-panel {
        width: 40%;
        padding: 20px;
      }

      .crt-container {
        max-width: 280px;
      }

      .game-title {
        font-size: 0.9rem;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .spinner-view {
        flex-direction: column;
      }

      .details-panel {
        width: 100%;
        height: auto;
        padding: 15px;
        order: 2;
      }

      .wheel-container {
        width: 100%;
        height: 50%;
        order: 1;
      }

      .crt-container {
        display: none;
      }
    }
  `;

  constructor() {
    super();
    this._games = [];
    this._systemId = null;
    this._currentIndex = 0;
    this._loading = false;
    this._letterIndex = {};
    this._currentLetter = '#';
    this._unsubscribers = [];
    this._wheelSize = 150;
    this._visibleItems = 11;
  }

  /**
   * Get the storage key for this section
   */
  _getSectionKey() {
    return this._systemId || 'default';
  }

  /**
   * Load wheel size for this section from localStorage, with theme default fallback
   */
  _loadSectionSize() {
    const key = this._getSectionKey();
    const stored = localStorage.getItem(`rwl-spinner-size-${key}`);
    if (stored) {
      this._wheelSize = parseInt(stored, 10);
    } else {
      // Fall back to theme default
      const spinnerSettings = themeService.getSpinnerSettings();
      this._wheelSize = spinnerSettings?.sizing?.defaultSize || 150;
    }
  }

  /**
   * Save wheel size for this section to localStorage
   */
  _saveSectionSize() {
    const key = this._getSectionKey();
    localStorage.setItem(`rwl-spinner-size-${key}`, this._wheelSize);
  }

  connectedCallback() {
    super.connectedCallback();
    this._bindEvents();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._systemId && this._games.length > 0) {
      sessionStorage.setItem(`rwl-spinner-pos-${this._systemId}`, this._currentIndex);
    }
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
    document.removeEventListener('keydown', this._keyHandler);
    this._stopVideo();
  }

  set systemId(id) {
    this._systemId = id;
    const savedPos = sessionStorage.getItem(`rwl-spinner-pos-${id}`);
    this._currentIndex = savedPos ? parseInt(savedPos, 10) : 0;
    this._loadSectionSize();
    this._loadGames();
  }

  get selectedGame() {
    return this._games[this._currentIndex] || null;
  }

  async _loadGames() {
    if (this._loading) return;
    this._loading = true;

    try {
      const response = await api.getGames(this._systemId, { page: 1, limit: 10000 });
      this._games = response.games || [];
      this._buildLetterIndex();

      if (this._currentIndex >= this._games.length) {
        this._currentIndex = Math.max(0, this._games.length - 1);
      }
      this.requestUpdate();
      await this.updateComplete;
      this._renderWheel();
    } catch (error) {
      console.error('Failed to load games:', error);
    } finally {
      this._loading = false;
    }
  }

  _bindEvents() {
    this._keyHandler = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._navigate(-1);
      } else if (e.key === 'ArrowDown') {
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
        this._updateWheel();
      } else if (e.key === 'End') {
        e.preventDefault();
        this._currentIndex = this._games.length - 1;
        this._updateWheel();
      } else if (/^[a-zA-Z]$/.test(e.key)) {
        this._jumpToLetter(e.key.toUpperCase());
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    this._unsubscribers.push(
      state.on('input:navigate', (direction) => {
        if (direction === 'up') this._navigate(-1);
        if (direction === 'down') this._navigate(1);
      })
    );

    this._unsubscribers.push(
      state.on('input:select', () => this._selectCurrent())
    );
  }

  _navigate(delta) {
    if (this._games.length === 0) return;
    this._currentIndex = (this._currentIndex + delta + this._games.length) % this._games.length;
    this._updateWheel();
    const game = this.selectedGame;
    if (game) state.emit('gameSelected', game);
  }

  _selectCurrent() {
    const game = this.selectedGame;
    if (game) {
      sessionStorage.setItem(`rwl-spinner-pos-${this._systemId}`, this._currentIndex);
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
      this._updateWheel();
      this._updateAlphabetBar();
    }
  }

  _updateCurrentLetter() {
    const game = this._games[this._currentIndex];
    if (!game?.name) return;

    let letter = game.name.charAt(0).toUpperCase();
    if (!/[A-Z]/.test(letter)) letter = '#';

    if (letter !== this._currentLetter) {
      this._currentLetter = letter;
      this._updateAlphabetBar();
    }
  }

  _updateAlphabetBar() {
    const bar = this.shadowRoot.querySelector('.alphabet-bar');
    if (!bar) return;

    bar.querySelectorAll('.alpha-letter').forEach(el => {
      el.classList.toggle('active', el.dataset.letter === this._currentLetter);
      el.classList.toggle('has-games', el.dataset.letter in this._letterIndex);
    });
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

  _renderWheel() {
    const container = this.shadowRoot.querySelector('.wheel-container');
    if (!container) return;

    if (this._games.length === 0) {
      container.innerHTML = `
        <div class="state-message">
          <span class="icon">🎮</span>
          <p>No games found</p>
        </div>
      `;
      return;
    }

    // Build the wheel items
    let itemsHtml = '';
    for (let i = 0; i < this._games.length; i++) {
      const game = this._games[i];
      const hasImage = game.thumbnail || game.image;
      const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';

      itemsHtml += `
        <div class="wheel-item" data-index="${i}">
          <div class="item-card">
            ${imageUrl ? `<img src="${imageUrl}" alt="${game.name}" loading="lazy">` : `<div class="no-img">🎮</div>`}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="wheel-arc">
        ${itemsHtml}
      </div>
      <div class="selection-pointer"></div>
    `;

    // Bind click handlers
    this.shadowRoot.querySelectorAll('.wheel-item').forEach((item) => {
      const idx = parseInt(item.dataset.index, 10);
      item.addEventListener('click', () => {
        if (idx === this._currentIndex) {
          this._selectCurrent();
        } else {
          this._currentIndex = idx;
          this._updateWheel();
        }
      });
    });

    // Mouse wheel scrolling
    container.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._navigate(e.deltaY > 0 ? 1 : -1);
    });

    // Add alphabet bar
    this._renderAlphabetBar();

    this._updateWheel();
  }

  _renderAlphabetBar() {
    const wrapper = this.shadowRoot.querySelector('.spinner-view');
    if (!wrapper) return;

    const existing = wrapper.querySelector('.alphabet-bar');
    if (existing) existing.remove();

    if (this._games.length < 20) return;

    const letters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

    const bar = document.createElement('div');
    bar.className = 'alphabet-bar';
    bar.innerHTML = letters.map(letter => `
      <button
        class="alpha-letter ${letter in this._letterIndex ? 'has-games' : ''} ${letter === this._currentLetter ? 'active' : ''}"
        data-letter="${letter}"
        title="${letter}"
      >${letter}</button>
    `).join('');

    wrapper.appendChild(bar);

    bar.addEventListener('click', (e) => {
      const letterBtn = e.target.closest('.alpha-letter');
      if (letterBtn && letterBtn.classList.contains('has-games')) {
        this._jumpToLetter(letterBtn.dataset.letter);
      }
    });
  }

  _updateWheel() {
    const items = this.shadowRoot.querySelectorAll('.wheel-item');
    const counter = this.shadowRoot.querySelector('.counter');

    if (items.length === 0) return;

    const totalItems = this._games.length;
    const scaleFactor = this._wheelSize / 100;
    const baseRadius = 202;  // Fixed radius - not affected by zoom
    const cardWidth = 90 * scaleFactor;
    const cardHeight = 125 * scaleFactor;
    const halfVisible = Math.floor(this._visibleItems / 2);

    items.forEach((item, i) => {
      let offset = i - this._currentIndex;

      if (offset > totalItems / 2) offset -= totalItems;
      if (offset < -totalItems / 2) offset += totalItems;

      const absOffset = Math.abs(offset);

      if (absOffset > halfVisible) {
        item.style.opacity = '0';
        item.style.pointerEvents = 'none';
        item.classList.add('hidden');
        return;
      }

      item.classList.remove('hidden');
      item.style.pointerEvents = 'auto';

      // Angle step scales slightly with size - larger cards get more spacing
      const angleStep = 10 + (scaleFactor * 3);  // ~12° at min, ~14.5° at default, ~17.5° at max
      const angleDeg = 180 + (offset * angleStep);
      const angleRad = (angleDeg * Math.PI) / 180;

      const x = Math.cos(angleRad) * baseRadius;
      const y = Math.sin(angleRad) * baseRadius;
      const tiltAngle = (angleDeg - 180) * 0.7;
      const scale = absOffset === 0 ? 1.25 : Math.max(0.5, 1 - absOffset * 0.12);
      const opacity = Math.max(0.25, 1 - absOffset * 0.18);
      const zIndex = 100 - absOffset;

      item.style.transform = `
        translateX(${x}px)
        translateY(${y}px)
        rotateZ(${tiltAngle}deg)
        scale(${scale})
      `;
      item.style.opacity = opacity;
      item.style.zIndex = zIndex;

      const card = item.querySelector('.item-card');
      if (card) {
        card.style.width = `${cardWidth}px`;
        card.style.height = `${cardHeight}px`;
      }

      item.classList.toggle('active', i === this._currentIndex);
    });

    if (counter) counter.textContent = `${this._currentIndex + 1} / ${this._games.length}`;

    // Update game details panel
    this._updateGameDetails();
    this._updateCurrentLetter();
  }

  _updateGameDetails() {
    const game = this.selectedGame;
    const detailsPanel = this.shadowRoot.querySelector('.details-content');
    const bgImage = this.shadowRoot.querySelector('.bg-image');
    const videoPlayer = this.shadowRoot.querySelector('rwl-video-player');

    if (!detailsPanel || !game) return;

    // Update background - use graceful fallback
    if (bgImage) {
      this._loadBackgroundImage(bgImage, game.id);
    }

    // Update CRT TV video player
    if (videoPlayer) {
      const videoUrl = `/api/media/game/${game.id}/video`;
      videoPlayer.src = videoUrl;
    }

    // Build details HTML
    const rating = this._formatRating(game.rating);
    const ratingHtml = rating
      ? `<div class="detail-row"><span class="detail-label">Rating</span><span class="rating-stars">${'★'.repeat(rating.filled)}${'☆'.repeat(rating.empty)}</span></div>`
      : '';

    detailsPanel.innerHTML = `
      <h2 class="game-title">${game.name || 'Unknown'}</h2>
      <div class="game-meta">
        ${game.releaseYear ? `<span class="meta-item">${game.releaseYear}</span>` : ''}
        ${game.genre ? `<span class="meta-item">${game.genre}</span>` : ''}
      </div>
      <div class="details-grid">
        ${game.developer ? `<div class="detail-row"><span class="detail-label">Developer</span><span class="detail-value">${game.developer}</span></div>` : ''}
        ${game.publisher ? `<div class="detail-row"><span class="detail-label">Publisher</span><span class="detail-value">${game.publisher}</span></div>` : ''}
        ${game.players ? `<div class="detail-row"><span class="detail-label">Players</span><span class="detail-value">${game.players}</span></div>` : ''}
        ${game.region ? `<div class="detail-row"><span class="detail-label">Region</span><span class="detail-value">${game.region}</span></div>` : ''}
        ${ratingHtml}
        ${game.playCount ? `<div class="detail-row"><span class="detail-label">Play Count</span><span class="detail-value">${game.playCount}</span></div>` : ''}
        ${game.lastPlayed ? `<div class="detail-row"><span class="detail-label">Last Played</span><span class="detail-value">${new Date(game.lastPlayed).toLocaleDateString()}</span></div>` : ''}
      </div>
      ${game.description ? `<p class="game-desc">${game.description}</p>` : ''}
    `;
  }

  _onSliderChange(e) {
    this._wheelSize = parseInt(e.target.value, 10);
    this._saveSectionSize();
    this._updateWheel();
  }

  /**
   * Load background image with graceful fallbacks
   * Tries: fanart -> screenshot -> solid color
   */
  _loadBackgroundImage(bgElement, gameId) {
    const fanartUrl = `/api/media/game/${gameId}/fanart`;
    const screenshotUrl = `/api/media/game/${gameId}/screenshot`;

    const fanartImg = new Image();
    fanartImg.onload = () => {
      bgElement.style.backgroundImage = `url('${fanartUrl}')`;
      bgElement.classList.add('visible');
    };
    fanartImg.onerror = () => {
      const screenshotImg = new Image();
      screenshotImg.onload = () => {
        bgElement.style.backgroundImage = `url('${screenshotUrl}')`;
        bgElement.classList.add('visible');
      };
      screenshotImg.onerror = () => {
        bgElement.style.backgroundImage = 'none';
        bgElement.classList.remove('visible');
      };
      screenshotImg.src = screenshotUrl;
    };
    fanartImg.src = fanartUrl;
  }

  render() {
    const videoSrc = this.selectedGame ? `/api/media/game/${this.selectedGame.id}/video` : '';

    return html`
      <div class="spinner-view">
        <div class="bg-layer">
          <div class="bg-image"></div>
          <div class="bg-gradient"></div>
        </div>

        <div class="details-panel">
          <div class="crt-container">
            <div class="crt-frame">
              <div class="crt-screen">
                <rwl-video-player autoplay loop muted .src=${videoSrc}></rwl-video-player>
              </div>
              <div class="crt-details">
                <div class="crt-led"></div>
                <div class="crt-brand">RetroTV</div>
              </div>
            </div>
          </div>
          <div class="details-content">
            <h2 class="game-title">Select a game</h2>
          </div>
        </div>

        <div class="wheel-container">
          ${this._loading ? html`
            <div class="state-message">
              <div class="loading-spinner"></div>
              <p>Loading games...</p>
            </div>
          ` : this._games.length === 0 ? html`
            <div class="state-message">
              <span class="icon">🎮</span>
              <p>Select a system to browse games</p>
            </div>
          ` : ''}
        </div>

        <div class="controls-bar">
          <div class="nav-controls">
            <button class="nav-btn prev" aria-label="Previous" @click=${() => this._navigate(-1)}>▲</button>
            <span class="counter">${this._currentIndex + 1} / ${this._games.length}</span>
            <button class="nav-btn next" aria-label="Next" @click=${() => this._navigate(1)}>▼</button>
          </div>
          <div class="size-control">
            <label>🔍</label>
            <input type="range" id="size-slider" min="80" max="250" .value=${this._wheelSize} @input=${this._onSliderChange} title="Adjust size">
          </div>
          <span class="game-count"></span>
        </div>
      </div>
    `;
  }

  updated(changedProperties) {
    if (changedProperties.has('_games') || changedProperties.has('_currentIndex')) {
      if (this._games.length > 0) {
        this._renderWheel();
      }
    }
  }
}

customElements.define('rwl-spinner-view', RwlSpinnerView);
