/**
 * RetroWebLauncher - Screensaver/Attract Mode Component
 * Floating retro CRT TVs playing random game videos
 */

import { state } from '../state.js';
import { api } from '../api.js';

const { LitElement, html, css } = window.Lit;

class RwlScreensaver extends LitElement {
  static properties = {
    _active: { type: Boolean, state: true },
    _games: { type: Array, state: true },
    _tvs: { type: Array, state: true },
    arcadeName: { type: String, state: true }
  };

  static styles = css`
    :host {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: var(--z-screensaver, 9999);
      background: var(--screensaver-background, var(--color-background, #0a0a0a));
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

    /* Animated starfield background */
    .bg-stars {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        radial-gradient(2px 2px at 20px 30px, var(--screensaver-star-color, #fff), transparent),
        radial-gradient(2px 2px at 40px 70px, var(--screensaver-star-color, rgba(255,255,255,0.8)), transparent),
        radial-gradient(1px 1px at 90px 40px, var(--screensaver-star-color, #fff), transparent),
        radial-gradient(2px 2px at 130px 80px, var(--screensaver-star-color, rgba(255,255,255,0.6)), transparent),
        radial-gradient(1px 1px at 160px 120px, var(--screensaver-star-color, #fff), transparent);
      background-size: 200px 200px;
      animation: starsMove 60s linear infinite;
    }

    @keyframes starsMove {
      from { background-position: 0 0; }
      to { background-position: -1000px 500px; }
    }

    /* Animated gradient nebula - uses theme colors */
    .bg-nebula {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        radial-gradient(ellipse at 20% 80%, var(--screensaver-nebula-primary, var(--color-primary, rgba(255, 0, 102, 0.15))) 0%, transparent 50%),
        radial-gradient(ellipse at 80% 20%, var(--screensaver-nebula-secondary, var(--color-secondary, rgba(0, 200, 255, 0.12))) 0%, transparent 50%),
        radial-gradient(ellipse at 60% 60%, var(--screensaver-nebula-accent, var(--color-accent, rgba(138, 43, 226, 0.1))) 0%, transparent 60%);
      animation: nebulaPulse 15s ease-in-out infinite;
      opacity: var(--screensaver-nebula-opacity, 0.6);
    }

    @keyframes nebulaPulse {
      0%, 100% { opacity: var(--screensaver-nebula-opacity, 0.6); transform: scale(1) rotate(0deg); }
      50% { opacity: 1; transform: scale(1.05) rotate(2deg); }
    }

    /* Floating TVs container */
    .floating-tvs {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      overflow: hidden;
    }

    /* Individual floating TV */
    .floating-tv {
      position: absolute;
      transition: opacity 0.5s ease;
    }

    /* Retro CRT TV Frame - uses theme colors */
    .tv-frame {
      background: var(--screensaver-tv-frame, linear-gradient(145deg, #3a3a3a, #1a1a1a));
      border-radius: 12px;
      padding: 12px;
      box-shadow:
        0 15px 50px rgba(0, 0, 0, 0.6),
        0 0 40px var(--screensaver-tv-glow, var(--color-primary, rgba(255, 0, 102, 0.15))),
        inset 0 2px 0 rgba(255, 255, 255, 0.15),
        inset 0 -2px 0 rgba(0, 0, 0, 0.3);
      border: 2px solid var(--screensaver-tv-border, #222);
    }

    .tv-screen-bezel {
      background: var(--screensaver-bezel-bg, #111);
      border-radius: 8px;
      padding: 4px;
      box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.8);
    }

    .tv-screen {
      position: relative;
      background: var(--screensaver-screen-bg, #000);
      border-radius: 6px;
      overflow: hidden;
      aspect-ratio: 4/3;
    }

    .tv-screen video {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    /* CRT screen effects */
    .tv-screen::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.15) 0px,
        rgba(0, 0, 0, 0.15) 1px,
        transparent 1px,
        transparent 2px
      );
      pointer-events: none;
      z-index: 2;
    }

    .tv-screen::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.4) 100%);
      pointer-events: none;
      z-index: 3;
    }

    /* Screen glow effect */
    .tv-glow {
      position: absolute;
      top: -10px;
      left: -10px;
      right: -10px;
      bottom: -10px;
      border-radius: 16px;
      opacity: 0.6;
      z-index: -1;
      animation: screenGlow 3s ease-in-out infinite;
    }

    @keyframes screenGlow {
      0%, 100% { opacity: 0.4; }
      50% { opacity: 0.7; }
    }

    /* TV bottom with controls */
    .tv-bottom {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 4px 4px;
    }

    .tv-brand {
      font-family: 'Arial Black', sans-serif;
      font-size: 0.5rem;
      color: var(--screensaver-brand-color, #666);
      text-transform: uppercase;
      letter-spacing: 2px;
    }

    .tv-controls {
      display: flex;
      gap: 4px;
    }

    .tv-knob {
      width: 10px;
      height: 10px;
      background: linear-gradient(145deg, #555, #333);
      border-radius: 50%;
      border: 1px solid #222;
    }

    .tv-led {
      width: 6px;
      height: 6px;
      background: var(--screensaver-led-color, #0f0);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--screensaver-led-color, #0f0), 0 0 12px var(--screensaver-led-color, #0f0);
      animation: ledBlink 2s ease-in-out infinite;
    }

    @keyframes ledBlink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.6; }
    }

    /* Game info label on TV - uses theme colors */
    .tv-label {
      position: absolute;
      bottom: -24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--screensaver-label-bg, rgba(0, 0, 0, 0.8));
      padding: 4px 10px;
      border-radius: 4px;
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 0.7rem;
      color: var(--screensaver-label-color, #fff);
      white-space: nowrap;
      max-width: 150%;
      overflow: hidden;
      text-overflow: ellipsis;
      text-shadow: 0 0 10px var(--screensaver-label-glow, var(--color-primary, #ff0066));
      opacity: 0;
      transition: opacity 0.3s;
    }

    .floating-tv:hover .tv-label {
      opacity: 1;
    }

    /* Static/noise for videos that fail to load */
    .tv-static {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background:
        repeating-radial-gradient(#000 0 0.0001%, #fff 0 0.0002%) 50% 0/2500px 2500px,
        repeating-conic-gradient(#000 0 0.0001%, #fff 0 0.0002%) 60% 60%/2500px 2500px;
      background-blend-mode: difference;
      animation: staticNoise 0.2s infinite;
      opacity: 0.8;
    }

    @keyframes staticNoise {
      0%, 100% { background-position: 50% 0, 60% 60%; }
      10% { background-position: 51% 1%, 61% 61%; }
      20% { background-position: 49% 2%, 59% 59%; }
      30% { background-position: 52% 1%, 62% 60%; }
      40% { background-position: 48% 0%, 58% 62%; }
      50% { background-position: 50% 2%, 60% 58%; }
      60% { background-position: 51% 0%, 61% 61%; }
      70% { background-position: 49% 1%, 59% 60%; }
      80% { background-position: 50% 2%, 60% 59%; }
      90% { background-position: 52% 1%, 62% 61%; }
    }

    /* Center arcade title - uses theme colors */
    .arcade-title {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 4rem;
      color: var(--screensaver-title-color, #fff);
      text-shadow:
        0 0 10px var(--screensaver-title-glow, var(--color-primary, #ff0066)),
        0 0 20px var(--screensaver-title-glow, var(--color-primary, #ff0066)),
        0 0 40px var(--screensaver-title-glow, var(--color-primary, #ff0066)),
        0 0 80px var(--screensaver-title-glow, var(--color-primary, #ff0066));
      animation: titleFloat 6s ease-in-out infinite;
      z-index: 1000;
      text-align: center;
      pointer-events: none;
      letter-spacing: 4px;
    }

    @keyframes titleFloat {
      0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        filter: brightness(1);
      }
      50% {
        transform: translate(-50%, -52%) scale(1.02);
        filter: brightness(1.2);
      }
    }

    .arcade-subtitle {
      position: absolute;
      top: calc(50% + 50px);
      left: 50%;
      transform: translateX(-50%);
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 1.2rem;
      color: var(--screensaver-subtitle-color, rgba(255, 255, 255, 0.7));
      z-index: 1000;
      animation: subtitlePulse 3s ease-in-out infinite;
      letter-spacing: 2px;
    }

    @keyframes subtitlePulse {
      0%, 100% { opacity: 0.5; }
      50% { opacity: 1; }
    }

    /* Exit hint */
    .exit-hint {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 0.8rem;
      color: var(--screensaver-hint-color, rgba(255, 255, 255, 0.4));
      animation: hintBlink 2s ease infinite;
      z-index: 1000;
    }

    @keyframes hintBlink {
      0%, 100% { opacity: 0.3; }
      50% { opacity: 0.8; }
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
        rgba(0, 0, 0, 0.08) 0px,
        rgba(0, 0, 0, 0.08) 1px,
        transparent 1px,
        transparent 3px
      );
      pointer-events: none;
      z-index: 999;
    }

    /* Vignette */
    .vignette {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.7) 100%);
      pointer-events: none;
      z-index: 998;
    }

    /* Mobile adjustments */
    @media (max-width: 768px) {
      .arcade-title {
        font-size: 2rem;
      }

      .arcade-subtitle {
        font-size: 0.9rem;
        top: calc(50% + 35px);
      }

      .floating-tv {
        transform: scale(0.7) !important;
      }
    }
  `;

  constructor() {
    super();
    this._active = false;
    this._games = [];
    this._tvs = [];
    this._idleTimer = null;
    this._animationFrame = null;
    this._videoRotationTimer = null;
    this._idleTimeout = 300000; // 5 minutes default
    this._unsubscribers = [];
    this._boundHandleActivity = (e) => this._handleActivity(e);
    this._floatingTvs = [];
    this._lastSpawnTime = 0;
    this._spawnInterval = 4000; // Spawn new TV every 4 seconds
    this._maxTvs = 8; // Max TVs on screen
    this.arcadeName = 'RetroWebLauncher';
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadConfig();
    this._bindEvents();
    this._resetIdleTimer();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
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
    this.arcadeName = config.arcadeName || 'RetroWebLauncher';
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
    clearTimeout(this._videoRotationTimer);
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
    }
  }

  async _activate() {
    if (this._active) return;

    this._active = true;
    this.classList.add('active');
    this._lastMousePos = null;

    // Load games with videos
    await this._loadGames();

    // Start animation loop
    this._lastSpawnTime = 0;
    this._floatingTvs = [];
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

    // Stop all videos and clear TVs
    const container = this.shadowRoot.querySelector('.floating-tvs');
    if (container) {
      container.querySelectorAll('video').forEach(v => {
        v.pause();
        v.src = '';
      });
      container.innerHTML = '';
    }
    this._floatingTvs = [];

    state.emit('screensaverActive', false);
  }

  async _loadGames() {
    try {
      const systems = state.get('systems') || [];
      let allGames = [];

      // Get games from multiple systems
      for (const system of systems.slice(0, 10)) {
        try {
          const response = await api.getGames(system.id, { limit: 30 });
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

      // Filter to games with videos, shuffle, and limit
      this._games = allGames
        .filter(g => g.video) // Only games with videos
        .sort(() => Math.random() - 0.5)
        .slice(0, 50);

      // If not enough video games, also include games with images
      if (this._games.length < 20) {
        const imageGames = allGames
          .filter(g => !g.video && (g.thumbnail || g.image))
          .sort(() => Math.random() - 0.5)
          .slice(0, 30);
        this._games = [...this._games, ...imageGames];
      }

      console.log(`[Screensaver] Loaded ${this._games.length} games (${this._games.filter(g => g.video).length} with videos)`);
    } catch (error) {
      console.error('Failed to load games for screensaver:', error);
      this._games = [];
    }
  }

  _animate() {
    if (!this._active) return;

    const now = performance.now();

    // Spawn new TVs periodically (up to max)
    if (now - this._lastSpawnTime > this._spawnInterval &&
        this._games.length > 0 &&
        this._floatingTvs.length < this._maxTvs) {
      this._spawnTv();
      this._lastSpawnTime = now;
    }

    // Update TV positions
    this._updateTvs();

    this._animationFrame = requestAnimationFrame(() => this._animate());
  }

  _spawnTv() {
    const container = this.shadowRoot.querySelector('.floating-tvs');
    if (!container || this._games.length === 0) return;

    // Pick random game
    const game = this._games[Math.floor(Math.random() * this._games.length)];
    const hasVideo = !!game.video;

    // Random TV size (smaller for more TVs)
    const size = 140 + Math.random() * 80; // 140-220px width

    // Random starting position from edges
    const side = Math.floor(Math.random() * 4);
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let startX, startY, endX, endY;
    const margin = size * 1.5;

    switch (side) {
      case 0: // From top
        startX = margin + Math.random() * (vw - margin * 2);
        startY = -size * 1.5;
        endX = startX + (Math.random() - 0.5) * 300;
        endY = vh + size;
        break;
      case 1: // From right
        startX = vw + size;
        startY = margin + Math.random() * (vh - margin * 2);
        endX = -size * 1.5;
        endY = startY + (Math.random() - 0.5) * 200;
        break;
      case 2: // From bottom
        startX = margin + Math.random() * (vw - margin * 2);
        startY = vh + size;
        endX = startX + (Math.random() - 0.5) * 300;
        endY = -size * 1.5;
        break;
      case 3: // From left
        startX = -size * 1.5;
        startY = margin + Math.random() * (vh - margin * 2);
        endX = vw + size;
        endY = startY + (Math.random() - 0.5) * 200;
        break;
    }

    const duration = 15000 + Math.random() * 10000; // 15-25 seconds
    const rotation = (Math.random() - 0.5) * 15; // -7.5 to 7.5 degrees
    const rotationEnd = rotation + (Math.random() - 0.5) * 10;

    // Get theme colors from CSS variables, fallback to defaults
    const computedStyle = getComputedStyle(document.documentElement);
    const primaryColor = computedStyle.getPropertyValue('--color-primary').trim() || '#ff0066';
    const secondaryColor = computedStyle.getPropertyValue('--color-secondary').trim() || '#00ffff';
    const accentColor = computedStyle.getPropertyValue('--color-accent').trim() || '#ff6600';

    // Use theme colors for glow, with some complementary variations
    const glowColors = [primaryColor, secondaryColor, accentColor];
    const glowColor = glowColors[Math.floor(Math.random() * glowColors.length)];

    const tv = document.createElement('div');
    tv.className = 'floating-tv';
    tv.style.cssText = `
      width: ${size}px;
      left: ${startX}px;
      top: ${startY}px;
      transform: rotate(${rotation}deg);
      z-index: ${Math.floor(50 + Math.random() * 50)};
    `;

    const videoUrl = hasVideo ? `/api/media/game/${game.id}/video` : '';
    const videoId = `tv-video-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

    tv.innerHTML = `
      <div class="tv-frame">
        <div class="tv-glow" style="box-shadow: 0 0 30px ${glowColor}, 0 0 60px ${glowColor};"></div>
        <div class="tv-screen-bezel">
          <div class="tv-screen">
            ${hasVideo ? `
              <video id="${videoId}" muted loop playsinline autoplay>
                <source src="${videoUrl}" type="video/mp4">
              </video>
            ` : `
              <div class="tv-static"></div>
            `}
          </div>
        </div>
        <div class="tv-bottom">
          <span class="tv-brand">RetroTV</span>
          <div class="tv-controls">
            <div class="tv-knob"></div>
            <div class="tv-knob"></div>
            <div class="tv-led"></div>
          </div>
        </div>
      </div>
      <div class="tv-label">${game.name}</div>
    `;

    container.appendChild(tv);

    // Try to play video
    if (hasVideo) {
      const video = tv.querySelector('video');
      if (video) {
        video.play().catch(() => {
          // If video fails, show static
          const screen = tv.querySelector('.tv-screen');
          if (screen) {
            video.remove();
            const staticDiv = document.createElement('div');
            staticDiv.className = 'tv-static';
            screen.appendChild(staticDiv);
          }
        });
      }
    }

    // Store animation data
    this._floatingTvs.push({
      element: tv,
      startX, startY,
      endX, endY,
      startRotation: rotation,
      endRotation: rotationEnd,
      startTime: performance.now(),
      duration
    });
  }

  _updateTvs() {
    const now = performance.now();
    const toRemove = [];

    this._floatingTvs.forEach((tv, index) => {
      const elapsed = now - tv.startTime;
      const progress = Math.min(elapsed / tv.duration, 1);

      if (progress >= 1) {
        toRemove.push(index);
        // Stop video before removing
        const video = tv.element.querySelector('video');
        if (video) {
          video.pause();
          video.src = '';
        }
        tv.element.remove();
        return;
      }

      // Eased progress
      const eased = this._easeInOutCubic(progress);

      const x = tv.startX + (tv.endX - tv.startX) * eased;
      const y = tv.startY + (tv.endY - tv.startY) * eased;
      const rot = tv.startRotation + (tv.endRotation - tv.startRotation) * eased;

      // Gentle floating motion
      const floatY = Math.sin(elapsed / 1000) * 5;
      const floatX = Math.cos(elapsed / 1500) * 3;

      // Fade in/out
      let opacity = 1;
      if (progress < 0.1) opacity = progress / 0.1;
      if (progress > 0.85) opacity = (1 - progress) / 0.15;

      tv.element.style.left = `${x + floatX}px`;
      tv.element.style.top = `${y + floatY}px`;
      tv.element.style.transform = `rotate(${rot}deg)`;
      tv.element.style.opacity = opacity;
    });

    // Remove completed TVs
    toRemove.reverse().forEach(i => this._floatingTvs.splice(i, 1));
  }

  _easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  render() {
    return html`
      <div class="screensaver-container">
        <div class="bg-stars"></div>
        <div class="bg-nebula"></div>
        <div class="floating-tvs"></div>
        <div class="arcade-title">${this.arcadeName}</div>
        <div class="arcade-subtitle">INSERT COIN TO PLAY</div>
        <div class="vignette"></div>
        <div class="scanlines"></div>
        <div class="exit-hint">🎮 Press any key or move mouse to continue</div>
      </div>
    `;
  }
}

customElements.define('rwl-screensaver', RwlScreensaver);
