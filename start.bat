@echo off
title RetroWebLauncher
color 0B

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

:: Start the server
echo.
echo  Starting RetroWebLauncher...
echo.
echo  Press Ctrl+C to stop the server.
echo.

node src/server/index.js

:: If we get here, the server stopped
echo.
echo  Server stopped.
pause
