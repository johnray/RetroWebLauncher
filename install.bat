@echo off
setlocal EnableDelayedExpansion
title RetroWebLauncher - Dependency Installation
color 0A

echo.
echo  =========================================
echo   RetroWebLauncher - Install Dependencies
echo  =========================================
echo.

:: Change to script directory
cd /d "%~dp0"
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Failed to change to script directory!
    pause
    exit /b 1
)

:: =========================================
:: Step 1: Detect Node.js (portable or system)
:: =========================================
echo  Checking Node.js installation...

set "NODE_CMD="
set "NPM_CMD="
set "USING_PORTABLE=0"

:: Check for portable Node.js first
if exist "%~dp0node\node.exe" (
    set "NODE_CMD=%~dp0node\node.exe"
    set "NPM_CMD=%~dp0node\npm.cmd"
    set "USING_PORTABLE=1"
    goto node_found
)

:: Fall back to system Node.js
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "NODE_CMD=node"
    set "NPM_CMD=npm"
    goto node_found
)

:: Node.js not found
echo.
echo  [ERROR] Node.js is not installed!
echo.
echo  Options:
echo    1. Run 'rwl portable' to download portable Node.js
echo    2. Install Node.js 18 LTS or higher from https://nodejs.org/
echo.
set /p "OPEN_DL=  Open download page? (Y/n): "
if /i not "!OPEN_DL!"=="n" (
    start "" "https://nodejs.org/"
)
echo.
echo  After installing Node.js, run this script again.
pause
exit /b 1

:node_found

:: Get and display Node.js version
for /f "tokens=*" %%v in ('"!NODE_CMD!" -v 2^>nul') do set "NODE_VER=%%v"
set "NODE_VER_CLEAN=!NODE_VER:v=!"
for /f "tokens=1 delims=." %%a in ("!NODE_VER_CLEAN!") do set "NODE_MAJOR=%%a"

set /a "NODE_MAJOR_NUM=!NODE_MAJOR!" 2>nul
if !NODE_MAJOR_NUM! LSS 18 (
    echo.
    echo  [WARNING] Node.js !NODE_VER! detected.
    echo            Version 18 LTS or higher is recommended.
    echo.
    set /p "CONTINUE_OLD=  Continue with older version? (y/N): "
    if /i not "!CONTINUE_OLD!"=="y" (
        echo  Please install Node.js 20 LTS from https://nodejs.org/
        pause
        exit /b 1
    )
)

echo  [OK] Node.js !NODE_VER! detected
if "!USING_PORTABLE!"=="1" (
    echo      ^(Using portable Node.js^)
)
echo.

:: =========================================
:: Step 2: Check npm
:: =========================================
echo  Checking npm installation...

for /f "tokens=*" %%v in ('"!NPM_CMD!" -v 2^>nul') do set "NPM_VER=%%v"
if "!NPM_VER!"=="" (
    echo  [ERROR] npm not found!
    echo  npm should be installed with Node.js. Please reinstall Node.js.
    pause
    exit /b 1
)

echo  [OK] npm !NPM_VER! detected
echo.

:: =========================================
:: Step 3: Check internet connectivity
:: =========================================
echo  Checking internet connectivity...

ping -n 1 registry.npmjs.org >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    ping -n 1 8.8.8.8 >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo  [WARNING] No internet connection detected!
        echo            npm install requires internet access.
        echo.
        set /p "CONTINUE_OFFLINE=  Try anyway? (y/N): "
        if /i not "!CONTINUE_OFFLINE!"=="y" (
            pause
            exit /b 1
        )
    ) else (
        echo  [WARNING] Cannot reach npm registry. DNS issue possible.
    )
) else (
    echo  [OK] Internet connection available
)
echo.

:: =========================================
:: Step 4: Clean up if requested
:: =========================================
if exist "node_modules" (
    echo  Existing node_modules folder found.
    set /p "CLEAN_INSTALL=  Perform clean install? (delete node_modules) (y/N): "
    if /i "!CLEAN_INSTALL!"=="y" (
        echo  [INFO] Removing old node_modules...
        rmdir /s /q "node_modules" 2>nul
        if exist "node_modules" (
            echo  [ERROR] Could not remove node_modules folder.
            echo          Close any programs using files in this folder.
            pause
            exit /b 1
        )
        echo  [OK] Old node_modules removed
    )
)
echo.

:: =========================================
:: Step 5: Install dependencies
:: =========================================
echo  Installing dependencies...
echo  This may take 1-5 minutes depending on your connection.
echo.

set "INSTALL_ATTEMPTS=0"

:try_install
set /a "INSTALL_ATTEMPTS+=1"
echo  [Attempt !INSTALL_ATTEMPTS!/3] Running npm install...
echo.

call "!NPM_CMD!" install 2>&1
set "NPM_EXIT=%ERRORLEVEL%"

if %NPM_EXIT% NEQ 0 (
    echo.
    echo  [ERROR] npm install failed with exit code %NPM_EXIT%
    echo.

    if !INSTALL_ATTEMPTS! LSS 3 (
        echo  Possible solutions:
        echo    - Check your internet connection
        echo    - Try again ^(sometimes npm registry is slow^)
        echo    - Run: npm cache clean --force
        echo.
        set /p "RETRY_INSTALL=  Retry installation? (Y/n): "
        if /i not "!RETRY_INSTALL!"=="n" (
            echo  [INFO] Clearing npm cache before retry...
            call "!NPM_CMD!" cache clean --force >nul 2>&1
            echo.
            goto try_install
        )
    ) else (
        echo  Maximum retry attempts reached.
        echo.
        echo  Troubleshooting steps:
        echo    1. Check firewall/proxy settings
        echo    2. Try: npm config set registry https://registry.npmjs.org/
        echo    3. Run as Administrator
        echo    4. Check for disk space
        echo.
    )
    pause
    exit /b 1
)

echo.

:: =========================================
:: Step 6: Verify installation
:: =========================================
echo  Verifying installation...

set "MISSING_DEPS=0"

if not exist "node_modules\express" (
    echo  [ERROR] express not installed!
    set "MISSING_DEPS=1"
)
if not exist "node_modules\socket.io" (
    echo  [ERROR] socket.io not installed!
    set "MISSING_DEPS=1"
)
if not exist "node_modules\fast-xml-parser" (
    echo  [ERROR] fast-xml-parser not installed!
    set "MISSING_DEPS=1"
)
if not exist "node_modules\better-sqlite3" (
    echo  [WARNING] better-sqlite3 not installed!
    echo            This native module may need Visual Studio Build Tools.
    echo            Run: npm install --global windows-build-tools
    set "MISSING_DEPS=1"
)
if not exist "node_modules\chokidar" (
    echo  [WARNING] chokidar not installed!
    set "MISSING_DEPS=1"
)
if not exist "node_modules\qrcode" (
    echo  [WARNING] qrcode not installed!
    set "MISSING_DEPS=1"
)

if "!MISSING_DEPS!"=="1" (
    echo.
    echo  [WARNING] Some dependencies may not have installed correctly.
    echo            The application may not work properly.
    echo.
    set /p "CONTINUE_MISSING=  Continue anyway? (y/N): "
    if /i not "!CONTINUE_MISSING!"=="y" (
        pause
        exit /b 1
    )
) else (
    echo  [OK] All core dependencies verified!
)

echo.
echo  =========================================
echo   Installation Complete!
echo  =========================================
echo.
echo  Next steps:
echo.
echo    1. Run setup.bat to configure RetroWebLauncher
echo       (first-time setup)
echo.
echo    2. Run start.bat to launch the server
echo       Or use: rwl start
echo.

set /p "RUN_SETUP=  Run setup now? (Y/n): "
if /i not "!RUN_SETUP!"=="n" (
    call "%~dp0setup.bat"
)

pause
exit /b 0
