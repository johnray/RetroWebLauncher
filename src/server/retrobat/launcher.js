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

  // Build launch arguments
  const args = [
    '-system', system.name,
    '-rom', romPath
  ];

  // Add optional emulator/core overrides
  if (options.emulator) {
    args.push('-emulator', options.emulator);
  }
  if (options.core) {
    args.push('-core', options.core);
  }

  console.log(`Launching: ${game.name}`);
  console.log(`  System: ${system.name}`);
  console.log(`  ROM: ${romPath}`);
  console.log(`  Command: ${launcherPath} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    try {
      // Spawn the launcher process
      currentGameProcess = spawn(launcherPath, args, {
        cwd: path.dirname(launcherPath),
        detached: true,
        stdio: 'ignore',
        windowsHide: false // Show the game window
      });

      currentGameInfo = {
        gameId: game.id,
        gameName: game.name,
        systemId: system.id,
        systemName: system.name,
        startTime: new Date(),
        pid: currentGameProcess.pid
      };

      currentGameProcess.unref();

      // Listen for process exit
      currentGameProcess.on('exit', (code) => {
        console.log(`Game process exited with code: ${code}`);
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
