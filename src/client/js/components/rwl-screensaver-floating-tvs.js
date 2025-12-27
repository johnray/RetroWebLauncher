/**
 * RetroWebLauncher - Floating TVs Screensaver
 * Bouncing retro CRT TVs playing random game videos
 */

import { RwlScreensaverBase } from './rwl-screensaver-base.js';

const { html, css } = window.Lit;

class RwlScreensaverFloatingTvs extends RwlScreensaverBase {
  static properties = {
    ...RwlScreensaverBase.properties,
    _tvs: { type: Array, state: true }
  };

  static styles = css`
    ${RwlScreensaverBase.baseStyles}

    /* Animated starfield background */
    .bg-stars {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-image:
        radial-gradient(2px 2px at 47px 83px, var(--screensaver-star-color, #fff), transparent),
        radial-gradient(2px 2px at 213px 127px, var(--screensaver-star-color, #fff), transparent),
        radial-gradient(2px 2px at 389px 41px, var(--screensaver-star-color, #fff), transparent),
        radial-gradient(2px 2px at 571px 293px, var(--screensaver-star-color, #fff), transparent),
        radial-gradient(2px 2px at 743px 167px, var(--screensaver-star-color, #fff), transparent),
        radial-gradient(2px 2px at 127px 419px, var(--screensaver-star-color, #fff), transparent),
        radial-gradient(2px 2px at 461px 523px, var(--screensaver-star-color, #fff), transparent),
        radial-gradient(2px 2px at 659px 89px, var(--screensaver-star-color, #fff), transparent),
        radial-gradient(1.5px 1.5px at 89px 197px, var(--screensaver-star-color, rgba(255,255,255,0.85)), transparent),
        radial-gradient(1.5px 1.5px at 317px 359px, var(--screensaver-star-color, rgba(255,255,255,0.85)), transparent),
        radial-gradient(1.5px 1.5px at 523px 71px, var(--screensaver-star-color, rgba(255,255,255,0.85)), transparent),
        radial-gradient(1.5px 1.5px at 701px 443px, var(--screensaver-star-color, rgba(255,255,255,0.85)), transparent),
        radial-gradient(1.5px 1.5px at 167px 557px, var(--screensaver-star-color, rgba(255,255,255,0.85)), transparent),
        radial-gradient(1.5px 1.5px at 599px 391px, var(--screensaver-star-color, rgba(255,255,255,0.85)), transparent),
        radial-gradient(1px 1px at 53px 349px, var(--screensaver-star-color, rgba(255,255,255,0.6)), transparent),
        radial-gradient(1px 1px at 181px 67px, var(--screensaver-star-color, rgba(255,255,255,0.6)), transparent),
        radial-gradient(1px 1px at 277px 239px, var(--screensaver-star-color, rgba(255,255,255,0.6)), transparent),
        radial-gradient(1px 1px at 431px 179px, var(--screensaver-star-color, rgba(255,255,255,0.6)), transparent),
        radial-gradient(1px 1px at 617px 503px, var(--screensaver-star-color, rgba(255,255,255,0.6)), transparent),
        radial-gradient(1px 1px at 773px 311px, var(--screensaver-star-color, rgba(255,255,255,0.6)), transparent),
        radial-gradient(1px 1px at 349px 487px, var(--screensaver-star-color, rgba(255,255,255,0.6)), transparent),
        radial-gradient(1px 1px at 107px 271px, var(--screensaver-star-color, rgba(255,255,255,0.6)), transparent),
        radial-gradient(1px 1px at 233px 503px, var(--screensaver-star-color, rgba(255,255,255,0.4)), transparent),
        radial-gradient(1px 1px at 479px 347px, var(--screensaver-star-color, rgba(255,255,255,0.4)), transparent),
        radial-gradient(1px 1px at 683px 229px, var(--screensaver-star-color, rgba(255,255,255,0.4)), transparent),
        radial-gradient(1px 1px at 139px 137px, var(--screensaver-star-color, rgba(255,255,255,0.4)), transparent),
        radial-gradient(1px 1px at 547px 461px, var(--screensaver-star-color, rgba(255,255,255,0.4)), transparent),
        radial-gradient(1px 1px at 397px 113px, var(--screensaver-star-color, rgba(255,255,255,0.4)), transparent);
      background-size: 800px 600px;
      animation: starsMove 120s linear infinite;
    }

    @keyframes starsMove {
      from { background-position: 0 0; }
      to { background-position: -2400px 1800px; }
    }

    /* Animated gradient nebula */
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

    /* Retro CRT TV Frame */
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

    /* Game info label on TV */
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

    /* Mobile adjustments */
    @media (max-width: 768px) {
      .floating-tv {
        transform: scale(0.7) !important;
      }
    }
  `;

  constructor() {
    super();
    this._tvs = [];
    this._animationFrame = null;
    this._boundAnimate = () => this._animate();
    this._floatingTvs = [];
    this._floatingTvsContainer = null;
    this._pendingTimeouts = new Set();
    this._lastSpawnTime = 0;
    this._spawnInterval = 3000;
    this._maxTvs = 6;
    this._glowColors = ['#ff0066', '#00ffff', '#ff6600'];
  }

  // ─────────────────────────────────────────────────────────────
  // Screensaver lifecycle hooks
  // ─────────────────────────────────────────────────────────────

  _onActivate() {
    this._floatingTvsContainer = null;
    this._cacheThemeColors();
    this._lastSpawnTime = 0;
    this._lastAnimateTime = 0;
    this._floatingTvs = [];
    this._animate();
  }

  _onDeactivate() {
    // Stop all videos and clear TVs
    this._floatingTvs.forEach(tv => {
      this._cleanupVideo(tv.element?.querySelector('video'));
    });
    this._floatingTvs = [];

    if (this._floatingTvsContainer) {
      this._floatingTvsContainer.innerHTML = '';
    }
  }

  /**
   * Safely cleanup a video element to prevent memory leaks
   */
  _cleanupVideo(video) {
    if (!video) return;
    try {
      video.pause();
      video.removeAttribute('src');
      video.load();
    } catch (e) {
      // Ignore errors during cleanup - video may already be disposed
    }
  }

  _onCleanup() {
    this._floatingTvsContainer = null;
    this._floatingTvs = [];
  }

  /**
   * Pause all videos and animation when tab is hidden
   */
  _onPause() {
    this._floatingTvs.forEach(tv => {
      const video = tv.element?.querySelector('video');
      if (video) {
        video.pause();
      }
    });
    // Stop animation loop
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  /**
   * Resume videos and animation when tab becomes visible
   */
  _onResume() {
    this._floatingTvs.forEach(tv => {
      const video = tv.element?.querySelector('video');
      if (video && video.src) {
        video.play().catch(() => {});
      }
      // Reset last update time to prevent jumps
      tv.lastUpdateTime = performance.now();
    });
    // Restart animation loop
    if (!this._animationFrame && this._active) {
      this._lastAnimateTime = performance.now();
      this._animate();
    }
  }

  _clearScreensaverTimers() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
    this._pendingTimeouts.forEach(id => clearTimeout(id));
    this._pendingTimeouts.clear();
  }

  // ─────────────────────────────────────────────────────────────
  // Animation
  // ─────────────────────────────────────────────────────────────

  _cacheThemeColors() {
    try {
      const computedStyle = getComputedStyle(document.documentElement);
      const primaryColor = computedStyle.getPropertyValue('--color-primary').trim() || '#ff0066';
      const secondaryColor = computedStyle.getPropertyValue('--color-secondary').trim() || '#00ffff';
      const accentColor = computedStyle.getPropertyValue('--color-accent').trim() || '#ff6600';
      this._glowColors = [primaryColor, secondaryColor, accentColor];
    } catch (e) {
      this._glowColors = ['#ff0066', '#00ffff', '#ff6600'];
    }
  }

  _animate() {
    if (!this._active || !this.isConnected) {
      this._animationFrame = null;
      return;
    }

    const now = performance.now();

    if (this._lastAnimateTime && (now - this._lastAnimateTime) > 1000) {
      this._floatingTvs.forEach(tv => {
        tv.lastUpdateTime = now;
      });
    }
    this._lastAnimateTime = now;

    if (!this._floatingTvsContainer) {
      this._floatingTvsContainer = this.shadowRoot?.querySelector('.floating-tvs');
      if (!this._floatingTvsContainer) {
        this._animationFrame = null;
        return;
      }
    }

    // Spawn new TVs periodically
    if (now - this._lastSpawnTime > this._spawnInterval &&
        this._games.length > 0 &&
        this._floatingTvs.length < this._maxTvs) {
      this._spawnTv();
      this._lastSpawnTime = now;
    }

    this._updateTvs(now);
    this._animationFrame = requestAnimationFrame(this._boundAnimate);
  }

  _spawnTv() {
    if (!this._active || !this.isConnected) return;
    const container = this._floatingTvsContainer;
    if (!container || this._games.length === 0) return;

    const currentlyDisplayed = new Set(this._floatingTvs.map(tv => tv.gameId));
    const game = this._getRandomGame(currentlyDisplayed);
    if (!game) return;

    const hasVideo = !!game.video;
    const size = 120 + Math.random() * 100;

    const vw = this._viewportWidth;
    const vh = this._viewportHeight;

    const margin = size + 20;
    const x = margin + Math.random() * (vw - margin * 2);
    const y = margin + Math.random() * (vh - margin * 2 - 100);

    const speed = 0.8 + Math.random() * 0.8;
    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle) * speed;
    const dy = Math.sin(angle) * speed;

    const rotation = (Math.random() - 0.5) * 20;
    const rotationSpeed = (Math.random() - 0.5) * 16;
    const glowColor = this._glowColors[Math.floor(Math.random() * this._glowColors.length)];

    const tv = document.createElement('div');
    tv.className = 'floating-tv';
    tv.style.cssText = `
      width: ${size}px;
      left: ${x}px;
      top: ${y}px;
      transform: rotate(${rotation}deg);
      z-index: ${Math.floor(50 + Math.random() * 50)};
      opacity: 0;
    `;

    const videoUrl = hasVideo ? `/api/media/game/${game.id}/video` : '';

    tv.innerHTML = `
      <div class="tv-frame">
        <div class="tv-glow" style="box-shadow: 0 0 30px ${glowColor}, 0 0 60px ${glowColor};"></div>
        <div class="tv-screen-bezel">
          <div class="tv-screen">
            ${hasVideo ? `
              <video muted loop playsinline autoplay>
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

    if (hasVideo) {
      const video = tv.querySelector('video');
      if (video) {
        // Handle video errors (network, format, etc.)
        const showStatic = () => {
          const screen = tv.querySelector('.tv-screen');
          if (screen && !screen.querySelector('.tv-static')) {
            this._cleanupVideo(video);
            video.remove();
            const staticDiv = document.createElement('div');
            staticDiv.className = 'tv-static';
            screen.appendChild(staticDiv);
          }
        };

        video.addEventListener('error', showStatic, { once: true });
        video.addEventListener('stalled', () => {
          // Give stalled videos 5 seconds before showing static
          const timeoutId = setTimeout(() => {
            this._pendingTimeouts.delete(timeoutId);
            if (video.readyState < 3) { // HAVE_FUTURE_DATA
              showStatic();
            }
          }, 5000);
          this._pendingTimeouts.add(timeoutId);
        }, { once: true });

        video.play().catch(showStatic);
      }
    }

    requestAnimationFrame(() => {
      tv.style.opacity = '1';
    });

    this._floatingTvs.push({
      element: tv,
      gameId: game.id,
      x, y,
      dx, dy,
      width: size,
      height: size * 1.2,
      rotation,
      rotationSpeed,
      lastUpdateTime: performance.now(),
      spawnTime: performance.now(),
      lifespan: 30000 + Math.random() * 20000,
      glowColor
    });
  }

  _updateTvs(now) {
    const vw = this._viewportWidth;
    const vh = this._viewportHeight;
    const toRemove = [];

    this._floatingTvs.forEach((tv, index) => {
      const age = now - tv.spawnTime;

      if (age > tv.lifespan) {
        toRemove.push(index);
        tv.element.style.opacity = '0';

        this._cleanupVideo(tv.element.querySelector('video'));

        const timeoutId = setTimeout(() => {
          this._pendingTimeouts.delete(timeoutId);
          if (tv.element.parentNode) {
            tv.element.remove();
          }
        }, 500);
        this._pendingTimeouts.add(timeoutId);
        return;
      }

      tv.x += tv.dx;
      tv.y += tv.dy;

      const leftBound = 20;
      const rightBound = vw - tv.width - 20;
      const topBound = 20;
      const bottomBound = vh - tv.height - 100;

      if (tv.x <= leftBound) {
        tv.x = leftBound;
        tv.dx = Math.abs(tv.dx) * (0.95 + Math.random() * 0.1);
        tv.rotationSpeed = (Math.random() - 0.5) * 16;
        this._flashGlow(tv);
      } else if (tv.x >= rightBound) {
        tv.x = rightBound;
        tv.dx = -Math.abs(tv.dx) * (0.95 + Math.random() * 0.1);
        tv.rotationSpeed = (Math.random() - 0.5) * 16;
        this._flashGlow(tv);
      }

      if (tv.y <= topBound) {
        tv.y = topBound;
        tv.dy = Math.abs(tv.dy) * (0.95 + Math.random() * 0.1);
        tv.rotationSpeed = (Math.random() - 0.5) * 16;
        this._flashGlow(tv);
      } else if (tv.y >= bottomBound) {
        tv.y = bottomBound;
        tv.dy = -Math.abs(tv.dy) * (0.95 + Math.random() * 0.1);
        tv.rotationSpeed = (Math.random() - 0.5) * 16;
        this._flashGlow(tv);
      }

      const deltaTime = (now - tv.lastUpdateTime) / 1000;
      tv.rotation += tv.rotationSpeed * deltaTime;
      tv.lastUpdateTime = now;

      const wobbleX = Math.sin(now / 1000 + index) * 2;
      const wobbleY = Math.cos(now / 1200 + index) * 2;

      let opacity = 1;
      const fadeOutStart = tv.lifespan - 2000;
      if (age < 500) {
        opacity = age / 500;
      } else if (age > fadeOutStart) {
        opacity = (tv.lifespan - age) / 2000;
      }

      tv.element.style.left = `${tv.x + wobbleX}px`;
      tv.element.style.top = `${tv.y + wobbleY}px`;
      tv.element.style.transform = `rotate(${tv.rotation}deg)`;
      tv.element.style.opacity = opacity;
    });

    toRemove.reverse().forEach(i => this._floatingTvs.splice(i, 1));
  }

  _flashGlow(tv) {
    const glow = tv.element?.querySelector('.tv-glow');
    if (glow) {
      const originalShadow = glow.style.boxShadow;
      glow.style.boxShadow = `0 0 50px ${tv.glowColor}, 0 0 100px ${tv.glowColor}`;
      const timeoutId = setTimeout(() => {
        this._pendingTimeouts.delete(timeoutId);
        if (glow.isConnected) {
          glow.style.boxShadow = originalShadow;
        }
      }, 150);
      this._pendingTimeouts.add(timeoutId);
    }
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
        <div class="exit-hint">Press any key or move mouse to continue</div>
      </div>
    `;
  }
}

customElements.define('rwl-screensaver-floating-tvs', RwlScreensaverFloatingTvs);
