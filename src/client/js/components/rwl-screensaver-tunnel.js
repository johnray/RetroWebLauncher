/**
 * RetroWebLauncher - Tunnel Screensaver
 * 3D tunnel flight with game artwork mosaic walls
 * Uses Three.js for rendering
 */

import { RwlScreensaverBase } from './rwl-screensaver-base.js';
import { api } from '../api.js';

const { html, css } = window.Lit;

class RwlScreensaverTunnel extends RwlScreensaverBase {
  static properties = {
    ...RwlScreensaverBase.properties,
    _loadingImages: { type: Boolean, state: true }
  };

  static styles = css`
    ${RwlScreensaverBase.baseStyles}

    .tunnel-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .loading-overlay {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .loading-text {
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 1.5rem;
      color: var(--screensaver-title-color, #fff);
      text-shadow: 0 0 10px var(--screensaver-title-glow, var(--color-primary, #ff0066));
      text-align: center;
      margin: 0;
    }

    .loading-bar {
      width: 200px;
      height: 4px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
      margin-top: 1rem;
      overflow: hidden;
    }

    .loading-progress {
      height: 100%;
      background: var(--color-primary, #ff0066);
      transition: width 0.3s ease;
    }

    /* Arcade branding in upper left with translucent background */
    .arcade-branding {
      position: absolute;
      top: 40px;
      left: 40px;
      background: rgba(0, 0, 0, 0.6);
      padding: 20px 30px;
      border-radius: 12px;
      backdrop-filter: blur(4px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      z-index: 50;
    }

    .arcade-branding .arcade-title {
      position: static;
      transform: none;
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 2.5rem;
      color: var(--screensaver-title-color, #fff);
      text-shadow:
        0 0 10px var(--screensaver-title-glow, var(--color-primary, #ff0066)),
        0 0 20px var(--screensaver-title-glow, var(--color-primary, #ff0066)),
        0 0 40px var(--screensaver-title-glow, var(--color-primary, #ff0066));
      letter-spacing: 2px;
      margin: 0;
      animation: titlePulse 4s ease-in-out infinite;
    }

    .arcade-branding .arcade-subtitle {
      position: static;
      transform: none;
      font-family: var(--font-display, 'VT323', monospace);
      font-size: 1rem;
      color: var(--screensaver-subtitle-color, rgba(255, 255, 255, 0.7));
      letter-spacing: 3px;
      margin-top: 8px;
      animation: subtitleBlink 2s ease-in-out infinite;
    }

    @keyframes titlePulse {
      0%, 100% { opacity: 1; filter: brightness(1); }
      50% { opacity: 0.9; filter: brightness(1.2); }
    }

    @keyframes subtitleBlink {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }

    /* Mobile adjustments */
    @media (max-width: 768px) {
      .arcade-branding {
        top: 20px;
        left: 20px;
        padding: 12px 18px;
      }

      .arcade-branding .arcade-title {
        font-size: 1.5rem;
      }

      .arcade-branding .arcade-subtitle {
        font-size: 0.8rem;
      }
    }
  `;

  constructor() {
    super();
    this._loadingImages = true;
    this._isActivating = false; // Guard against multiple activations
    this._animationFrame = null;
    this._boundAnimate = this._animate.bind(this);

    // Three.js objects
    this._scene = null;
    this._camera = null;
    this._renderer = null;
    this._tunnelMesh = null;
    this._tunnelPath = null;

    // Tunnel parameters
    this._pathProgress = 0;
    this._targetSpeed = 0.00015;
    this._currentSpeed = 0.00015;
    this._speedChangeTimer = 0;
    this._speedChangeDuration = 0;

    // Cross-section morphing
    this._currentShape = 0; // 0 = circle, 1 = square, 2 = hexagon, etc.
    this._targetShape = 2; // Start morphing to square immediately
    this._shapeMorphProgress = 0;
    this._shapeChangeTimer = 0;

    // Images loaded for texture
    this._loadedTextures = [];
    this._textureCanvas = null;
    this._textureNeedsUpdate = false;
    this._loadProgress = 0;

    // Path generation
    this._pathPoints = [];
    this._pathLength = 5000;
    this._tunnelRadius = 8;
    this._pathSegments = 200;
    this._radialSegments = 32;

    // SimplexNoise instance
    this._noise = null;

    // Keep track of time for animations
    this._lastTime = 0;
  }

  // ─────────────────────────────────────────────────────────────
  // Screensaver lifecycle hooks
  // ─────────────────────────────────────────────────────────────

  async _onActivate() {
    // Guard against multiple activations
    if (this._isActivating) {
      console.log('[Tunnel Screensaver] Already activating, skipping');
      return;
    }
    this._isActivating = true;
    this._loadingImages = true;

    // Wait for Three.js and SimplexNoise to be available
    await this._waitForDependencies();

    // Check if Three.js loaded successfully
    if (!window.THREE) {
      console.error('[Tunnel Screensaver] Cannot start - Three.js failed to load');
      this._loadingImages = false;
      this._isActivating = false;
      return;
    }

    // Ensure component has rendered before accessing shadow DOM
    await this.updateComplete;

    // Initialize Three.js scene
    this._initThreeJS();

    // Check if initialization succeeded
    if (!this._scene || !this._renderer) {
      console.error('[Tunnel Screensaver] Three.js initialization failed');
      this._loadingImages = false;
      this._isActivating = false;
      return;
    }

    // Load game images for texture
    await this._loadGameImages();

    // Check if we were deactivated during loading
    if (!this._active || !this.isConnected) {
      console.log('[Tunnel Screensaver] Deactivated during loading');
      this._loadingImages = false;
      this._isActivating = false;
      return;
    }

    // Create the tunnel
    this._createTunnel();

    // Verify tunnel was created
    if (!this._tunnelMesh) {
      console.error('[Tunnel Screensaver] Tunnel creation failed');
      this._loadingImages = false;
      this._isActivating = false;
      return;
    }

    this._loadingImages = false;
    this._isActivating = false;
    this._lastTime = performance.now();

    console.log('[Tunnel Screensaver] Started successfully');

    // Start animation
    this._animate();
  }

  _onDeactivate() {
    this._isActivating = false;
    this._loadingImages = false;

    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }

    // Cleanup Three.js resources
    this._cleanupThreeJS();
  }

  _onCleanup() {
    this._cleanupThreeJS();
  }

  _onPause() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  _onResume() {
    if (!this._animationFrame && this._active) {
      this._lastTime = performance.now();
      this._animate();
    }
  }

  _clearScreensaverTimers() {
    if (this._animationFrame) {
      cancelAnimationFrame(this._animationFrame);
      this._animationFrame = null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Dependencies
  // ─────────────────────────────────────────────────────────────

  async _waitForDependencies() {
    // Dynamically import Three.js if not already available
    if (!window.THREE) {
      try {
        console.log('[Tunnel Screensaver] Loading Three.js...');
        const THREE = await import('https://cdn.jsdelivr.net/npm/three@0.160/build/three.module.js/+esm');
        window.THREE = THREE;
        console.log('[Tunnel Screensaver] Three.js loaded successfully');
      } catch (err) {
        console.error('[Tunnel Screensaver] Failed to load Three.js:', err);
        return;
      }
    }

    // Dynamically import SimplexNoise if not already available
    if (!window.SimplexNoise) {
      try {
        console.log('[Tunnel Screensaver] Loading SimplexNoise...');
        const simplexModule = await import('https://cdn.jsdelivr.net/npm/simplex-noise@4.0.1/dist/esm/simplex-noise.js/+esm');
        window.SimplexNoise = simplexModule;
        console.log('[Tunnel Screensaver] SimplexNoise loaded successfully');
      } catch (err) {
        console.warn('[Tunnel Screensaver] SimplexNoise not available, using fallback:', err);
      }
    }

    // Create noise function
    if (window.SimplexNoise && window.SimplexNoise.createNoise3D) {
      this._noise = window.SimplexNoise.createNoise3D();
    } else {
      // Fallback noise function
      console.log('[Tunnel Screensaver] Using fallback noise function');
      this._noise = (x, y, z) => {
        return Math.sin(x * 0.5) * Math.cos(y * 0.5) * Math.sin(z * 0.5);
      };
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Three.js Setup
  // ─────────────────────────────────────────────────────────────

  _initThreeJS() {
    const THREE = window.THREE;
    if (!THREE) {
      console.error('[Tunnel Screensaver] _initThreeJS: THREE not available');
      return;
    }

    const container = this.shadowRoot?.querySelector('.tunnel-canvas');
    if (!container) {
      console.error('[Tunnel Screensaver] _initThreeJS: canvas container not found');
      return;
    }

    console.log('[Tunnel Screensaver] Initializing Three.js...');

    // Create scene with dark but not black background
    this._scene = new THREE.Scene();
    this._scene.background = new THREE.Color(0x0a0a15);

    // Light fog for subtle depth - don't obscure artwork
    this._scene.fog = new THREE.FogExp2(0x101020, 0.003);

    // Create camera
    this._camera = new THREE.PerspectiveCamera(
      75,
      this._viewportWidth / this._viewportHeight,
      0.1,
      1000
    );

    // Create renderer
    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    });
    this._renderer.setSize(this._viewportWidth, this._viewportHeight);
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this._renderer.domElement);

    // Add strong ambient light so artwork is always visible
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    this._scene.add(ambientLight);

    // Add point light that follows camera
    this._cameraLight = new THREE.PointLight(0xffffff, 3, 100);
    this._scene.add(this._cameraLight);

    // Add secondary lights for color variation
    this._light2 = new THREE.PointLight(0x00ffff, 2, 60);
    this._scene.add(this._light2);

    this._light3 = new THREE.PointLight(0xff6600, 2, 60);
    this._scene.add(this._light3);
  }

  _cleanupThreeJS() {
    if (this._renderer) {
      this._renderer.dispose();
      const canvas = this._renderer.domElement;
      if (canvas && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
      }
      this._renderer = null;
    }

    if (this._tunnelMesh) {
      if (this._tunnelMesh.geometry) {
        this._tunnelMesh.geometry.dispose();
      }
      if (this._tunnelMesh.material) {
        if (this._tunnelMesh.material.map) {
          this._tunnelMesh.material.map.dispose();
        }
        this._tunnelMesh.material.dispose();
      }
      this._tunnelMesh = null;
    }

    // Dispose loaded textures
    this._loadedTextures.forEach(tex => {
      if (tex && tex.dispose) tex.dispose();
    });
    this._loadedTextures = [];

    this._scene = null;
    this._camera = null;
  }

  // ─────────────────────────────────────────────────────────────
  // Game Loading - Override base class to prioritize images over videos
  // ─────────────────────────────────────────────────────────────

  async _loadGames() {
    // Override base class to load games with IMAGES from ALL systems
    try {
      const systemsResponse = await api.getSystems();
      const systems = systemsResponse.systems || [];

      if (systems.length === 0) {
        console.warn('[Tunnel Screensaver] No systems found');
        this._games = [];
        return;
      }

      let allGames = [];

      // Fetch MORE games from ALL systems - we want variety
      const gamesPerSystem = Math.max(20, Math.ceil(1000 / systems.length));
      const maxConcurrent = 5;

      console.log(`[Tunnel Screensaver] Loading games from ${systems.length} systems...`);

      // Process systems in batches
      for (let i = 0; i < systems.length; i += maxConcurrent) {
        const batch = systems.slice(i, i + maxConcurrent);
        const batchPromises = batch.map(async (system) => {
          try {
            const response = await api.getGames(system.id, { limit: gamesPerSystem });
            if (response.games) {
              return response.games.map(g => ({
                ...g,
                systemId: system.id,
                systemName: system.name
              }));
            }
          } catch (e) {
            // Continue with other systems
          }
          return [];
        });

        const results = await Promise.all(batchPromises);
        allGames = allGames.concat(results.flat());

        // Early exit if screensaver was deactivated during loading
        if (!this._active || !this.isConnected) {
          return;
        }
      }

      // Prioritize games with images (screenshots, box art, fanart)
      const gamesWithImages = allGames.filter(g =>
        g.screenshot || g.image || g.fanart || g.thumbnail
      );

      // Shuffle and take up to 500 games
      this._games = this._shuffle(gamesWithImages).slice(0, 500);

      console.log(`[Tunnel Screensaver] Loaded ${this._games.length} games with images from ${systems.length} systems`);
    } catch (error) {
      console.error('[Tunnel Screensaver] Failed to load games:', error);
      this._games = [];
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Image Loading
  // ─────────────────────────────────────────────────────────────

  async _loadGameImages() {
    if (!this._games || this._games.length === 0) {
      console.warn('[Tunnel Screensaver] No games available for textures');
      return;
    }

    // Prioritize games with screenshots/boxart over wheel logos
    const gamesWithScreenshots = this._games.filter(g => g.screenshot || g.image);
    const gamesWithOtherImages = this._games.filter(g => !g.screenshot && !g.image && (g.fanart || g.thumbnail));

    // Prioritize games with screenshots, then fill with others
    const gamesWithImages = this._shuffle([
      ...gamesWithScreenshots,
      ...gamesWithOtherImages
    ]).slice(0, 500);

    console.log(`[Tunnel Screensaver] Loading images from ${gamesWithImages.length} games`);

    // Create a WIDE texture to match tunnel proportions
    // Tunnel: length 5000, circumference ~50 = 100:1 aspect ratio
    // We'll use 16384 x 2048 (8:1) and set repeat to compensate
    this._textureCanvas = document.createElement('canvas');
    const canvasWidth = 16384;
    const canvasHeight = 2048;
    this._textureCanvas.width = canvasWidth;
    this._textureCanvas.height = canvasHeight;
    const ctx = this._textureCanvas.getContext('2d');

    // Fill with dark background
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Grid: 32 columns x 4 rows = 128 tiles
    // Each tile is 512x512 pixels - nice and large for legibility
    const tilesPerRow = 32;
    const tilesPerCol = 4;
    const tileWidth = canvasWidth / tilesPerRow;  // 512
    const tileHeight = canvasHeight / tilesPerCol; // 512
    const totalTiles = tilesPerRow * tilesPerCol;  // 128

    // Load images in batches
    const batchSize = 15;
    let loadedCount = 0;
    let placedCount = 0;

    for (let i = 0; i < gamesWithImages.length && placedCount < totalTiles; i += batchSize) {
      if (!this._active || !this.isConnected) return;

      const batch = gamesWithImages.slice(i, i + batchSize);
      const loadPromises = batch.map(game => this._loadGameImage(game));

      const results = await Promise.allSettled(loadPromises);

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value && placedCount < totalTiles) {
          const img = result.value;

          // Calculate position in grid
          const col = placedCount % tilesPerRow;
          const row = Math.floor(placedCount / tilesPerRow);

          const x = col * tileWidth;
          const y = row * tileHeight;

          // Small padding for visual separation
          const padding = 4;
          const drawWidth = tileWidth - padding * 2;
          const drawHeight = tileHeight - padding * 2;

          // Draw image scaled to fit tile (maintain aspect, crop to fill)
          // Mirror horizontally so text reads correctly when viewed from inside tunnel
          ctx.save();
          ctx.beginPath();
          ctx.rect(x + padding, y + padding, drawWidth, drawHeight);
          ctx.clip();

          // Calculate scaling to cover the tile
          const imgAspect = img.width / img.height;
          const tileAspect = drawWidth / drawHeight;
          let srcX = 0, srcY = 0, srcW = img.width, srcH = img.height;

          if (imgAspect > tileAspect) {
            // Image is wider - crop sides
            srcW = img.height * tileAspect;
            srcX = (img.width - srcW) / 2;
          } else {
            // Image is taller - crop top/bottom
            srcH = img.width / tileAspect;
            srcY = (img.height - srcH) / 2;
          }

          // Mirror horizontally: translate to right edge, then scale -1 on X axis
          ctx.translate(x + padding + drawWidth, y + padding);
          ctx.scale(-1, 1);
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, drawWidth, drawHeight);

          // Add subtle border
          ctx.restore();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x + padding, y + padding, drawWidth, drawHeight);

          placedCount++;
        }
        loadedCount++;
      }

      this._loadProgress = Math.min(100, Math.round((loadedCount / Math.min(gamesWithImages.length, totalTiles)) * 100));
      this.requestUpdate();
    }

    // Fill remaining tiles by duplicating existing images
    if (placedCount > 0 && placedCount < totalTiles) {
      // Create a temporary canvas with just the filled portion
      const filledRows = Math.ceil(placedCount / tilesPerRow);
      const filledHeight = filledRows * tileHeight;

      for (let i = placedCount; i < totalTiles; i++) {
        const col = i % tilesPerRow;
        const row = Math.floor(i / tilesPerRow);
        const srcCol = col % (placedCount % tilesPerRow || tilesPerRow);
        const srcRow = row % filledRows;

        ctx.drawImage(
          this._textureCanvas,
          srcCol * tileWidth, srcRow * tileHeight, tileWidth, tileHeight,
          col * tileWidth, row * tileHeight, tileWidth, tileHeight
        );
      }
    }

    console.log(`[Tunnel Screensaver] Loaded ${placedCount} images into ${tilesPerRow}x${tilesPerCol} texture grid`);
  }

  async _loadGameImage(game) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      // Prioritize higher-resolution images for legibility
      // screenshot and image (box art) are usually higher quality than thumbnail (wheel logos)
      const sources = [];

      // Screenshot - actual game screenshots, usually high res
      if (game.screenshot) {
        sources.push(`/api/media/game/${game.id}/screenshot`);
      }
      // Image/box art - good quality promotional art
      if (game.image) {
        sources.push(`/api/media/game/${game.id}/image`);
      }
      // Fanart - promotional art, can be high res
      if (game.fanart) {
        sources.push(`/api/media/game/${game.id}/fanart`);
      }
      // Thumbnail last - often small wheel logos
      if (game.thumbnail) {
        sources.push(`/api/media/game/${game.id}/thumbnail`);
      }

      if (sources.length === 0) {
        resolve(null);
        return;
      }

      let sourceIndex = 0;
      let resolved = false;

      const tryNextSource = () => {
        if (resolved) return;
        if (sourceIndex >= sources.length) {
          resolved = true;
          resolve(null);
          return;
        }
        img.src = sources[sourceIndex];
        sourceIndex++;
      };

      img.onload = () => {
        if (!resolved) {
          resolved = true;
          resolve(img);
        }
      };

      img.onerror = tryNextSource;

      // Timeout after 3 seconds per image
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          resolve(null);
        }
      }, 3000);

      tryNextSource();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // Tunnel Creation
  // ─────────────────────────────────────────────────────────────

  _createTunnel() {
    const THREE = window.THREE;
    if (!THREE || !this._scene) {
      console.error('[Tunnel Screensaver] _createTunnel: THREE or scene not available');
      return;
    }

    console.log('[Tunnel Screensaver] Creating tunnel...');

    // Generate a curved path using noise
    this._generatePath();

    // Create the tunnel path as a CatmullRomCurve3
    this._tunnelPath = new THREE.CatmullRomCurve3(this._pathPoints);
    this._tunnelPath.closed = false;

    // Create tube geometry
    const geometry = new THREE.TubeGeometry(
      this._tunnelPath,
      this._pathSegments,
      this._tunnelRadius,
      this._radialSegments,
      false
    );

    // Create texture from canvas
    let texture = null;
    if (this._textureCanvas) {
      texture = new THREE.CanvasTexture(this._textureCanvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      // Texture is 8:1 aspect, tunnel is ~100:1 aspect
      // repeat.set(X along length, Y around circumference)
      // 100/8 = 12.5, so repeat 12x along length for square images
      texture.repeat.set(12, 1);
    }

    // Create material - bright and fully opaque
    const material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide // Render inside of tube
    });

    this._tunnelMesh = new THREE.Mesh(geometry, material);
    this._scene.add(this._tunnelMesh);

    console.log('[Tunnel Screensaver] Tunnel created successfully');
  }

  _generatePath() {
    const THREE = window.THREE;
    if (!THREE) return;

    this._pathPoints = [];

    // Generate a long, winding path using noise
    const numPoints = 100;
    const segmentLength = this._pathLength / numPoints;

    for (let i = 0; i < numPoints; i++) {
      const z = -i * segmentLength;

      // Use noise to create organic curves - VERY dramatic weaving
      const noiseScale = 0.08; // Higher = more frequent turns
      const curveAmplitude = 120; // Much larger = more dramatic turns

      let x, y;
      if (this._noise) {
        // Layer multiple noise frequencies for complex curves
        x = this._noise(i * noiseScale, 0, 0) * curveAmplitude +
            this._noise(i * noiseScale * 2, 50, 0) * curveAmplitude * 0.4;
        y = this._noise(0, i * noiseScale, 100) * curveAmplitude +
            this._noise(50, i * noiseScale * 2, 100) * curveAmplitude * 0.4;
      } else {
        // Fallback: layered sine waves for complex curves
        x = Math.sin(i * 0.15) * curveAmplitude + Math.sin(i * 0.3) * curveAmplitude * 0.4;
        y = Math.cos(i * 0.2) * curveAmplitude + Math.cos(i * 0.4) * curveAmplitude * 0.4;
      }

      this._pathPoints.push(new THREE.Vector3(x, y, z));
    }
  }

  _updateTunnelShape() {
    // Regenerate tunnel geometry with different cross-section
    const THREE = window.THREE;
    if (!THREE || !this._tunnelPath || !this._tunnelMesh) return;

    // Interpolate between shapes
    const shapeProgress = this._currentShape + (this._targetShape - this._currentShape) * this._shapeMorphProgress;

    // Different shapes have different radial segments:
    // Shape 0: Circle (32 segments)
    // Shape 1: Hexagon (6 segments)
    // Shape 2: Square (4 segments)
    // Shape 3: Octagon (8 segments)
    const shapeSegments = [32, 6, 4, 8];
    const currentSegs = shapeSegments[Math.floor(this._currentShape) % 4];
    const targetSegs = shapeSegments[Math.floor(this._targetShape) % 4];

    // Interpolate segment count (round to integer)
    const radialSegments = Math.round(currentSegs + (targetSegs - currentSegs) * this._shapeMorphProgress);

    // Also vary the radius for a breathing effect
    const radiusMultiplier = 1 + 0.3 * Math.sin(shapeProgress * Math.PI * 0.5);

    // Create new geometry with morphed cross-section
    const geometry = new THREE.TubeGeometry(
      this._tunnelPath,
      this._pathSegments,
      this._tunnelRadius * radiusMultiplier,
      Math.max(4, radialSegments), // Minimum 4 segments (square)
      false
    );

    // Dispose old geometry and update
    if (this._tunnelMesh.geometry) {
      this._tunnelMesh.geometry.dispose();
    }
    this._tunnelMesh.geometry = geometry;
  }

  // ─────────────────────────────────────────────────────────────
  // Animation
  // ─────────────────────────────────────────────────────────────

  _animate() {
    if (!this._active || !this.isConnected) {
      this._animationFrame = null;
      return;
    }

    const now = performance.now();
    const delta = (now - this._lastTime) / 1000;
    this._lastTime = now;

    if (this._scene && this._camera && this._renderer && this._tunnelPath) {
      // Update speed with smooth transitions
      this._updateSpeed(delta);

      // Update shape morphing
      this._updateShapeMorph(delta);

      // Move camera along path
      this._pathProgress += this._currentSpeed * delta * 60;

      // Wrap path progress for infinite tunnel effect
      if (this._pathProgress >= 0.95) {
        this._pathProgress = 0.05;
        // Regenerate path ahead
        this._regeneratePath();
      }

      // Get position and direction on path
      const t = Math.max(0.001, Math.min(0.999, this._pathProgress));
      const position = this._tunnelPath.getPointAt(t);
      const lookAt = this._tunnelPath.getPointAt(Math.min(0.999, t + 0.01));

      // Update camera
      this._camera.position.copy(position);
      this._camera.lookAt(lookAt);

      // No camera shake - keep artwork stable and viewable

      // Update lights to follow camera (for any lit materials)
      if (this._cameraLight) {
        this._cameraLight.position.copy(position);
      }

      // Keep fog constant - don't obscure artwork

      // Render
      this._renderer.render(this._scene, this._camera);
    }

    this._animationFrame = requestAnimationFrame(this._boundAnimate);
  }

  _updateSpeed(delta) {
    // Change target speed periodically
    this._speedChangeTimer += delta;

    if (this._speedChangeTimer >= this._speedChangeDuration) {
      // Pick new target speed - very slow, leisurely pace
      // Range: 0.00005 (crawl) to 0.00025 (gentle cruise)
      this._targetSpeed = 0.00005 + Math.random() * 0.0002;
      this._speedChangeDuration = 10 + Math.random() * 25; // 10-35 seconds
      this._speedChangeTimer = 0;
    }

    // Smoothly interpolate to target speed
    const speedLerp = 0.02;
    this._currentSpeed += (this._targetSpeed - this._currentSpeed) * speedLerp;
  }

  _updateShapeMorph(delta) {
    // Periodically morph between shapes - more frequent changes
    this._shapeChangeTimer += delta;

    if (this._shapeChangeTimer > 8) { // Change shape every 8 seconds
      this._currentShape = this._targetShape;
      // Pick a different shape than current
      let newShape;
      do {
        newShape = Math.floor(Math.random() * 4);
      } while (newShape === this._currentShape && Math.random() > 0.3);
      this._targetShape = newShape;
      this._shapeMorphProgress = 0;
      this._shapeChangeTimer = 0;
    }

    // Faster morph - complete in about 3 seconds
    if (this._shapeMorphProgress < 1) {
      this._shapeMorphProgress = Math.min(1, this._shapeMorphProgress + delta * 0.35);

      // Update tunnel geometry frequently during morph for smooth transition
      if (Math.floor(this._shapeMorphProgress * 20) !== Math.floor((this._shapeMorphProgress - delta * 0.35) * 20)) {
        this._updateTunnelShape();
      }
    }
  }

  _regeneratePath() {
    // Generate new path segment ahead
    const THREE = window.THREE;
    if (!THREE) return;

    // Shift existing points and add new ones at the end
    const halfPoints = Math.floor(this._pathPoints.length / 2);

    // Remove first half
    this._pathPoints.splice(0, halfPoints);

    // Add new points at the end
    const lastPoint = this._pathPoints[this._pathPoints.length - 1];
    const numPoints = halfPoints;
    const segmentLength = this._pathLength / (numPoints * 2);

    for (let i = 0; i < numPoints; i++) {
      const z = lastPoint.z - (i + 1) * segmentLength;
      const noiseScale = 0.08;
      const curveAmplitude = 120;

      // Use different noise offset for variety
      const noiseOffset = this._pathPoints.length + i;

      let x, y;
      if (this._noise) {
        // Layer multiple noise frequencies for complex curves
        x = this._noise(noiseOffset * noiseScale, 0, 0) * curveAmplitude +
            this._noise(noiseOffset * noiseScale * 2, 50, 0) * curveAmplitude * 0.4;
        y = this._noise(0, noiseOffset * noiseScale, 100) * curveAmplitude +
            this._noise(50, noiseOffset * noiseScale * 2, 100) * curveAmplitude * 0.4;
      } else {
        x = Math.sin(noiseOffset * 0.15) * curveAmplitude + Math.sin(noiseOffset * 0.3) * curveAmplitude * 0.4;
        y = Math.cos(noiseOffset * 0.2) * curveAmplitude + Math.cos(noiseOffset * 0.4) * curveAmplitude * 0.4;
      }

      this._pathPoints.push(new THREE.Vector3(x, y, z));
    }

    // Recreate curve
    this._tunnelPath = new THREE.CatmullRomCurve3(this._pathPoints);

    // Update mesh geometry
    if (this._tunnelMesh) {
      const geometry = new THREE.TubeGeometry(
        this._tunnelPath,
        this._pathSegments,
        this._tunnelRadius,
        this._radialSegments,
        false
      );

      if (this._tunnelMesh.geometry) {
        this._tunnelMesh.geometry.dispose();
      }
      this._tunnelMesh.geometry = geometry;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Resize handling
  // ─────────────────────────────────────────────────────────────

  _onResize() {
    super._onResize();

    if (this._camera && this._renderer) {
      this._camera.aspect = this._viewportWidth / this._viewportHeight;
      this._camera.updateProjectionMatrix();
      this._renderer.setSize(this._viewportWidth, this._viewportHeight);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────

  render() {
    return html`
      <div class="screensaver-container">
        <div class="tunnel-canvas"></div>

        ${this._loadingImages ? html`
          <div class="loading-overlay">
            <div class="loading-text">Loading game artwork...</div>
            <div class="loading-bar">
              <div class="loading-progress" style="width: ${this._loadProgress}%"></div>
            </div>
          </div>
        ` : html`
          <div class="arcade-branding">
            <div class="arcade-title">${this.arcadeName}</div>
            <div class="arcade-subtitle">INSERT COIN TO PLAY</div>
          </div>
        `}

        <div class="vignette"></div>
        <div class="exit-hint">Press any key or move mouse to exit</div>
      </div>
    `;
  }
}

customElements.define('rwl-screensaver-tunnel', RwlScreensaverTunnel);
