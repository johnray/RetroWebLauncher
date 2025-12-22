# RetroWebLauncher Theme Creation Guide

This comprehensive guide explains how to create custom themes for RetroWebLauncher, covering CSS variables, theme settings, and best practices.

## Table of Contents

1. [Theme Overview](#theme-overview)
2. [File Structure](#file-structure)
3. [CSS Variables Reference](#css-variables-reference)
4. [Theme Settings (JSON)](#theme-settings-json)
5. [Creating a New Theme](#creating-a-new-theme)
6. [Effect Classes](#effect-classes)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## Theme Overview

RetroWebLauncher themes consist of two parts:

1. **CSS File** (`src/client/css/themes/{theme-name}.css`) - Defines visual styling, colors, fonts, and effects
2. **Settings File** (`src/server/themes/{theme-name}.json`) - Defines behavior, defaults, and component configuration

Themes are loaded dynamically and can be changed in Settings without restarting the application.

---

## File Structure

```
RetroWebLauncher/
├── src/
│   ├── client/
│   │   └── css/
│   │       └── themes/
│   │           ├── classic-arcade.css
│   │           ├── dark-modern.css
│   │           ├── synthwave.css
│   │           └── {your-theme}.css
│   └── server/
│       └── themes/
│           ├── classic-arcade.json
│           ├── dark-modern.json
│           └── {your-theme}.json
```

---

## CSS Variables Reference

All CSS variables use the `data-theme` attribute selector:

```css
[data-theme="your-theme-name"] {
  /* Your variables here */
}
```

### Color Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `--color-primary` | Main accent color (buttons, highlights) | `#ff0066` |
| `--color-primary-hover` | Primary color on hover | `#ff3388` |
| `--color-secondary` | Secondary accent color | `#00ffff` |
| `--color-accent` | Tertiary accent color | `#ffff00` |
| `--color-background` | Main background color | `#0a0a0a` |
| `--color-surface` | Card/panel background | `#111111` |
| `--color-surface-elevated` | Elevated surface (hover states) | `#1a1a1a` |
| `--color-text` | Primary text color | `#ffffff` |
| `--color-text-muted` | Secondary/muted text | `#888888` |
| `--color-text-secondary` | Alternative text color | `#cccccc` |
| `--color-success` | Success state color | `#00ff66` |
| `--color-warning` | Warning state color | `#ffaa00` |
| `--color-error` | Error state color | `#ff3333` |

### Gradient Variables

```css
--gradient-primary: linear-gradient(135deg, #ff0066 0%, #ff00ff 50%, #00ffff 100%);
--gradient-surface: linear-gradient(180deg, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 100%);
```

### Typography Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `--font-display` | Headings and titles | `'Press Start 2P', monospace` |
| `--font-body` | Body text | `'Inter', sans-serif` |
| `--font-size-xs` | Extra small text | `0.625rem` |
| `--font-size-sm` | Small text | `0.75rem` |
| `--font-size-base` | Base text size | `0.875rem` |
| `--font-size-lg` | Large text | `1rem` |
| `--font-size-xl` | Extra large text | `1.25rem` |
| `--font-size-2xl` | 2x large text | `1.5rem` |
| `--font-size-3xl` | 3x large text | `2rem` |

**Recommended Retro Fonts:**
- `'Press Start 2P'` - Classic pixel font (current default)
- `'VT323'` - Clean terminal/CRT style, more readable
- `'Silkscreen'` - Clean pixel font
- `'Pixelify Sans'` - Modern pixel-style, good balance
- `'DotGothic16'` - Japanese arcade style

### Spacing Variables

| Variable | Value |
|----------|-------|
| `--spacing-xs` | `0.25rem` |
| `--spacing-sm` | `0.5rem` |
| `--spacing-md` | `1rem` |
| `--spacing-lg` | `1.5rem` |
| `--spacing-xl` | `2rem` |
| `--spacing-2xl` | `3rem` |

### Border Radius Variables

| Variable | Value |
|----------|-------|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-xl` | `16px` |
| `--radius-full` | `9999px` |

### Shadow Variables

```css
--shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.5);
--shadow-md: 0 4px 12px rgba(0, 0, 0, 0.6);
--shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.7);
--shadow-glow: 0 0 30px rgba(255, 0, 102, 0.6), 0 0 60px rgba(255, 0, 102, 0.3);
```

### Transition Variables

```css
--transition-fast: 150ms ease;
--transition-normal: 250ms ease;
--transition-slow: 400ms ease;
```

### Focus Variables

```css
--focus-ring-color: #ff0066;
--focus-ring-width: 3px;
```

### Layout Variables

```css
--header-height: 64px;
--sidebar-width: 280px;
```

### Z-Index Variables

```css
--z-sidebar: 100;
--z-header: 200;
--z-modal: 500;
--z-toast: 600;
--z-screensaver: 9999;
```

---

## Theme Settings (JSON)

Create a JSON file in `src/server/themes/` with the same name as your CSS file.

### Full Settings Structure

```json
{
  "name": "Your Theme Name",
  "description": "A brief description of your theme",
  "author": "Your Name",
  "version": "1.0.0",
  "settings": {
    "views": {
      "systemSelector": "carousel",
      "systemDefault": "wheel",
      "collectionDefault": "grid",
      "searchDefault": "grid",
      "recentlyPlayedDefault": "grid"
    },
    "home": {
      "style": "carousel",
      "showSidebar": false,
      "showBreadcrumbs": true,
      "carouselControlsPosition": "bottom-center"
    },
    "ui": {
      "showViewToggle": true,
      "showSystemBadges": true,
      "showGameCount": true,
      "showConnectionStatus": true,
      "showNavButtons": true,
      "animationsEnabled": true
    },
    "effects": {
      "particlesEnabled": false,
      "scanlineEffect": false,
      "crtEffect": false,
      "chromaticAberration": false,
      "gridFloorEffect": false,
      "chromeTextEffect": false
    },
    "backgrounds": {
      "systemSelector": {
        "enabled": true,
        "type": "gradient",
        "blur": 0,
        "opacity": 1
      },
      "gameList": {
        "enabled": true,
        "type": "selected",
        "blur": 20,
        "brightness": 0.35,
        "opacity": 1,
        "fadeInDuration": 500,
        "videoEnabled": true,
        "videoMuted": true,
        "videoLoop": true
      },
      "gameDetail": {
        "enabled": true,
        "type": "artwork",
        "fallbackToVideo": true,
        "blur": 15,
        "brightness": 0.4,
        "opacity": 1,
        "preferredArtwork": ["fanart", "screenshot", "thumbnail"]
      }
    },
    "selection": {
      "glowEffect": true,
      "glowColor": "#ff0066",
      "glowIntensity": 0.5,
      "glowSpread": 20,
      "scaleOnHover": 1.05,
      "showBackgroundPreview": true,
      "backgroundPreviewBlur": 25,
      "backgroundPreviewBrightness": 0.35,
      "backgroundPreviewOpacity": 1
    },
    "carousel": {
      "cardStyle": "3d",
      "reflectionEnabled": true,
      "rotationAngle": 15,
      "perspective": 1000,
      "neonBorder": false,
      "shadowEnabled": true,
      "layout": {
        "position": "bottom",
        "detailsPosition": "above",
        "controlsPosition": "bottom"
      },
      "sizing": {
        "defaultCardSize": 330,
        "minCardSize": 150,
        "maxCardSize": 500,
        "cardAspectRatio": 1.36,
        "cardGap": 0.09
      },
      "details": {
        "showCrtTv": true,
        "crtWidth": 320,
        "showRating": true,
        "showPlayCount": true,
        "showDescription": true,
        "maxDescriptionLines": 3
      }
    },
    "grid": {
      "cardBorderRadius": 8,
      "hoverScale": 1.05,
      "showTitle": true,
      "aspectRatio": "3/4",
      "sizing": {
        "defaultCardSize": 150,
        "minCardSize": 80,
        "maxCardSize": 300
      }
    },
    "list": {
      "showThumbnails": true,
      "stripedRows": false,
      "compactMode": false,
      "showRatings": true,
      "sizing": {
        "defaultIconSize": 40,
        "minIconSize": 24,
        "maxIconSize": 80
      }
    },
    "spinWheel": {
      "layout": {
        "wheelPosition": "right",
        "detailsPosition": "left",
        "controlsPosition": "bottom"
      },
      "sizing": {
        "defaultCardSize": 300,
        "minCardSize": 200,
        "maxCardSize": 550
      }
    },
    "spinner": {
      "layout": {
        "wheelPosition": "right",
        "detailsPosition": "left",
        "controlsPosition": "bottom"
      },
      "sizing": {
        "defaultSize": 150,
        "minSize": 80,
        "maxSize": 250,
        "baseRadius": 202
      },
      "pointer": {
        "style": "arrow",
        "size": 40,
        "color": "#ff0066",
        "glowEnabled": true
      }
    },
    "crtTv": {
      "enabled": true,
      "scanlineEffect": true,
      "scanlineOpacity": 0.15,
      "vignetteEffect": true,
      "vignetteIntensity": 0.4,
      "borderRadius": 10,
      "frameStyle": "classic",
      "frameColor": "#2a2a2a",
      "ledIndicator": true,
      "autoplayVideo": true,
      "aspectRatio": "4/3"
    },
    "colors": {
      "primary": "#ff0066",
      "secondary": "#00ffff",
      "accent": "#ffff00",
      "background": "#0a0a0a",
      "surface": "#111111",
      "text": "#ffffff",
      "textMuted": "#888888"
    }
  }
}
```

---

## Creating a New Theme

### Step 1: Create the CSS File

Create `src/client/css/themes/my-theme.css`:

```css
/**
 * RetroWebLauncher - My Custom Theme
 * Description of your theme
 */

[data-theme="my-theme"] {
  /* Colors */
  --color-primary: #your-color;
  --color-primary-hover: #your-hover-color;
  /* ... add all required variables */
}

/* Body styling */
[data-theme="my-theme"] body {
  background-color: var(--color-background);
  /* Add background effects here */
}

/* Add any custom effect classes */
[data-theme="my-theme"] .custom-effect {
  /* Your custom styling */
}
```

### Step 2: Create the Settings File

Create `src/server/themes/my-theme.json`:

```json
{
  "name": "My Theme",
  "description": "My custom theme description",
  "author": "Your Name",
  "version": "1.0.0",
  "settings": {
    "views": {
      "systemDefault": "wheel"
    },
    "home": {
      "style": "carousel",
      "showSidebar": false
    },
    "colors": {
      "primary": "#your-color"
    }
  }
}
```

### Step 3: Test Your Theme

1. Start the RetroWebLauncher server
2. Go to Settings
3. Select your theme from the dropdown
4. Verify all views render correctly

---

## Effect Classes

Themes can define CSS classes for visual effects. Components may apply these classes based on theme settings.

### Common Effect Classes

```css
/* Neon text glow */
.neon-text {
  text-shadow: 0 0 10px currentColor, 0 0 20px var(--color-primary);
}

/* Glowing border */
.neon-border {
  box-shadow: 0 0 10px var(--color-primary), inset 0 0 5px var(--color-primary);
}

/* CRT scanline overlay */
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    rgba(0,0,0,0.1) 0px,
    transparent 1px,
    transparent 2px
  );
  pointer-events: none;
}

/* Glass morphism */
.glass {
  background: rgba(255,255,255,0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255,255,255,0.2);
}

/* Floating animation */
.float {
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
```

---

## Best Practices

### 1. Color Contrast
Ensure sufficient contrast between text and background colors for accessibility (WCAG 2.1 Level AA requires 4.5:1 for normal text).

### 2. Use CSS Variables Consistently
Always use the defined CSS variables rather than hardcoding values:

```css
/* Good */
.my-element {
  color: var(--color-text);
  padding: var(--spacing-md);
}

/* Avoid */
.my-element {
  color: #ffffff;
  padding: 16px;
}
```

### 3. Provide Fallback Values
Include fallback values for critical variables:

```css
.element {
  color: var(--color-text, #ffffff);
  background: var(--color-surface, #111111);
}
```

### 4. Test All Views
Verify your theme works with:
- System carousel (home screen)
- Grid view
- List view
- Wheel/Carousel view
- Spin wheel view
- Spinner (Wheel of Fortune) view
- Game detail page
- Search page
- Settings page

### 5. Responsive Design
Test on multiple screen sizes. Components handle most responsive behavior, but ensure colors and fonts work on mobile.

### 6. Animation Performance
Use `transform` and `opacity` for animations (GPU-accelerated). Avoid animating `width`, `height`, or `margin`.

### 7. Dark/Light Considerations
For light themes, remember to:
- Invert shadow directions
- Use darker text on light backgrounds
- Adjust glow effects (may need to be more subtle)

---

## Examples

### Light Theme Example

```css
[data-theme="clean-light"] {
  --color-primary: #0066ff;
  --color-primary-hover: #0052cc;
  --color-secondary: #00cc88;
  --color-accent: #ff6600;

  --color-background: #f5f5f5;
  --color-surface: #ffffff;
  --color-surface-elevated: #fafafa;

  --color-text: #1a1a1a;
  --color-text-muted: #666666;
  --color-text-secondary: #444444;

  --shadow-sm: 0 1px 3px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.1);
  --shadow-lg: 0 8px 24px rgba(0,0,0,0.15);
  --shadow-glow: 0 0 20px rgba(0,102,255,0.3);
}

[data-theme="clean-light"] body {
  background: linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%);
}
```

### Minimalist Dark Theme Example

```css
[data-theme="minimalist-dark"] {
  --color-primary: #ffffff;
  --color-primary-hover: #cccccc;
  --color-secondary: #888888;
  --color-accent: #ffffff;

  --color-background: #000000;
  --color-surface: #0a0a0a;
  --color-surface-elevated: #141414;

  --color-text: #ffffff;
  --color-text-muted: #666666;

  --font-display: 'Inter', sans-serif;
  --font-body: 'Inter', sans-serif;

  --shadow-glow: none;
}
```

---

## Troubleshooting

### Theme not appearing in Settings
- Ensure both CSS and JSON files exist with matching names
- Check file permissions
- Restart the server

### Colors not applying
- Verify the `data-theme` attribute matches your theme name
- Check browser dev tools for CSS specificity issues
- Ensure variables are properly defined

### Animations not smooth
- Use GPU-accelerated properties (`transform`, `opacity`)
- Reduce complexity of animations
- Check for layout thrashing

---

## Support

For help with theme creation:
- Check existing themes for reference
- Review component source code for available CSS hooks
- File issues at: https://github.com/anthropics/claude-code/issues

---

*Last updated: December 2025*
