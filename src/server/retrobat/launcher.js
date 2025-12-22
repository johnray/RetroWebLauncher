/**
 * RetroWebLauncher - Game Launcher
 * Launches games via Retrobat's emulatorLauncher.exe
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { loadConfig, getRetrobatPaths } = require('../config');
const cache = require('../cache');

// Track running game process
let currentGameProcess = null;
let currentGameInfo = null;

/**
 * Launch a game
 * @param {Object} game - Game object from cache
 * @param {Object} options - Launch options
 * @returns {Object} Launch result
 */
async function launchGame(game, options = {}) {
  const config = loadConfig();
  const paths = getRetrobatPaths();

  // Verify emulatorLauncher.exe exists
  const launcherPath = paths.emulatorLauncher;
  if (!fs.existsSync(launcherPath)) {
    throw new Error(`emulatorLauncher.exe not found at: ${launcherPath}`);
  }

  // Get the system info
  const system = cache.getSystem(game.systemId);
  if (!system) {
    throw new Error(`System not found: ${game.systemId}`);
  }

  // Build the ROM path
  const romPath = game.fullPath;
  if (!fs.existsSync(romPath)) {
    throw new Error(`ROM file not found: ${romPath}`);
  }

  // Kill existing game if running
  if (currentGameProcess) {
    await killCurrentGame();
  }

  // Determine emulator and core to use
  // Priority: options override > system default
  let emulatorName = options.emulator || '';
  let coreName = options.core || '';

  // If no emulator specified, use system's default (first in list)
  if (!emulatorName && system.emulators && system.emulators.length > 0) {
    const defaultEmu = system.emulators[0];
    emulatorName = defaultEmu.name;

    // If it's libretro and has cores, use the first core
    if (!coreName && defaultEmu.cores && defaultEmu.cores.length > 0) {
      // Look for default core first, otherwise use first
      const defaultCore = defaultEmu.cores.find(c => c.default) || defaultEmu.cores[0];
      coreName = defaultCore.name || defaultCore;
    }
  }

  // Build launch arguments - quote paths with spaces
  const quotedRomPath = `"${romPath}"`;
  const args = [
    '-system', system.name,
    '-rom', quotedRomPath
  ];

  // Add emulator (required by emulatorLauncher)
  if (emulatorName) {
    args.push('-emulator', emulatorName);
  }

  // Add core (required for libretro)
  if (coreName) {
    args.push('-core', coreName);
  }

  console.log(`Launching: ${game.name}`);
  console.log(`  System: ${system.name}`);
  console.log(`  Emulator: ${emulatorName || 'auto'}`);
  console.log(`  Core: ${coreName || 'none'}`);
  console.log(`  ROM: ${romPath}`);
  console.log(`  Command: ${launcherPath} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    try {
      // Quote the launcher path too in case it has spaces
      const quotedLauncherPath = `"${launcherPath}"`;

      // Use shell: true to properly handle quoted paths on Windows
      // Use pipe for stdio to capture output for debugging
      currentGameProcess = spawn(quotedLauncherPath, args, {
        cwd: path.dirname(launcherPath),
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
        windowsHide: false, // Show the game window
        shell: true // Required for proper path quoting on Windows
      });

      currentGameInfo = {
        gameId: game.id,
        gameName: game.name,
        systemId: system.id,
        systemName: system.name,
        startTime: new Date(),
        pid: currentGameProcess.pid
      };

      // Capture stdout and stderr for debugging
      let stdout = '';
      let stderr = '';

      currentGameProcess.stdout.on('data', (data) => {
        stdout += data.toString();
        console.log('[Launcher stdout]:', data.toString().trim());
      });

      currentGameProcess.stderr.on('data', (data) => {
        stderr += data.toString();
        console.error('[Launcher stderr]:', data.toString().trim());
      });

      currentGameProcess.unref();

      // Listen for process exit
      currentGameProcess.on('exit', (code) => {
        console.log(`Game process exited with code: ${code}`);
        if (code !== 0 && (stdout || stderr)) {
          console.log('Captured output:', { stdout: stdout.trim(), stderr: stderr.trim() });
        }
        currentGameProcess = null;
        currentGameInfo = null;
      });

      currentGameProcess.on('error', (error) => {
        console.error('Game launch error:', error);
        currentGameProcess = null;
        currentGameInfo = null;
      });

      resolve({
        success: true,
        message: `Launched ${game.name}`,
        pid: currentGameProcess.pid,
        game: {
          id: game.id,
          name: game.name
        },
        system: {
          id: system.id,
          name: system.name
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Kill the currently running game
 */
async function killCurrentGame() {
  if (!currentGameProcess) {
    return { success: true, message: 'No game running' };
  }

  return new Promise((resolve) => {
    const pid = currentGameProcess.pid;

    try {
      // On Windows, we need to kill the process tree
      exec(`taskkill /pid ${pid} /T /F`, (error) => {
        if (error) {
          console.warn('Failed to kill process:', error.message);
        }

        currentGameProcess = null;
        currentGameInfo = null;

        resolve({
          success: true,
          message: `Killed process ${pid}`
        });
      });
    } catch (error) {
      console.error('Error killing game:', error);
      currentGameProcess = null;
      currentGameInfo = null;
      resolve({
        success: false,
        message: error.message
      });
    }
  });
}

/**
 * Get info about currently running game
 */
function getCurrentGame() {
  if (!currentGameInfo) {
    return null;
  }

  return {
    ...currentGameInfo,
    running: currentGameProcess !== null
  };
}

/**
 * Check if a game is currently running
 */
function isGameRunning() {
  return currentGameProcess !== null;
}

module.exports = {
  launchGame,
  killCurrentGame,
  getCurrentGame,
  isGameRunning
};
