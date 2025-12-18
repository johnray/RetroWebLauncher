/**
 * RetroWebLauncher - Path Utilities
 * Handles Windows path resolution and symlink following
 */

const fs = require('fs');
const path = require('path');

/**
 * Resolve a path that may contain ~ or relative references
 * @param {string} inputPath - Path to resolve
 * @param {string} basePath - Base path for relative resolution
 * @returns {string} Resolved absolute path
 */
function resolvePath(inputPath, basePath = '') {
  if (!inputPath) return '';

  let resolved = inputPath;

  // Replace ~ with the base Retrobat path
  if (resolved.startsWith('~')) {
    resolved = resolved.replace(/^~/, basePath);
  }

  // Handle relative paths (./ or ../)
  if (resolved.startsWith('./') || resolved.startsWith('.\\')) {
    resolved = path.join(basePath, resolved);
  } else if (resolved.startsWith('../') || resolved.startsWith('..\\')) {
    resolved = path.join(basePath, resolved);
  }

  // Normalize the path for Windows
  resolved = path.normalize(resolved);

  return resolved;
}

/**
 * Follow symlinks/junctions to get the real path
 * @param {string} inputPath - Path to resolve
 * @returns {string} Real path after following symlinks
 */
function followSymlink(inputPath) {
  try {
    // Check if path exists
    if (!fs.existsSync(inputPath)) {
      return inputPath;
    }

    // Get the real path (follows symlinks/junctions)
    const realPath = fs.realpathSync(inputPath);
    return realPath;
  } catch (error) {
    // If we can't resolve, return original
    console.warn(`Could not resolve symlink for: ${inputPath}`, error.message);
    return inputPath;
  }
}

/**
 * Check if a path is a symlink or junction
 * @param {string} inputPath - Path to check
 * @returns {boolean} True if symlink or junction
 */
function isSymlink(inputPath) {
  try {
    const stats = fs.lstatSync(inputPath);
    return stats.isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * Check if a directory exists and is accessible
 * @param {string} dirPath - Directory path
 * @returns {boolean} True if accessible
 */
function isDirectoryAccessible(dirPath) {
  try {
    const realPath = followSymlink(dirPath);
    const stats = fs.statSync(realPath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Check if a file exists and is accessible
 * @param {string} filePath - File path
 * @returns {boolean} True if accessible
 */
function isFileAccessible(filePath) {
  try {
    const realPath = followSymlink(filePath);
    const stats = fs.statSync(realPath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Convert a Windows path to use forward slashes (for URLs)
 * @param {string} winPath - Windows path
 * @returns {string} Path with forward slashes
 */
function toUrlPath(winPath) {
  return winPath.replace(/\\/g, '/');
}

/**
 * Convert a URL-style path to Windows path
 * @param {string} urlPath - URL-style path
 * @returns {string} Windows path
 */
function toWindowsPath(urlPath) {
  return urlPath.replace(/\//g, '\\');
}

/**
 * Get relative path from ROM directory
 * Handles paths like "./game.rom" or "game.rom"
 * @param {string} gamePath - Path from gamelist.xml
 * @param {string} romDir - ROM directory path
 * @returns {string} Full absolute path to the game
 */
function resolveGamePath(gamePath, romDir) {
  if (!gamePath) return '';

  // Remove leading ./ or .\
  let cleaned = gamePath.replace(/^\.[\\/]/, '');

  // Build full path
  const fullPath = path.join(romDir, cleaned);

  return path.normalize(fullPath);
}

/**
 * Get relative media path from ROM directory
 * @param {string} mediaPath - Path from gamelist.xml (e.g., "./images/game.png")
 * @param {string} romDir - ROM directory path
 * @returns {string} Full absolute path to the media file
 */
function resolveMediaPath(mediaPath, romDir) {
  if (!mediaPath) return '';

  // Remove leading ./ or .\
  let cleaned = mediaPath.replace(/^\.[\\/]/, '');

  // Build full path
  const fullPath = path.join(romDir, cleaned);

  return path.normalize(fullPath);
}

/**
 * Safely read a directory, following symlinks
 * @param {string} dirPath - Directory path
 * @returns {string[]} Array of filenames, or empty array if error
 */
function safeReadDir(dirPath) {
  try {
    const realPath = followSymlink(dirPath);
    return fs.readdirSync(realPath);
  } catch (error) {
    console.warn(`Could not read directory: ${dirPath}`, error.message);
    return [];
  }
}

/**
 * Get file modification time
 * @param {string} filePath - File path
 * @returns {number} Modification time in milliseconds, or 0 if error
 */
function getFileModTime(filePath) {
  try {
    const stats = fs.statSync(filePath);
    return stats.mtimeMs;
  } catch {
    return 0;
  }
}

/**
 * Create a unique ID from a path
 * @param {string} inputPath - Path to hash
 * @returns {string} URL-safe unique ID
 */
function pathToId(inputPath) {
  // Create a simple hash-like ID from the path
  // Remove drive letter and special chars, replace separators with underscores
  return inputPath
    .replace(/^[A-Z]:/i, '')
    .replace(/[\\\/]/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .toLowerCase();
}

module.exports = {
  resolvePath,
  followSymlink,
  isSymlink,
  isDirectoryAccessible,
  isFileAccessible,
  toUrlPath,
  toWindowsPath,
  resolveGamePath,
  resolveMediaPath,
  safeReadDir,
  getFileModTime,
  pathToId
};
