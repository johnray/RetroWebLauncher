/**
 * RetroWebLauncher - Wheel View Component
 * 3D carousel using Swiper.js for game selection
 */

import { state } from '../state.js';
import { api } from '../api.js';

class RwlWheelView extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._games = [];
    this._systemId = null;
    this._swiper = null;
    this._loading = false;
  }

  connectedCallback() {
    this._render();
    this._initSwiper();
    this._bindEvents();
  }

  disconnectedCallback() {
    if (this._swiper) {
      this._swiper.destroy();
      this._swiper = null;
    }
  }

  set systemId(id) {
    this._systemId = id;
    this._loadGames();
  }

  set games(data) {
    this._games = data || [];
    this._renderSlides();
  }

  get selectedGame() {
    if (this._swiper && this._games.length > 0) {
      return this._games[this._swiper.activeIndex] || null;
    }
    return null;
  }

  async _loadGames() {
    if (this._loading) return;

    this._loading = true;
    this._showLoading();

    try {
      const response = await api.getGames(this._systemId, { page: 1, limit: 500 });
      this._games = response.games || [];
      this._renderSlides();
    } catch (error) {
      console.error('Failed to load games:', error);
      this._showError();
    } finally {
      this._loading = false;
    }
  }

  _initSwiper() {
    // Wait for Swiper to be available
    if (typeof Swiper === 'undefined') {
      console.warn('Swiper not loaded, waiting...');
      setTimeout(() => this._initSwiper(), 100);
      return;
    }

    const container = this.shadowRoot.querySelector('.swiper');
    if (!container) return;

    this._swiper = new Swiper(container, {
      // Effect
      effect: 'coverflow',
      coverflowEffect: {
        rotate: 30,
        stretch: 0,
        depth: 200,
        modifier: 1,
        slideShadows: true,
      },

      // Core settings
      slidesPerView: 'auto',
      centeredSlides: true,
      grabCursor: true,
      watchSlidesProgress: true,

      // Speed
      speed: 400,

      // Keyboard
      keyboard: {
        enabled: true,
        onlyInViewport: true,
      },

      // Mousewheel
      mousewheel: {
        sensitivity: 1,
        forceToAxis: true,
      },

      // Navigation arrows
      navigation: {
        nextEl: this.shadowRoot.querySelector('.swiper-button-next'),
        prevEl: this.shadowRoot.querySelector('.swiper-button-prev'),
      },

      // Pagination
      pagination: {
        el: this.shadowRoot.querySelector('.swiper-pagination'),
        type: 'fraction',
      },

      // Events
      on: {
        slideChange: () => this._onSlideChange(),
        click: (swiper, event) => this._onSlideClick(event),
      },

      // Accessibility
      a11y: {
        prevSlideMessage: 'Previous game',
        nextSlideMessage: 'Next game',
        firstSlideMessage: 'First game',
        lastSlideMessage: 'Last game',
      },
    });
  }

  _bindEvents() {
    // Input manager navigation
    state.on('input:navigate', (direction) => {
      if (!this._swiper) return;

      if (direction === 'left' || direction === 'up') {
        this._swiper.slidePrev();
      } else if (direction === 'right' || direction === 'down') {
        this._swiper.slideNext();
      }
    });

    state.on('input:select', () => {
      this._selectCurrent();
    });

    // Gamepad triggers for fast navigation
    state.on('input:pageLeft', () => {
      if (this._swiper) {
        this._swiper.slideTo(Math.max(0, this._swiper.activeIndex - 10));
      }
    });

    state.on('input:pageRight', () => {
      if (this._swiper) {
        this._swiper.slideTo(Math.min(this._games.length - 1, this._swiper.activeIndex + 10));
      }
    });
  }

  _onSlideChange() {
    const game = this.selectedGame;
    if (game) {
      state.emit('gameSelected', game);
    }
  }

  _onSlideClick(event) {
    const slide = event.target.closest('.swiper-slide');
    if (!slide) return;

    const index = parseInt(slide.dataset.index, 10);

    if (this._swiper.activeIndex === index) {
      // Already active - select it
      this._selectCurrent();
    } else {
      // Navigate to it
      this._swiper.slideTo(index);
    }
  }

  _selectCurrent() {
    const game = this.selectedGame;
    if (game) {
      state.emit('gameActivated', game);
    }
  }

  _getImageUrl(game) {
    if (!game) return '';

    // Use game ID-based endpoint which handles thumbnail/image fallback server-side
    if (game.thumbnail || game.image) {
      return `/api/media/game/${game.id}/thumbnail`;
    }
    return '';
  }

  _showLoading() {
    const wrapper = this.shadowRoot.querySelector('.swiper-wrapper');
    if (wrapper) {
      wrapper.innerHTML = `
        <div class="loading-state">
          <div class="spinner"></div>
          <p>Loading games...</p>
        </div>
      `;
    }
  }

  _showError() {
    const wrapper = this.shadowRoot.querySelector('.swiper-wrapper');
    if (wrapper) {
      wrapper.innerHTML = `
        <div class="error-state">
          <span class="error-icon">⚠️</span>
          <p>Failed to load games</p>
        </div>
      `;
    }
  }

  _renderSlides() {
    const wrapper = this.shadowRoot.querySelector('.swiper-wrapper');
    if (!wrapper) return;

    if (this._games.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🎮</span>
          <p>No games available</p>
        </div>
      `;
      return;
    }

    wrapper.innerHTML = this._games.map((game, index) => {
      const imageUrl = this._getImageUrl(game);

      return `
        <div class="swiper-slide" data-index="${index}">
          <div class="slide-content">
            ${imageUrl ? `
              <img src="${imageUrl}" alt="${game.name}" loading="lazy" />
            ` : `
              <div class="no-image">
                <span>🎮</span>
              </div>
            `}
            ${game.favorite ? '<span class="favorite-badge">❤️</span>' : ''}
            ${game.video ? '<span class="video-badge">▶</span>' : ''}
          </div>
          <div class="slide-info">
            <div class="game-name">${game.name}</div>
            ${game.releaseYear ? `<div class="game-year">${game.releaseYear}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    // Reinitialize Swiper with new slides
    if (this._swiper) {
      this._swiper.update();
      this._swiper.slideTo(0, 0);
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: 100%;
          overflow: hidden;
        }

        .wheel-container {
          height: 100%;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: var(--spacing-lg, 1.5rem);
        }

        /* Swiper container */
        .swiper {
          width: 100%;
          padding: 40px 0 60px;
          overflow: visible;
        }

        .swiper-wrapper {
          align-items: center;
        }

        .swiper-slide {
          width: 280px;
          height: 380px;
          display: flex;
          flex-direction: column;
          background: rgba(0, 0, 0, 0.6);
          border-radius: var(--radius-lg, 12px);
          overflow: hidden;
          transition: transform 0.3s ease, box-shadow 0.3s ease;
          cursor: pointer;
        }

        .swiper-slide-active {
          box-shadow:
            0 0 40px rgba(255, 0, 102, 0.5),
            0 20px 60px rgba(0, 0, 0, 0.5);
        }

        .swiper-slide-active .slide-info {
          background: rgba(255, 0, 102, 0.3);
        }

        .slide-content {
          flex: 1;
          position: relative;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #1a1a1a 0%, #0a0a0a 100%);
        }

        .slide-content img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.3s ease;
        }

        .swiper-slide-active .slide-content img {
          transform: scale(1.05);
        }

        .no-image {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          font-size: 4rem;
          opacity: 0.2;
        }

        .favorite-badge {
          position: absolute;
          top: 10px;
          right: 10px;
          font-size: 1.25rem;
          filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.5));
        }

        .video-badge {
          position: absolute;
          bottom: 10px;
          right: 10px;
          width: 28px;
          height: 28px;
          background: rgba(0, 0, 0, 0.8);
          color: var(--color-primary, #ff0066);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
        }

        .slide-info {
          padding: var(--spacing-md, 1rem);
          background: rgba(0, 0, 0, 0.8);
          transition: background 0.3s ease;
        }

        .game-name {
          font-size: var(--font-size-sm, 0.75rem);
          font-weight: 600;
          color: var(--color-text, #fff);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .game-year {
          font-size: var(--font-size-xs, 0.625rem);
          color: var(--color-text-muted, #888);
          margin-top: 4px;
        }

        /* Navigation arrows */
        .swiper-button-prev,
        .swiper-button-next {
          color: var(--color-primary, #ff0066);
          opacity: 0.7;
          transition: opacity 0.2s ease;
        }

        .swiper-button-prev:hover,
        .swiper-button-next:hover {
          opacity: 1;
        }

        .swiper-button-prev::after,
        .swiper-button-next::after {
          font-size: 2rem;
        }

        /* Pagination */
        .swiper-pagination {
          font-family: var(--font-display, 'Press Start 2P', monospace);
          font-size: var(--font-size-xs, 0.625rem);
          color: var(--color-text-muted, #888);
        }

        .swiper-pagination-current {
          color: var(--color-primary, #ff0066);
        }

        /* States */
        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 300px;
          text-align: center;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255, 255, 255, 0.2);
          border-top-color: var(--color-primary, #ff0066);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .empty-icon,
        .error-icon {
          font-size: 4rem;
          margin-bottom: var(--spacing-md, 1rem);
          opacity: 0.5;
        }

        .loading-state p,
        .error-state p,
        .empty-state p {
          color: var(--color-text-muted, #888);
          margin: var(--spacing-md, 1rem) 0 0;
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .swiper-slide {
            width: 200px;
            height: 280px;
          }

          .swiper-button-prev,
          .swiper-button-next {
            display: none;
          }
        }

        /* Safari optimizations */
        @supports (-webkit-touch-callout: none) {
          .swiper-slide {
            -webkit-transform: translateZ(0);
            transform: translateZ(0);
          }
        }
      </style>

      <div class="wheel-container">
        <div class="swiper">
          <div class="swiper-wrapper">
            <div class="empty-state">
              <span class="empty-icon">🎮</span>
              <p>Select a system to browse games</p>
            </div>
          </div>

          <div class="swiper-button-prev"></div>
          <div class="swiper-button-next"></div>

          <div class="swiper-pagination"></div>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-wheel-view', RwlWheelView);
