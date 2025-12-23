/**
 * RetroWebLauncher - Grid View Component
 * Grid layout with alphabet selector and size slider
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';

const { LitElement, html, css } = window.Lit;

class RwlGridView extends LitElement {
  static properties = {
    _games: { state: true },
    _systemId: { state: true },
    _collectionId: { state: true },
    _page: { state: true },
    _totalPages: { state: true },
    _loading: { state: true },
    _cardSize: { state: true },
    _letterIndex: { state: true },
    _currentLetter: { state: true }
  };

  static styles = css`
    * { box-sizing: border-box; }

    :host {
      display: block;
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    }

    .grid-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
    }

    /* Dynamic Background */
    .bg-layer {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 0;
      pointer-events: none;
    }

    .bg-image {
      position: absolute;
      top: -5%;
      left: -5%;
      width: 110%;
      height: 110%;
      background-color: var(--color-background, #0a0a0a);
      background-size: cover;
      background-position: center;
      filter: blur(25px) brightness(var(--bg-brightness, 0.5));
      opacity: 0;
      transition: opacity 0.5s ease, background-image 0.5s ease;
    }

    .bg-image.visible {
      opacity: 1;
    }

    .bg-gradient {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: var(--bg-gradient-overlay,
        radial-gradient(ellipse at center, transparent 0%, rgba(10,10,10,0.8) 100%),
        linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.6) 100%));
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
      padding-right: 40px;
      z-index: 1;
    }

    #games-grid {
      display: grid;
      gap: 16px;
    }

    .card {
      background: var(--game-card-background, #1a1a1a);
      border: 1px solid var(--game-card-border, transparent);
      border-radius: 8px;
      overflow: hidden;
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: var(--game-card-shadow, none);
    }

    .card:hover {
      transform: scale(var(--grid-hover-scale, 1.05));
      box-shadow: var(--game-card-hover-shadow, 0 8px 24px rgba(0,0,0,0.5)), 0 0 20px var(--selection-glow-color, rgba(255,0,102,0.3));
      z-index: 10;
      position: relative;
    }

    .card:focus {
      outline: var(--selection-border-width, 3px) solid var(--selection-border-color, #ff0066);
      outline-offset: 2px;
    }

    .card-img {
      aspect-ratio: 3/4;
      background: var(--game-card-image-bg, #111);
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
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

    .system-badge {
      position: absolute;
      bottom: 6px;
      left: 6px;
      height: 24px;
      max-width: 80px;
      background: var(--badge-background, rgba(0, 0, 0, 0.85));
      border-radius: 4px;
      padding: 3px 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      box-shadow: var(--badge-shadow, 0 2px 8px rgba(0, 0, 0, 0.5));
    }

    .system-badge img {
      max-height: 18px;
      max-width: 70px;
      object-fit: contain;
      filter: brightness(1.1);
    }

    .system-badge.text-fallback {
      min-width: 30px;
    }

    .system-badge .badge-text {
      font-size: 9px;
      font-weight: bold;
      color: var(--badge-text-color, #fff);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-name {
      padding: 8px;
      font-size: 12px;
      color: var(--color-text, #fff);
      background: var(--game-card-title-bg, rgba(0,0,0,0.7));
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Alphabet Bar */
    .alphabet-bar {
      position: absolute;
      right: 4px;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      flex-direction: column;
      gap: 1px;
      padding: 6px 4px;
      background: var(--alphabet-bar-background, rgba(0, 0, 0, 0.8));
      border-radius: 8px;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 100;
      max-height: calc(100% - 80px);
      overflow-y: auto;
      scrollbar-width: none;
    }

    .alphabet-bar::-webkit-scrollbar {
      display: none;
    }

    .alpha-letter {
      width: 22px;
      height: 18px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
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
      box-shadow: 0 0 10px var(--selection-glow-rgba, rgba(255, 0, 102, 0.5));
    }

    .toolbar {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 50px;
      background: var(--toolbar-background, rgba(20, 20, 20, 0.95));
      border-top: 1px solid var(--toolbar-border, #333);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 0 16px;
      z-index: 10;
    }

    .toolbar label {
      color: var(--color-text-muted, #888);
      font-size: 14px;
    }

    .toolbar input[type="range"] {
      width: 150px;
      cursor: pointer;
      accent-color: var(--color-primary, #ff0066);
    }

    .game-count {
      color: var(--color-text-muted, #888);
      font-size: 12px;
      margin-left: auto;
    }

    .message {
      grid-column: 1 / -1;
      text-align: center;
      padding: 48px;
      color: var(--color-text-muted, #888);
    }

    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid var(--spinner-track, #333);
      border-top-color: var(--color-primary, #ff0066);
      border-radius: 50%;
      margin: 0 auto 16px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    #scroll-container::-webkit-scrollbar { width: 8px; }
    #scroll-container::-webkit-scrollbar-track { background: var(--content-scrollbar-track, rgba(0,0,0,0.2)); }
    #scroll-container::-webkit-scrollbar-thumb { background: var(--content-scrollbar-thumb, rgba(255,255,255,0.2)); border-radius: 4px; }
    #scroll-container::-webkit-scrollbar-thumb:hover { background: var(--content-scrollbar-thumb-hover, rgba(255,255,255,0.3)); }

    @media (max-width: 600px) {
      .alphabet-bar {
        right: 2px;
        padding: 3px 2px;
      }

      .alpha-letter {
        width: 18px;
        height: 15px;
        font-size: 8px;
      }

      #scroll-container {
        padding-right: 28px;
      }
    }
  `;

  constructor() {
    super();
    this._games = [];
    this._systemId = null;
    this._collectionId = null;
    this._page = 1;
    this._totalPages = 1;
    this._loading = false;
    this._cardSize = 150; // Will be loaded per-section when systemId/collectionId is set
    this._letterIndex = {};
    this._currentLetter = '#';
    this._scrollHandler = null; // Store scroll handler reference to prevent duplicates
  }

  /**
   * Get the storage key for this section
   */
  _getSectionKey() {
    return this._systemId || this._collectionId || 'default';
  }

  /**
   * Load card size for this section from localStorage, with theme default fallback
   */
  _loadSectionSize() {
    const key = this._getSectionKey();
    const stored = localStorage.getItem(`rwl-grid-size-${key}`);
    if (stored) {
      this._cardSize = parseInt(stored, 10);
    } else {
      // Fall back to theme default
      const gridSettings = themeService.getGridSettings();
      this._cardSize = gridSettings?.defaultCardSize || 150;
    }
    this._updateSlider();
  }

  /**
   * Save card size for this section to localStorage
   */
  _saveSectionSize() {
    const key = this._getSectionKey();
    localStorage.setItem(`rwl-grid-size-${key}`, this._cardSize);
  }

  /**
   * Update the slider to reflect current size
   */
  _updateSlider() {
    const slider = this.shadowRoot?.getElementById('size-slider');
    if (slider) {
      slider.value = this._cardSize;
    }
  }

  connectedCallback() {
    super.connectedCallback();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this._saveScrollPosition();
  }

  _saveScrollPosition() {
    const scrollContainer = this.shadowRoot.getElementById('scroll-container');
    const key = this._systemId || this._collectionId;
    if (scrollContainer && key) {
      sessionStorage.setItem(`rwl-grid-scroll-${key}`, scrollContainer.scrollTop);
    }
  }

  _restoreScrollPosition() {
    const key = this._systemId || this._collectionId;
    if (!key) return;

    const savedPos = sessionStorage.getItem(`rwl-grid-scroll-${key}`);
    if (savedPos) {
      const scrollContainer = this.shadowRoot.getElementById('scroll-container');
      if (scrollContainer) {
        requestAnimationFrame(() => {
          scrollContainer.scrollTop = parseInt(savedPos, 10);
        });
      }
    }
  }

  set systemId(id) {
    console.log('[GridView] systemId set to:', id);
    this._systemId = id;
    this._collectionId = null;
    this._page = 1;
    this._games = [];
    this._loadSectionSize();
    this._loadGames();
  }

  set collectionId(id) {
    console.log('[GridView] collectionId set to:', id);
    this._collectionId = id;
    this._systemId = null;
    this._page = 1;
    this._games = [];
    this._loadSectionSize();
    this._loadGames();
  }

  async _loadGames() {
    if (this._loading) return;

    console.log('[GridView] Loading games...');
    this._loading = true;

    try {
      let response;
      if (this._systemId) {
        response = await api.getGames(this._systemId, { page: this._page, limit: 10000 });
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
      this._buildLetterIndex();
    } catch (error) {
      console.error('[GridView] Failed to load games:', error);
    } finally {
      this._loading = false;
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
    if (!(letter in this._letterIndex)) return;

    const index = this._letterIndex[letter];
    const cards = this.shadowRoot.querySelectorAll('.card');
    if (cards[index]) {
      cards[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
      this._currentLetter = letter;
    }
  }

  _updateCurrentLetterFromScroll() {
    const scrollContainer = this.shadowRoot.getElementById('scroll-container');
    const cards = this.shadowRoot.querySelectorAll('.card');
    if (!scrollContainer || cards.length === 0) return;

    const containerTop = scrollContainer.getBoundingClientRect().top;

    // Find the first visible card
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect();
      if (rect.top >= containerTop - 50) {
        const game = this._games[i];
        if (game?.name) {
          let letter = game.name.charAt(0).toUpperCase();
          if (!/[A-Z]/.test(letter)) letter = '#';
          if (letter !== this._currentLetter) {
            this._currentLetter = letter;
          }
        }
        break;
      }
    }
  }

  _escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  updated(changedProperties) {
    super.updated(changedProperties);

    if (changedProperties.has('_games') || changedProperties.has('_cardSize')) {
      this._applySize();
      this._restoreScrollPosition();
      this._setupCardEvents();
      this._setupScrollHandler();
    }
  }

  _setupCardEvents() {
    const grid = this.shadowRoot.getElementById('games-grid');
    if (!grid) return;

    grid.querySelectorAll('.card').forEach(card => {
      card.onclick = () => {
        const id = card.dataset.id;
        console.log('[GridView] Card clicked:', id);
        this._saveScrollPosition();
        router.navigate(`/game/${id}`);
      };
      card.onkeydown = (e) => {
        if (e.key === 'Enter') {
          this._saveScrollPosition();
          router.navigate(`/game/${card.dataset.id}`);
        }
      };
      card.onmouseenter = () => this._updateBackground(card.dataset.id);
      card.onfocus = () => this._updateBackground(card.dataset.id);
    });
  }

  _setupScrollHandler() {
    // Track scroll for current letter (remove old handler first to prevent accumulation)
    const scrollContainer = this.shadowRoot.getElementById('scroll-container');
    if (scrollContainer) {
      if (this._scrollHandler) {
        scrollContainer.removeEventListener('scroll', this._scrollHandler);
      }
      this._scrollHandler = () => this._updateCurrentLetterFromScroll();
      scrollContainer.addEventListener('scroll', this._scrollHandler, { passive: true });
    }
  }

  _applySize() {
    const grid = this.shadowRoot.getElementById('games-grid');
    if (grid) {
      grid.style.gridTemplateColumns = `repeat(auto-fill, minmax(${this._cardSize}px, 1fr))`;
    }
  }

  _onSliderChange(e) {
    this._cardSize = parseInt(e.target.value, 10);
    this._saveSectionSize();
    this._applySize();
  }

  _handleAlphabetClick(e) {
    const letterBtn = e.target.closest('.alpha-letter');
    if (letterBtn && letterBtn.classList.contains('has-games')) {
      this._jumpToLetter(letterBtn.dataset.letter);
    }
  }

  _updateBackground(gameId) {
    const bgImage = this.shadowRoot.querySelector('.bg-image');
    if (!bgImage) return;

    if (gameId) {
      const imgUrl = `/api/media/game/${gameId}/screenshot`;

      // Preload image before swapping to prevent flash
      const preloader = new Image();
      preloader.onload = () => {
        bgImage.style.backgroundImage = `url('${imgUrl}')`;
        bgImage.classList.add('visible');
      };
      preloader.onerror = () => {
        // On error, still show (cached version may work, or graceful degrade)
        bgImage.style.backgroundImage = `url('${imgUrl}')`;
        bgImage.classList.add('visible');
      };
      preloader.src = imgUrl;
    } else {
      bgImage.classList.remove('visible');
    }
  }

  _renderLoadingState() {
    return html`
      <div class="message">
        <div class="spinner"></div>
        <p>Loading games...</p>
      </div>
    `;
  }

  _renderEmptyState() {
    if (!this._systemId && !this._collectionId) {
      return html`<div class="message"><p>Select a system to view games</p></div>`;
    }
    return html`<div class="message"><p>No games found</p></div>`;
  }

  _renderGameCard(game, index) {
    const name = String(game.name || 'Unknown');
    const hasImage = game.thumbnail || game.image || game.marquee;
    const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';
    const systemName = this._escapeHtml(game.systemId || '');
    const systemAbbr = this._escapeHtml((game.systemId || '').substring(0, 3).toUpperCase());
    const showSystemBadge = this._collectionId || !this._systemId;

    return html`
      <div class="card" data-id="${game.id}" data-index="${index}" tabindex="0">
        <div class="card-img">
          ${imageUrl
            ? html`<img src="${imageUrl}" alt="${name}" loading="lazy">`
            : html`<span class="no-img">🎮</span>`
          }
          ${showSystemBadge && game.systemId ? html`
            <div class="system-badge" title="${systemName}">
              <img
                src="/api/media/system/${game.systemId}/logo"
                alt="${systemName}"
                @error=${(e) => {
                  e.target.parentElement.classList.add('text-fallback');
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              >
              <span class="badge-text" style="display:none;">${systemAbbr}</span>
            </div>
          ` : ''}
        </div>
        <div class="card-name">${name}</div>
      </div>
    `;
  }

  _renderGamesGrid() {
    if (this._loading) {
      return this._renderLoadingState();
    }

    if (this._games.length === 0) {
      return this._renderEmptyState();
    }

    return this._games.map((game, index) => this._renderGameCard(game, index));
  }

  _renderAlphabetBar() {
    if (this._games.length < 30) return '';

    const letters = ['#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

    return html`
      <div class="alphabet-bar" @click=${this._handleAlphabetClick}>
        ${letters.map(letter => html`
          <button
            class="alpha-letter ${letter in this._letterIndex ? 'has-games' : ''} ${letter === this._currentLetter ? 'active' : ''}"
            data-letter="${letter}"
            title="${letter}"
          >${letter}</button>
        `)}
      </div>
    `;
  }

  render() {
    return html`
      <div class="grid-wrapper">
        <div class="bg-layer">
          <div class="bg-image"></div>
          <div class="bg-gradient"></div>
        </div>

        <div id="scroll-container">
          <div id="games-grid">
            ${this._renderGamesGrid()}
          </div>
        </div>

        ${this._renderAlphabetBar()}

        <div class="toolbar">
          <label>🔍</label>
          <input
            type="range"
            id="size-slider"
            min="80"
            max="280"
            .value="${this._cardSize}"
            title="Adjust size"
            @input=${this._onSliderChange}
          >
          <span class="game-count">${this._games.length > 0 ? `${this._games.length} games` : ''}</span>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-grid-view', RwlGridView);
