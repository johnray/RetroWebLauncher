@echo off
title RetroWebLauncher - Development Mode
color 0E

:: Change to script directory
cd /d "%~dp0"

:: Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo  [ERROR] Dependencies not installed!
    echo  Please run install.bat first.
    echo.
    pause
    exit /b 1
)

:: Start the server in watch mode (auto-restart on changes)
echo.
echo  Starting RetroWebLauncher in Development Mode...
echo  Server will auto-restart when files change.
echo.
echo  Press Ctrl+C to stop.
echo.

node --watch src/server/index.js
