@echo off
setlocal enabledelayedexpansion
title RetroWebLauncher
color 0B
cd /d "%~dp0"

:: ============================================
:: RetroWebLauncher - One-Click Launcher
:: ============================================

echo.
echo   ____      _           __        __   _
echo  ^|  _ \ ___^| ^|_ _ __ ___\ \      / /__^| ^|__
echo  ^| ^|_) / _ \ __^| '__/ _ \\ \ /\ / / _ \ '_ \
echo  ^|  _ ^<  __/ ^|_^| ^| ^| (_) ^|\ V  V /  __/ ^|_) ^|
echo  ^|_^| \_\___^|\__^|_^|  \___/  \_/\_/ \___^|_.__/
echo                                    Launcher
echo.

:: ============================================
:: Step 1: Check for Node.js (auto-install if missing)
:: ============================================
set "NODE_OK=0"
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=1,2,3 delims=v." %%a in ('node -v') do set NODE_MAJOR=%%b
    if !NODE_MAJOR! GEQ 18 set "NODE_OK=1"
)

if "!NODE_OK!"=="0" (
    echo  [!] Node.js 18+ is required but not found.
    echo.
    set /p "INSTALL_NODE=      Install Node.js automatically? [Y/n]: "
    if /i "!INSTALL_NODE!"=="n" (
        echo.
        echo      Please install Node.js 20 LTS from https://nodejs.org/
        echo      Then run this script again.
        pause
        exit /b 1
    )

    echo.
    echo  [*] Downloading Node.js 20 LTS...

    set "NODE_MSI=%TEMP%\node-v20-install.msi"
    set "NODE_URL=https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi"

    :: Download using PowerShell (with progress)
    powershell -Command "& { $ProgressPreference = 'SilentlyContinue'; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Write-Host '      Downloading...' ; Invoke-WebRequest -Uri '%NODE_URL%' -OutFile '%NODE_MSI%' ; Write-Host '      Download complete.' }"

    if not exist "!NODE_MSI!" (
        echo.
        echo  [!] Download failed. Please install Node.js manually:
        echo      https://nodejs.org/
        start https://nodejs.org/
        pause
        exit /b 1
    )

    echo.
    echo  [*] Installing Node.js...
    echo      ^(You may see a UAC prompt - please accept it^)
    echo.

    :: Install with UI (so user can see progress and accept UAC)
    msiexec /i "!NODE_MSI!" /passive /norestart

    :: Wait a moment for PATH to update
    timeout /t 3 /nobreak >nul

    :: Clean up installer
    del "!NODE_MSI!" 2>nul

    :: Refresh environment PATH
    for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SYSPATH=%%b"
    for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "USERPATH=%%b"
    set "PATH=!SYSPATH!;!USERPATH!"

    :: Verify installation
    where node >nul 2>nul
    if %ERRORLEVEL% NEQ 0 (
        echo  [!] Node.js installation may require you to restart this script.
        echo      Please close this window and double-click run.bat again.
        pause
        exit /b 1
    )

    echo  [OK] Node.js installed successfully!
    echo.
)

:: ============================================
:: Step 2: Install dependencies if needed
:: ============================================
if not exist "node_modules\express" (
    echo  [*] Installing dependencies ^(first run only^)...
    echo.
    call npm install --loglevel=error
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  [!] Failed to install dependencies.
        echo      Check your internet connection and try again.
        echo.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Dependencies installed.
    echo.
)

:: ============================================
:: Step 3: Create config if needed
:: ============================================
if not exist "rwl.config.json" (
    echo  ============================================
    echo   First-Time Setup
    echo  ============================================
    echo.

    :: Try to auto-detect Retrobat
    set "RETROBAT_PATH="

    :: Check common locations
    if exist "E:\Emulators-and-Launchers\RetroBat\emulatorLauncher.exe" (
        set "RETROBAT_PATH=E:\Emulators-and-Launchers\RetroBat"
    ) else if exist "C:\RetroBat\emulatorLauncher.exe" (
        set "RETROBAT_PATH=C:\RetroBat"
    ) else if exist "D:\RetroBat\emulatorLauncher.exe" (
        set "RETROBAT_PATH=D:\RetroBat"
    ) else if exist "%USERPROFILE%\RetroBat\emulatorLauncher.exe" (
        set "RETROBAT_PATH=%USERPROFILE%\RetroBat"
    )

    if defined RETROBAT_PATH (
        echo  [*] Found Retrobat at: !RETROBAT_PATH!
        echo.
        set /p "USE_DETECTED=      Use this path? [Y/n]: "
        if /i "!USE_DETECTED!"=="n" set "RETROBAT_PATH="
    )

    if not defined RETROBAT_PATH (
        echo.
        echo  [?] Enter the path to your Retrobat installation:
        echo      ^(e.g., E:\RetroBat or C:\Games\RetroBat^)
        echo.
        set /p "RETROBAT_PATH=      Path: "
    )

    :: Validate path
    if not exist "!RETROBAT_PATH!\emulatorLauncher.exe" (
        echo.
        echo  [!] Warning: emulatorLauncher.exe not found at that path.
        echo      Games may not launch correctly.
        echo.
        set /p "CONTINUE=      Continue anyway? [y/N]: "
        if /i not "!CONTINUE!"=="y" (
            echo  Setup cancelled.
            pause
            exit /b 1
        )
    )

    echo.
    echo  [?] What would you like to call your arcade?
    echo      ^(This appears in the header and screensaver^)
    echo.
    set /p "ARCADE_NAME=      Arcade Name [My Arcade]: "
    if "!ARCADE_NAME!"=="" set "ARCADE_NAME=My Arcade"

    :: Escape backslashes for JSON
    set "RETROBAT_JSON=!RETROBAT_PATH:\=\\!"

    :: Write config
    (
        echo {
        echo   "retrobatPath": "!RETROBAT_JSON!",
        echo   "port": 3000,
        echo   "arcadeName": "!ARCADE_NAME!",
        echo   "theme": "classic-arcade",
        echo   "defaultView": "wheel",
        echo   "showHiddenGames": false,
        echo   "attractMode": {
        echo     "enabled": true,
        echo     "idleTimeout": 300
        echo   },
        echo   "ai": {
        echo     "enabled": false
        echo   }
        echo }
    ) > rwl.config.json

    echo.
    echo  [OK] Configuration saved!
    echo.
    echo  ============================================
    echo.
)

:: ============================================
:: Step 4: Start the server
:: ============================================
echo  [*] Starting RetroWebLauncher...
echo.

:: Get local IP for network access info
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1"') do (
    for /f "tokens=1" %%b in ("%%a") do set "LOCAL_IP=%%b"
)

echo      Local:   http://localhost:3000
if defined LOCAL_IP echo      Network: http://!LOCAL_IP!:3000
echo.
echo      Press Ctrl+C to stop the server.
echo.
echo  ============================================
echo.

:: Open browser after short delay (gives server time to start)
start /b cmd /c "timeout /t 2 /nobreak >nul && start http://localhost:3000"

:: Start the server (this blocks until Ctrl+C)
node src/server/index.js

:: If we get here, server stopped
echo.
echo  Server stopped.
pause
