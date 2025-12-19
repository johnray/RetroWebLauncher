/**
 * RetroWebLauncher - Main Application Bootstrap
 */

import { api } from './api.js';
import { state } from './state.js';
import { router } from './router.js';
import { inputManager } from './input/manager.js';

class App {
  constructor() {
    this.socket = null;
    this.config = null;
    this.initialized = false;
  }

  async init() {
    try {
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

    this.socket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      state.set('connected', false);
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
      './components/rwl-game-detail.js',
      './components/rwl-video-player.js',
      './components/rwl-pdf-viewer.js',
      './components/rwl-search.js',
      './components/rwl-settings.js',
      './components/rwl-screensaver.js',
      './components/rwl-qr-code.js'
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
