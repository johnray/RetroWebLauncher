# RetroWebLauncher Theme System

This document explains how to customize the appearance of RetroWebLauncher through themes and create your own custom themes.

## Overview

RetroWebLauncher uses a CSS custom properties (CSS variables) based theming system. Themes are defined in CSS files and can be switched dynamically without page reload.

## Built-in Themes

### Classic Arcade (Default)

A vibrant retro theme inspired by 80s/90s arcade cabinets.

**Characteristics:**
- Black background with neon pink accents
- Press Start 2P pixel font for headers
- Bright, high-contrast colors
- Optional CRT scanline effects
- Neon glow effects on interactive elements

**Colors:**
- Primary: `#ff0066` (Hot Pink)
- Secondary: `#00ffff` (Cyan)
- Accent: `#ffff00` (Yellow)
- Background: `#0a0a0a`

### Dark & Modern

A clean, contemporary dark theme with subtle gradients.

**Characteristics:**
- Smooth dark surfaces with glass morphism
- Modern Inter font throughout
- Indigo/purple accent colors
- Softer shadows and transitions
- More rounded corners

**Colors:**
- Primary: `#6366f1` (Indigo)
- Secondary: `#22d3ee` (Cyan)
- Accent: `#f59e0b` (Amber)
- Background: `#0f0f0f`

## Changing Themes

### Via Configuration

Edit your `rwl.config.json` file:

```json
{
  "theme": "dark-modern"
}
```

Available values: `"classic-arcade"`, `"dark-modern"`, or the name of a custom theme.

### Via Settings UI

Navigate to Settings in the web interface and select your preferred theme from the dropdown.

## Creating Custom Themes

### Step 1: Create Theme File

Create a new CSS file in `src/client/css/themes/`:

```
src/client/css/themes/my-custom-theme.css
```

### Step 2: Define Theme Variables

Use the `[data-theme="theme-name"]` selector to scope your variables:

```css
/**
 * My Custom Theme
 */

[data-theme="my-custom-theme"] {
  /* Primary brand colors */
  --color-primary: #your-color;
  --color-primary-hover: #your-hover-color;
  --color-secondary: #secondary-color;
  --color-accent: #accent-color;

  /* Backgrounds */
  --color-background: #background;
  --color-surface: #surface;
  --color-surface-elevated: #elevated-surface;

  /* Text */
  --color-text: #text-color;
  --color-text-muted: #muted-text;
  --color-text-secondary: #secondary-text;

  /* Status colors */
  --color-success: #success;
  --color-warning: #warning;
  --color-error: #error;

  /* Typography */
  --font-display: 'Your Display Font', sans-serif;
  --font-body: 'Your Body Font', sans-serif;

  /* ... other variables */
}
```

### Step 3: Include Theme in HTML

Add your theme to `src/client/index.html`:

```html
<link rel="stylesheet" href="/css/themes/my-custom-theme.css">
```

### Step 4: Add Theme-Specific Styles (Optional)

You can add custom styles that only apply when your theme is active:

```css
[data-theme="my-custom-theme"] body {
  /* Custom background gradient */
  background-image: linear-gradient(...);
}

[data-theme="my-custom-theme"] .card {
  /* Custom card styling */
  border: 1px solid var(--color-primary);
}
```

## Available CSS Variables

### Colors

| Variable | Description | Example |
|----------|-------------|---------|
| `--color-primary` | Main brand color | `#ff0066` |
| `--color-primary-hover` | Hover state for primary | `#ff3388` |
| `--color-secondary` | Secondary brand color | `#00ffff` |
| `--color-accent` | Accent/highlight color | `#ffff00` |
| `--color-background` | Page background | `#0a0a0a` |
| `--color-surface` | Card/panel background | `#111111` |
| `--color-surface-elevated` | Elevated surface | `#1a1a1a` |
| `--color-text` | Primary text | `#ffffff` |
| `--color-text-muted` | Secondary/muted text | `#888888` |
| `--color-text-secondary` | Less prominent text | `#cccccc` |
| `--color-success` | Success indicators | `#00ff66` |
| `--color-warning` | Warning indicators | `#ffaa00` |
| `--color-error` | Error indicators | `#ff3333` |

### Gradients

| Variable | Description |
|----------|-------------|
| `--gradient-primary` | Primary button/accent gradient |
| `--gradient-surface` | Surface/card gradient |

### Typography

| Variable | Description | Default |
|----------|-------------|---------|
| `--font-display` | Headers, titles | `'Press Start 2P'` |
| `--font-body` | Body text | `'Inter'` |
| `--font-size-xs` | Extra small | `0.625rem` |
| `--font-size-sm` | Small | `0.75rem` |
| `--font-size-base` | Base size | `0.875rem` |
| `--font-size-lg` | Large | `1rem` |
| `--font-size-xl` | Extra large | `1.25rem` |
| `--font-size-2xl` | 2X large | `1.5rem` |
| `--font-size-3xl` | 3X large | `2rem` |

### Spacing

| Variable | Value |
|----------|-------|
| `--spacing-xs` | `0.25rem` |
| `--spacing-sm` | `0.5rem` |
| `--spacing-md` | `1rem` |
| `--spacing-lg` | `1.5rem` |
| `--spacing-xl` | `2rem` |
| `--spacing-2xl` | `3rem` |

### Border Radius

| Variable | Value |
|----------|-------|
| `--radius-sm` | `4px` |
| `--radius-md` | `8px` |
| `--radius-lg` | `12px` |
| `--radius-xl` | `16px` |
| `--radius-full` | `9999px` |

### Shadows

| Variable | Description |
|----------|-------------|
| `--shadow-sm` | Subtle shadow |
| `--shadow-md` | Medium shadow |
| `--shadow-lg` | Large shadow |
| `--shadow-glow` | Colored glow effect |

### Transitions

| Variable | Value |
|----------|-------|
| `--transition-fast` | `150ms ease` |
| `--transition-normal` | `250ms ease` |
| `--transition-slow` | `400ms ease` |

### Layout

| Variable | Description | Default |
|----------|-------------|---------|
| `--header-height` | Header bar height | `64px` |
| `--sidebar-width` | Sidebar width | `280px` |

### Focus & Accessibility

| Variable | Description |
|----------|-------------|
| `--focus-ring-color` | Focus outline color |
| `--focus-ring-width` | Focus outline width |

### Z-Index Layers

| Variable | Value | Usage |
|----------|-------|-------|
| `--z-sidebar` | `100` | Sidebar |
| `--z-header` | `200` | Header |
| `--z-modal` | `500` | Modals |
| `--z-toast` | `600` | Notifications |
| `--z-screensaver` | `9999` | Attract mode |

## Theme Helper Classes

### Classic Arcade Theme

```css
/* Scanline effect overlay */
.scanlines

/* Neon text glow */
.neon-text

/* Neon border glow */
.neon-border

/* Pixel-art style border */
.pixel-border

/* CRT flicker animation */
.crt-effect
```

### Dark Modern Theme

```css
/* Glass morphism effect */
.glass

/* Gradient border */
.gradient-border

/* Smooth hover animation */
.card-hover

/* Primary button style */
.btn-primary

/* Glow accent */
.accent-glow
```

## Best Practices

1. **Use CSS Variables**: Always use `var(--variable-name)` instead of hardcoded values so themes work correctly.

2. **Test Both Themes**: Ensure your components look good in all built-in themes.

3. **Respect Motion Preferences**: The system respects `prefers-reduced-motion` automatically.

4. **Consider Contrast**: Ensure sufficient contrast ratios for accessibility (WCAG 2.1 AA minimum).

5. **Test on Safari**: Since Safari is the primary target, test all visual elements in Safari/WebKit.

## Accessibility Considerations

- The system automatically handles `prefers-reduced-motion` for users who prefer less animation
- High contrast mode adjustments are included for `prefers-contrast: high`
- Focus indicators are visible and use theme colors
- All interactive elements maintain proper focus states

## Troubleshooting

### Theme Not Applying

1. Verify the theme name in config matches the CSS selector
2. Check that the CSS file is loaded in `index.html`
3. Clear browser cache
4. Check browser console for CSS errors

### Variables Not Working

1. Ensure you're using `var(--variable-name)` syntax
2. Check variable names match exactly (case-sensitive)
3. Verify variables are defined in the correct theme block

### Safari Issues

Safari requires `-webkit-` prefixes for some properties:
- `backdrop-filter` → `-webkit-backdrop-filter`
- `mask-composite` → `-webkit-mask-composite`

## Example: Creating a "Cyberpunk" Theme

```css
/**
 * Cyberpunk Theme
 * Neon yellow/green on dark purple
 */

[data-theme="cyberpunk"] {
  --color-primary: #00ff9f;
  --color-primary-hover: #33ffb2;
  --color-secondary: #ff00ff;
  --color-accent: #ffff00;

  --color-background: #0d0221;
  --color-surface: #1a0533;
  --color-surface-elevated: #2d0a47;

  --color-text: #e0e0e0;
  --color-text-muted: #8888aa;
  --color-text-secondary: #bbbbdd;

  --gradient-primary: linear-gradient(135deg, #00ff9f 0%, #00cc7f 100%);
  --gradient-surface: linear-gradient(180deg, #1a0533 0%, #0d0221 100%);

  --font-display: 'Orbitron', sans-serif;
  --font-body: 'Roboto', sans-serif;

  --shadow-glow: 0 0 30px rgba(0, 255, 159, 0.4);
}

[data-theme="cyberpunk"] body {
  background-image:
    linear-gradient(135deg, rgba(0, 255, 159, 0.05) 0%, transparent 50%),
    linear-gradient(225deg, rgba(255, 0, 255, 0.05) 0%, transparent 50%);
}
```

Then add to your config:

```json
{
  "theme": "cyberpunk"
}
```
