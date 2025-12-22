/**
 * RetroWebLauncher - Spin Wheel View Component
 * HyperSpin-style vertical spinning wheel on right, details on left
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';

class RwlSpinWheel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._games = [];
    this._systemId = null;
    this._currentIndex = 0;
    this._loading = false;
    this._rotation = 0;
    this._letterIndex = {};
    this._currentLetter = '#';
    this._unsubscribers = [];
    this._cardSize = 300; // Will be loaded per-section when systemId is set
  }

  /**
   * Get the storage key for this section
   */
  _getSectionKey() {
    return this._systemId || 'default';
  }

  /**
   * Load card size for this section from localStorage, with theme default fallback
   */
  _loadSectionSize() {
    const key = this._getSectionKey();
    const stored = localStorage.getItem(`rwl-spin-size-${key}`);
    if (stored) {
      this._cardSize = parseInt(stored, 10);
    } else {
      // Fall back to theme default
      const spinWheelSettings = themeService.getSpinWheelSettings();
      this._cardSize = spinWheelSettings?.sizing?.defaultCardSize || 300;
    }
    this._updateSlider();
  }

  /**
   * Save card size for this section to localStorage
   */
  _saveSectionSize() {
    const key = this._getSectionKey();
    localStorage.setItem(`rwl-spin-size-${key}`, this._cardSize);
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
    this._bindEvents();

    const savedPos = sessionStorage.getItem(`rwl-spin-pos-${this._systemId}`);
    if (savedPos) {
      this._currentIndex = parseInt(savedPos, 10);
    }
  }

  disconnectedCallback() {
    if (this._systemId && this._games.length > 0) {
      sessionStorage.setItem(`rwl-spin-pos-${this._systemId}`, this._currentIndex);
    }

    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
    document.removeEventListener('keydown', this._keyHandler);
    this._stopVideo();
  }

  set systemId(id) {
    this._systemId = id;

    const savedPos = sessionStorage.getItem(`rwl-spin-pos-${id}`);
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
    this._showLoading();

    try {
      const response = await api.getGames(this._systemId, { page: 1, limit: 10000 });
      this._games = response.games || [];
      this._buildLetterIndex();

      if (this._currentIndex >= this._games.length) {
        this._currentIndex = Math.max(0, this._games.length - 1);
      }

      this._renderWheel();
    } catch (error) {
      console.error('Failed to load games:', error);
      this._showError();
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
    if (game) {
      state.emit('gameSelected', game);
    }
  }

  _selectCurrent() {
    const game = this.selectedGame;
    if (game) {
      sessionStorage.setItem(`rwl-spin-pos-${this._systemId}`, this._currentIndex);
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

  _showLoading() {
    const container = this.shadowRoot.querySelector('.wheel-area');
    if (container) {
      container.innerHTML = `
        <div class="state-message">
          <div class="spinner"></div>
          <p>Loading games...</p>
        </div>
      `;
    }
  }

  _showError() {
    const container = this.shadowRoot.querySelector('.wheel-area');
    if (container) {
      container.innerHTML = `
        <div class="state-message">
          <span class="icon">⚠</span>
          <p>Failed to load games</p>
        </div>
      `;
    }
  }

  _renderWheel() {
    const container = this.shadowRoot.querySelector('.wheel-area');
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

    const visibleItems = 5;

    container.innerHTML = `
      <div class="spin-wheel">
        <div class="wheel-track"></div>
        <div class="wheel-pointer"></div>
        <div class="wheel-glow"></div>
      </div>
    `;

    this._renderWheelItems();
    this._renderAlphabetBar();

    this.shadowRoot.querySelector('.spin-wheel')?.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._navigate(e.deltaY > 0 ? 1 : -1);
    });

    this._updateWheel();
  }

  _renderWheelItems() {
    const track = this.shadowRoot.querySelector('.wheel-track');
    if (!track) return;

    track.innerHTML = this._games.map((game, index) => {
      const hasImage = game.thumbnail || game.image;
      const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';

      return `
        <div class="wheel-item" data-index="${index}">
          <div class="item-image">
            ${imageUrl ? `<img src="${imageUrl}" alt="${game.name}" loading="lazy">` : '<span class="no-img">🎮</span>'}
          </div>
          <div class="item-title">${game.name}</div>
          ${game.favorite ? '<span class="badge favorite">❤</span>' : ''}
        </div>
      `;
    }).join('');

    track.querySelectorAll('.wheel-item').forEach((item, i) => {
      item.addEventListener('click', () => {
        if (i === this._currentIndex) {
          this._selectCurrent();
        } else {
          this._currentIndex = i;
          this._updateWheel();
        }
      });
    });
  }

  _renderAlphabetBar() {
    const wrapper = this.shadowRoot.querySelector('.spin-view');
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
    const track = this.shadowRoot.querySelector('.wheel-track');
    const items = this.shadowRoot.querySelectorAll('.wheel-item');
    const counter = this.shadowRoot.querySelector('.counter');

    if (!track || items.length === 0) return;

    const itemHeight = this._cardSize * 0.35;
    const visibleItems = 5;

    items.forEach((item, i) => {
      const offset = i - this._currentIndex;
      const absOffset = Math.abs(offset);

      const angle = offset * 22;
      const translateZ = -Math.abs(offset) * 40;
      const translateY = offset * itemHeight;
      const opacity = Math.max(0, 1 - absOffset * 0.25);
      const scale = Math.max(0.55, 1 - absOffset * 0.12);

      item.style.transform = `
        translateY(${translateY}px)
        translateZ(${translateZ}px)
        rotateX(${-angle}deg)
        scale(${scale})
      `;
      item.style.opacity = opacity;
      item.style.zIndex = 100 - absOffset;

      const imgContainer = item.querySelector('.item-image');
      if (imgContainer) {
        imgContainer.style.width = `${this._cardSize * 0.3}px`;
        imgContainer.style.height = `${this._cardSize * 0.4}px`;
      }

      item.style.width = `${this._cardSize}px`;
      item.classList.toggle('active', i === this._currentIndex);
      item.classList.toggle('hidden', absOffset > visibleItems);
    });

    const gameCount = this.shadowRoot.querySelector('.game-count');
    if (gameCount) {
      gameCount.textContent = `${this._games.length} games`;
    }

    if (counter) counter.textContent = `${this._currentIndex + 1} / ${this._games.length}`;

    this._updateGameDetails();
    this._updateCurrentLetter();
  }

  _updateGameDetails() {
    const game = this.selectedGame;
    const detailsPanel = this.shadowRoot.querySelector('.details-content');
    const bgImage = this.shadowRoot.querySelector('.bg-image');
    const videoPlayer = this.shadowRoot.querySelector('rwl-video-player');

    if (!detailsPanel || !game) return;

    // Background
    if (bgImage) {
      const imgUrl = `/api/media/game/${game.id}/fanart`;
      bgImage.style.backgroundImage = `url('${imgUrl}'), url('/api/media/game/${game.id}/screenshot')`;
    }

    // CRT TV video player
    if (videoPlayer) {
      const videoUrl = `/api/media/game/${game.id}/video`;
      videoPlayer.src = videoUrl;
    }

    // Details
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
      </div>
      ${game.description ? `<p class="game-desc">${game.description}</p>` : ''}
    `;
  }

  _onSliderChange(e) {
    this._cardSize = parseInt(e.target.value, 10);
    this._saveSectionSize();
    this._updateWheel();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          overflow: hidden;
        }

        .spin-view {
          position: relative;
          display: flex;
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
          background-size: cover;
          background-position: center;
          filter: blur(20px) brightness(0.4);
          transition: background-image 0.5s ease;
        }

        .bg-gradient {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background:
            linear-gradient(90deg, rgba(0,0,0,0.5) 0%, transparent 40%, transparent 50%, rgba(0,0,0,0.7) 100%),
            linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.5) 100%);
        }

        /* Left: Details */
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

        /* CRT TV - uses theme variables */
        .crt-container {
          width: 100%;
          max-width: 350px;
          margin-bottom: 25px;
          flex-shrink: 0;
        }

        .crt-frame {
          background: var(--crt-frame-background, linear-gradient(145deg, #2a2a2a, #1a1a1a));
          border: 1px solid var(--crt-frame-border, transparent);
          border-radius: 18px;
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
          overflow-y: auto;
          padding-right: 10px;
        }

        .details-content::-webkit-scrollbar { width: 4px; }
        .details-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }

        .game-title {
          font-family: var(--font-display, 'VT323', monospace);
          font-size: 1rem;
          color: #fff;
          margin: 0 0 12px 0;
          text-shadow: 0 0 20px rgba(255, 0, 102, 0.5);
          line-height: 1.5;
        }

        .game-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 18px;
          flex-wrap: wrap;
        }

        .meta-item {
          font-size: 0.85rem;
          color: rgba(255,255,255,0.7);
          padding: 4px 10px;
          background: rgba(255,255,255,0.1);
          border-radius: 4px;
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px 18px;
          margin-bottom: 18px;
        }

        .detail-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .detail-label {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
        }

        .detail-value {
          font-size: 0.85rem;
          color: #fff;
        }

        .rating-stars {
          color: #ffcc00;
          font-size: 0.85rem;
        }

        .game-desc {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.6);
          line-height: 1.5;
          margin: 0;
        }

        /* Right: Wheel */
        .wheel-area {
          flex: 1;
          height: calc(100% - 70px);
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          perspective: 1000px;
          z-index: 1;
        }

        .spin-wheel {
          position: relative;
          width: 400px;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          perspective: 1000px;
        }

        .wheel-track {
          position: relative;
          transform-style: preserve-3d;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .wheel-item {
          position: absolute;
          width: ${this._cardSize}px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 15px;
          background: rgba(20, 20, 30, 0.85);
          border-radius: 10px;
          border: 2px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.25, 0.1, 0.25, 1);
          transform-style: preserve-3d;
          backface-visibility: hidden;
        }

        .wheel-item.active {
          background: linear-gradient(135deg, rgba(255, 0, 102, 0.3), rgba(0, 200, 255, 0.2));
          border-color: rgba(255, 0, 102, 0.8);
          box-shadow:
            0 0 30px rgba(255, 0, 102, 0.4),
            0 0 60px rgba(0, 200, 255, 0.2);
        }

        .wheel-item.hidden {
          visibility: hidden;
          pointer-events: none;
        }

        .wheel-item:hover:not(.active) {
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(30, 30, 50, 0.9);
        }

        .item-image {
          width: 60px;
          height: 80px;
          flex-shrink: 0;
          border-radius: 6px;
          overflow: hidden;
          background: rgba(0, 0, 0, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .item-image img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .no-img {
          font-size: 1.8rem;
          opacity: 0.3;
        }

        .item-title {
          flex: 1;
          font-size: 0.85rem;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .wheel-item.active .item-title {
          text-shadow: 0 0 15px rgba(255, 0, 102, 0.5);
        }

        .badge { position: absolute; top: 5px; right: 10px; font-size: 1rem; }

        .wheel-pointer {
          position: absolute;
          left: -15px;
          width: 0;
          height: 0;
          border-top: 12px solid transparent;
          border-bottom: 12px solid transparent;
          border-left: 18px solid #ff0066;
          filter: drop-shadow(0 0 10px rgba(255, 0, 102, 0.8));
          z-index: 200;
        }

        .wheel-glow {
          position: absolute;
          width: 280px;
          height: 120px;
          background: radial-gradient(ellipse, rgba(255, 0, 102, 0.15) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
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

        /* Controls bar - uses theme variables */
        .controls-bar {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 70px;
          background: var(--controls-bar-bg, rgba(15, 15, 15, 0.95));
          border-top: 1px solid var(--controls-bar-border-color, #333);
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
          color: #666;
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
          color: #666;
          font-size: 11px;
        }

        /* State messages */
        .state-message {
          text-align: center;
          padding: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .state-message .icon {
          font-size: 4rem;
          margin-bottom: 20px;
          opacity: 0.5;
        }

        .state-message p {
          color: #888;
          font-size: 1rem;
        }

        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid #333;
          border-top-color: #ff0066;
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

          .details-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .spin-view {
            flex-direction: column;
          }

          .details-panel {
            width: 100%;
            height: auto;
            padding: 15px;
            order: 2;
          }

          .wheel-area {
            width: 100%;
            height: 50%;
            order: 1;
          }

          .crt-container {
            display: none;
          }
        }
      </style>

      <div class="spin-view">
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
            <h2 class="game-title">Select a game</h2>
          </div>
        </div>

        <div class="wheel-area">
          <div class="state-message">
            <span class="icon">🎮</span>
            <p>Select a system to browse games</p>
          </div>
        </div>

        <div class="controls-bar">
          <div class="nav-controls">
            <button class="nav-btn prev" aria-label="Previous">▲</button>
            <span class="counter">0 / 0</span>
            <button class="nav-btn next" aria-label="Next">▼</button>
          </div>
          <div class="size-control">
            <label>🔍</label>
            <input type="range" id="size-slider" min="200" max="550" value="${this._cardSize}" title="Adjust size">
          </div>
          <span class="game-count"></span>
        </div>
      </div>
    `;

    // Bind slider
    const slider = this.shadowRoot.getElementById('size-slider');
    if (slider) {
      slider.oninput = (e) => this._onSliderChange(e);
    }

    // Nav buttons
    this.shadowRoot.querySelector('.prev')?.addEventListener('click', () => this._navigate(-1));
    this.shadowRoot.querySelector('.next')?.addEventListener('click', () => this._navigate(1));
  }
}

customElements.define('rwl-spin-wheel', RwlSpinWheel);
