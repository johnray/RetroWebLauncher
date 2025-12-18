@echo off
title RetroWebLauncher - Installation
color 0A

echo.
echo  =========================================
echo   RetroWebLauncher Installation
echo  =========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Node.js is not installed!
    echo.
    echo  Please install Node.js 20 LTS or higher from:
    echo  https://nodejs.org/
    echo.
    echo  After installing Node.js, run this script again.
    echo.
    pause
    exit /b 1
)

:: Check Node.js version
for /f "tokens=1,2,3 delims=." %%a in ('node -v') do (
    set NODE_MAJOR=%%a
)
set NODE_MAJOR=%NODE_MAJOR:v=%

if %NODE_MAJOR% LSS 18 (
    echo  [WARNING] Node.js version is older than recommended.
    echo  Please install Node.js 20 LTS for best compatibility.
    echo.
)

echo  [OK] Node.js found:
node -v
echo.

:: Install dependencies
echo  Installing dependencies...
echo  This may take a few minutes...
echo.

call npm install

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] Failed to install dependencies!
    echo  Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo  =========================================
echo   Installation Complete!
echo  =========================================
echo.
echo  To start RetroWebLauncher, run:
echo    start.bat
echo.
echo  Or double-click start.bat in Explorer.
echo.

pause
