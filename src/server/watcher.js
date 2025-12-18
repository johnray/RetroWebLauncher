/**
 * RetroWebLauncher - File Watcher
 * Monitors Retrobat directories for changes and triggers rescan
 */

const chokidar = require('chokidar');
const path = require('path');
const { loadConfig, getRetrobatPaths } = require('./config');

let watcher = null;
let debounceTimer = null;
const DEBOUNCE_MS = 5000; // Wait 5 seconds after last change

/**
 * Initialize the file watcher
 * @param {Function} onChangeCallback - Called when changes detected
 * @returns {Object} Watcher instance
 */
function initWatcher(onChangeCallback) {
  const config = loadConfig();
  const paths = getRetrobatPaths();

  if (!paths.root) {
    console.warn('[Watcher] Retrobat path not configured, skipping file watcher');
    return null;
  }

  // Paths to watch
  const watchPaths = [
    // Watch gamelist.xml files
    path.join(paths.roms, '**/gamelist.xml'),
    // Watch collections
    path.join(paths.collections, '*.cfg'),
    // Watch system config
    paths.systemsConfig
  ].filter(Boolean);

  console.log('[Watcher] Initializing file watcher...');
  console.log('[Watcher] Watching paths:', watchPaths);

  try {
    watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: true,
      depth: 5,
      awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
      },
      // Ignore hidden files and temp files
      ignored: /(^|[\/\\])\../
    });

    watcher
      .on('add', (filePath) => {
        console.log(`[Watcher] File added: ${filePath}`);
        debouncedCallback(onChangeCallback, 'add', filePath);
      })
      .on('change', (filePath) => {
        console.log(`[Watcher] File changed: ${filePath}`);
        debouncedCallback(onChangeCallback, 'change', filePath);
      })
      .on('unlink', (filePath) => {
        console.log(`[Watcher] File removed: ${filePath}`);
        debouncedCallback(onChangeCallback, 'remove', filePath);
      })
      .on('error', (error) => {
        console.error('[Watcher] Error:', error);
      })
      .on('ready', () => {
        console.log('[Watcher] Ready and watching for changes');
      });

    return watcher;
  } catch (error) {
    console.error('[Watcher] Failed to initialize:', error);
    return null;
  }
}

/**
 * Debounce callback to avoid rapid-fire rescans
 */
function debouncedCallback(callback, type, filePath) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    console.log('[Watcher] Triggering callback after debounce');
    if (typeof callback === 'function') {
      callback({ type, path: filePath, timestamp: new Date() });
    }
    debounceTimer = null;
  }, DEBOUNCE_MS);
}

/**
 * Stop the file watcher
 */
function stopWatcher() {
  if (watcher) {
    console.log('[Watcher] Stopping...');
    watcher.close();
    watcher = null;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

/**
 * Check if watcher is running
 */
function isWatching() {
  return watcher !== null;
}

module.exports = {
  initWatcher,
  stopWatcher,
  isWatching
};
