/**
 * RetroWebLauncher - Theme Compiler
 * Converts user-friendly JSON theme configs into comprehensive CSS
 * Generates ALL CSS variables needed for a complete theme
 */

const fs = require('fs');
const path = require('path');

/**
 * Color palette presets - users pick names, we provide hex codes
 */
const COLOR_PRESETS = {
  // Neons
  'neon-pink': '#ff0066',
  'neon-cyan': '#00ffff',
  'neon-green': '#00ff66',
  'neon-purple': '#bf00ff',
  'neon-orange': '#ff6600',
  'neon-yellow': '#ffff00',
  'neon-blue': '#0066ff',
  'neon-red': '#ff0033',

  // Pastels
  'pastel-pink': '#ffb3d9',
  'pastel-blue': '#b3d9ff',
  'pastel-green': '#b3ffb3',
  'pastel-purple': '#d9b3ff',
  'pastel-orange': '#ffd9b3',

  // Dark backgrounds
  'pitch-black': '#000000',
  'near-black': '#0a0a0a',
  'dark-gray': '#1a1a1a',
  'charcoal': '#2d2d2d',
  'midnight-blue': '#0d1117',
  'dark-purple': '#1a0a2e',
  'dark-green': '#0a1a0a',
  'dark-red': '#1a0a0a',
  'dark-teal': '#0a1a1a',

  // Light backgrounds
  'light-gray': '#f8fafc',
  'off-white': '#f5f5f5',
  'pure-white': '#ffffff',
  'cream': '#fffdd0',
  'light-blue': '#e0f2fe',

  // Rich colors
  'royal-blue': '#4169e1',
  'crimson': '#dc143c',
  'gold': '#ffd700',
  'emerald': '#50c878',
  'amethyst': '#9966cc',
  'coral': '#ff7f50',
  'teal': '#008080',
  'indigo': '#6366f1',
  'forest-green': '#228b22',
  'ruby': '#e0115f',

  // Metallics
  'silver': '#c0c0c0',
  'bronze': '#cd7f32',
  'copper': '#b87333',

  // Whites/Grays
  'slate-gray': '#64748b',
  'warm-gray': '#78716c'
};

/**
 * Font presets - users pick style, we provide font stack
 */
const FONT_PRESETS = {
  'pixel': "'Press Start 2P', monospace",
  'retro': "'VT323', 'Courier New', monospace",
  'arcade': "'Russo One', 'Impact', sans-serif",
  'futuristic': "'Orbitron', 'Arial', sans-serif",
  'modern': "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  'elegant': "'Playfair Display', 'Georgia', serif",
  'tech': "'Roboto Mono', 'Consolas', monospace",
  'bold': "'Bebas Neue', 'Impact', sans-serif",
  'clean': "'Poppins', 'Helvetica', sans-serif",
  'gaming': "'Press Start 2P', 'Silkscreen', monospace"
};

/**
 * Effect presets that generate CSS animations
 */
const EFFECT_PRESETS = {
  'scanlines': `
[data-theme="{THEME}"] body::after {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0, 0, 0, 0.1) 0px,
    rgba(0, 0, 0, 0.1) 1px,
    transparent 1px,
    transparent 3px
  );
  pointer-events: none;
  z-index: 9998;
}`,
  'crt-flicker': `
@keyframes crt-flicker-{THEME} {
  0%, 100% { opacity: 1; }
  92% { opacity: 1; }
  93% { opacity: 0.9; }
  94% { opacity: 1; }
}
[data-theme="{THEME}"] .crt-effect { animation: crt-flicker-{THEME} 0.15s infinite; }`,
  'particles': `
[data-theme="{THEME}"] body::before {
  content: '';
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image:
    radial-gradient(2px 2px at 20px 30px, var(--color-primary), transparent),
    radial-gradient(2px 2px at 60px 100px, var(--color-secondary), transparent),
    radial-gradient(2px 2px at 100px 50px, var(--color-accent), transparent),
    radial-gradient(2px 2px at 140px 150px, var(--color-primary), transparent),
    radial-gradient(2px 2px at 180px 80px, var(--color-secondary), transparent);
  background-repeat: repeat;
  background-size: 200px 200px;
  animation: particle-drift-{THEME} 30s linear infinite;
  opacity: 0.5;
  pointer-events: none;
  z-index: -1;
}
@keyframes particle-drift-{THEME} {
  0% { transform: translateY(0); }
  100% { transform: translateY(-200px); }
}`,
  'starfield': `
[data-theme="{THEME}"] .starfield::before {
  content: '';
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image:
    radial-gradient(1px 1px at 10% 20%, white, transparent),
    radial-gradient(1.5px 1.5px at 30% 50%, rgba(255,255,255,0.8), transparent),
    radial-gradient(1px 1px at 70% 30%, white, transparent),
    radial-gradient(1px 1px at 90% 80%, rgba(255,255,255,0.6), transparent);
  background-size: 200px 200px;
  animation: stars-twinkle-{THEME} 4s ease-in-out infinite alternate;
  pointer-events: none;
  z-index: -2;
}
@keyframes stars-twinkle-{THEME} {
  0% { opacity: 0.5; }
  100% { opacity: 1; }
}`,
  'pulse-glow': `
@keyframes pulse-glow-{THEME} {
  0%, 100% { box-shadow: 0 0 20px var(--color-primary); }
  50% { box-shadow: 0 0 40px var(--color-primary), 0 0 60px var(--color-primary); }
}
[data-theme="{THEME}"] .pulse-glow { animation: pulse-glow-{THEME} 2s ease-in-out infinite; }`,
  'neon-flicker': `
@keyframes neon-flicker-{THEME} {
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
    text-shadow:
      0 0 4px var(--color-primary),
      0 0 11px var(--color-primary),
      0 0 19px var(--color-primary);
  }
  20%, 24%, 55% { text-shadow: none; }
}
[data-theme="{THEME}"] .neon-flicker { animation: neon-flicker-{THEME} 1.5s infinite alternate; }`,
  'floating': `
@keyframes floating-{THEME} {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
[data-theme="{THEME}"] .floating { animation: floating-{THEME} 3s ease-in-out infinite; }`,
  'rainbow-border': `
@keyframes rainbow-spin-{THEME} {
  to { --rainbow-angle: 360deg; }
}
@property --rainbow-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
[data-theme="{THEME}"] .rainbow-border::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: inherit;
  padding: 3px;
  background: linear-gradient(var(--rainbow-angle, 0deg), #ff0066, #ff8800, #ffff00, #00ff66, #00ffff, #0066ff, #ff00ff, #ff0066);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: rainbow-spin-{THEME} 3s linear infinite;
}`,
  'glass-morphism': `
[data-theme="{THEME}"] .glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}`
};

/**
 * Compile a theme config into comprehensive CSS
 */
function compileTheme(config) {
  const themeName = config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const isLight = config.isLight || false;

  // Resolve colors
  const colors = {
    primary: resolveColor(config.colors?.primary || 'neon-pink'),
    primaryHover: resolveColor(config.colors?.primaryHover) || adjustBrightness(resolveColor(config.colors?.primary || 'neon-pink'), isLight ? -15 : 20),
    secondary: resolveColor(config.colors?.secondary || 'neon-cyan'),
    accent: resolveColor(config.colors?.accent || 'neon-yellow'),
    background: resolveColor(config.colors?.background || (isLight ? 'light-gray' : 'near-black')),
    surface: resolveColor(config.colors?.surface || (isLight ? 'pure-white' : 'dark-gray')),
    surfaceElevated: resolveColor(config.colors?.surfaceElevated || (isLight ? 'off-white' : 'charcoal')),
    text: resolveColor(config.colors?.text || (isLight ? 'dark-gray' : 'pure-white')),
    textMuted: resolveColor(config.colors?.textMuted || (isLight ? 'slate-gray' : 'silver')),
    success: resolveColor(config.colors?.success || 'neon-green'),
    warning: resolveColor(config.colors?.warning || 'neon-orange'),
    error: resolveColor(config.colors?.error || 'neon-red')
  };

  // Resolve fonts
  const fonts = {
    display: FONT_PRESETS[config.fonts?.display] || FONT_PRESETS['retro'],
    body: FONT_PRESETS[config.fonts?.body] || FONT_PRESETS['modern']
  };

  // Glow intensity
  const glowIntensity = config.glowIntensity || 'medium';
  const glowSizes = {
    'subtle': { sm: 10, md: 20, lg: 30 },
    'medium': { sm: 20, md: 40, lg: 60 },
    'intense': { sm: 30, md: 60, lg: 100 },
    'extreme': { sm: 50, md: 100, lg: 150 }
  };
  const glow = glowSizes[glowIntensity] || glowSizes.medium;

  // Animation speed
  const animSpeed = config.animationSpeed || 'normal';
  const speeds = {
    'slow': { fast: 300, normal: 500, slow: 800 },
    'normal': { fast: 150, normal: 250, slow: 400 },
    'fast': { fast: 100, normal: 150, slow: 250 },
    'instant': { fast: 50, normal: 100, slow: 150 }
  };
  const speed = speeds[animSpeed] || speeds.normal;

  // Border radius style
  const borderStyle = config.borderStyle || 'rounded';
  const radii = {
    'sharp': { sm: 0, md: 2, lg: 4 },
    'subtle': { sm: 2, md: 4, lg: 8 },
    'rounded': { sm: 4, md: 8, lg: 12 },
    'very-rounded': { sm: 8, md: 16, lg: 24 },
    'pill': { sm: 20, md: 50, lg: 100 }
  };
  const radius = radii[borderStyle] || radii.rounded;

  // Helper to create rgba from hex
  const rgba = (hex, alpha) => hexToRgba(hex, alpha);
  const p = colors.primary;
  const s = colors.secondary;
  const a = colors.accent;
  const bg = colors.background;
  const sf = colors.surface;

  // Build effects CSS
  let effectsCSS = '';
  if (config.effects && Array.isArray(config.effects)) {
    for (const effect of config.effects) {
      if (EFFECT_PRESETS[effect]) {
        effectsCSS += EFFECT_PRESETS[effect].replace(/\{THEME\}/g, themeName) + '\n';
      }
    }
  }

  // Generate the comprehensive CSS
  const css = `/**
 * ${config.displayName || config.name} Theme
 * ${config.description || 'AI-Generated RetroWebLauncher theme'}
 * Generated by Theme Compiler
 */

[data-theme="${themeName}"] {
  /* ========== BASE COLORS ========== */
  --color-primary: ${p};
  --color-primary-hover: ${colors.primaryHover};
  --color-secondary: ${s};
  --color-accent: ${a};

  --color-background: ${bg};
  --color-surface: ${sf};
  --color-surface-elevated: ${colors.surfaceElevated};

  --color-text: ${colors.text};
  --color-text-muted: ${colors.textMuted};
  --color-text-secondary: ${adjustBrightness(colors.textMuted, isLight ? 20 : -20)};

  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};

  /* ========== GRADIENTS ========== */
  --gradient-primary: linear-gradient(135deg, ${p} 0%, ${s} 100%);
  --gradient-surface: linear-gradient(180deg, ${rgba(bg, 0.9)} 0%, ${rgba(bg, 0.7)} 100%);

  /* ========== TYPOGRAPHY ========== */
  --font-display: ${fonts.display};
  --font-body: ${fonts.body};

  --font-size-xs: 0.625rem;
  --font-size-sm: 0.75rem;
  --font-size-base: 0.875rem;
  --font-size-lg: 1rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;

  /* ========== SPACING ========== */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  /* ========== BORDER RADIUS ========== */
  --radius-sm: ${radius.sm}px;
  --radius-md: ${radius.md}px;
  --radius-lg: ${radius.lg}px;
  --radius-xl: ${Math.round(radius.lg * 1.5)}px;
  --radius-full: 9999px;

  /* ========== SHADOWS & GLOWS ========== */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, ${isLight ? 0.1 : 0.5});
  --shadow-md: 0 4px 12px rgba(0, 0, 0, ${isLight ? 0.15 : 0.6});
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, ${isLight ? 0.2 : 0.7});
  --shadow-glow: 0 0 ${glow.md}px ${rgba(p, 0.6)}, 0 0 ${glow.lg}px ${rgba(p, 0.3)};
  --shadow-glow-intense: 0 0 ${glow.lg}px ${rgba(p, 0.8)}, 0 0 ${glow.lg * 1.5}px ${rgba(p, 0.5)};

  /* ========== TRANSITIONS ========== */
  --transition-fast: ${speed.fast}ms ease;
  --transition-normal: ${speed.normal}ms ease;
  --transition-slow: ${speed.slow}ms ease;

  /* ========== FOCUS ========== */
  --focus-ring-color: ${p};
  --focus-ring-width: 3px;

  /* ========== LAYOUT ========== */
  --header-height: 64px;
  --sidebar-width: 280px;

  /* ========== Z-INDEX ========== */
  --z-sidebar: 100;
  --z-header: 200;
  --z-modal: 500;
  --z-toast: 600;
  --z-screensaver: 9999;

  /* ========== HEADER STYLING ========== */
  --header-background: linear-gradient(180deg, ${rgba(bg, 0.95)} 0%, ${rgba(sf, 0.9)} 100%);
  --header-border-color: ${isLight ? rgba('#000000', 0.1) : p};
  --header-text-color: ${colors.text};
  --header-btn-background: ${rgba(p, isLight ? 0.1 : 0.15)};
  --header-btn-border: ${rgba(p, isLight ? 0.2 : 0.3)};
  --header-btn-background-hover: ${rgba(p, isLight ? 0.2 : 0.3)};

  /* ========== SIDEBAR STYLING ========== */
  --sidebar-background: ${isLight ? sf : `linear-gradient(180deg, ${rgba(bg, 0.95)} 0%, ${rgba(sf, 0.9)} 100%)`};
  --sidebar-border-color: ${rgba(p, isLight ? 0.15 : 0.3)};
  --sidebar-section-border: ${rgba(p, isLight ? 0.2 : 0.4)};
  --sidebar-item-hover: ${rgba(p, 0.15)};
  --sidebar-item-selected: ${rgba(p, 0.25)};
  --sidebar-text-color: ${colors.text};
  --sidebar-group-header-color: ${colors.textMuted};
  --sidebar-count-bg: ${rgba(p, 0.2)};

  /* ========== CONTENT/PANEL STYLING ========== */
  --content-background: ${rgba(bg, 0.9)};
  --content-surface: ${rgba(sf, 0.8)};
  --content-border: ${rgba(p, 0.2)};
  --content-overlay-dark: rgba(0, 0, 0, ${isLight ? 0.1 : 0.4});
  --content-overlay: rgba(0, 0, 0, ${isLight ? 0.3 : 0.6});
  --content-input-background: ${isLight ? sf : rgba('#000000', 0.4)};
  --content-input-border: ${rgba(isLight ? '#000000' : '#ffffff', 0.2)};
  --content-scrollbar-thumb: ${rgba(p, 0.4)};
  --content-scrollbar-track: ${rgba(isLight ? '#000000' : '#ffffff', 0.1)};
  --content-scrollbar-thumb-hover: ${rgba(p, 0.6)};

  /* ========== BADGE STYLING ========== */
  --badge-background: ${rgba(isLight ? '#ffffff' : '#000000', 0.85)};
  --badge-shadow: 0 1px 3px rgba(0, 0, 0, ${isLight ? 0.2 : 0.5});
  --badge-text-color: ${colors.text};
  --badge-glow: ${rgba(p, 0.4)};
  --game-count-badge-bg: ${rgba(p, 0.9)};
  --game-count-badge-color: ${isLight ? '#ffffff' : colors.text};

  /* ========== BUTTON STYLING ========== */
  --button-secondary-bg: ${rgba(p, 0.1)};
  --button-secondary-hover: ${rgba(p, 0.2)};
  --button-secondary-border: ${rgba(p, 0.3)};
  --button-active-bg: ${rgba(p, 0.25)};
  --button-active-border: ${rgba(p, 0.5)};
  --button-primary-shadow: ${rgba(p, 0.3)};
  --button-primary-shadow-hover: ${rgba(p, 0.4)};

  /* ========== SELECTION STYLING ========== */
  --selection-border-width: 3px;
  --selection-border-color: ${p};
  --selection-glow-color: ${p};
  --selection-glow-rgba: ${rgba(p, 0.4)};
  --selection-glow-secondary: ${rgba(s, 0.2)};
  --selection-hover-bg: ${rgba(p, 0.15)};

  /* ========== NAVIGATION CONTROLS ========== */
  --nav-btn-bg: ${rgba(p, 0.15)};
  --nav-btn-border: ${rgba(p, 0.4)};
  --nav-btn-color: ${p};
  --nav-btn-hover-bg: ${rgba(p, 0.3)};
  --counter-color: ${p};
  --controls-bar-bg: ${rgba(isLight ? '#ffffff' : sf, 0.95)};
  --controls-bar-border-color: ${isLight ? rgba('#000000', 0.1) : '#333'};
  --toolbar-background: ${rgba(isLight ? '#ffffff' : sf, 0.95)};
  --toolbar-border: ${isLight ? rgba('#000000', 0.1) : '#333'};

  /* ========== ALPHABET BAR ========== */
  --alphabet-bar-background: ${rgba(isLight ? '#ffffff' : '#000000', 0.8)};
  --alphabet-bar-border: ${rgba(p, isLight ? 0.1 : 0)};
  --alphabet-bar-bg: ${rgba(isLight ? '#ffffff' : '#000000', 0.8)};
  --alphabet-letter-color: ${rgba(colors.text, 0.7)};
  --alphabet-letter-muted: ${rgba(colors.text, 0.25)};
  --alphabet-letter-active-bg: ${p};
  --alphabet-letter-active-color: ${isLight ? '#ffffff' : colors.text};

  /* ========== ARCADE NAME GLOW ========== */
  --arcade-name-glow: 0 0 10px ${rgba(p, 0.5)}, 0 0 20px ${rgba(p, 0.3)};
  --arcade-name-glow-color: ${rgba(p, 0.5)};

  /* ========== BREADCRUMB ========== */
  --breadcrumb-background: ${rgba(isLight ? '#ffffff' : '#000000', 0.5)};

  /* ========== CAROUSEL ========== */
  --carousel-reflection-gradient: linear-gradient(0deg, ${bg} 0%, transparent 100%);

  /* ========== CRT/VIDEO STYLING ========== */
  --crt-frame-background: ${isLight ? `linear-gradient(145deg, #e2e8f0, #f1f5f9)` : `linear-gradient(145deg, #2a2a2a, #1a1a1a)`};
  --crt-frame-border: ${rgba(isLight ? '#000000' : '#ffffff', 0.1)};
  --crt-screen-background: ${isLight ? '#1e293b' : '#000'};
  --crt-led-on: ${colors.success};
  --crt-led-off: ${isLight ? '#cbd5e1' : '#333'};

  /* ========== GAME CARDS ========== */
  --game-card-background: ${isLight ? sf : '#1a1a1a'};
  --game-card-border: ${rgba(isLight ? '#000000' : '#ffffff', 0.1)};
  --game-card-shadow: 0 4px 12px rgba(0, 0, 0, ${isLight ? 0.1 : 0.5});
  --game-card-hover-shadow: 0 8px 24px rgba(0, 0, 0, ${isLight ? 0.15 : 0.6});
  --game-card-image-bg: ${isLight ? '#e2e8f0' : `linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)`};
  --game-card-no-image-bg: ${isLight ? `linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)` : `linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%)`};
  --game-card-title-bg: linear-gradient(transparent, rgba(0, 0, 0, 0.6));
  --grid-hover-scale: 1.03;

  /* ========== VIEW BACKGROUNDS ========== */
  --view-background: ${isLight
    ? `linear-gradient(180deg, ${bg} 0%, ${colors.surfaceElevated} 50%, ${bg} 100%)`
    : `linear-gradient(180deg, ${bg} 0%, ${adjustBrightness(bg, 10)} 50%, ${bg} 100%)`};
  --bg-brightness: ${isLight ? 0.85 : 0.4};
  --bg-gradient-overlay: ${isLight
    ? `radial-gradient(ellipse at center bottom, transparent 0%, ${rgba('#ffffff', 0.7)} 70%),
       linear-gradient(180deg, ${rgba('#ffffff', 0.2)} 0%, transparent 30%, transparent 60%, ${rgba('#ffffff', 0.5)} 100%)`
    : `radial-gradient(ellipse at center bottom, transparent 0%, ${rgba(bg, 0.9)} 70%),
       linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 60%, rgba(0,0,0,0.8) 100%)`};

  /* ========== SYSTEM CAROUSEL ========== */
  --system-card-background: ${isLight
    ? `linear-gradient(135deg, ${sf} 0%, ${colors.surfaceElevated} 50%, ${adjustBrightness(colors.surfaceElevated, -10)} 100%)`
    : `linear-gradient(135deg, ${adjustBrightness(bg, 15)} 0%, ${adjustBrightness(bg, 25)} 50%, ${adjustBrightness(bg, 35)} 100%)`};
  --system-card-border: ${rgba(isLight ? '#000000' : '#ffffff', 0.1)};
  --system-info-background: ${isLight
    ? `linear-gradient(180deg, ${rgba('#ffffff', 0.95)} 0%, ${rgba(bg, 0.8)} 100%)`
    : `linear-gradient(180deg, rgba(0,0,0,0.8) 0%, transparent 100%)`};
  --system-name-color: ${colors.text};
  --system-meta-color: ${colors.textMuted};

  /* ========== SPINNER ========== */
  --spinner-track: ${isLight ? rgba('#000000', 0.15) : '#333'};

  /* ========== SETTINGS PANEL ========== */
  --settings-background: ${isLight ? sf : rgba('#000000', 0.9)};
  --settings-section-bg: ${rgba(isLight ? bg : '#ffffff', isLight ? 0.8 : 0.05)};
  --settings-border: ${rgba(p, isLight ? 0.15 : 0.3)};
  --settings-title-color: ${p};
  --settings-label-color: ${colors.text};
  --settings-desc-color: ${colors.textMuted};
  --settings-input-bg: ${isLight ? sf : rgba('#000000', 0.4)};
  --settings-input-border: ${rgba(isLight ? '#000000' : '#ffffff', 0.2)};
  --settings-footer-background: ${isLight
    ? `linear-gradient(transparent, ${rgba('#ffffff', 0.95)} 30%)`
    : `linear-gradient(transparent, rgba(0,0,0,0.9) 30%)`};

  /* ========== SCREENSAVER ========== */
  --screensaver-background: ${isLight ? '#1e293b' : bg};
  --screensaver-star-color: #fff;
  --screensaver-nebula-primary: ${rgba(p, 0.15)};
  --screensaver-nebula-secondary: ${rgba(s, 0.12)};
  --screensaver-nebula-accent: ${rgba(a, 0.1)};
  --screensaver-nebula-opacity: 0.6;
  --screensaver-tv-frame: ${isLight ? `linear-gradient(145deg, #64748b, #475569)` : `linear-gradient(145deg, #3a3a3a, #1a1a1a)`};
  --screensaver-tv-glow: ${rgba(p, 0.15)};
  --screensaver-tv-border: ${isLight ? '#334155' : '#222'};
  --screensaver-title-color: #fff;
  --screensaver-title-glow: ${p};
  --screensaver-subtitle-color: rgba(255, 255, 255, 0.7);
  --screensaver-hint-color: rgba(255, 255, 255, 0.4);
  --screensaver-led-color: ${colors.success};
  --screensaver-label-bg: ${rgba(isLight ? '#1e293b' : '#000000', 0.8)};
  --screensaver-label-color: #fff;
  --screensaver-label-glow: ${p};
}

/* ========== BODY BACKGROUND ========== */
[data-theme="${themeName}"] body {
  background-color: ${bg};
  background-image:
    radial-gradient(ellipse at 20% 10%, ${rgba(p, isLight ? 0.08 : 0.2)} 0%, transparent 40%),
    radial-gradient(ellipse at 80% 90%, ${rgba(s, isLight ? 0.06 : 0.15)} 0%, transparent 40%),
    radial-gradient(circle at 50% 50%, ${rgba(a, isLight ? 0.03 : 0.05)} 0%, transparent 60%);
  overflow-x: hidden;
}

/* ========== NEON TEXT EFFECTS ========== */
[data-theme="${themeName}"] .neon-text {
  text-shadow:
    0 0 5px currentColor,
    0 0 10px currentColor,
    0 0 20px currentColor,
    0 0 40px ${p};
}

/* ========== NEON BORDER EFFECTS ========== */
[data-theme="${themeName}"] .neon-border {
  border: 2px solid ${p};
  box-shadow:
    0 0 5px ${p},
    0 0 10px ${p},
    inset 0 0 5px ${rgba(p, 0.3)};
}

/* ========== CARD HOVER EFFECT ========== */
[data-theme="${themeName}"] .card-hover {
  transition:
    transform var(--transition-normal),
    box-shadow var(--transition-normal);
}

[data-theme="${themeName}"] .card-hover:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, ${isLight ? 0.2 : 0.4}),
    0 0 ${glow.md}px ${rgba(p, 0.3)};
}

/* ========== SELECTION PULSE ANIMATION ========== */
@keyframes selection-pulse-${themeName} {
  0%, 100% {
    box-shadow: 0 0 0 3px ${rgba(p, 0.3)}, 0 0 15px ${rgba(p, 0.2)};
  }
  50% {
    box-shadow: 0 0 0 5px ${rgba(p, 0.4)}, 0 0 25px ${rgba(p, 0.4)};
  }
}

[data-theme="${themeName}"] .card:focus,
[data-theme="${themeName}"] .game-card.active {
  animation: selection-pulse-${themeName} 2s ease-in-out infinite;
}

${effectsCSS}
`;

  return css;
}

/**
 * Resolve a color name to hex
 */
function resolveColor(color) {
  if (!color) return null;
  if (color.startsWith('#')) return color;
  return COLOR_PRESETS[color] || color;
}

/**
 * Convert hex to rgba
 */
function hexToRgba(hex, alpha) {
  const resolved = resolveColor(hex) || '#ff0066';
  const cleanHex = resolved.replace('#', '');
  const r = parseInt(cleanHex.slice(0, 2), 16);
  const g = parseInt(cleanHex.slice(2, 4), 16);
  const b = parseInt(cleanHex.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Adjust brightness of a color
 */
function adjustBrightness(color, percent) {
  const resolved = resolveColor(color) || '#ff0066';
  const cleanHex = resolved.replace('#', '');
  const num = parseInt(cleanHex, 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, Math.max(0, (num >> 16) + amt));
  const G = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amt));
  const B = Math.min(255, Math.max(0, (num & 0x0000FF) + amt));
  return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

/**
 * Get list of available presets
 */
function getPresets() {
  return {
    colors: Object.keys(COLOR_PRESETS),
    fonts: Object.keys(FONT_PRESETS),
    effects: Object.keys(EFFECT_PRESETS)
  };
}

/**
 * Save compiled theme
 */
function saveCompiledTheme(config) {
  const themeName = config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const css = compileTheme(config);

  const themesDir = path.join(__dirname, '..', '..', 'client', 'css', 'themes');
  if (!fs.existsSync(themesDir)) {
    fs.mkdirSync(themesDir, { recursive: true });
  }

  const cssPath = path.join(themesDir, `${themeName}.css`);
  fs.writeFileSync(cssPath, css, 'utf-8');

  // Also save the config JSON for editing later
  const configDir = path.join(__dirname, '..', '..', '..', 'themes');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const configPath = path.join(configDir, `${themeName}.json`);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

  return { cssPath, configPath, themeName };
}

module.exports = {
  compileTheme,
  saveCompiledTheme,
  getPresets,
  COLOR_PRESETS,
  FONT_PRESETS,
  EFFECT_PRESETS
};
