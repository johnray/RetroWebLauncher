/**
 * RetroWebLauncher - Theme Compiler
 * Converts user-friendly JSON theme configs into CSS
 *
 * Users describe themes with simple terms - no CSS knowledge required!
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

  // Rich colors
  'royal-blue': '#4169e1',
  'crimson': '#dc143c',
  'gold': '#ffd700',
  'emerald': '#50c878',
  'amethyst': '#9966cc',
  'coral': '#ff7f50',
  'teal': '#008080',
  'indigo': '#6366f1',

  // Metallics
  'silver': '#c0c0c0',
  'bronze': '#cd7f32',
  'copper': '#b87333',

  // Whites
  'pure-white': '#ffffff',
  'off-white': '#f5f5f5',
  'cream': '#fffdd0'
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
 * Effect presets that generate CSS
 */
const EFFECT_PRESETS = {
  'scanlines': `
    .scanlines::after {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: repeating-linear-gradient(
        0deg,
        rgba(0, 0, 0, 0.15) 0px,
        rgba(0, 0, 0, 0.15) 1px,
        transparent 1px,
        transparent 2px
      );
      pointer-events: none;
      z-index: 9998;
    }
  `,
  'crt-flicker': `
    @keyframes crt-flicker {
      0%, 100% { opacity: 1; }
      92% { opacity: 1; }
      93% { opacity: 0.9; }
      94% { opacity: 1; }
    }
    .crt-flicker { animation: crt-flicker 0.15s infinite; }
  `,
  'vhs-tracking': `
    @keyframes vhs-tracking {
      0% { transform: translateX(0); }
      2% { transform: translateX(-2px); }
      4% { transform: translateX(2px); }
      6% { transform: translateX(0); }
    }
    .vhs-effect { animation: vhs-tracking 0.5s infinite; }
  `,
  'chromatic-aberration': `
    .chromatic {
      text-shadow:
        -2px 0 #ff0000,
        2px 0 #00ffff;
    }
  `,
  'glitch': `
    @keyframes glitch {
      0%, 90%, 100% { transform: translate(0); filter: none; }
      91% { transform: translate(-5px, 2px); filter: hue-rotate(90deg); }
      92% { transform: translate(5px, -2px); filter: hue-rotate(-90deg); }
      93% { transform: translate(-3px, 1px); }
      94% { transform: translate(3px, -1px); }
    }
    .glitch { animation: glitch 3s infinite; }
  `,
  'neon-flicker': `
    @keyframes neon-flicker {
      0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
        text-shadow:
          0 0 4px var(--color-primary),
          0 0 11px var(--color-primary),
          0 0 19px var(--color-primary),
          0 0 40px var(--color-primary);
      }
      20%, 24%, 55% {
        text-shadow: none;
      }
    }
    .neon-flicker { animation: neon-flicker 1.5s infinite alternate; }
  `,
  'rainbow-glow': `
    @keyframes rainbow-glow {
      0% { filter: drop-shadow(0 0 10px #ff0000); }
      14% { filter: drop-shadow(0 0 10px #ff8800); }
      28% { filter: drop-shadow(0 0 10px #ffff00); }
      42% { filter: drop-shadow(0 0 10px #00ff00); }
      57% { filter: drop-shadow(0 0 10px #00ffff); }
      71% { filter: drop-shadow(0 0 10px #0000ff); }
      85% { filter: drop-shadow(0 0 10px #ff00ff); }
      100% { filter: drop-shadow(0 0 10px #ff0000); }
    }
    .rainbow-glow { animation: rainbow-glow 5s infinite linear; }
  `,
  'floating': `
    @keyframes floating {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .floating { animation: floating 3s ease-in-out infinite; }
  `,
  'pulse-glow': `
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px var(--color-primary); }
      50% { box-shadow: 0 0 40px var(--color-primary), 0 0 60px var(--color-primary); }
    }
    .pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
  `,
  'rotate-hue': `
    @keyframes rotate-hue {
      0% { filter: hue-rotate(0deg); }
      100% { filter: hue-rotate(360deg); }
    }
    .rotate-hue { animation: rotate-hue 10s linear infinite; }
  `,
  'shake': `
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
      20%, 40%, 60%, 80% { transform: translateX(2px); }
    }
    .shake:hover { animation: shake 0.5s ease-in-out; }
  `,
  'particles': `
    .particles::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image:
        radial-gradient(circle, var(--color-primary) 1px, transparent 1px),
        radial-gradient(circle, var(--color-secondary) 1px, transparent 1px);
      background-size: 100px 100px, 150px 150px;
      background-position: 0 0, 50px 50px;
      animation: particles-float 20s linear infinite;
      opacity: 0.3;
      pointer-events: none;
      z-index: -1;
    }
    @keyframes particles-float {
      0% { transform: translateY(0); }
      100% { transform: translateY(-100px); }
    }
  `,
  'starfield': `
    .starfield::before {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background:
        radial-gradient(1px 1px at 20px 30px, white, transparent),
        radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
        radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
        radial-gradient(1px 1px at 90px 40px, white, transparent),
        radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
        radial-gradient(2px 2px at 160px 120px, white, transparent);
      background-repeat: repeat;
      background-size: 200px 200px;
      animation: starfield-twinkle 4s ease-in-out infinite;
      pointer-events: none;
      z-index: -1;
    }
    @keyframes starfield-twinkle {
      0%, 100% { opacity: 0.8; }
      50% { opacity: 1; }
    }
  `,
  'glass-morphism': `
    .glass {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
  `,
  'depth-3d': `
    .depth-3d {
      transform-style: preserve-3d;
      perspective: 1000px;
    }
    .depth-3d:hover {
      transform: translateZ(20px) rotateX(5deg) rotateY(5deg);
    }
  `
};

/**
 * Compile a theme config into CSS
 * @param {Object} config - User-friendly theme configuration
 * @returns {string} Generated CSS
 */
function compileTheme(config) {
  const themeName = config.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

  // Resolve colors
  const colors = {
    primary: resolveColor(config.colors?.primary || 'neon-pink'),
    primaryHover: resolveColor(config.colors?.primaryHover || adjustBrightness(config.colors?.primary || 'neon-pink', 20)),
    secondary: resolveColor(config.colors?.secondary || 'neon-cyan'),
    accent: resolveColor(config.colors?.accent || 'neon-yellow'),
    background: resolveColor(config.colors?.background || 'near-black'),
    surface: resolveColor(config.colors?.surface || 'dark-gray'),
    surfaceElevated: resolveColor(config.colors?.surfaceElevated || 'charcoal'),
    text: resolveColor(config.colors?.text || 'pure-white'),
    textMuted: resolveColor(config.colors?.textMuted || 'silver'),
    success: resolveColor(config.colors?.success || 'neon-green'),
    warning: resolveColor(config.colors?.warning || 'neon-orange'),
    error: resolveColor(config.colors?.error || 'neon-red')
  };

  // Resolve fonts
  const fonts = {
    display: FONT_PRESETS[config.fonts?.display] || FONT_PRESETS['pixel'],
    body: FONT_PRESETS[config.fonts?.body] || FONT_PRESETS['modern']
  };

  // Build effects CSS
  let effectsCSS = '';
  if (config.effects && Array.isArray(config.effects)) {
    for (const effect of config.effects) {
      if (EFFECT_PRESETS[effect]) {
        effectsCSS += EFFECT_PRESETS[effect] + '\n';
      }
    }
  }

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

  // Generate the CSS
  const css = `/**
 * ${config.displayName || config.name} Theme
 * ${config.description || 'Custom RetroWebLauncher theme'}
 * Generated by Theme Compiler
 */

[data-theme="${themeName}"] {
  /* Colors */
  --color-primary: ${colors.primary};
  --color-primary-hover: ${colors.primaryHover};
  --color-secondary: ${colors.secondary};
  --color-accent: ${colors.accent};

  --color-background: ${colors.background};
  --color-surface: ${colors.surface};
  --color-surface-elevated: ${colors.surfaceElevated};

  --color-text: ${colors.text};
  --color-text-muted: ${colors.textMuted};
  --color-text-secondary: ${adjustBrightness(colors.textMuted, -20)};

  --color-success: ${colors.success};
  --color-warning: ${colors.warning};
  --color-error: ${colors.error};

  /* Gradients */
  --gradient-primary: linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%);
  --gradient-surface: linear-gradient(180deg, ${colors.surface} 0%, ${colors.background} 100%);

  /* Typography */
  --font-display: ${fonts.display};
  --font-body: ${fonts.body};

  --font-size-xs: 0.625rem;
  --font-size-sm: 0.75rem;
  --font-size-base: 0.875rem;
  --font-size-lg: 1rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 2rem;

  /* Spacing */
  --spacing-xs: 0.25rem;
  --spacing-sm: 0.5rem;
  --spacing-md: 1rem;
  --spacing-lg: 1.5rem;
  --spacing-xl: 2rem;
  --spacing-2xl: 3rem;

  /* Border Radius */
  --radius-sm: ${radius.sm}px;
  --radius-md: ${radius.md}px;
  --radius-lg: ${radius.lg}px;
  --radius-xl: ${radius.lg * 1.5}px;
  --radius-full: 9999px;

  /* Shadows & Glows */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 ${glow.md}px ${colors.primary};
  --shadow-glow-intense: 0 0 ${glow.lg}px ${colors.primary}, 0 0 ${glow.lg * 1.5}px ${colors.primary};

  /* Transitions */
  --transition-fast: ${speed.fast}ms ease;
  --transition-normal: ${speed.normal}ms ease;
  --transition-slow: ${speed.slow}ms ease;

  /* Focus */
  --focus-ring-color: ${colors.primary};
  --focus-ring-width: 3px;

  /* Layout */
  --header-height: 64px;
  --sidebar-width: 280px;

  /* Z-index */
  --z-sidebar: 100;
  --z-header: 200;
  --z-modal: 500;
  --z-toast: 600;
  --z-screensaver: 9999;
}

/* Background with effects */
[data-theme="${themeName}"] body {
  background-color: ${colors.background};
  background-image:
    radial-gradient(ellipse at 20% 0%, ${hexToRgba(colors.primary, 0.15)} 0%, transparent 50%),
    radial-gradient(ellipse at 80% 100%, ${hexToRgba(colors.secondary, 0.1)} 0%, transparent 50%),
    radial-gradient(circle at 50% 50%, ${hexToRgba(colors.accent, 0.05)} 0%, transparent 70%);
}

/* Neon text effect */
[data-theme="${themeName}"] .neon-text {
  text-shadow:
    0 0 ${glow.sm / 2}px ${colors.primary},
    0 0 ${glow.sm}px ${colors.primary},
    0 0 ${glow.md}px ${colors.primary},
    0 0 ${glow.lg}px ${colors.primary};
}

/* Neon box effect */
[data-theme="${themeName}"] .neon-box {
  box-shadow:
    0 0 ${glow.sm / 2}px ${colors.primary},
    0 0 ${glow.sm}px ${colors.primary},
    inset 0 0 ${glow.sm / 2}px ${hexToRgba(colors.primary, 0.3)};
}

/* Glowing border */
[data-theme="${themeName}"] .glow-border {
  border: 2px solid ${colors.primary};
  box-shadow:
    0 0 ${glow.sm}px ${colors.primary},
    inset 0 0 ${glow.sm}px ${hexToRgba(colors.primary, 0.2)};
}

/* Animated gradient border */
[data-theme="${themeName}"] .animated-border {
  position: relative;
  background: ${colors.surface};
  border-radius: var(--radius-lg);
}

[data-theme="${themeName}"] .animated-border::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: inherit;
  padding: 2px;
  background: linear-gradient(
    var(--border-angle, 0deg),
    ${colors.primary},
    ${colors.secondary},
    ${colors.accent},
    ${colors.primary}
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: border-rotate 4s linear infinite;
}

@keyframes border-rotate {
  to { --border-angle: 360deg; }
}

@property --border-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}

/* Card hover effect */
[data-theme="${themeName}"] .card-hover {
  transition:
    transform var(--transition-normal),
    box-shadow var(--transition-normal);
}

[data-theme="${themeName}"] .card-hover:hover {
  transform: translateY(-5px) scale(1.02);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.4),
    0 0 ${glow.md}px ${hexToRgba(colors.primary, 0.3)};
}

/* Button glow pulse */
[data-theme="${themeName}"] .btn-glow {
  animation: btn-glow-pulse 2s ease-in-out infinite;
}

@keyframes btn-glow-pulse {
  0%, 100% {
    box-shadow: 0 0 ${glow.sm}px ${colors.primary};
  }
  50% {
    box-shadow: 0 0 ${glow.md}px ${colors.primary}, 0 0 ${glow.lg}px ${hexToRgba(colors.primary, 0.5)};
  }
}

${effectsCSS}
`;

  return css;
}

/**
 * Resolve a color name to hex
 */
function resolveColor(color) {
  if (!color) return '#ff0066';
  if (color.startsWith('#')) return color;
  return COLOR_PRESETS[color] || color;
}

/**
 * Convert hex to rgba
 */
function hexToRgba(hex, alpha) {
  const resolved = resolveColor(hex);
  const r = parseInt(resolved.slice(1, 3), 16);
  const g = parseInt(resolved.slice(3, 5), 16);
  const b = parseInt(resolved.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Adjust brightness of a color
 */
function adjustBrightness(color, percent) {
  const resolved = resolveColor(color);
  const num = parseInt(resolved.replace('#', ''), 16);
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
