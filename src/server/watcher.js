/**
 * RetroWebLauncher - File Watcher
 * Monitors Retrobat directories for changes and triggers rescan
 */

const chokidar = require('chokidar');
const path = require('path');
const { loadConfig, getRetrobatPaths } = require('./config');

let watcher = null;
let debounceTimer = null;
let errorCount = 0;
let lastErrorTime = 0;
const DEBOUNCE_MS = 5000; // Wait 5 seconds after last change
const ERROR_THROTTLE_MS = 60000; // Only log errors once per minute
const MAX_ERRORS_TO_LOG = 3; // Max errors to log before silencing

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

  // Paths to watch - only watch the main config, not all ROMs (symlinks cause issues)
  const watchPaths = [
    // Watch system config only - most reliable
    paths.systemsConfig
  ].filter(Boolean);

  console.log('[Watcher] Initializing file watcher...');
  console.log('[Watcher] Watching:', paths.systemsConfig);
  console.log('[Watcher] Note: Use "Rescan Library" button or restart server to refresh game lists');

  try {
    watcher = chokidar.watch(watchPaths, {
      persistent: true,
      ignoreInitial: true,
      followSymlinks: false, // Don't follow symlinks - they often point to network drives
      depth: 0, // Only watch direct paths
      usePolling: false, // Native watching is more efficient
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
        // Throttle error logging to prevent console spam
        const now = Date.now();
        if (now - lastErrorTime > ERROR_THROTTLE_MS) {
          errorCount = 0;
        }
        errorCount++;
        lastErrorTime = now;

        if (errorCount <= MAX_ERRORS_TO_LOG) {
          console.warn(`[Watcher] Error (${errorCount}): ${error.message || error}`);
          if (errorCount === MAX_ERRORS_TO_LOG) {
            console.warn('[Watcher] Suppressing further errors for 1 minute...');
          }
        }
      })
      .on('ready', () => {
        console.log('[Watcher] Ready and watching for changes');
      });

    return watcher;
  } catch (error) {
    console.error('[Watcher] Failed to initialize:', error.message);
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
