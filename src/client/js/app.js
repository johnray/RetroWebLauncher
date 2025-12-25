/**
 * RetroWebLauncher - Main Application Bootstrap
 */

import { api } from './api.js';
import { state } from './state.js';
import { router } from './router.js';
import { inputManager } from './input/manager.js';
import { themeService } from './theme-service.js';

class App {
  constructor() {
    this.socket = null;
    this.config = null;
    this.initialized = false;
  }

  async init() {
    try {
      // Detect PWA standalone mode (iOS and other platforms)
      this.detectStandaloneMode();

      this.updateLoadingStatus('Connecting to server...');

      // Initialize WebSocket connection
      this.initSocket();

      // Load initial configuration
      this.updateLoadingStatus('Loading configuration...');
      const configResponse = await api.getConfig();
      this.config = configResponse.config || {};

      // Update arcade name in loading screen
      const arcadeNameEl = document.getElementById('arcade-name');
      if (arcadeNameEl && this.config.arcadeName) {
        arcadeNameEl.textContent = this.config.arcadeName;
        document.title = this.config.arcadeName;
      }

      // Initialize state
      state.set('config', this.config);
      state.set('connected', true);

      // Initialize theme service
      this.updateLoadingStatus('Loading theme...');
      await themeService.init();

      // Load components
      this.updateLoadingStatus('Loading components...');
      await this.loadComponents();

      // Initialize router
      this.updateLoadingStatus('Initializing...');
      router.init();

      // Hide loading screen
      this.hideLoadingScreen();

      this.initialized = true;
      console.log('RetroWebLauncher initialized');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      this.showError(error.message);
    }
  }

  initSocket() {
    // Socket.io is loaded via script tag
    if (typeof io === 'undefined') {
      console.warn('Socket.io not available');
      return;
    }

    this.socket = io();

    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      state.set('connected', true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      state.set('connected', false);
    });

    this.socket.on('connect_error', (error) => {
      console.warn('WebSocket connection error:', error.message);
      state.set('connected', false);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      state.set('connected', true);
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnection attempt:', attemptNumber);
    });

    this.socket.on('status', (data) => {
      console.log('Server status:', data);
      if (data.arcadeName) {
        state.set('arcadeName', data.arcadeName);
      }
    });

    this.socket.on('library:updated', () => {
      console.log('Library updated');
      state.emit('libraryUpdated');
    });

    this.socket.on('game:launched', (data) => {
      console.log('Game launched:', data);
      state.emit('gameLaunched', data);
    });

    this.socket.on('config:changed', (data) => {
      console.log('Config changed:', data);
      state.set('config', data);
    });
  }

  async loadComponents() {
    // Load all web components
    const components = [
      './components/rwl-app.js',
      './components/rwl-header.js',
      './components/rwl-sidebar.js',
      './components/rwl-game-card.js',
      './components/rwl-grid-view.js',
      './components/rwl-list-view.js',
      './components/rwl-wheel-view.js',
      './components/rwl-spin-wheel.js',
      './components/rwl-spinner-view.js',
      './components/rwl-system-carousel.js',
      './components/rwl-view-toggle.js',
      './components/rwl-game-detail.js',
      './components/rwl-video-player.js',
      './components/rwl-pdf-viewer.js',
      './components/rwl-search.js',
      './components/rwl-settings.js',
      './components/rwl-screensaver.js',
      './components/rwl-qr-code.js',
      './components/rwl-skeleton.js',
      './components/rwl-alphabet-bar.js'
    ];

    // Load components in parallel for speed
    await Promise.all(
      components.map(async (componentPath) => {
        try {
          await import(componentPath);
        } catch (error) {
          console.warn(`Failed to load component: ${componentPath}`, error);
        }
      })
    );

    // Initialize input manager after components are loaded
    inputManager.init();
  }

  updateLoadingStatus(message) {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
      statusEl.textContent = message;
    }
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      loadingScreen.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 300);
    }
  }

  showError(message) {
    const statusEl = document.getElementById('loading-status');
    if (statusEl) {
      statusEl.textContent = `Error: ${message}`;
      statusEl.style.color = '#ff3333';
    }
  }

  /**
   * Detect if running as installed PWA (standalone mode)
   * Adds CSS class for styling adjustments and stores in state
   */
  detectStandaloneMode() {
    // iOS Safari standalone mode
    const isIOSStandalone = window.navigator.standalone === true;

    // Standard display-mode media query (Chrome, Edge, Firefox, Safari 13+)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

    // Fullscreen mode (some browsers)
    const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;

    const isPWA = isIOSStandalone || isStandalone || isFullscreen;

    if (isPWA) {
      document.documentElement.classList.add('pwa-standalone');
      console.log('Running as installed PWA');
    }

    // Detect iOS for platform-specific adjustments
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      document.documentElement.classList.add('ios-device');
    }

    // Store in state for components to use
    state.set('pwa', {
      isStandalone: isPWA,
      isIOS,
      isIOSStandalone
    });

    // Listen for display mode changes (user installs PWA while using it)
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      if (e.matches) {
        document.documentElement.classList.add('pwa-standalone');
        state.set('pwa', { ...state.get('pwa'), isStandalone: true });
      }
    });
  }
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration.scope);
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
    }
  });
}

// Initialize app when DOM is ready
const app = new App();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

// Export for debugging
window.rwlApp = app;
