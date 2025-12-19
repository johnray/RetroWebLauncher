/**
 * RetroWebLauncher - ES Systems Parser
 * Parses the es_systems.cfg file to get system definitions
 */

const fs = require('fs');
const path = require('path');
const { XMLParser } = require('fast-xml-parser');
const { resolvePath, followSymlink, isDirectoryAccessible, pathToId } = require('./paths');
const { loadConfig, getRetrobatPaths } = require('../config');

/**
 * Parse the es_systems.cfg file
 * @returns {Promise<Array>} Array of system objects
 */
async function parseSystems() {
  const paths = getRetrobatPaths();
  const systemsFile = paths.esSystems;

  if (!fs.existsSync(systemsFile)) {
    throw new Error(`es_systems.cfg not found at: ${systemsFile}`);
  }

  const xmlContent = fs.readFileSync(systemsFile, 'utf-8');

  // Configure parser to handle the XML structure
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => {
      // These elements can appear multiple times
      return ['system', 'emulator', 'core'].includes(name);
    },
    commentPropName: false, // Ignore comments
  });

  const result = parser.parse(xmlContent);

  if (!result.systemList || !result.systemList.system) {
    return [];
  }

  const systems = [];
  const basePath = paths.root;

  for (const sys of result.systemList.system) {
    const system = parseSystemEntry(sys, basePath, paths);
    if (system) {
      systems.push(system);
    }
  }

  return systems;
}

/**
 * Parse a single system entry
 * @param {Object} sys - Raw system object from XML
 * @param {string} basePath - Base Retrobat path
 * @param {Object} paths - Retrobat paths object
 * @returns {Object|null} Parsed system object or null if invalid
 */
function parseSystemEntry(sys, basePath, paths) {
  // Skip if no name
  if (!sys.name) {
    return null;
  }

  const name = sys.name;
  const fullname = sys.fullname || name;

  // Resolve the ROM path
  // Path format is usually: ~\..\roms\systemname
  // In RetroBat, ~ refers to the emulationstation directory (not .emulationstation)
  // So ~\..\roms\flash resolves to: emulationstation\..\roms\flash = RetroBat\roms\flash
  let romPath = sys.path || '';

  // Replace ~ with the emulationstation directory (NOT .emulationstation)
  if (romPath.startsWith('~')) {
    romPath = romPath.replace('~', paths.emulationStation);
  }

  // Normalize and resolve
  romPath = path.normalize(romPath);

  // Follow symlinks to get real path
  const resolvedRomPath = followSymlink(romPath);

  // Parse extensions
  const extensions = parseExtensions(sys.extension || '');

  // Parse emulators
  const emulators = parseEmulators(sys.emulators);

  // Parse platform (can be comma-separated)
  const platforms = (sys.platform || name)
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);

  return {
    id: pathToId(name),
    name: name,
    fullname: fullname,
    manufacturer: sys.manufacturer || '',
    release: sys.release || '',
    hardware: sys.hardware || 'console',
    path: romPath,
    resolvedPath: resolvedRomPath,
    extensions: extensions,
    emulators: emulators,
    platform: platforms,
    theme: sys.theme || name,
    accessible: isDirectoryAccessible(resolvedRomPath)
  };
}

/**
 * Parse the extensions string into an array
 * @param {string} extString - Space-separated extensions
 * @returns {string[]} Array of extensions (lowercase, with leading dots)
 */
function parseExtensions(extString) {
  if (!extString) return [];

  return extString
    .split(/\s+/)
    .map(ext => {
      ext = ext.trim().toLowerCase();
      if (!ext) return null;
      // Ensure leading dot
      return ext.startsWith('.') ? ext : '.' + ext;
    })
    .filter(Boolean);
}

/**
 * Parse emulators configuration
 * @param {Object} emulatorsObj - Emulators object from XML
 * @returns {Array} Array of emulator configurations
 */
function parseEmulators(emulatorsObj) {
  if (!emulatorsObj || !emulatorsObj.emulator) {
    return [];
  }

  const emulators = Array.isArray(emulatorsObj.emulator)
    ? emulatorsObj.emulator
    : [emulatorsObj.emulator];

  return emulators.map(emu => {
    const name = emu['@_name'] || emu.name || '';

    // Parse cores if present
    let cores = [];
    if (emu.cores && emu.cores.core) {
      const coreList = Array.isArray(emu.cores.core)
        ? emu.cores.core
        : [emu.cores.core];

      cores = coreList.map(core => {
        if (typeof core === 'string') {
          return { name: core, default: false };
        }
        return {
          name: core['#text'] || core,
          default: core['@_default'] === 'true'
        };
      });
    }

    return {
      name: name,
      cores: cores
    };
  }).filter(emu => emu.name);
}

/**
 * Get a single system by name
 * @param {string} systemName - System name to find
 * @returns {Promise<Object|null>} System object or null
 */
async function getSystem(systemName) {
  const systems = await parseSystems();
  return systems.find(s => s.name === systemName || s.id === systemName) || null;
}

/**
 * Get only accessible systems (those with valid ROM paths)
 * @returns {Promise<Array>} Array of accessible systems
 */
async function getAccessibleSystems() {
  const systems = await parseSystems();
  return systems.filter(s => s.accessible);
}

/**
 * Get systems grouped by hardware type
 * @returns {Promise<Object>} Systems grouped by hardware
 */
async function getSystemsByHardware() {
  const systems = await parseSystems();
  const grouped = {};

  for (const system of systems) {
    const hw = system.hardware || 'other';
    if (!grouped[hw]) {
      grouped[hw] = [];
    }
    grouped[hw].push(system);
  }

  return grouped;
}

module.exports = {
  parseSystems,
  getSystem,
  getAccessibleSystems,
  getSystemsByHardware
};
