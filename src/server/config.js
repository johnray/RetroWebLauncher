/**
 * Configuration loader for RetroWebLauncher
 * Handles loading, saving, and validating configuration
 */

const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '..', '..', 'rwl.config.json');

const DEFAULT_CONFIG = {
  retrobatPath: '',
  port: 3000,
  arcadeName: 'My Arcade',
  theme: 'classic-arcade',
  showHiddenGames: false,
  defaultView: 'wheel',
  attractMode: {
    enabled: true,
    idleTimeout: 300,
    transitionInterval: 10
  },
  authentication: {
    enabled: false,
    pin: ''
  },
  ai: {
    enabled: false,
    provider: 'ollama',
    endpoint: 'http://localhost:11434',
    model: 'llama3.2',
    apiKey: '',
    features: {
      search: true,
      smartLists: true
    }
  }
};

let cachedConfig = null;

/**
 * Load configuration from disk
 * @returns {Object} Configuration object
 */
function loadConfig() {
  if (cachedConfig) {
    return cachedConfig;
  }

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const data = fs.readFileSync(CONFIG_FILE, 'utf8');
      const userConfig = JSON.parse(data);
      cachedConfig = mergeConfig(DEFAULT_CONFIG, userConfig);
    } else {
      cachedConfig = { ...DEFAULT_CONFIG };
      saveConfig(cachedConfig);
    }
  } catch (error) {
    console.error('Error loading config:', error.message);
    cachedConfig = { ...DEFAULT_CONFIG };
  }

  return cachedConfig;
}

/**
 * Save configuration to disk
 * @param {Object} config - Configuration object to save
 */
function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    cachedConfig = config;
  } catch (error) {
    console.error('Error saving config:', error.message);
    throw error;
  }
}

/**
 * Update specific configuration values
 * @param {Object} updates - Partial configuration updates
 * @returns {Object} Updated configuration
 */
function updateConfig(updates) {
  const currentConfig = loadConfig();
  const newConfig = mergeConfig(currentConfig, updates);
  saveConfig(newConfig);
  return newConfig;
}

/**
 * Deep merge two configuration objects
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} Merged object
 */
function mergeConfig(target, source) {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeConfig(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }

  return result;
}

/**
 * Validate configuration
 * @param {Object} config - Configuration to validate
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateConfig(config) {
  const errors = [];

  if (!config.retrobatPath) {
    errors.push('Retrobat path is required');
  } else if (!fs.existsSync(config.retrobatPath)) {
    errors.push(`Retrobat path does not exist: ${config.retrobatPath}`);
  }

  if (config.port < 1 || config.port > 65535) {
    errors.push('Port must be between 1 and 65535');
  }

  if (!config.arcadeName || config.arcadeName.trim() === '') {
    errors.push('Arcade name is required');
  }

  if (config.attractMode.idleTimeout < 0) {
    errors.push('Attract mode idle timeout must be non-negative');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get the resolved Retrobat paths
 * @returns {Object} Paths object
 */
function getRetrobatPaths() {
  const config = loadConfig();
  const retrobatPath = config.retrobatPath;

  return {
    root: retrobatPath,
    emulationStation: path.join(retrobatPath, 'emulationstation'),
    esConfig: path.join(retrobatPath, 'emulationstation', '.emulationstation'),
    esSystems: path.join(retrobatPath, 'emulationstation', '.emulationstation', 'es_systems.cfg'),
    collections: path.join(retrobatPath, 'emulationstation', '.emulationstation', 'collections'),
    roms: path.join(retrobatPath, 'roms'),
    emulatorLauncher: path.join(retrobatPath, 'emulatorLauncher.exe')
  };
}

/**
 * Clear the config cache (useful after external changes)
 */
function clearCache() {
  cachedConfig = null;
}

module.exports = {
  loadConfig,
  saveConfig,
  updateConfig,
  validateConfig,
  getRetrobatPaths,
  clearCache,
  DEFAULT_CONFIG,
  CONFIG_FILE
};
