/**
 * RetroWebLauncher - Grid View Component
 * Grid layout with alphabet selector and size slider
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';

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
    this._render();
  }

  disconnectedCallback() {
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
    this._showLoading();

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
      this._renderGames();
    } catch (error) {
      console.error('[GridView] Failed to load games:', error);
      this._showError(error.message);
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
            this._updateAlphabetBar();
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

    if (!grid) {
      console.error('[GridView] Grid element not found!');
      return;
    }

    if (this._games.length === 0) {
      grid.innerHTML = '<div class="message"><p>No games found</p></div>';
      return;
    }

    console.log('[GridView] Rendering', this._games.length, 'game cards');

    const showSystemBadge = this._collectionId || !this._systemId;

    let html = '';
    for (let i = 0; i < this._games.length; i++) {
      const game = this._games[i];
      const name = String(game.name || 'Unknown');
      const hasImage = game.thumbnail || game.image || game.marquee;
      const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';
      const systemName = this._escapeHtml(game.systemId || '');
      const systemAbbr = this._escapeHtml((game.systemId || '').substring(0, 3).toUpperCase());

      html += `
        <div class="card" data-id="${game.id}" data-index="${i}" tabindex="0">
          <div class="card-img">
            ${imageUrl ? `<img src="${imageUrl}" alt="${name}" loading="lazy">` : '<span class="no-img">🎮</span>'}
            ${showSystemBadge && game.systemId ? `
              <div class="system-badge" title="${systemName}">
                <img src="/api/media/system/${game.systemId}/logo" alt="${systemName}"
                  onerror="this.parentElement.classList.add('text-fallback'); this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span class="badge-text" style="display:none;">${systemAbbr}</span>
              </div>
            ` : ''}
          </div>
          <div class="card-name">${name}</div>
        </div>
      `;
    }

    grid.innerHTML = html;

    const countEl = this.shadowRoot.querySelector('.game-count');
    if (countEl) {
      countEl.textContent = `${this._games.length} games`;
    }

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

    this._applySize();
    this._renderAlphabetBar();
    this._restoreScrollPosition();

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

  _renderAlphabetBar() {
    const wrapper = this.shadowRoot.querySelector('.grid-wrapper');
    if (!wrapper) return;

    // Remove existing
    const existing = wrapper.querySelector('.alphabet-bar');
    if (existing) existing.remove();

    if (this._games.length < 30) return;

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
          grid-template-columns: repeat(auto-fill, minmax(${this._cardSize}px, 1fr));
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
          color: #fff;
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
          color: rgba(255, 255, 255, 0.25);
          cursor: default;
          border-radius: 3px;
          transition: all 0.15s ease;
          padding: 0;
        }

        .alpha-letter.has-games {
          color: rgba(255, 255, 255, 0.7);
          cursor: pointer;
        }

        .alpha-letter.has-games:hover {
          background: var(--selection-hover-bg, rgba(255, 0, 102, 0.3));
          color: #fff;
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
          color: #888;
          font-size: 14px;
        }

        .toolbar input[type="range"] {
          width: 150px;
          cursor: pointer;
          accent-color: var(--color-primary, #ff0066);
        }

        .game-count {
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
      </style>

      <div class="grid-wrapper">
        <div class="bg-layer">
          <div class="bg-image"></div>
          <div class="bg-gradient"></div>
        </div>

        <div id="scroll-container">
          <div id="games-grid">
            <div class="message"><p>Select a system to view games</p></div>
          </div>
        </div>

        <div class="toolbar">
          <label>🔍</label>
          <input type="range" id="size-slider" min="80" max="280" value="${this._cardSize}" title="Adjust size">
          <span class="game-count"></span>
        </div>
      </div>
    `;

    const slider = this.shadowRoot.getElementById('size-slider');
    if (slider) {
      slider.oninput = (e) => this._onSliderChange(e);
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
}

customElements.define('rwl-grid-view', RwlGridView);
