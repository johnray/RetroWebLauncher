/**
 * RetroWebLauncher - Header Component
 * Displays arcade name, search, and navigation
 */

import { state } from '../state.js';
import { router } from '../router.js';

class RwlHeader extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._isFullscreen = false;
  }

  connectedCallback() {
    this._render();
    this._bindEvents();

    // Listen for config changes
    state.subscribe('config', () => this._updateArcadeName());

    // Listen for fullscreen changes
    document.addEventListener('fullscreenchange', () => this._updateFullscreenButton());
    document.addEventListener('webkitfullscreenchange', () => this._updateFullscreenButton());
  }

  _updateArcadeName() {
    const config = state.get('config');
    const nameEl = this.shadowRoot.querySelector('.arcade-name');
    if (nameEl && config?.arcadeName) {
      nameEl.textContent = config.arcadeName;
    }
  }

  _bindEvents() {
    // Home button
    this.shadowRoot.querySelector('.home-btn')?.addEventListener('click', () => {
      router.navigate('/');
    });

    // Search button
    this.shadowRoot.querySelector('.search-btn')?.addEventListener('click', () => {
      router.navigate('/search');
    });

    // Settings button
    this.shadowRoot.querySelector('.settings-btn')?.addEventListener('click', () => {
      router.navigate('/settings');
    });

    // Fullscreen button
    this.shadowRoot.querySelector('.fullscreen-btn')?.addEventListener('click', () => {
      this._toggleFullscreen();
    });
  }

  _toggleFullscreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      // Enter fullscreen
      const elem = document.documentElement;
      if (elem.requestFullscreen) {
        elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        // Safari
        elem.webkitRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        // Safari
        document.webkitExitFullscreen();
      }
    }
  }

  _updateFullscreenButton() {
    this._isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement);
    const btn = this.shadowRoot.querySelector('.fullscreen-btn');
    if (btn) {
      btn.innerHTML = this._isFullscreen ? `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
        </svg>
        <span>Exit Fullscreen</span>
      ` : `
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
        </svg>
        <span>Fullscreen</span>
      `;
      btn.title = this._isFullscreen ? 'Exit Fullscreen (F11)' : 'Fullscreen (F11)';
    }
  }

  _render() {
    const config = state.get('config') || {};

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          height: var(--header-height, 64px);
          background: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 100%);
          border-bottom: 2px solid var(--color-primary, #ff0066);
          position: relative;
          z-index: var(--z-header, 200);
        }

        .header-container {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 100%;
          padding: 0 var(--spacing-lg, 1.5rem);
          max-width: 100%;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: var(--spacing-md, 1rem);
        }

        .home-btn {
          background: none;
          border: none;
          color: var(--color-text, #fff);
          cursor: pointer;
          padding: var(--spacing-sm, 0.5rem);
          border-radius: var(--radius-md, 8px);
          transition: background var(--transition-fast, 150ms);
        }

        .home-btn:hover {
          background: rgba(255,255,255,0.1);
        }

        .home-btn svg {
          width: 24px;
          height: 24px;
        }

        .arcade-name {
          font-family: var(--font-display, 'Press Start 2P', monospace);
          font-size: var(--font-size-lg, 1.25rem);
          color: var(--color-primary, #ff0066);
          text-shadow:
            0 0 10px rgba(255, 0, 102, 0.5),
            0 0 20px rgba(255, 0, 102, 0.3);
          margin: 0;
          letter-spacing: 0.05em;
        }

        .header-center {
          flex: 1;
          display: flex;
          justify-content: center;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm, 0.5rem);
        }

        .header-btn {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs, 0.25rem);
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: var(--radius-md, 8px);
          padding: var(--spacing-sm, 0.5rem) var(--spacing-md, 1rem);
          color: var(--color-text, #fff);
          font-family: var(--font-body);
          font-size: var(--font-size-sm, 0.75rem);
          cursor: pointer;
          transition: all var(--transition-fast, 150ms);
        }

        .header-btn:hover {
          background: rgba(255,255,255,0.2);
          border-color: var(--color-primary, #ff0066);
        }

        .header-btn:focus-visible {
          outline: var(--focus-ring-width, 4px) solid var(--focus-ring-color, #ff0066);
          outline-offset: 2px;
        }

        .header-btn svg {
          width: 16px;
          height: 16px;
        }

        .connection-status {
          display: flex;
          align-items: center;
          gap: var(--spacing-xs, 0.25rem);
          font-size: var(--font-size-xs, 0.625rem);
          color: var(--color-success, #00ff66);
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--color-success, #00ff66);
          box-shadow: 0 0 8px var(--color-success, #00ff66);
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        /* Mobile responsive */
        @media (max-width: 768px) {
          .arcade-name {
            font-size: var(--font-size-base, 1rem);
          }

          .header-btn span {
            display: none;
          }

          .header-btn {
            padding: var(--spacing-sm, 0.5rem);
          }
        }
      </style>

      <div class="header-container">
        <div class="header-left">
          <button class="home-btn" title="Home">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
            </svg>
          </button>
          <h1 class="arcade-name">${config.arcadeName || 'RetroWebLauncher'}</h1>
        </div>

        <div class="header-center">
          <!-- Breadcrumb or current location could go here -->
        </div>

        <div class="header-right">
          <div class="connection-status">
            <span class="status-dot"></span>
            <span>Connected</span>
          </div>

          <button class="header-btn search-btn" title="Search (Y)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27a6.5 6.5 0 0 0 1.48-5.34c-.47-2.78-2.79-5-5.59-5.34a6.505 6.505 0 0 0-7.27 7.27c.34 2.8 2.56 5.12 5.34 5.59a6.5 6.5 0 0 0 5.34-1.48l.27.28v.79l4.25 4.25c.41.41 1.08.41 1.49 0 .41-.41.41-1.08 0-1.49L15.5 14zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
            <span>Search</span>
          </button>

          <button class="header-btn fullscreen-btn" title="Fullscreen (F11)">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
            </svg>
            <span>Fullscreen</span>
          </button>

          <button class="header-btn settings-btn" title="Settings">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
            </svg>
            <span>Settings</span>
          </button>
        </div>
      </div>
    `;
  }
}

customElements.define('rwl-header', RwlHeader);
