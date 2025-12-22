/**
 * RetroWebLauncher - Theme Service
 * Manages theme settings, defaults, and dynamic effects
 */

class ThemeService {
  constructor() {
    this._settings = null;
    this._currentTheme = 'classic-arcade';
    this._subscribers = new Map();
    this._backgroundElement = null;
    this._initialized = false;
  }

  async init() {
    if (this._initialized) return;

    // Get current theme from localStorage or default
    this._currentTheme = localStorage.getItem('rwl-theme') || 'classic-arcade';
    await this.loadThemeSettings(this._currentTheme);
    this._createBackgroundLayer();
    this._initialized = true;
  }

  /**
   * Load theme settings from server
   */
  async loadThemeSettings(themeName) {
    try {
      const response = await fetch(`/api/themes/${themeName}/settings`);
      if (response.ok) {
        const data = await response.json();
        this._settings = data.settings;
        this._currentTheme = themeName;
        localStorage.setItem('rwl-theme', themeName);
        this._notifySubscribers('settings', this._settings);
        this._applyThemeCSS(themeName);
        this._applyColors();
        return this._settings;
      }
    } catch (error) {
      console.error('Failed to load theme settings:', error);
    }
    // Return defaults if loading fails
    return this._getDefaults();
  }

  /**
   * Apply theme CSS file and data-theme attribute
   */
  _applyThemeCSS(themeName) {
    // Set data-theme attribute on document element for CSS selectors
    document.documentElement.setAttribute('data-theme', themeName);

    // Load the theme CSS file
    let link = document.getElementById('theme-css');
    if (!link) {
      link = document.createElement('link');
      link.id = 'theme-css';
      link.rel = 'stylesheet';
      document.head.appendChild(link);
    }
    link.href = `/css/themes/${themeName}.css`;
  }

  /**
   * Apply colors from theme settings to CSS variables
   */
  _applyColors() {
    const colors = this.getColors();
    const root = document.documentElement;

    if (colors.primary) root.style.setProperty('--color-primary', colors.primary);
    if (colors.secondary) root.style.setProperty('--color-secondary', colors.secondary);
    if (colors.accent) root.style.setProperty('--color-accent', colors.accent);
    if (colors.background) root.style.setProperty('--color-background', colors.background);
    if (colors.surface) root.style.setProperty('--color-surface', colors.surface);
    if (colors.text) root.style.setProperty('--color-text', colors.text);
    if (colors.textMuted) root.style.setProperty('--color-text-muted', colors.textMuted);

    // Apply selection glow settings
    const selection = this.getSelectionSettings();
    if (selection.glowColor) {
      root.style.setProperty('--selection-glow-color', selection.glowColor);
    }
  }

  /**
   * Create background layer for dynamic effects
   */
  _createBackgroundLayer() {
    if (this._backgroundElement) return;

    this._backgroundElement = document.createElement('div');
    this._backgroundElement.id = 'theme-background';
    this._backgroundElement.innerHTML = `
      <div class="bg-image"></div>
      <video class="bg-video" muted loop playsinline></video>
      <div class="bg-overlay"></div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #theme-background {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: -1;
        pointer-events: none;
        overflow: hidden;
      }
      #theme-background .bg-image,
      #theme-background .bg-video {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        min-width: 100%;
        min-height: 100%;
        width: auto;
        height: auto;
        object-fit: cover;
        opacity: 0;
        transition: opacity var(--bg-fade-duration, 500ms) ease;
      }
      #theme-background .bg-image.visible,
      #theme-background .bg-video.visible {
        opacity: var(--bg-opacity, 0.3);
      }
      #theme-background .bg-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(
          180deg,
          rgba(0,0,0,0.6) 0%,
          transparent 30%,
          transparent 70%,
          rgba(0,0,0,0.8) 100%
        );
      }
      #theme-background.blur .bg-image,
      #theme-background.blur .bg-video {
        filter: blur(var(--bg-blur, 20px));
        transform: translate(-50%, -50%) scale(1.1);
      }
    `;
    document.head.appendChild(style);
    document.body.insertBefore(this._backgroundElement, document.body.firstChild);
  }

  /**
   * Set background image/video based on selection
   */
  setBackground(options = {}) {
    if (!this._backgroundElement) return;

    const { image, video, blur = true, opacity, fadeDuration, context = 'gameList' } = options;
    const bgSettings = this.getBackgroundSettings(context);
    const selection = this.getSelectionSettings();

    if (!selection.showBackgroundPreview && !options.force) {
      this.clearBackground();
      return;
    }

    const bgImage = this._backgroundElement.querySelector('.bg-image');
    const bgVideo = this._backgroundElement.querySelector('.bg-video');

    // Set CSS variables
    const actualBlur = blur ? (selection.backgroundPreviewBlur || bgSettings.blur || 20) : 0;
    const actualOpacity = opacity || selection.backgroundPreviewOpacity || bgSettings.opacity || 0.3;
    const actualFade = fadeDuration || bgSettings.fadeInDuration || 500;

    this._backgroundElement.style.setProperty('--bg-blur', `${actualBlur}px`);
    this._backgroundElement.style.setProperty('--bg-opacity', actualOpacity);
    this._backgroundElement.style.setProperty('--bg-fade-duration', `${actualFade}ms`);

    if (blur) {
      this._backgroundElement.classList.add('blur');
    } else {
      this._backgroundElement.classList.remove('blur');
    }

    // Handle video
    if (video && bgSettings.videoEnabled !== false) {
      bgImage.classList.remove('visible');
      bgVideo.src = video;
      bgVideo.muted = bgSettings.videoMuted !== false;
      bgVideo.loop = bgSettings.videoLoop !== false;
      bgVideo.play().catch(() => {});
      setTimeout(() => bgVideo.classList.add('visible'), 50);
    }
    // Handle image
    else if (image) {
      bgVideo.pause();
      bgVideo.classList.remove('visible');

      // Preload then show
      const img = new Image();
      img.onload = () => {
        bgImage.src = image;
        setTimeout(() => bgImage.classList.add('visible'), 50);
      };
      img.src = image;
    }
  }

  /**
   * Clear background
   */
  clearBackground() {
    if (!this._backgroundElement) return;

    const bgImage = this._backgroundElement.querySelector('.bg-image');
    const bgVideo = this._backgroundElement.querySelector('.bg-video');

    bgImage.classList.remove('visible');
    bgVideo.classList.remove('visible');
    bgVideo.pause();
  }

  /**
   * Get default view for a context
   */
  getDefaultView(context) {
    const views = this._settings?.views || this._getDefaults().views;

    switch (context) {
      case 'system':
        return views.systemDefault || 'wheel';
      case 'collection':
        return views.collectionDefault || 'grid';
      case 'search':
        return views.searchDefault || 'grid';
      case 'recentlyPlayed':
        return views.recentlyPlayedDefault || 'grid';
      case 'systemSelector':
        return views.systemSelector || 'carousel';
      default:
        return 'grid';
    }
  }

  /**
   * Get UI settings
   */
  getUISettings() {
    return this._settings?.ui || this._getDefaults().ui;
  }

  /**
   * Get home screen settings
   */
  getHomeSettings() {
    return this._settings?.home || this._getDefaults().home;
  }

  /**
   * Get background settings for current context
   */
  getBackgroundSettings(context = 'gameList') {
    const backgrounds = this._settings?.backgrounds || this._getDefaults().backgrounds;
    return backgrounds[context] || backgrounds.gameList;
  }

  /**
   * Get selection/glow settings
   */
  getSelectionSettings() {
    return this._settings?.selection || this._getDefaults().selection;
  }

  /**
   * Get carousel settings
   */
  getCarouselSettings() {
    return this._settings?.carousel || this._getDefaults().carousel;
  }

  /**
   * Get color palette
   */
  getColors() {
    return this._settings?.colors || this._getDefaults().colors;
  }

  /**
   * Check if a UI feature is enabled
   */
  isEnabled(feature) {
    const ui = this.getUISettings();
    return ui[feature] !== false;
  }

  /**
   * Subscribe to theme changes
   */
  subscribe(event, callback) {
    if (!this._subscribers.has(event)) {
      this._subscribers.set(event, new Set());
    }
    this._subscribers.get(event).add(callback);

    // Immediately call with current settings
    if (event === 'settings' && this._settings) {
      callback(this._settings);
    }

    return () => this._subscribers.get(event)?.delete(callback);
  }

  _notifySubscribers(event, data) {
    this._subscribers.get(event)?.forEach(cb => {
      try {
        cb(data);
      } catch (e) {
        console.error('Theme subscriber error:', e);
      }
    });
  }

  /**
   * Get current theme name
   */
  getCurrentTheme() {
    return this._currentTheme;
  }

  /**
   * Get all settings
   */
  getSettings() {
    return this._settings || this._getDefaults();
  }

  /**
   * Get effects settings
   */
  getEffectsSettings() {
    return this._settings?.effects || this._getDefaults().effects;
  }

  /**
   * Get wheel settings
   */
  getWheelSettings() {
    return this._settings?.wheel || this._getDefaults().wheel;
  }

  /**
   * Get grid settings
   */
  getGridSettings() {
    return this._settings?.grid || this._getDefaults().grid;
  }

  /**
   * Get list settings
   */
  getListSettings() {
    return this._settings?.list || this._getDefaults().list;
  }

  /**
   * Get spinner settings (half-clock wheel view / Wheel of Fortune)
   */
  getSpinnerSettings() {
    return this._settings?.spinner || this._getDefaults().spinner;
  }

  /**
   * Get spin wheel settings (HyperSpin-style vertical wheel)
   */
  getSpinWheelSettings() {
    return this._settings?.spinWheel || this._getDefaults().spinWheel;
  }

  /**
   * Get CRT TV settings
   */
  getCrtTvSettings() {
    return this._settings?.crtTv || this._getDefaults().crtTv;
  }

  /**
   * Get zoom slider settings
   */
  getZoomSliderSettings() {
    return this._settings?.zoomSlider || this._getDefaults().zoomSlider;
  }

  /**
   * Default settings fallback
   */
  _getDefaults() {
    return {
      views: {
        systemSelector: 'carousel',
        systemDefault: 'wheel',
        collectionDefault: 'grid',
        searchDefault: 'grid',
        recentlyPlayedDefault: 'grid'
      },
      home: {
        style: 'sidebar',  // 'carousel' (fullscreen system carousel) or 'sidebar' (sidebar + welcome)
        showSidebar: true,  // Show sidebar when style is 'sidebar'
        showBreadcrumbs: false  // Show breadcrumbs when style is 'carousel' (mutually exclusive with sidebar)
      },
      ui: {
        showViewToggle: true,
        showSystemBadges: true,
        showGameCount: true,
        showConnectionStatus: true,
        showNavButtons: true,
        animationsEnabled: true
      },
      effects: {
        particlesEnabled: false,
        scanlineEffect: false,
        crtEffect: false,
        chromaticAberration: false,
        gridFloorEffect: false,
        chromeTextEffect: false
      },
      backgrounds: {
        systemSelector: {
          enabled: true,
          type: 'gradient',
          blur: 0,
          opacity: 1
        },
        gameList: {
          enabled: true,
          type: 'selected',
          blur: 20,
          brightness: 0.35,
          opacity: 1,
          fadeInDuration: 500,
          videoEnabled: true,
          videoMuted: true,
          videoLoop: true
        },
        gameDetail: {
          enabled: true,
          type: 'artwork',
          fallbackToVideo: true,
          blur: 15,
          brightness: 0.4,
          opacity: 1,
          preferredArtwork: ['fanart', 'screenshot', 'thumbnail']
        }
      },
      selection: {
        glowEffect: true,
        glowColor: '#ff0066',
        glowIntensity: 0.5,
        glowSpread: 20,
        scaleOnHover: 1.05,
        showBackgroundPreview: true,
        backgroundPreviewBlur: 25,
        backgroundPreviewBrightness: 0.35,
        backgroundPreviewOpacity: 1
      },
      carousel: {
        cardStyle: '3d',
        reflectionEnabled: true,
        rotationAngle: 15,
        perspective: 1000,
        neonBorder: false,
        shadowEnabled: true,
        layout: {
          position: 'bottom',
          detailsPosition: 'above',
          controlsPosition: 'bottom'
        },
        sizing: {
          defaultCardSize: 330,
          minCardSize: 150,
          maxCardSize: 500,
          cardAspectRatio: 1.36,
          cardGap: 0.09
        },
        details: {
          showCrtTv: true,
          crtWidth: 320,
          showRating: true,
          showPlayCount: true,
          showDescription: true,
          maxDescriptionLines: 3
        }
      },
      wheel: {
        itemSpacing: 25,
        curve3d: true,
        fadeEdges: true,
        visibleItems: 9
      },
      spinWheel: {
        layout: {
          wheelPosition: 'right',
          detailsPosition: 'left',
          controlsPosition: 'bottom'
        },
        sizing: {
          defaultCardSize: 300,
          minCardSize: 200,
          maxCardSize: 550,
          itemHeight: 0.35,
          imageWidth: 0.3,
          imageHeight: 0.4
        },
        wheel: {
          visibleItems: 5,
          angleStep: 22,
          translateZFactor: 40,
          opacityFalloff: 0.25,
          scaleFalloff: 0.12
        },
        details: {
          showCrtTv: true,
          crtWidth: 350,
          showRating: true,
          showPlayCount: true,
          showDescription: true
        }
      },
      grid: {
        cardBorderRadius: 8,
        hoverScale: 1.05,
        showTitle: true,
        aspectRatio: '3/4',
        sizing: {
          defaultCardSize: 150,
          minCardSize: 80,
          maxCardSize: 300
        }
      },
      list: {
        showThumbnails: true,
        stripedRows: false,
        compactMode: false,
        showRatings: true,
        sizing: {
          defaultIconSize: 40,
          minIconSize: 24,
          maxIconSize: 80
        }
      },
      spinner: {
        visibleItems: 11,
        radius: 320,
        cardWidth: 100,
        cardHeight: 140,
        angleStep: 15,
        selectedScale: 1.2,
        layout: {
          wheelPosition: 'right',
          detailsPosition: 'left',
          controlsPosition: 'bottom'
        },
        sizing: {
          defaultSize: 150,
          minSize: 80,
          maxSize: 250,
          baseRadius: 202,
          cardWidthFactor: 0.9,
          cardHeightFactor: 1.25
        },
        pointer: {
          style: 'arrow',
          size: 40,
          color: '#ff0066',
          glowEnabled: true,
          glowIntensity: 0.8,
          position: 'left'
        },
        details: {
          showCrtTv: true,
          crtWidth: 380,
          showRating: true,
          showPlayCount: true,
          showLastPlayed: true,
          showDescription: true
        }
      },
      crtTv: {
        enabled: true,
        scanlineEffect: true,
        scanlineOpacity: 0.15,
        vignetteEffect: true,
        vignetteIntensity: 0.4,
        borderRadius: 10,
        frameStyle: 'classic',
        frameColor: '#2a2a2a',
        ledIndicator: true,
        autoplayVideo: true,
        videoFallbackToScreenshot: true,
        aspectRatio: '4/3'
      },
      zoomSlider: {
        width: 'calc(33vw - 200px)',
        minWidth: 150,
        maxWidth: 300
      },
      colors: {
        primary: '#ff0066',
        secondary: '#00ffff',
        accent: '#ffff00',
        background: '#0a0a0a',
        surface: '#111111',
        surfaceHover: '#1a1a1a',
        text: '#ffffff',
        textMuted: '#888888',
        success: '#00ff66',
        warning: '#ffaa00',
        error: '#ff3333'
      },
      fonts: {
        heading: "'Press Start 2P', monospace",
        body: "'Inter', sans-serif",
        mono: "'Fira Code', monospace"
      },
      spacing: {
        cardGap: 16,
        sectionPadding: 20
      }
    };
  }
}

// Export singleton instance
export const themeService = new ThemeService();

// Also attach to window for debugging
window.themeService = themeService;
