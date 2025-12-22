#!/usr/bin/env node
/**
 * RetroWebLauncher - Sync & Version Script
 * Syncs source files to installed directory and optionally bumps version
 *
 * Usage:
 *   node scripts/sync.js           - Sync only
 *   node scripts/sync.js patch     - Bump patch version (1.0.0 -> 1.0.1) and sync
 *   node scripts/sync.js minor     - Bump minor version (1.0.0 -> 1.1.0) and sync
 *   node scripts/sync.js major     - Bump major version (1.0.0 -> 2.0.0) and sync
 */

const fs = require('fs');
const path = require('path');

// Configuration
const SOURCE_DIR = path.join(__dirname, '..');
const INSTALL_DIR = 'E:\\Emulators-and-Launchers\\RetroWebLauncher';

// Directories to sync
const SYNC_DIRS = [
  'src/client',
  'src/server',
  'themes'
];

// Individual files to sync
const SYNC_FILES = [
  'package.json',
  'rwl.ps1',
  'rwl.bat'
];

function bumpVersion(type) {
  const pkgPath = path.join(SOURCE_DIR, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  const [major, minor, patch] = pkg.version.split('.').map(Number);

  switch (type) {
    case 'patch':
      pkg.version = `${major}.${minor}.${patch + 1}`;
      break;
    case 'minor':
      pkg.version = `${major}.${minor + 1}.0`;
      break;
    case 'major':
      pkg.version = `${major + 1}.0.0`;
      break;
    default:
      console.log(`Unknown version type: ${type}`);
      return null;
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`Version bumped to ${pkg.version}`);
  return pkg.version;
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    console.log(`  Skipping (not found): ${src}`);
    return 0;
  }

  const stats = fs.statSync(src);

  if (stats.isDirectory()) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }

    let count = 0;
    const files = fs.readdirSync(src);
    for (const file of files) {
      count += copyRecursive(
        path.join(src, file),
        path.join(dest, file)
      );
    }
    return count;
  } else {
    // Ensure parent directory exists
    const parentDir = path.dirname(dest);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.copyFileSync(src, dest);
    return 1;
  }
}

function sync() {
  console.log(`\nSyncing to: ${INSTALL_DIR}`);

  if (!fs.existsSync(INSTALL_DIR)) {
    console.log('Install directory not found. Creating...');
    fs.mkdirSync(INSTALL_DIR, { recursive: true });
  }

  let totalFiles = 0;

  // Sync directories
  for (const dir of SYNC_DIRS) {
    const srcPath = path.join(SOURCE_DIR, dir);
    const destPath = path.join(INSTALL_DIR, dir);
    console.log(`\nSyncing ${dir}...`);
    const count = copyRecursive(srcPath, destPath);
    totalFiles += count;
    console.log(`  Copied ${count} files`);
  }

  // Sync individual files
  console.log('\nSyncing root files...');
  for (const file of SYNC_FILES) {
    const srcPath = path.join(SOURCE_DIR, file);
    const destPath = path.join(INSTALL_DIR, file);
    if (fs.existsSync(srcPath)) {
      const parentDir = path.dirname(destPath);
      if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
      }
      fs.copyFileSync(srcPath, destPath);
      console.log(`  ${file}`);
      totalFiles++;
    }
  }

  console.log(`\nSync complete! ${totalFiles} files copied.`);
}

// Main
const versionType = process.argv[2];

if (versionType) {
  if (['patch', 'minor', 'major'].includes(versionType)) {
    bumpVersion(versionType);
  } else {
    console.log('Usage: node scripts/sync.js [patch|minor|major]');
    process.exit(1);
  }
}

sync();
