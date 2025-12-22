/**
 * RetroWebLauncher - Video Player Component
 * Safari-optimized video player with autoplay on focus
 */

class RwlVideoPlayer extends HTMLElement {
  static get observedAttributes() {
    return ['src', 'autoplay', 'loop', 'muted'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._video = null;
    this._loaded = false;
    this._hasInteracted = false;
    this._errorShown = false;
  }

  connectedCallback() {
    this._render();
    this._bindEvents();

    // Auto-play when visible
    this._setupIntersectionObserver();
  }

  disconnectedCallback() {
    if (this._observer) {
      this._observer.disconnect();
    }
    this._pauseVideo();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      if (name === 'src') {
        // Hide error state when src changes
        this._hideError();

        if (newValue) {
          // Hide color bars when we have a video source
          this._hidePlaceholder();
          if (this._video) {
            this._video.src = newValue;
            this._loaded = false;
          }
        } else {
          // Show color bars when no video source
          this._showPlaceholder();
        }
      }
    }
  }

  get src() {
    return this.getAttribute('src');
  }

  set src(value) {
    this.setAttribute('src', value);
  }

  play() {
    this._playVideo();
  }

  pause() {
    this._pauseVideo();
  }

  _setupIntersectionObserver() {
    this._observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this._playVideo();
          } else {
            this._pauseVideo();
          }
        });
      },
      { threshold: 0.5 }
    );

    this._observer.observe(this);
  }

  _bindEvents() {
    const video = this.shadowRoot.querySelector('video');
    const playBtn = this.shadowRoot.querySelector('.play-overlay');
    const muteBtn = this.shadowRoot.querySelector('.mute-btn');
    const fullscreenBtn = this.shadowRoot.querySelector('.fullscreen-btn');

    this._video = video;

    if (!video) return;

    // Video events
    video.addEventListener('loadstart', () => {
      this._showLoading();
    });

    video.addEventListener('canplay', () => {
      this._loaded = true;
      this._hideLoading();
    });

    video.addEventListener('error', () => {
      // Don't show error for empty/missing src - allows dynamic src setting
      if (this.src && this.src.trim()) {
        this._showError();
      }
    });

    video.addEventListener('play', () => {
      this._updatePlayState(true);
    });

    video.addEventListener('pause', () => {
      this._updatePlayState(false);
    });

    // Play overlay click
    playBtn?.addEventListener('click', () => {
      this._hasInteracted = true;
      if (video.paused) {
        this._playVideo();
      } else {
        this._pauseVideo();
      }
    });

    // Mute toggle
    muteBtn?.addEventListener('click', () => {
      video.muted = !video.muted;
      this._updateMuteState();
    });

    // Fullscreen
    fullscreenBtn?.addEventListener('click', () => {
      this._toggleFullscreen();
    });

    // Double-click for fullscreen
    video.addEventListener('dblclick', () => {
      this._toggleFullscreen();
    });

    // Keyboard controls
    this.addEventListener('keydown', (e) => {
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          if (video.paused) {
            this._playVideo();
          } else {
            this._pauseVideo();
          }
          break;
        case 'm':
          e.preventDefault();
          video.muted = !video.muted;
          this._updateMuteState();
          break;
        case 'f':
          e.preventDefault();
          this._toggleFullscreen();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          video.currentTime = Math.max(0, video.currentTime - 5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          video.currentTime = Math.min(video.duration, video.currentTime + 5);
          break;
      }
    });
  }

  async _playVideo() {
    if (!this._video || !this.src) return;

    try {
      // Safari requires muted for autoplay
      // Only unmute if user has interacted
      if (!this._hasInteracted) {
        this._video.muted = true;
      }

      await this._video.play();
    } catch (error) {
      // Autoplay was prevented - show play button
      console.warn('Autoplay prevented:', error);
      this._updatePlayState(false);
    }
  }

  _pauseVideo() {
    if (this._video) {
      this._video.pause();
    }
  }

  _updatePlayState(playing) {
    const playOverlay = this.shadowRoot.querySelector('.play-overlay');
    if (playOverlay) {
      playOverlay.classList.toggle('hidden', playing);
    }
  }

  _updateMuteState() {
    const muteBtn = this.shadowRoot.querySelector('.mute-btn');
    if (muteBtn && this._video) {
      muteBtn.innerHTML = this._video.muted
        ? '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>';
    }
  }

  async _toggleFullscreen() {
    const container = this.shadowRoot.querySelector('.video-container');
    if (!container) return;

    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        }
      } else {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          // Safari
          await container.webkitRequestFullscreen();
        }
      }
    } catch (error) {
      console.warn('Fullscreen not supported:', error);
    }
  }

  _showLoading() {
    const loading = this.shadowRoot.querySelector('.loading-indicator');
    if (loading) {
      loading.classList.remove('hidden');
    }
  }

  _hideLoading() {
    const loading = this.shadowRoot.querySelector('.loading-indicator');
    if (loading) {
      loading.classList.add('hidden');
    }
  }

  _showError() {
    const errorState = this.shadowRoot.querySelector('.error-state');
    const video = this.shadowRoot.querySelector('video');
    const playOverlay = this.shadowRoot.querySelector('.play-overlay');
    const controls = this.shadowRoot.querySelector('.controls');

    if (errorState) {
      errorState.classList.remove('hidden');
      this._errorShown = true;
    }
    if (video) video.style.display = 'none';
    if (playOverlay) playOverlay.style.display = 'none';
    if (controls) controls.style.display = 'none';
  }

  _hideError() {
    const errorState = this.shadowRoot.querySelector('.error-state');
    const video = this.shadowRoot.querySelector('video');
    const playOverlay = this.shadowRoot.querySelector('.play-overlay');
    const controls = this.shadowRoot.querySelector('.controls');

    if (errorState) {
      errorState.classList.add('hidden');
      this._errorShown = false;
    }
    if (video) video.style.display = '';
    if (playOverlay) playOverlay.style.display = '';
    if (controls) controls.style.display = '';
  }

  _showPlaceholder() {
    const placeholder = this.shadowRoot.querySelector('.tv-placeholder');
    if (placeholder) {
      placeholder.classList.remove('hidden');
    }
  }

  _hidePlaceholder() {
    const placeholder = this.shadowRoot.querySelector('.tv-placeholder');
    if (placeholder) {
      placeholder.classList.add('hidden');
    }
  }

  _render() {
    const src = this.getAttribute('src') || '';
    const loop = this.hasAttribute('loop') || true;
    const muted = this.hasAttribute('muted') || true;
    // Only include src attribute if there's actually a value
    const srcAttr = src ? `src="${src}"` : '';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }

        .video-container {
          position: relative;
          width: 100%;
          height: 100%;
          background: #000;
          overflow: hidden;
        }

        video {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        /* TV Static/Color Bars Placeholder */
        .tv-placeholder {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          background: #1a1a1a;
          z-index: 1;
        }

        .tv-placeholder.hidden {
          display: none;
        }

        /* SMPTE Color Bars */
        .color-bars {
          display: flex;
          height: 70%;
        }

        .color-bar {
          flex: 1;
        }

        .color-bars .bar-white { background: #c0c0c0; }
        .color-bars .bar-yellow { background: #c0c000; }
        .color-bars .bar-cyan { background: #00c0c0; }
        .color-bars .bar-green { background: #00c000; }
        .color-bars .bar-magenta { background: #c000c0; }
        .color-bars .bar-red { background: #c00000; }
        .color-bars .bar-blue { background: #0000c0; }

        /* Bottom section with static */
        .static-section {
          height: 30%;
          position: relative;
          overflow: hidden;
        }

        .static-noise {
          position: absolute;
          top: -50%;
          left: -50%;
          right: -50%;
          bottom: -50%;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 200px 200px;
          opacity: 0.4;
          animation: static-move 0.1s steps(10) infinite;
        }

        @keyframes static-move {
          0% { transform: translate(0, 0); }
          10% { transform: translate(-5%, -5%); }
          20% { transform: translate(5%, 5%); }
          30% { transform: translate(-3%, 3%); }
          40% { transform: translate(3%, -3%); }
          50% { transform: translate(-5%, 5%); }
          60% { transform: translate(5%, -5%); }
          70% { transform: translate(-3%, -3%); }
          80% { transform: translate(3%, 3%); }
          90% { transform: translate(-5%, -5%); }
          100% { transform: translate(0, 0); }
        }

        /* Scanline overlay on color bars */
        .color-bars::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 0, 0, 0.15) 2px,
            rgba(0, 0, 0, 0.15) 4px
          );
          pointer-events: none;
        }

        .controls {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: var(--spacing-sm, 0.5rem);
          background: linear-gradient(transparent, rgba(0,0,0,0.8));
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-sm, 0.5rem);
          opacity: 0;
          transition: opacity var(--transition-fast, 150ms);
        }

        .video-container:hover .controls {
          opacity: 1;
        }

        .control-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: rgba(255,255,255,0.1);
          border: none;
          border-radius: var(--radius-sm, 4px);
          color: var(--color-text, #fff);
          cursor: pointer;
          transition: background var(--transition-fast, 150ms);
        }

        .control-btn:hover {
          background: rgba(255,255,255,0.2);
        }

        .control-btn svg {
          width: 20px;
          height: 20px;
        }

        .play-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0,0,0,0.4);
          cursor: pointer;
          transition: opacity var(--transition-fast, 150ms);
        }

        .play-overlay.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .play-overlay:hover .play-btn {
          transform: scale(1.1);
        }

        .play-btn {
          width: 80px;
          height: 80px;
          background: var(--color-primary, #ff0066);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform var(--transition-fast, 150ms);
          box-shadow: 0 0 30px rgba(255,0,102,0.5);
        }

        .play-btn svg {
          width: 40px;
          height: 40px;
          fill: white;
          margin-left: 6px;
        }

        .loading-indicator {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }

        .loading-indicator.hidden {
          display: none;
        }

        .spinner {
          width: 40px;
          height: 40px;
          border: 3px solid rgba(255,255,255,0.2);
          border-top-color: var(--color-primary, #ff0066);
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-state {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--spacing-md, 1rem);
          background: #000;
        }

        .error-state.hidden {
          display: none;
        }

        .error-icon {
          font-size: 3rem;
          opacity: 0.5;
        }

        .error-state p {
          color: var(--color-text-muted, #888);
        }

        /* Fullscreen */
        .video-container:fullscreen,
        .video-container:-webkit-full-screen {
          background: #000;
        }

        .video-container:fullscreen video,
        .video-container:-webkit-full-screen video {
          width: 100vw;
          height: 100vh;
        }

        /* Safari specific */
        @supports (-webkit-touch-callout: none) {
          video {
            -webkit-playsinline: true;
          }
        }
      </style>

      <div class="video-container" tabindex="0">
        <!-- TV Color Bars Placeholder (shown when no video) -->
        <div class="tv-placeholder${src ? ' hidden' : ''}">
          <div class="color-bars">
            <div class="color-bar bar-white"></div>
            <div class="color-bar bar-yellow"></div>
            <div class="color-bar bar-cyan"></div>
            <div class="color-bar bar-green"></div>
            <div class="color-bar bar-magenta"></div>
            <div class="color-bar bar-red"></div>
            <div class="color-bar bar-blue"></div>
          </div>
          <div class="static-section">
            <div class="static-noise"></div>
          </div>
        </div>

        <video
          ${srcAttr}
          ${loop ? 'loop' : ''}
          ${muted ? 'muted' : ''}
          playsinline
          webkit-playsinline
          preload="metadata"
        ></video>

        <div class="error-state hidden">
          <span class="error-icon">⚠️</span>
          <p>Video unavailable</p>
        </div>

        <div class="play-overlay">
          <div class="play-btn">
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </div>
        </div>

        <div class="loading-indicator">
          <div class="spinner"></div>
        </div>

        <div class="controls">
          <button class="control-btn mute-btn" title="Toggle Mute (M)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
          </button>
          <button class="control-btn fullscreen-btn" title="Fullscreen (F)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-video-player', RwlVideoPlayer);
