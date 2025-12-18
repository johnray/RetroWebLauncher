@echo off
setlocal EnableDelayedExpansion
title RetroWebLauncher - Setup Wizard
color 0E

echo.
echo  =========================================
echo   RetroWebLauncher Setup Wizard
echo  =========================================
echo.

:: Change to script directory
cd /d "%~dp0"
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Failed to change to script directory!
    echo  Please run this script from its original location.
    pause
    exit /b 1
)

:: Check for admin rights (needed for some operations)
net session >nul 2>&1
if %errorLevel% == 0 (
    echo  [OK] Running with administrator privileges
    set IS_ADMIN=1
) else (
    echo  [INFO] Running without administrator privileges
    echo         Some features ^(firewall rules^) may require admin.
    set IS_ADMIN=0
)
echo.

:: =========================================
:: Step 1: Detect Node.js (portable or system)
:: =========================================
echo  Step 1: Checking Node.js installation...

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
echo    1. Run 'rwl portable' to download portable Node.js ^(recommended^)
echo    2. Open the Node.js download page
echo    3. Exit and install manually
echo.
set /p "NODE_CHOICE=  Enter choice (1-3): "
if "!NODE_CHOICE!"=="1" (
    echo  Please run: rwl portable
    echo  Then run this setup again.
    pause
    exit /b 1
)
if "!NODE_CHOICE!"=="2" (
    echo  Opening Node.js download page...
    start "" "https://nodejs.org/"
)
echo.
echo  After installing Node.js, please run this setup again.
echo.
pause
exit /b 1

:node_found

:: Get Node.js version and validate it
for /f "tokens=*" %%v in ('"!NODE_CMD!" -v 2^>nul') do set "NODE_VER=%%v"
if "!NODE_VER!"=="" (
    echo  [ERROR] Could not determine Node.js version!
    pause
    exit /b 1
)

:: Extract major version number (e.g., v20.10.0 -> 20)
set "NODE_VER_CLEAN=!NODE_VER:v=!"
for /f "tokens=1 delims=." %%a in ("!NODE_VER_CLEAN!") do set "NODE_MAJOR=%%a"

:: Validate it's a number
set /a "NODE_MAJOR_CHECK=!NODE_MAJOR!" 2>nul
if !NODE_MAJOR_CHECK! LSS 1 (
    echo  [ERROR] Could not parse Node.js version: !NODE_VER!
    pause
    exit /b 1
)

if !NODE_MAJOR! LSS 18 (
    echo  [WARNING] Node.js !NODE_VER! detected.
    echo            Version 18 or higher is recommended.
    echo.
    set /p "CONTINUE_OLD_NODE=  Continue anyway? (y/N): "
    if /i not "!CONTINUE_OLD_NODE!"=="y" (
        echo  Please install Node.js 20 LTS from https://nodejs.org/
        pause
        exit /b 1
    )
)

echo  [OK] Node.js !NODE_VER! found
if "!USING_PORTABLE!"=="1" (
    echo      ^(Using portable Node.js^)
)
echo.

:: =========================================
:: Step 2: Check npm
:: =========================================
echo  Step 2: Checking npm installation...

for /f "tokens=*" %%v in ('"!NPM_CMD!" -v 2^>nul') do set "NPM_VER=%%v"
if "!NPM_VER!"=="" (
    echo  [ERROR] npm not found! This usually comes with Node.js.
    echo  Please reinstall Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo  [OK] npm !NPM_VER! found
echo.

:: =========================================
:: Step 3: Install dependencies
:: =========================================
echo  Step 3: Installing dependencies...

if exist "node_modules\express" (
    echo  [INFO] Dependencies appear to be installed.
    set /p "REINSTALL=  Reinstall dependencies? (y/N): "
    if /i not "!REINSTALL!"=="y" goto skip_install
)

echo  [INFO] Running npm install...
echo         This may take 1-3 minutes on first run.
echo.

:: Try npm install with error handling
call "!NPM_CMD!" install --loglevel error 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] npm install failed!
    echo.
    echo  Common solutions:
    echo    1. Check your internet connection
    echo    2. Run: npm cache clean --force
    echo    3. Delete node_modules folder and try again
    echo    4. Run as Administrator
    echo.
    set /p "RETRY_NPM=  Retry npm install? (y/N): "
    if /i "!RETRY_NPM!"=="y" (
        echo  [INFO] Clearing npm cache and retrying...
        call "!NPM_CMD!" cache clean --force >nul 2>&1
        rmdir /s /q "node_modules" 2>nul
        call "!NPM_CMD!" install --loglevel error 2>&1
        if %ERRORLEVEL% NEQ 0 (
            echo  [ERROR] npm install failed again!
            pause
            exit /b 1
        )
    ) else (
        pause
        exit /b 1
    )
)

:: Verify critical dependencies installed
if not exist "node_modules\express" (
    echo  [ERROR] Express not installed! npm install may have failed silently.
    pause
    exit /b 1
)
if not exist "node_modules\socket.io" (
    echo  [ERROR] Socket.io not installed! npm install may have failed silently.
    pause
    exit /b 1
)
if not exist "node_modules\better-sqlite3" (
    echo  [WARNING] better-sqlite3 not installed. This may require build tools.
    echo            On Windows, run: npm install --global windows-build-tools
)

echo  [OK] Dependencies installed successfully
echo.

:skip_install

:: =========================================
:: Step 4: Configure Retrobat path
:: =========================================
echo  Step 4: Configure Retrobat path...

:: Check if config exists and is valid
set "NEED_CONFIG=1"
if exist "rwl.config.json" (
    echo  [INFO] Configuration file exists.

    :: Try to read current path from config
    for /f "usebackq tokens=2 delims=:," %%a in (`findstr /i "retrobatPath" rwl.config.json 2^>nul`) do (
        set "CURRENT_PATH=%%~a"
    )

    if defined CURRENT_PATH (
        echo  Current Retrobat path: !CURRENT_PATH!
    )

    set /p "RECONFIGURE=  Reconfigure? (y/N): "
    if /i not "!RECONFIGURE!"=="y" (
        set "NEED_CONFIG=0"
    )
)

if "!NEED_CONFIG!"=="1" (
    call :configure_retrobat
    if %ERRORLEVEL% NEQ 0 (
        echo  [ERROR] Configuration failed!
        pause
        exit /b 1
    )
)
echo.

:: =========================================
:: Step 5: Create shortcuts
:: =========================================
echo  Step 5: Creating shortcuts...

:: Create assets/icons directory if it doesn't exist
if not exist "assets\icons" mkdir "assets\icons" 2>nul

:: Check if icon exists, create a placeholder message if not
if not exist "assets\icons\app.ico" (
    echo  [INFO] App icon not found. Shortcuts will use default icon.
    set "ICON_PATH="
) else (
    set "ICON_PATH=%~dp0assets\icons\app.ico"
)

:: Start Menu shortcut
set "STARTMENU_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs"
if exist "!STARTMENU_PATH!" (
    powershell -ExecutionPolicy Bypass -Command ^
        "$ws = New-Object -ComObject WScript.Shell; ^
        $s = $ws.CreateShortcut('!STARTMENU_PATH!\RetroWebLauncher.lnk'); ^
        $s.TargetPath = '%~dp0rwl.bat'; ^
        $s.WorkingDirectory = '%~dp0'; ^
        $s.Description = 'RetroWebLauncher - Web frontend for Retrobat'; ^
        $s.Save()" 2>nul
    if %ERRORLEVEL% EQU 0 (
        echo  [OK] Start Menu shortcut created
    ) else (
        echo  [WARNING] Could not create Start Menu shortcut
    )
) else (
    echo  [WARNING] Start Menu folder not found
)
echo.

:: =========================================
:: Step 6: Ask about startup
:: =========================================
echo  Step 6: Startup configuration...
set /p "ADD_STARTUP=  Add RetroWebLauncher to Windows startup? (y/N): "
if /i "!ADD_STARTUP!"=="y" (
    set "STARTUP_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
    if exist "!STARTUP_PATH!" (
        powershell -ExecutionPolicy Bypass -Command ^
            "$ws = New-Object -ComObject WScript.Shell; ^
            $s = $ws.CreateShortcut('!STARTUP_PATH!\RetroWebLauncher.lnk'); ^
            $s.TargetPath = '%~dp0start.bat'; ^
            $s.WorkingDirectory = '%~dp0'; ^
            $s.WindowStyle = 7; ^
            $s.Description = 'RetroWebLauncher Auto-Start'; ^
            $s.Save()" 2>nul
        if %ERRORLEVEL% EQU 0 (
            echo  [OK] Added to Windows startup ^(minimized^)
        ) else (
            echo  [WARNING] Could not add to startup
        )
    ) else (
        echo  [WARNING] Startup folder not found
    )
) else (
    echo  [INFO] Skipped startup configuration
)
echo.

:: =========================================
:: Step 7: Firewall rule (requires admin)
:: =========================================
echo  Step 7: Firewall configuration...

if "!IS_ADMIN!"=="0" (
    echo  [INFO] Firewall configuration requires administrator privileges.
    echo         Run this setup as Administrator to configure firewall.
    goto skip_firewall
)

set /p "ADD_FIREWALL=  Add firewall rule for network access? (y/N): "
if /i "!ADD_FIREWALL!"=="y" (
    :: Check if rule already exists
    netsh advfirewall firewall show rule name="RetroWebLauncher" >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        echo  [INFO] Firewall rule already exists
    ) else (
        netsh advfirewall firewall add rule name="RetroWebLauncher" dir=in action=allow protocol=TCP localport=3000 >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo  [OK] Firewall rule added for port 3000
        ) else (
            echo  [WARNING] Could not add firewall rule
        )
    )
) else (
    echo  [INFO] Skipped firewall configuration
)

:skip_firewall
echo.

:: =========================================
:: Done!
:: =========================================
echo  =========================================
echo   Setup Complete!
echo  =========================================
echo.
echo  To start RetroWebLauncher:
echo    - Run rwl.bat (controller script)
echo    - Or double-click start.bat
echo    - Or use the Start Menu shortcut
echo.
echo  Controller commands:
echo    rwl start    - Start the server
echo    rwl stop     - Stop the server
echo    rwl status   - View server status
echo    rwl portable - Download portable Node.js
echo.
echo  Access from this computer:
echo    http://localhost:3000
echo.

:: Get network IP addresses
echo  Access from other devices on your network:
set "FOUND_IP=0"
for /f "tokens=2 delims=:" %%a in ('ipconfig 2^>nul ^| findstr /i "IPv4"') do (
    set "IP_ADDR=%%a"
    set "IP_ADDR=!IP_ADDR: =!"
    if not "!IP_ADDR!"=="" (
        if not "!IP_ADDR!"=="127.0.0.1" (
            echo    http://!IP_ADDR!:3000
            set "FOUND_IP=1"
        )
    )
)
if "!FOUND_IP!"=="0" (
    echo    ^(Could not determine network IP^)
)
echo.

:: Offer to start now
set /p "START_NOW=  Start RetroWebLauncher now? (Y/n): "
if /i not "!START_NOW!"=="n" (
    echo  Starting RetroWebLauncher...
    start "" "%~dp0start.bat"

    :: Wait a moment for server to start
    echo  Waiting for server to start...
    timeout /t 4 /nobreak >nul

    :: Open browser
    start "" "http://localhost:3000"
)

echo.
echo  Setup finished. Press any key to exit.
pause >nul
exit /b 0

:: =========================================
:: Subroutine: Configure Retrobat Path
:: =========================================
:configure_retrobat
echo.
echo  Enter the full path to your Retrobat installation.
echo  Example: E:\Emulators-and-Launchers\RetroBat
echo.

:input_path
set /p "RETROBAT_PATH=  Retrobat path: "

:: Remove quotes if user added them
set "RETROBAT_PATH=!RETROBAT_PATH:"=!"

:: Check if path is empty
if "!RETROBAT_PATH!"=="" (
    echo  [ERROR] Path cannot be empty!
    goto input_path
)

:: Check if path exists
if not exist "!RETROBAT_PATH!" (
    echo  [ERROR] Path does not exist: !RETROBAT_PATH!
    set /p "RETRY_PATH=  Try again? (Y/n): "
    if /i "!RETRY_PATH!"=="n" exit /b 1
    goto input_path
)

:: Check for emulatorLauncher.exe
if not exist "!RETROBAT_PATH!\emulatorLauncher.exe" (
    echo.
    echo  [WARNING] emulatorLauncher.exe not found in:
    echo            !RETROBAT_PATH!
    echo.
    echo  This may not be the correct Retrobat directory.
    set /p "CONTINUE_ANYWAY=  Continue anyway? (y/N): "
    if /i not "!CONTINUE_ANYWAY!"=="y" goto input_path
)

:: Check for es_systems.cfg
set "ES_SYSTEMS_PATH=!RETROBAT_PATH!\emulationstation\.emulationstation\es_systems.cfg"
if not exist "!ES_SYSTEMS_PATH!" (
    echo  [WARNING] es_systems.cfg not found. Systems may not be detected.
)

echo.
set /p "ARCADE_NAME=  Arcade name (e.g., John's Arcade): "
if "!ARCADE_NAME!"=="" set "ARCADE_NAME=My Arcade"

:: Escape backslashes for JSON
set "RETROBAT_PATH_ESCAPED=!RETROBAT_PATH:\=\\!"

:: Escape quotes in arcade name
set "ARCADE_NAME_ESCAPED=!ARCADE_NAME:"=\"!"

:: Generate config file using PowerShell (handles special characters better)
echo  [INFO] Creating configuration file...
powershell -ExecutionPolicy Bypass -Command ^
    "$config = @{" ^
    "  retrobatPath = '!RETROBAT_PATH_ESCAPED!';" ^
    "  port = 3000;" ^
    "  arcadeName = '!ARCADE_NAME_ESCAPED!';" ^
    "  theme = 'classic-arcade';" ^
    "  defaultView = 'wheel';" ^
    "  showHiddenGames = $false;" ^
    "  attractMode = @{ enabled = $true; idleTimeout = 300 };" ^
    "  ai = @{ enabled = $false; provider = 'ollama' }" ^
    "};" ^
    "$config | ConvertTo-Json -Depth 3 | Set-Content -Path 'rwl.config.json' -Encoding UTF8" 2>nul

if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Failed to create configuration file!
    exit /b 1
)

if not exist "rwl.config.json" (
    echo  [ERROR] Configuration file was not created!
    exit /b 1
)

echo  [OK] Configuration saved to rwl.config.json
exit /b 0
