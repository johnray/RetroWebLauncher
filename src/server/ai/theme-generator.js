/**
 * RetroWebLauncher - AI Theme Generator
 * Generates user-friendly JSON theme configs from natural language descriptions
 * Uses theme-compiler to convert configs to pixel-perfect CSS
 */

const fs = require('fs');
const path = require('path');
const { compileTheme, saveCompiledTheme, getPresets, COLOR_PRESETS, FONT_PRESETS, EFFECT_PRESETS } = require('../themes/theme-compiler');

/**
 * Theme generation prompt - asks AI to return JSON config
 */
const THEME_PROMPT = `You are an expert retro gaming theme designer. Generate a JSON theme configuration based on the user's description.

AVAILABLE COLOR PRESETS (use these names, not hex codes):
${Object.keys(COLOR_PRESETS).join(', ')}

AVAILABLE FONT PRESETS:
${Object.keys(FONT_PRESETS).join(', ')}

AVAILABLE EFFECT PRESETS (these add animations and visual flair):
${Object.keys(EFFECT_PRESETS).join(', ')}

GLOW INTENSITY OPTIONS: subtle, medium, intense, extreme
ANIMATION SPEED OPTIONS: slow, normal, fast, instant
BORDER STYLE OPTIONS: sharp, subtle, rounded, very-rounded, pill

OUTPUT A VALID JSON OBJECT with this exact structure:
{
  "name": "theme-name-here",
  "displayName": "Theme Name Here",
  "description": "Brief description of the theme",
  "colors": {
    "primary": "COLOR_PRESET_NAME or #hexcode",
    "primaryHover": "COLOR_PRESET_NAME or #hexcode",
    "secondary": "COLOR_PRESET_NAME or #hexcode",
    "accent": "COLOR_PRESET_NAME or #hexcode",
    "background": "COLOR_PRESET_NAME or #hexcode",
    "surface": "COLOR_PRESET_NAME or #hexcode",
    "surfaceElevated": "COLOR_PRESET_NAME or #hexcode",
    "text": "COLOR_PRESET_NAME or #hexcode",
    "textMuted": "COLOR_PRESET_NAME or #hexcode",
    "success": "COLOR_PRESET_NAME or #hexcode",
    "warning": "COLOR_PRESET_NAME or #hexcode",
    "error": "COLOR_PRESET_NAME or #hexcode"
  },
  "fonts": {
    "display": "FONT_PRESET_NAME",
    "body": "FONT_PRESET_NAME"
  },
  "effects": ["EFFECT_NAME", "EFFECT_NAME"],
  "glowIntensity": "subtle|medium|intense|extreme",
  "animationSpeed": "slow|normal|fast|instant",
  "borderStyle": "sharp|subtle|rounded|very-rounded|pill"
}

GUIDELINES:
1. Choose effects that match the mood (e.g., "scanlines" + "crt-flicker" for retro CRT feel)
2. Use "intense" or "extreme" glow for vibrant neon themes
3. Pick fonts that match the era (pixel for 8-bit, futuristic for sci-fi)
4. Combine multiple effects for maximum visual impact (3-5 effects recommended)
5. For dark themes, use "pitch-black" or "near-black" backgrounds
6. Match warning/error colors to the theme's palette

USER'S THEME DESCRIPTION:
{DESCRIPTION}

OUTPUT ONLY VALID JSON - no explanations, no markdown, just the JSON object:`;

/**
 * Generate a theme from natural language description
 * @param {string} description - Natural language description of desired theme
 * @param {string} themeName - Name for the theme
 * @param {Object} provider - AI provider (ollama or openai)
 * @returns {Object} Generated theme object with config and CSS
 */
async function generateTheme(description, themeName, provider) {
  const prompt = THEME_PROMPT.replace('{DESCRIPTION}', description);

  try {
    // Generate JSON config using AI
    const jsonResponse = await provider.generate(prompt, {
      temperature: 0.4, // Balanced creativity with structure
      maxTokens: 1500
    });

    // Parse and validate JSON
    const config = parseThemeConfig(jsonResponse, themeName);

    // Compile to CSS using theme-compiler
    const css = compileTheme(config);

    return {
      success: true,
      config: config,
      css: css,
      themeName: config.name,
      displayName: config.displayName,
      description: config.description,
      generatedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Theme generation failed:', error);
    throw error;
  }
}

/**
 * Parse and validate theme config from AI response
 */
function parseThemeConfig(response, fallbackName) {
  let cleaned = response;

  // Remove markdown code blocks if present
  cleaned = cleaned.replace(/```json\n?/g, '');
  cleaned = cleaned.replace(/```\n?/g, '');
  cleaned = cleaned.trim();

  // Find JSON object in response
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in AI response');
  }

  let config;
  try {
    config = JSON.parse(jsonMatch[0]);
  } catch (e) {
    throw new Error('Failed to parse JSON: ' + e.message);
  }

  // Ensure required fields
  config.name = config.name || fallbackName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  config.displayName = config.displayName || fallbackName;
  config.description = config.description || 'AI-generated theme';

  // Validate colors - ensure they're preset names or hex codes
  if (config.colors) {
    for (const [key, value] of Object.entries(config.colors)) {
      if (value && !value.startsWith('#') && !COLOR_PRESETS[value]) {
        // Try to find closest match
        const closest = findClosestPreset(value, Object.keys(COLOR_PRESETS));
        if (closest) {
          config.colors[key] = closest;
        }
      }
    }
  }

  // Validate fonts
  if (config.fonts) {
    for (const [key, value] of Object.entries(config.fonts)) {
      if (value && !FONT_PRESETS[value]) {
        const closest = findClosestPreset(value, Object.keys(FONT_PRESETS));
        config.fonts[key] = closest || 'modern';
      }
    }
  }

  // Validate effects
  if (config.effects) {
    config.effects = config.effects.filter(e => EFFECT_PRESETS[e]);
    if (config.effects.length === 0) {
      config.effects = ['pulse-glow', 'floating']; // Default effects
    }
  } else {
    config.effects = ['pulse-glow', 'floating'];
  }

  // Validate other options
  const validGlow = ['subtle', 'medium', 'intense', 'extreme'];
  const validSpeed = ['slow', 'normal', 'fast', 'instant'];
  const validBorder = ['sharp', 'subtle', 'rounded', 'very-rounded', 'pill'];

  if (!validGlow.includes(config.glowIntensity)) {
    config.glowIntensity = 'medium';
  }
  if (!validSpeed.includes(config.animationSpeed)) {
    config.animationSpeed = 'normal';
  }
  if (!validBorder.includes(config.borderStyle)) {
    config.borderStyle = 'rounded';
  }

  return config;
}

/**
 * Find closest matching preset name
 */
function findClosestPreset(input, presets) {
  const lower = input.toLowerCase();

  // Exact match
  if (presets.includes(lower)) return lower;

  // Partial match
  for (const preset of presets) {
    if (preset.includes(lower) || lower.includes(preset)) {
      return preset;
    }
  }

  // Word match
  const words = lower.split(/[-_\s]+/);
  for (const preset of presets) {
    for (const word of words) {
      if (preset.includes(word)) {
        return preset;
      }
    }
  }

  return null;
}

/**
 * Save generated theme
 */
async function saveTheme(themeData) {
  const result = saveCompiledTheme(themeData.config);
  return {
    ...result,
    displayName: themeData.displayName,
    description: themeData.description
  };
}

/**
 * Get list of available themes
 */
function getAvailableThemes() {
  const themesDir = path.join(__dirname, '..', '..', 'client', 'css', 'themes');
  const configDir = path.join(__dirname, '..', '..', '..', 'themes');

  if (!fs.existsSync(themesDir)) {
    return [];
  }

  let files;
  try {
    files = fs.readdirSync(themesDir);
  } catch (e) {
    console.error('Error reading themes directory:', e);
    return [];
  }

  const themes = [];

  for (const file of files) {
    if (file.endsWith('.css')) {
      try {
        const themeName = file.replace('.css', '');
        const cssPath = path.join(themesDir, file);
        const configPath = path.join(configDir, `${themeName}.json`);

        // Skip if CSS file doesn't exist (race condition protection)
        if (!fs.existsSync(cssPath)) {
          continue;
        }

        const cssContent = fs.readFileSync(cssPath, 'utf-8');

        // Extract display name from comment if present
        const displayNameMatch = cssContent.match(/RetroWebLauncher - (.+) Theme/);
        const displayName = displayNameMatch ? displayNameMatch[1] : themeName;

        // Check if has JSON config (meaning it's editable)
        const hasConfig = fs.existsSync(configPath);

        // Check if AI-generated (has compiler marker) - built-in themes are hand-crafted (not AI-generated)
        const isAiGenerated = cssContent.includes('Generated by Theme Compiler') ||
                             cssContent.includes('AI-Generated Theme');
        const isBuiltIn = !isAiGenerated; // Hand-crafted themes are built-in

        let config = null;
        if (hasConfig) {
          try {
            config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
          } catch (e) {
            console.warn(`Failed to parse config for theme ${themeName}:`, e.message);
          }
        }

        themes.push({
          id: themeName,
          name: displayName,
          fileName: file,
          isAiGenerated,
          isBuiltIn,
          hasConfig,
          config
        });
      } catch (e) {
        console.warn(`Failed to load theme ${file}:`, e.message);
        // Continue to next theme instead of failing the entire request
      }
    }
  }

  return themes;
}

/**
 * Delete a custom theme (not built-in ones)
 */
function deleteTheme(themeName) {
  // Check if theme is built-in by reading CSS and checking for AI generation marker
  const themesDir = path.join(__dirname, '..', '..', 'client', 'css', 'themes');
  const cssPath = path.join(themesDir, `${themeName}.css`);

  if (!fs.existsSync(cssPath)) {
    throw new Error('Theme not found');
  }

  const cssContent = fs.readFileSync(cssPath, 'utf-8');
  const isAiGenerated = cssContent.includes('Generated by Theme Compiler') ||
                        cssContent.includes('AI-Generated Theme');

  // Built-in themes are hand-crafted (not AI-generated) and cannot be deleted
  if (!isAiGenerated) {
    throw new Error('Cannot delete built-in themes');
  }

  const configDir = path.join(__dirname, '..', '..', '..', 'themes');
  const configPath = path.join(configDir, `${themeName}.json`);

  let deleted = false;

  if (fs.existsSync(cssPath)) {
    fs.unlinkSync(cssPath);
    deleted = true;
  }

  if (fs.existsSync(configPath)) {
    fs.unlinkSync(configPath);
  }

  return deleted;
}

/**
 * Preview a theme without saving (returns CSS for client-side preview)
 */
async function previewTheme(description, themeName, provider) {
  const theme = await generateTheme(description, themeName, provider);
  return {
    css: theme.css,
    config: theme.config
  };
}

/**
 * Create theme from JSON config directly (no AI needed)
 */
function createThemeFromConfig(config) {
  const css = compileTheme(config);
  return {
    success: true,
    config: config,
    css: css,
    themeName: config.name,
    displayName: config.displayName || config.name,
    description: config.description || 'Custom theme'
  };
}

/**
 * Update an existing theme's config
 */
function updateTheme(themeName, newConfig) {
  newConfig.name = themeName; // Ensure name stays the same
  const result = saveCompiledTheme(newConfig);
  return {
    ...result,
    config: newConfig
  };
}

module.exports = {
  generateTheme,
  saveTheme,
  getAvailableThemes,
  deleteTheme,
  previewTheme,
  createThemeFromConfig,
  updateTheme,
  getPresets
};
