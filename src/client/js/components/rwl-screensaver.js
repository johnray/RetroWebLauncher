/**
 * RetroWebLauncher - Screensaver/Attract Mode Component
 * Cycles through random games when idle
 */

import { state } from '../state.js';
import { api } from '../api.js';

class RwlScreensaver extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._active = false;
    this._games = [];
    this._currentIndex = 0;
    this._cycleTimer = null;
    this._idleTimer = null;
    this._idleTimeout = 300000; // 5 minutes default
    this._cycleInterval = 10000; // 10 seconds per game
  }

  connectedCallback() {
    this._render();
    this._loadConfig();
    this._bindEvents();
    this._resetIdleTimer();
  }

  disconnectedCallback() {
    this._clearTimers();
  }

  async _loadConfig() {
    const config = state.get('config') || {};
    if (config.attractMode) {
      this._idleTimeout = (config.attractMode.idleTimeout || 300) * 1000;
    }
  }

  _bindEvents() {
    // Any input exits screensaver
    const exitEvents = ['click', 'keydown', 'touchstart', 'mousemove'];
    exitEvents.forEach(event => {
      document.addEventListener(event, () => this._handleActivity(), { passive: true });
    });

    // Gamepad activity
    state.on('input:any', () => this._handleActivity());

    // Config changes
    state.on('configSaved', () => this._loadConfig());
  }

  _handleActivity() {
    if (this._active) {
      this._deactivate();
    }
    this._resetIdleTimer();
  }

  _resetIdleTimer() {
    clearTimeout(this._idleTimer);

    const config = state.get('config') || {};
    if (!config.attractMode?.enabled) return;

    this._idleTimer = setTimeout(() => {
      this._activate();
    }, this._idleTimeout);
  }

  _clearTimers() {
    clearTimeout(this._idleTimer);
    clearInterval(this._cycleTimer);
  }

  async _activate() {
    if (this._active) return;

    this._active = true;
    this.classList.add('active');

    // Load random games
    await this._loadRandomGames();

    // Start cycling
    this._showCurrentGame();
    this._cycleTimer = setInterval(() => {
      this._nextGame();
    }, this._cycleInterval);

    state.emit('screensaverActive', true);
  }

  _deactivate() {
    if (!this._active) return;

    this._active = false;
    this.classList.remove('active');
    clearInterval(this._cycleTimer);

    // Stop any playing video
    const video = this.shadowRoot.querySelector('video');
    if (video) {
      video.pause();
    }

    state.emit('screensaverActive', false);
  }

  async _loadRandomGames() {
    try {
      // Get games with videos/images for screensaver
      const response = await api.getRandomGames(50);
      this._games = response.games || [];
      this._currentIndex = 0;

      // Shuffle
      this._games.sort(() => Math.random() - 0.5);
    } catch (error) {
      console.error('Failed to load games for screensaver:', error);
    }
  }

  _nextGame() {
    this._currentIndex = (this._currentIndex + 1) % this._games.length;
    this._showCurrentGame();
  }

  _showCurrentGame() {
    const game = this._games[this._currentIndex];
    if (!game) return;

    const mediaContainer = this.shadowRoot.querySelector('.media-display');
    const infoContainer = this.shadowRoot.querySelector('.game-info');

    if (!mediaContainer || !infoContainer) return;

    // Determine media to show (prefer video)
    const hasVideo = !!game.video;
    const imageUrl = game.image || game.thumbnail || game.screenshot;

    if (hasVideo) {
      const videoUrl = `/api/media/video/${encodeURIComponent(game.video)}`;
      mediaContainer.innerHTML = `
        <video
          src="${videoUrl}"
          autoplay
          muted
          loop
          playsinline
          webkit-playsinline
        ></video>
      `;
    } else if (imageUrl) {
      const imgUrl = `/api/media/image/${encodeURIComponent(imageUrl)}`;
      mediaContainer.innerHTML = `
        <img src="${imgUrl}" alt="${game.name}" />
      `;
    } else {
      mediaContainer.innerHTML = `
        <div class="no-media">
          <span>🎮</span>
        </div>
      `;
    }

    // Update game info
    infoContainer.innerHTML = `
      <div class="game-name">${game.name}</div>
      <div class="game-system">${game.systemName || ''}</div>
    `;
  }

  _render() {
    const config = state.get('config') || {};
    const arcadeName = config.arcadeName || 'RetroWebLauncher';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: var(--z-screensaver, 9999);
          background: #000;
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.5s ease, visibility 0.5s ease;
          pointer-events: none;
        }

        :host(.active) {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .screensaver-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .arcade-title {
          position: absolute;
          top: var(--spacing-xl, 2rem);
          left: 50%;
          transform: translateX(-50%);
          font-family: var(--font-display, 'Press Start 2P', monospace);
          font-size: var(--font-size-xl, 1.5rem);
          color: var(--color-primary, #ff0066);
          text-shadow:
            0 0 20px rgba(255, 0, 102, 0.8),
            0 0 40px rgba(255, 0, 102, 0.4);
          animation: glow 2s ease-in-out infinite;
          z-index: 10;
        }

        @keyframes glow {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .media-display {
          width: 80%;
          max-width: 1200px;
          aspect-ratio: 16/9;
          background: rgba(0,0,0,0.8);
          border-radius: var(--radius-lg, 12px);
          overflow: hidden;
          box-shadow:
            0 0 60px rgba(255, 0, 102, 0.3),
            0 20px 80px rgba(0, 0, 0, 0.8);
        }

        .media-display video,
        .media-display img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .no-media {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 8rem;
          opacity: 0.2;
        }

        .game-info {
          margin-top: var(--spacing-xl, 2rem);
          text-align: center;
          animation: fadeIn 0.5s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .game-name {
          font-family: var(--font-display, 'Press Start 2P', monospace);
          font-size: var(--font-size-lg, 1.25rem);
          color: var(--color-text, #fff);
          text-shadow: 0 0 10px rgba(255,255,255,0.5);
        }

        .game-system {
          font-size: var(--font-size-sm, 0.75rem);
          color: var(--color-text-muted, #888);
          margin-top: var(--spacing-sm, 0.5rem);
        }

        .exit-hint {
          position: absolute;
          bottom: var(--spacing-lg, 1.5rem);
          left: 50%;
          transform: translateX(-50%);
          font-size: var(--font-size-xs, 0.625rem);
          color: var(--color-text-muted, #888);
          animation: pulse 2s ease infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }

        /* Scanlines effect (optional for classic theme) */
        .scanlines {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.1) 0px,
            rgba(0, 0, 0, 0.1) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          opacity: 0.3;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .arcade-title {
            font-size: var(--font-size-base, 1rem);
          }

          .media-display {
            width: 95%;
          }

          .game-name {
            font-size: var(--font-size-base, 1rem);
          }
        }
      </style>

      <div class="screensaver-container">
        <div class="arcade-title">${arcadeName}</div>

        <div class="media-display">
          <div class="no-media">
            <span>🎮</span>
          </div>
        </div>

        <div class="game-info">
          <div class="game-name">Loading...</div>
          <div class="game-system"></div>
        </div>

        <div class="exit-hint">Press any key or tap to exit</div>

        <div class="scanlines"></div>
      </div>
    `;
  }
}

customElements.define('rwl-screensaver', RwlScreensaver);
