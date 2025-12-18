/**
 * RetroWebLauncher - AI Theme Generator
 * Generates pixel-perfect CSS themes from natural language descriptions
 */

const fs = require('fs');
const path = require('path');

/**
 * Theme generation prompt template for pixel-perfect output
 */
const THEME_PROMPT = `You are an expert CSS theme designer. Generate a complete, pixel-perfect CSS theme based on the user's description.

CRITICAL REQUIREMENTS:
1. All colors must use exact hex codes (e.g., #ff0066, not "hot pink")
2. All sizes must use exact rem or px values
3. All transitions must specify exact milliseconds and easing
4. Output must be valid, production-ready CSS
5. Theme must be complete - include ALL variables listed below

The theme must define these CSS custom properties within a [data-theme="THEME_NAME"] selector:

REQUIRED COLOR VARIABLES:
--color-primary: (main brand color)
--color-primary-hover: (hover state)
--color-secondary: (secondary accent)
--color-accent: (highlight color)
--color-background: (page background)
--color-surface: (card/panel background)
--color-surface-elevated: (elevated panels)
--color-text: (primary text)
--color-text-muted: (secondary text)
--color-text-secondary: (tertiary text)
--color-success: (success indicators)
--color-warning: (warning indicators)
--color-error: (error indicators)

REQUIRED GRADIENT VARIABLES:
--gradient-primary: (primary gradient)
--gradient-surface: (surface gradient)

REQUIRED TYPOGRAPHY:
--font-display: (display/heading font with fallbacks)
--font-body: (body text font with fallbacks)
--font-size-xs: (extra small, e.g., 0.625rem)
--font-size-sm: (small, e.g., 0.75rem)
--font-size-base: (base, e.g., 0.875rem)
--font-size-lg: (large, e.g., 1rem)
--font-size-xl: (extra large, e.g., 1.25rem)
--font-size-2xl: (2x large, e.g., 1.5rem)
--font-size-3xl: (3x large, e.g., 2rem)

REQUIRED SPACING:
--spacing-xs: 0.25rem
--spacing-sm: 0.5rem
--spacing-md: 1rem
--spacing-lg: 1.5rem
--spacing-xl: 2rem
--spacing-2xl: 3rem

REQUIRED BORDER RADIUS:
--radius-sm: (small, e.g., 4px)
--radius-md: (medium, e.g., 8px)
--radius-lg: (large, e.g., 12px)
--radius-xl: (extra large, e.g., 16px)
--radius-full: 9999px

REQUIRED SHADOWS:
--shadow-sm: (subtle shadow)
--shadow-md: (medium shadow)
--shadow-lg: (large shadow)
--shadow-glow: (colored glow effect using primary color)

REQUIRED TRANSITIONS:
--transition-fast: (e.g., 150ms ease)
--transition-normal: (e.g., 250ms ease)
--transition-slow: (e.g., 400ms ease)

REQUIRED FOCUS:
--focus-ring-color: (should match or complement primary)
--focus-ring-width: (e.g., 3px)

REQUIRED LAYOUT:
--header-height: (e.g., 64px)
--sidebar-width: (e.g., 280px)

REQUIRED Z-INDEX:
--z-sidebar: 100
--z-header: 200
--z-modal: 500
--z-toast: 600
--z-screensaver: 9999

After the variables block, include theme-specific styles:
1. Body background (can include gradients, images)
2. At least 2 utility classes for the theme's special effects
3. Any unique visual treatments

USER'S THEME DESCRIPTION:
{DESCRIPTION}

THEME NAME (for CSS selector):
{THEME_NAME}

OUTPUT ONLY VALID CSS - no explanations, no markdown code blocks, just pure CSS:`;

/**
 * Generate a theme from natural language description
 * @param {string} description - Natural language description of desired theme
 * @param {string} themeName - Name for the theme (used in CSS selector)
 * @param {Object} provider - AI provider (ollama or openai)
 * @returns {Object} Generated theme object with CSS and metadata
 */
async function generateTheme(description, themeName, provider) {
  // Sanitize theme name for CSS selector
  const cssThemeName = themeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  const prompt = THEME_PROMPT
    .replace('{DESCRIPTION}', description)
    .replace('{THEME_NAME}', cssThemeName);

  try {
    // Generate CSS using AI
    const css = await provider.generate(prompt, {
      temperature: 0.3, // Low temperature for precise output
      maxTokens: 2500
    });

    // Validate the generated CSS
    const validation = validateThemeCSS(css, cssThemeName);

    if (!validation.valid) {
      throw new Error(`Generated theme is missing required properties: ${validation.missing.join(', ')}`);
    }

    // Clean up CSS (remove any markdown artifacts)
    const cleanCSS = cleanGeneratedCSS(css);

    return {
      success: true,
      themeName: cssThemeName,
      displayName: themeName,
      css: cleanCSS,
      description: description,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Theme generation failed:', error);
    throw error;
  }
}

/**
 * Validate that generated CSS contains all required properties
 */
function validateThemeCSS(css, themeName) {
  const requiredProperties = [
    '--color-primary',
    '--color-background',
    '--color-surface',
    '--color-text',
    '--font-display',
    '--font-body',
    '--spacing-md',
    '--radius-md',
    '--shadow-md',
    '--transition-fast'
  ];

  const missing = [];

  for (const prop of requiredProperties) {
    if (!css.includes(prop)) {
      missing.push(prop);
    }
  }

  // Check for theme selector
  if (!css.includes(`[data-theme="${themeName}"]`)) {
    missing.push(`[data-theme="${themeName}"] selector`);
  }

  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Clean up generated CSS
 */
function cleanGeneratedCSS(css) {
  let cleaned = css;

  // Remove markdown code block markers
  cleaned = cleaned.replace(/```css\n?/g, '');
  cleaned = cleaned.replace(/```\n?/g, '');

  // Remove any leading/trailing explanation text
  const selectorMatch = cleaned.match(/\[data-theme=/);
  if (selectorMatch) {
    cleaned = cleaned.substring(selectorMatch.index);
  }

  // Trim whitespace
  cleaned = cleaned.trim();

  return cleaned;
}

/**
 * Save generated theme to file
 */
async function saveTheme(themeData) {
  const themesDir = path.join(__dirname, '..', '..', 'client', 'css', 'themes');
  const filePath = path.join(themesDir, `${themeData.themeName}.css`);

  // Ensure themes directory exists
  if (!fs.existsSync(themesDir)) {
    fs.mkdirSync(themesDir, { recursive: true });
  }

  // Add header comment
  const cssContent = `/**
 * RetroWebLauncher - ${themeData.displayName} Theme
 * AI-Generated Theme
 *
 * Description: ${themeData.description}
 * Generated: ${themeData.generatedAt}
 */

${themeData.css}
`;

  fs.writeFileSync(filePath, cssContent, 'utf-8');

  return {
    filePath,
    fileName: `${themeData.themeName}.css`
  };
}

/**
 * Get list of available themes
 */
function getAvailableThemes() {
  const themesDir = path.join(__dirname, '..', '..', 'client', 'css', 'themes');

  if (!fs.existsSync(themesDir)) {
    return [];
  }

  const files = fs.readdirSync(themesDir);
  const themes = [];

  for (const file of files) {
    if (file.endsWith('.css')) {
      const themeName = file.replace('.css', '');
      const filePath = path.join(themesDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract display name from comment if present
      const displayNameMatch = content.match(/RetroWebLauncher - (.+) Theme/);
      const displayName = displayNameMatch ? displayNameMatch[1] : themeName;

      // Check if AI-generated
      const isAiGenerated = content.includes('AI-Generated Theme');

      themes.push({
        id: themeName,
        name: displayName,
        fileName: file,
        isAiGenerated,
        isBuiltIn: ['classic-arcade', 'dark-modern'].includes(themeName)
      });
    }
  }

  return themes;
}

/**
 * Delete a custom theme (not built-in ones)
 */
function deleteTheme(themeName) {
  const builtIn = ['classic-arcade', 'dark-modern'];

  if (builtIn.includes(themeName)) {
    throw new Error('Cannot delete built-in themes');
  }

  const themesDir = path.join(__dirname, '..', '..', 'client', 'css', 'themes');
  const filePath = path.join(themesDir, `${themeName}.css`);

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }

  return false;
}

/**
 * Preview a theme without saving (returns CSS for client-side preview)
 */
async function previewTheme(description, themeName, provider) {
  const theme = await generateTheme(description, themeName, provider);
  return theme.css;
}

module.exports = {
  generateTheme,
  saveTheme,
  getAvailableThemes,
  deleteTheme,
  previewTheme
};
