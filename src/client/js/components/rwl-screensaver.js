/**
 * RetroWebLauncher - Screensaver/Attract Mode Component
 * Dynamic attract mode with floating game cards and animations
 */

import { state } from '../state.js';
import { api } from '../api.js';

class RwlScreensaver extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._active = false;
    this._games = [];
    this._idleTimer = null;
    this._animationFrame = null;
    this._idleTimeout = 300000; // 5 minutes default
    this._unsubscribers = [];
    this._boundHandleActivity = (e) => this._handleActivity(e);
    this._floatingCards = [];
    this._lastSpawnTime = 0;
    this._spawnInterval = 2000; // Spawn new card every 2 seconds
  }

  connectedCallback() {
    this._render();
    this._loadConfig();
    this._bindEvents();
    this._resetIdleTimer();
  }

  disconnectedCallback() {
    this._clearTimers();
    const exitEvents = ['click', 'keydown', 'touchstart', 'mousemove', 'wheel'];
    exitEvents.forEach(event => {
      document.removeEventListener(event, this._boundHandleActivity);
    });
    this._unsubscribers.forEach(unsub => unsub());
    this._unsubscribers = [];
  }

  async _loadConfig() {
    const config = state.get('config') || {};
    if (config.attractMode) {
      this._idleTimeout = (config.attractMode.idleTimeout || 300) * 1000;
    }
  }

  _bindEvents() {
    const exitEvents = ['click', 'keydown', 'touchstart', 'mousemove', 'wheel'];
    exitEvents.forEach(event => {
      document.addEventListener(event, this._boundHandleActivity, { passive: true });
    });

    this._unsubscribers.push(
      state.on('input:any', () => this._handleActivity())
    );

    this._unsubscribers.push(
      state.on('configSaved', () => this._loadConfig())
    );
  }

  _handleActivity(e) {
    // Ignore small mouse movements
    if (e?.type === 'mousemove' && this._lastMousePos) {
      const dx = Math.abs(e.clientX - this._lastMousePos.x);
      const dy = Math.abs(e.clientY - this._lastMousePos.y);
      if (dx < 10 && dy < 10) return;
    }
    if (e?.type === 'mousemove') {
      this._lastMousePos = { x: e.clientX, y: e.clientY };
    }

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
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  async _activate() {
    if (this._active) return;

    this._active = true;
    this.classList.add('active');
    this._lastMousePos = null;

    // Load games
    await this._loadGames();

    // Start animation loop
    this._lastSpawnTime = 0;
    this._floatingCards = [];
    this._animate();

    state.emit('screensaverActive', true);
  }

  _deactivate() {
    if (!this._active) return;

    this._active = false;
    this.classList.remove('active');

    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }

    // Clear floating cards
    const container = this.shadowRoot.querySelector('.floating-cards');
    if (container) container.innerHTML = '';
    this._floatingCards = [];

    state.emit('screensaverActive', false);
  }

  async _loadGames() {
    try {
      // Try to get games from all systems
      const systems = state.get('systems') || [];
      let allGames = [];

      // Get games from cached state or fetch
      for (const system of systems.slice(0, 10)) {
        try {
          const response = await api.getGames(system.id, { limit: 20 });
          if (response.games) {
            allGames = allGames.concat(response.games.map(g => ({
              ...g,
              systemName: system.name
            })));
          }
        } catch (e) {
          // Continue with other systems
        }
      }

      // Shuffle and limit
      this._games = allGames
        .filter(g => g.thumbnail || g.image)
        .sort(() => Math.random() - 0.5)
        .slice(0, 100);

      console.log(`[Screensaver] Loaded ${this._games.length} games`);
    } catch (error) {
      console.error('Failed to load games for screensaver:', error);
      this._games = [];
    }
  }

  _animate() {
    if (!this._active) return;

    const now = performance.now();

    // Spawn new cards periodically
    if (now - this._lastSpawnTime > this._spawnInterval && this._games.length > 0) {
      this._spawnCard();
      this._lastSpawnTime = now;
    }

    // Update and clean up cards
    this._updateCards();

    this._animationFrame = requestAnimationFrame(() => this._animate());
  }

  _spawnCard() {
    const container = this.shadowRoot.querySelector('.floating-cards');
    if (!container || this._games.length === 0) return;

    // Pick random game
    const game = this._games[Math.floor(Math.random() * this._games.length)];

    // Random starting position (from edges)
    const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    const size = 120 + Math.random() * 100; // Random size 120-220px

    let startX, startY, endX, endY, duration;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    switch (side) {
      case 0: // From top
        startX = Math.random() * vw;
        startY = -size;
        endX = startX + (Math.random() - 0.5) * 400;
        endY = vh + size;
        break;
      case 1: // From right
        startX = vw + size;
        startY = Math.random() * vh;
        endX = -size;
        endY = startY + (Math.random() - 0.5) * 300;
        break;
      case 2: // From bottom
        startX = Math.random() * vw;
        startY = vh + size;
        endX = startX + (Math.random() - 0.5) * 400;
        endY = -size;
        break;
      case 3: // From left
        startX = -size;
        startY = Math.random() * vh;
        endX = vw + size;
        endY = startY + (Math.random() - 0.5) * 300;
        break;
    }

    duration = 8000 + Math.random() * 7000; // 8-15 seconds to cross
    const rotation = (Math.random() - 0.5) * 20; // -10 to 10 degrees
    const rotationEnd = rotation + (Math.random() - 0.5) * 30;

    const card = document.createElement('div');
    card.className = 'floating-card';
    card.style.cssText = `
      width: ${size}px;
      height: ${size * 1.3}px;
      left: ${startX}px;
      top: ${startY}px;
      transform: rotate(${rotation}deg);
      z-index: ${Math.floor(size)};
    `;

    const imgUrl = `/api/media/game/${game.id}/thumbnail`;
    card.innerHTML = `
      <div class="card-inner">
        <img src="${imgUrl}" alt="${game.name}" loading="lazy" />
        <div class="card-title">${game.name}</div>
        <div class="card-system">${game.systemName || game.systemId || ''}</div>
      </div>
    `;

    container.appendChild(card);

    // Store animation data
    this._floatingCards.push({
      element: card,
      startX, startY,
      endX, endY,
      startRotation: rotation,
      endRotation: rotationEnd,
      startTime: performance.now(),
      duration
    });
  }

  _updateCards() {
    const now = performance.now();
    const toRemove = [];

    this._floatingCards.forEach((card, index) => {
      const elapsed = now - card.startTime;
      const progress = Math.min(elapsed / card.duration, 1);

      if (progress >= 1) {
        toRemove.push(index);
        card.element.remove();
        return;
      }

      // Eased progress for smooth movement
      const eased = this._easeInOutQuad(progress);

      const x = card.startX + (card.endX - card.startX) * eased;
      const y = card.startY + (card.endY - card.startY) * eased;
      const rot = card.startRotation + (card.endRotation - card.startRotation) * eased;

      // Fade in/out at edges
      let opacity = 1;
      if (progress < 0.1) opacity = progress / 0.1;
      if (progress > 0.9) opacity = (1 - progress) / 0.1;

      card.element.style.left = `${x}px`;
      card.element.style.top = `${y}px`;
      card.element.style.transform = `rotate(${rot}deg)`;
      card.element.style.opacity = opacity;
    });

    // Remove completed cards (reverse order to maintain indices)
    toRemove.reverse().forEach(i => this._floatingCards.splice(i, 1));
  }

  _easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
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
          background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%);
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.8s ease, visibility 0.8s ease;
          pointer-events: none;
          overflow: hidden;
        }

        :host(.active) {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .screensaver-container {
          width: 100%;
          height: 100%;
          position: relative;
        }

        /* Animated gradient background */
        .bg-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background:
            radial-gradient(ellipse at 20% 80%, rgba(255, 0, 102, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(0, 255, 255, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(255, 255, 0, 0.05) 0%, transparent 70%);
          animation: bgPulse 10s ease-in-out infinite;
        }

        @keyframes bgPulse {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.1); }
        }

        /* Floating cards container */
        .floating-cards {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
        }

        .floating-card {
          position: absolute;
          transition: opacity 0.3s ease;
        }

        .card-inner {
          width: 100%;
          height: 100%;
          background: linear-gradient(145deg, #2a2a3e, #1a1a2e);
          border-radius: 12px;
          overflow: hidden;
          box-shadow:
            0 10px 40px rgba(0, 0, 0, 0.5),
            0 0 30px rgba(255, 0, 102, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .card-inner img {
          width: 100%;
          height: 70%;
          object-fit: cover;
        }

        .card-title {
          padding: 8px 10px 2px;
          font-family: var(--font-display, 'VT323', monospace);
          font-size: 0.75rem;
          color: #fff;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          text-shadow: 0 0 10px rgba(255, 0, 102, 0.5);
        }

        .card-system {
          padding: 0 10px 8px;
          font-size: 0.6rem;
          color: rgba(255, 255, 255, 0.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        /* Center title */
        .arcade-title {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-family: var(--font-display, 'VT323', monospace);
          font-size: 3rem;
          color: var(--color-primary, #ff0066);
          text-shadow:
            0 0 20px rgba(255, 0, 102, 0.8),
            0 0 40px rgba(255, 0, 102, 0.5),
            0 0 80px rgba(255, 0, 102, 0.3);
          animation: titleGlow 3s ease-in-out infinite;
          z-index: 1000;
          text-align: center;
          pointer-events: none;
          white-space: nowrap;
        }

        @keyframes titleGlow {
          0%, 100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
            text-shadow:
              0 0 20px rgba(255, 0, 102, 0.8),
              0 0 40px rgba(255, 0, 102, 0.5),
              0 0 80px rgba(255, 0, 102, 0.3);
          }
          50% {
            opacity: 0.8;
            transform: translate(-50%, -50%) scale(1.02);
            text-shadow:
              0 0 30px rgba(255, 0, 102, 1),
              0 0 60px rgba(255, 0, 102, 0.7),
              0 0 100px rgba(255, 0, 102, 0.5);
          }
        }

        /* Subtitle */
        .arcade-subtitle {
          position: absolute;
          top: calc(50% + 40px);
          left: 50%;
          transform: translateX(-50%);
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.6);
          z-index: 1000;
          animation: subtitleFade 4s ease-in-out infinite;
        }

        @keyframes subtitleFade {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 0.9; }
        }

        /* Exit hint */
        .exit-hint {
          position: absolute;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.4);
          animation: hintPulse 2s ease infinite;
          z-index: 1000;
        }

        @keyframes hintPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.7; }
        }

        /* Scanlines overlay */
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
            transparent 3px
          );
          pointer-events: none;
          opacity: 0.15;
          z-index: 999;
        }

        /* Vignette effect */
        .vignette {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%);
          pointer-events: none;
          z-index: 998;
        }

        /* Mobile */
        @media (max-width: 768px) {
          .arcade-title {
            font-size: 1.8rem;
          }

          .arcade-subtitle {
            font-size: 0.8rem;
            top: calc(50% + 30px);
          }

          .floating-card {
            transform: scale(0.8);
          }
        }
      </style>

      <div class="screensaver-container">
        <div class="bg-gradient"></div>
        <div class="floating-cards"></div>
        <div class="arcade-title">${arcadeName}</div>
        <div class="arcade-subtitle">Press any key to play</div>
        <div class="vignette"></div>
        <div class="scanlines"></div>
        <div class="exit-hint">🎮 Move mouse or press any key to continue</div>
      </div>
    `;
  }
}

customElements.define('rwl-screensaver', RwlScreensaver);
