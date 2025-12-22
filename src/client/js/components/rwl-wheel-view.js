/**
 * RetroWebLauncher - Wheel View Component (Carousel)
 * Horizontal carousel at bottom, details panel with CRT video above
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';
import { themeService } from '../theme-service.js';

class RwlWheelView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._games = [];
    this._systemId = null;
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
    return this._systemId || 'default';
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
    this._updateSlider();
  }

  /**
   * Save card size for this section to localStorage
   */
  _saveSectionSize() {
    const key = this._getSectionKey();
    localStorage.setItem(`rwl-wheel-size-${key}`, this._cardSize);
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

    const savedPos = sessionStorage.getItem(`rwl-wheel-pos-${this._systemId}`);
    if (savedPos) {
      this._currentIndex = parseInt(savedPos, 10);
    }
  }

  disconnectedCallback() {
    if (this._systemId && this._games.length > 0) {
      sessionStorage.setItem(`rwl-wheel-pos-${this._systemId}`, this._currentIndex);
    }

    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
    document.removeEventListener('keydown', this._keyHandler);
    this._stopVideo();
  }

  set systemId(id) {
    this._systemId = id;

    const savedPos = sessionStorage.getItem(`rwl-wheel-pos-${id}`);
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

      this._renderGames();
    } catch (error) {
      console.error('Failed to load games:', error);
      this._showError();
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
        this._updateCarousel();
      } else if (e.key === 'End') {
        e.preventDefault();
        this._currentIndex = this._games.length - 1;
        this._updateCarousel();
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
    this._updateCarousel();

    const game = this.selectedGame;
    if (game) {
      state.emit('gameSelected', game);
    }
  }

  _selectCurrent() {
    const game = this.selectedGame;
    if (game) {
      sessionStorage.setItem(`rwl-wheel-pos-${this._systemId}`, this._currentIndex);
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
      this._updateCarousel();
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
    const container = this.shadowRoot.querySelector('.carousel-area');
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
    const container = this.shadowRoot.querySelector('.carousel-area');
    if (container) {
      container.innerHTML = `
        <div class="state-message">
          <span class="icon">⚠</span>
          <p>Failed to load games</p>
        </div>
      `;
    }
  }

  _renderGames() {
    const container = this.shadowRoot.querySelector('.carousel-area');
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

    container.innerHTML = `
      <div class="carousel">
        <div class="carousel-track">
          ${this._games.map((game, index) => this._renderCard(game, index)).join('')}
        </div>
      </div>
    `;

    // Bind click events
    this.shadowRoot.querySelectorAll('.card').forEach((card, i) => {
      card.addEventListener('click', () => {
        if (i === this._currentIndex) {
          this._selectCurrent();
        } else {
          this._currentIndex = i;
          this._updateCarousel();
        }
      });
    });

    // Wheel on carousel
    this.shadowRoot.querySelector('.carousel')?.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._navigate(e.deltaY > 0 ? 1 : -1);
    });

    // Update game count
    const countEl = this.shadowRoot.querySelector('.game-count');
    if (countEl) {
      countEl.textContent = `${this._games.length} games`;
    }

    this._applyCardSize();
    this._renderAlphabetBar();
    this._updateCarousel();
  }

  _renderCard(game, index) {
    const hasImage = game.thumbnail || game.image;
    const imageUrl = hasImage ? `/api/media/game/${game.id}/thumbnail` : '';

    return `
      <div class="card" data-index="${index}">
        <div class="card-image">
          ${imageUrl ? `<img src="${imageUrl}" alt="${game.name}" loading="lazy">` : '<span class="no-img">🎮</span>'}
        </div>
        ${game.favorite ? '<span class="badge favorite">❤</span>' : ''}
      </div>
    `;
  }

  _renderAlphabetBar() {
    const wrapper = this.shadowRoot.querySelector('.wheel-view');
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

  _updateCarousel() {
    const track = this.shadowRoot.querySelector('.carousel-track');
    const cards = this.shadowRoot.querySelectorAll('.card');
    const counter = this.shadowRoot.querySelector('.counter');

    if (!track || cards.length === 0) return;

    // Update active state
    cards.forEach((card, i) => {
      card.classList.toggle('active', i === this._currentIndex);
      card.classList.toggle('prev', i === this._currentIndex - 1);
      card.classList.toggle('next', i === this._currentIndex + 1);
    });

    // Calculate translation
    const cardWidth = this._cardSize;
    const gap = Math.round(this._cardSize * 0.09);
    const containerWidth = this.shadowRoot.querySelector('.carousel')?.offsetWidth || 800;
    const centerOffset = (containerWidth / 2) - (cardWidth / 2);
    const translateX = centerOffset - (this._currentIndex * (cardWidth + gap));

    track.style.transform = `translateX(${translateX}px)`;

    // Update counter
    if (counter) counter.textContent = `${this._currentIndex + 1} / ${this._games.length}`;

    // Update game details
    this._updateGameDetails();
    this._updateCurrentLetter();
  }

  _updateGameDetails() {
    const game = this.selectedGame;
    const detailsPanel = this.shadowRoot.querySelector('.details-content');
    const bgImage = this.shadowRoot.querySelector('.bg-image');
    const videoPlayer = this.shadowRoot.querySelector('rwl-video-player');

    if (!detailsPanel || !game) return;

    // Update background
    if (bgImage) {
      const imgUrl = `/api/media/game/${game.id}/fanart`;
      bgImage.style.backgroundImage = `url('${imgUrl}'), url('/api/media/game/${game.id}/screenshot')`;
    }

    // Update CRT TV video player
    if (videoPlayer) {
      const videoUrl = `/api/media/game/${game.id}/video`;
      videoPlayer.src = videoUrl;
    }

    // Build details
    const rating = this._formatRating(game.rating);
    const ratingHtml = rating
      ? `<div class="detail-item"><span class="rating-stars">${'★'.repeat(rating.filled)}${'☆'.repeat(rating.empty)}</span></div>`
      : '';

    detailsPanel.innerHTML = `
      <h2 class="game-title">${game.name || 'Unknown'}</h2>
      <div class="game-meta">
        ${game.releaseYear ? `<span class="meta-item">${game.releaseYear}</span>` : ''}
        ${game.genre ? `<span class="meta-item">${game.genre}</span>` : ''}
        ${game.developer ? `<span class="meta-item">${game.developer}</span>` : ''}
      </div>
      <div class="details-row">
        ${game.publisher ? `<div class="detail-item"><span class="label">Publisher</span><span class="value">${game.publisher}</span></div>` : ''}
        ${game.players ? `<div class="detail-item"><span class="label">Players</span><span class="value">${game.players}</span></div>` : ''}
        ${game.region ? `<div class="detail-item"><span class="label">Region</span><span class="value">${game.region}</span></div>` : ''}
        ${ratingHtml}
        ${game.playCount ? `<div class="detail-item"><span class="label">Plays</span><span class="value">${game.playCount}</span></div>` : ''}
      </div>
      ${game.description ? `<p class="game-desc">${game.description}</p>` : ''}
    `;
  }

  _onSliderChange(e) {
    this._cardSize = parseInt(e.target.value, 10);
    this._saveSectionSize();
    this._applyCardSize();
    this._updateCarousel();
  }

  _applyCardSize() {
    const cards = this.shadowRoot.querySelectorAll('.card');
    const height = Math.round(this._cardSize * 1.36);

    cards.forEach(card => {
      card.style.width = `${this._cardSize}px`;
      card.style.height = `${height}px`;
    });

    const track = this.shadowRoot.querySelector('.carousel-track');
    if (track) {
      track.style.gap = `${Math.round(this._cardSize * 0.09)}px`;
    }
  }

  _render() {
    const cardHeight = Math.round(this._cardSize * 1.36);
    const gap = Math.round(this._cardSize * 0.09);

    this.shadowRoot.innerHTML = `
      <style>
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
          color: rgba(255,255,255,0.7);
          padding: 4px 10px;
          background: rgba(255,255,255,0.1);
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
          color: rgba(255,255,255,0.5);
          text-transform: uppercase;
        }

        .detail-item .value {
          font-size: 0.85rem;
          color: #fff;
        }

        .rating-stars {
          color: #ffcc00;
          font-size: 0.9rem;
        }

        .game-desc {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.6);
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
          height: ${cardHeight + 80}px;
          overflow: visible;
          z-index: 1;
          margin-bottom: 80px; /* Space for controls bar - increased for better separation */
        }

        .carousel {
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .carousel-track {
          display: flex;
          gap: ${gap}px;
          transition: transform 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
          height: 100%;
          align-items: center;
          padding: 20px 0 40px;
        }

        .card {
          flex-shrink: 0;
          width: ${this._cardSize}px;
          height: ${cardHeight}px;
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
          color: #888;
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
      </style>

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
            <h2 class="game-title">Select a game</h2>
          </div>
        </div>

        <div class="carousel-area">
          <div class="state-message">
            <span class="icon">🎮</span>
            <p>Select a system to browse games</p>
          </div>
        </div>

        <div class="controls-bar">
          <div class="nav-controls">
            <button class="nav-btn prev" aria-label="Previous">◀</button>
            <span class="counter">0 / 0</span>
            <button class="nav-btn next" aria-label="Next">▶</button>
          </div>
          <div class="size-control">
            <label>🔍</label>
            <input type="range" id="size-slider" min="95" max="125" value="${Math.min(this._cardSize, 125)}" title="Adjust size">
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

customElements.define('rwl-wheel-view', RwlWheelView);
