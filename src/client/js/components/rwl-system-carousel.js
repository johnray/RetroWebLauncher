/**
 * RetroWebLauncher - System Carousel Component
 * Graphical horizontal carousel for system selection using RetroBat theme assets
 */

import { state } from '../state.js';
import { api } from '../api.js';
import { router } from '../router.js';

class RwlSystemCarousel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._systems = [];
    this._currentIndex = 0;
    this._loading = true;
    this._unsubscribers = [];
  }

  connectedCallback() {
    this._render();
    this._loadSystems();
    this._bindEvents();
  }

  disconnectedCallback() {
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
    document.removeEventListener('keydown', this._keyHandler);
  }

  get selectedSystem() {
    return this._systems[this._currentIndex] || null;
  }

  async _loadSystems() {
    try {
      const response = await api.getSystems();
      // Only show systems with games
      this._systems = (response.systems || []).filter(s => s.gameCount > 0);
      this._loading = false;
      this._renderSystems();
    } catch (error) {
      console.error('Failed to load systems:', error);
      this._loading = false;
      this._showError();
    }
  }

  _bindEvents() {
    // Keyboard navigation
    this._keyHandler = (e) => {
      // Only handle if carousel is visible
      if (!this.offsetParent) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this._navigate(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        this._navigate(1);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        this._selectCurrent();
      } else if (e.key === 'Home') {
        e.preventDefault();
        this._currentIndex = 0;
        this._updateCarousel();
      } else if (e.key === 'End') {
        e.preventDefault();
        this._currentIndex = this._systems.length - 1;
        this._updateCarousel();
      }
    };
    document.addEventListener('keydown', this._keyHandler);

    // State events for gamepad/input
    this._unsubscribers.push(
      state.on('input:navigate', (direction) => {
        if (!this.offsetParent) return;
        if (direction === 'left') this._navigate(-1);
        if (direction === 'right') this._navigate(1);
      })
    );

    this._unsubscribers.push(
      state.on('input:select', () => {
        if (!this.offsetParent) return;
        this._selectCurrent();
      })
    );

    // Listen for library updates
    this._unsubscribers.push(
      state.on('libraryUpdated', () => {
        this._loadSystems();
      })
    );
  }

  _navigate(delta) {
    if (this._systems.length === 0) return;

    this._currentIndex = (this._currentIndex + delta + this._systems.length) % this._systems.length;
    this._updateCarousel();

    const system = this.selectedSystem;
    if (system) {
      state.emit('systemHighlighted', system);
    }
  }

  _selectCurrent() {
    const system = this.selectedSystem;
    if (system) {
      router.navigate(`/system/${system.id}`);
    }
  }

  _showError() {
    const container = this.shadowRoot.querySelector('.carousel-container');
    if (container) {
      container.innerHTML = `
        <div class="state-message">
          <span class="icon">⚠️</span>
          <p>Failed to load systems</p>
        </div>
      `;
    }
  }

  _renderSystems() {
    const container = this.shadowRoot.querySelector('.carousel-container');
    if (!container) return;

    if (this._systems.length === 0) {
      container.innerHTML = `
        <div class="state-message">
          <span class="icon">🎮</span>
          <p>No systems found</p>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="system-info">
        <div class="system-name"></div>
        <div class="system-meta"></div>
      </div>
      <div class="carousel">
        <div class="carousel-track">
          ${this._systems.map((system, index) => this._renderSystemCard(system, index)).join('')}
        </div>
      </div>
      <div class="controls-bar">
        <div class="nav-controls">
          <button class="nav-btn prev" aria-label="Previous system">◀</button>
          <span class="counter">${this._currentIndex + 1} / ${this._systems.length}</span>
          <button class="nav-btn next" aria-label="Next system">▶</button>
        </div>
      </div>
    `;

    // Bind click events on cards
    this.shadowRoot.querySelectorAll('.system-card').forEach((card, i) => {
      card.addEventListener('click', () => {
        if (i === this._currentIndex) {
          this._selectCurrent();
        } else {
          this._currentIndex = i;
          this._updateCarousel();
        }
      });
    });

    // Nav buttons
    this.shadowRoot.querySelector('.prev')?.addEventListener('click', () => this._navigate(-1));
    this.shadowRoot.querySelector('.next')?.addEventListener('click', () => this._navigate(1));

    // Mouse wheel
    this.shadowRoot.querySelector('.carousel')?.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._navigate(e.deltaY > 0 ? 1 : -1);
    });

    this._updateCarousel();
  }

  _renderSystemCard(system, index) {
    return `
      <div class="system-card" data-index="${index}" data-system-id="${system.id}">
        <div class="card-inner">
          <div class="console-image">
            <img
              src="/api/media/system/${system.id}/console"
              alt="${system.fullname}"
              loading="lazy"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
            >
            <div class="fallback-icon" style="display:none;">🎮</div>
          </div>
          <div class="logo-image">
            <img
              src="/api/media/system/${system.id}/logo"
              alt="${system.fullname}"
              loading="lazy"
              onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"
            >
            <span class="fallback-text" style="display:none;">${system.fullname}</span>
          </div>
        </div>
        <div class="game-count-badge">${system.gameCount} games</div>
      </div>
    `;
  }

  _updateCarousel() {
    const track = this.shadowRoot.querySelector('.carousel-track');
    const cards = this.shadowRoot.querySelectorAll('.system-card');
    const counter = this.shadowRoot.querySelector('.counter');
    const nameEl = this.shadowRoot.querySelector('.system-name');
    const metaEl = this.shadowRoot.querySelector('.system-meta');

    if (!track || cards.length === 0) return;

    // Update active state
    cards.forEach((card, i) => {
      const offset = i - this._currentIndex;
      card.classList.toggle('active', i === this._currentIndex);
      card.classList.toggle('prev', offset === -1);
      card.classList.toggle('next', offset === 1);
      card.classList.toggle('far', Math.abs(offset) > 1);
    });

    // Calculate translation - center the current card
    const cardWidth = 280;
    const gap = 30;
    const containerWidth = this.shadowRoot.querySelector('.carousel')?.offsetWidth || 900;
    const centerOffset = (containerWidth / 2) - (cardWidth / 2);
    const translateX = centerOffset - (this._currentIndex * (cardWidth + gap));

    track.style.transform = `translateX(${translateX}px)`;

    // Update info
    const system = this.selectedSystem;
    if (counter) counter.textContent = `${this._currentIndex + 1} / ${this._systems.length}`;
    if (nameEl) nameEl.textContent = system?.fullname || '';
    if (metaEl) {
      const parts = [];
      if (system?.manufacturer) parts.push(system.manufacturer);
      if (system?.hardware) parts.push(system.hardware);
      parts.push(`${system?.gameCount || 0} games`);
      metaEl.textContent = parts.join(' • ');
    }
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
          overflow: hidden;
          background: var(--view-background, linear-gradient(180deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%));
        }

        .system-carousel {
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 20px 0 0 0;
          box-sizing: border-box;
        }

        .carousel-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .carousel {
          flex: 1;
          width: 100%;
          overflow: hidden;
          position: relative;
          display: flex;
          align-items: center;
        }

        .carousel-track {
          display: flex;
          gap: 30px;
          transition: transform 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
          height: 100%;
          align-items: center;
          padding: 20px 0;
        }

        .system-card {
          flex-shrink: 0;
          width: 280px;
          height: 320px;
          border-radius: 16px;
          overflow: hidden;
          cursor: pointer;
          transition: all 0.5s cubic-bezier(0.25, 0.1, 0.25, 1);
          transform: scale(0.75) rotateY(15deg);
          opacity: 0.4;
          filter: brightness(0.5) blur(2px);
          position: relative;
          transform-style: preserve-3d;
          perspective: 1000px;
        }

        .system-card.active {
          transform: scale(1) rotateY(0deg);
          opacity: 1;
          filter: brightness(1) blur(0);
          z-index: 10;
        }

        .system-card.active .card-inner {
          border: var(--selection-border-width, 3px) solid var(--selection-border-color, #00c8ff);
          box-shadow:
            0 0 60px var(--selection-glow-rgba, rgba(0, 200, 255, 0.4)),
            0 0 100px var(--selection-glow-secondary, rgba(255, 0, 102, 0.2)),
            0 20px 40px rgba(0, 0, 0, 0.6);
        }

        .system-card.prev {
          transform: scale(0.85) rotateY(8deg) translateX(20px);
          opacity: 0.7;
          filter: brightness(0.7) blur(1px);
        }

        .system-card.next {
          transform: scale(0.85) rotateY(-8deg) translateX(-20px);
          opacity: 0.7;
          filter: brightness(0.7) blur(1px);
        }

        .system-card.far {
          transform: scale(0.65) rotateY(25deg);
          opacity: 0.3;
          filter: brightness(0.4) blur(3px);
        }

        .system-card:hover:not(.active) {
          opacity: 0.8;
          filter: brightness(0.8) blur(0);
        }

        .card-inner {
          width: 100%;
          height: 100%;
          background: var(--system-card-background, linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%));
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          box-sizing: border-box;
          border: 2px solid var(--system-card-border, rgba(255, 255, 255, 0.1));
          transition: box-shadow 0.5s ease;
        }

        .console-image {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          max-height: 180px;
          margin-bottom: 15px;
        }

        .console-image img {
          max-width: 100%;
          max-height: 160px;
          object-fit: contain;
          filter: drop-shadow(0 10px 30px rgba(0, 0, 0, 0.5));
        }

        .fallback-icon {
          font-size: 5rem;
          opacity: 0.3;
          align-items: center;
          justify-content: center;
        }

        .logo-image {
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
        }

        .logo-image img {
          max-width: 100%;
          max-height: 50px;
          object-fit: contain;
          filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.5));
        }

        .fallback-text {
          font-family: var(--font-display, 'VT323', monospace);
          font-size: 0.7rem;
          color: #fff;
          text-align: center;
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
        }

        .game-count-badge {
          position: absolute;
          bottom: 10px;
          right: 10px;
          background: var(--game-count-badge-bg, rgba(255, 0, 102, 0.8));
          color: var(--game-count-badge-color, #fff);
          font-family: var(--font-display, 'VT323', monospace);
          font-size: 0.5rem;
          padding: 6px 10px;
          border-radius: 20px;
          box-shadow: 0 2px 10px var(--badge-glow, rgba(255, 0, 102, 0.4));
        }

        .system-info {
          padding: 20px 30px;
          text-align: center;
          background: var(--system-info-background, linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%));
          position: relative;
          z-index: 5;
        }

        .system-name {
          font-family: var(--font-display, 'VT323', monospace);
          font-size: 1.2rem;
          color: var(--system-name-color, #fff);
          margin-bottom: 8px;
          text-shadow: 0 0 20px var(--selection-glow-rgba, rgba(0, 200, 255, 0.5));
        }

        .system-meta {
          font-size: 0.85rem;
          color: var(--system-meta-color, #888);
          margin: 0;
        }

        /* Controls bar - matching wheel view style */
        .controls-bar {
          position: relative;
          flex-shrink: 0;
          height: 60px;
          background: var(--controls-bar-bg, rgba(15, 15, 15, 0.95));
          border-top: 1px solid var(--controls-bar-border-color, #333);
          display: flex;
          align-items: center;
          justify-content: center;
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
          box-shadow: 0 0 20px var(--badge-glow, rgba(255, 0, 102, 0.4));
        }

        .counter {
          font-family: var(--font-display, 'VT323', monospace);
          font-size: 0.6rem;
          color: var(--counter-color, #ff0066);
          min-width: 100px;
          text-align: center;
        }

        .state-message {
          text-align: center;
          padding: 40px;
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
          border-top-color: var(--color-primary, #00c8ff);
          border-radius: 50%;
          margin: 0 auto 20px;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Ambient glow effect behind carousel */
        .carousel::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 400px;
          height: 300px;
          background: radial-gradient(ellipse, rgba(0, 200, 255, 0.15) 0%, transparent 70%);
          pointer-events: none;
          z-index: -1;
        }

        /* Reflection effect */
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

        /* Responsive */
        @media (max-width: 768px) {
          .system-card {
            width: 200px;
            height: 240px;
          }

          .carousel {
            height: 280px;
          }

          .console-image img {
            max-height: 100px;
          }

          .system-name {
            font-size: 0.9rem;
          }
        }
      </style>

      <div class="system-carousel">
        <div class="carousel-container">
          <div class="state-message">
            <div class="spinner"></div>
            <p>Loading systems...</p>
          </div>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-system-carousel', RwlSystemCarousel);
