@echo off
title RetroWebLauncher - Setup Wizard
color 0E

echo.
echo  =========================================
echo   RetroWebLauncher Setup Wizard
echo  =========================================
echo.

:: Change to script directory
cd /d "%~dp0"

:: Check for admin rights (needed for some operations)
net session >nul 2>&1
if %errorLevel% == 0 (
    echo  [OK] Running with administrator privileges
) else (
    echo  [INFO] Running without administrator privileges
    echo         Some features may be limited.
)
echo.

:: Step 1: Check Node.js
echo  Step 1: Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] Node.js is not installed!
    echo.
    echo  Node.js 20 LTS or higher is required.
    echo.
    echo  Would you like to:
    echo    1. Open the Node.js download page
    echo    2. Exit and install manually
    echo.
    set /p choice="  Enter choice (1 or 2): "
    if "%choice%"=="1" (
        start https://nodejs.org/
    )
    echo.
    echo  After installing Node.js, run this setup again.
    pause
    exit /b 1
)

for /f "tokens=1 delims=v" %%a in ('node -v') do set NODE_VERSION=%%a
echo  [OK] Node.js found: %NODE_VERSION%
echo.

:: Step 2: Install dependencies
echo  Step 2: Installing dependencies...
if exist "node_modules" (
    echo  [INFO] node_modules exists, skipping install.
    echo         Run 'npm install' manually to update.
) else (
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo.
        echo  [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
)
echo  [OK] Dependencies installed
echo.

:: Step 3: Configure Retrobat path
echo  Step 3: Configure Retrobat path...
if exist "rwl.config.json" (
    echo  [INFO] Configuration file exists.
    set /p reconfigure="  Reconfigure Retrobat path? (y/N): "
    if /i not "%reconfigure%"=="y" goto skip_config
)

:config_retrobat
echo.
echo  Enter the full path to your Retrobat installation.
echo  Example: E:\Emulators-and-Launchers\RetroBat
echo.
set /p RETROBAT_PATH="  Retrobat path: "

:: Validate path
if not exist "%RETROBAT_PATH%" (
    echo  [ERROR] Path does not exist!
    goto config_retrobat
)

if not exist "%RETROBAT_PATH%\emulatorLauncher.exe" (
    echo  [WARNING] emulatorLauncher.exe not found in path.
    echo            Make sure this is the correct Retrobat directory.
    set /p continue_anyway="  Continue anyway? (y/N): "
    if /i not "%continue_anyway%"=="y" goto config_retrobat
)

:: Create config file
echo.
set /p ARCADE_NAME="  Arcade name (e.g., John's Arcade): "
if "%ARCADE_NAME%"=="" set ARCADE_NAME=My Arcade

:: Generate config (using PowerShell for proper JSON escaping)
powershell -Command "$config = @{ retrobatPath = '%RETROBAT_PATH%'.Replace('\', '\\'); port = 3000; arcadeName = '%ARCADE_NAME%'; theme = 'classic-arcade'; defaultView = 'wheel'; showHiddenGames = $false; attractMode = @{ enabled = $true; idleTimeout = 300 }; ai = @{ enabled = $false; provider = 'ollama' } }; $config | ConvertTo-Json -Depth 3 | Set-Content -Path 'rwl.config.json'"

echo  [OK] Configuration saved
echo.

:skip_config

:: Step 4: Create Start Menu shortcut
echo  Step 4: Creating shortcuts...
set SHORTCUT_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\RetroWebLauncher.lnk
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%SHORTCUT_PATH%'); $s.TargetPath = '%~dp0start.bat'; $s.WorkingDirectory = '%~dp0'; $s.IconLocation = '%~dp0assets\icons\app.ico'; $s.Description = 'RetroWebLauncher - Web frontend for Retrobat'; $s.Save()"
echo  [OK] Start Menu shortcut created
echo.

:: Step 5: Ask about startup
echo  Step 5: Startup configuration...
set /p add_startup="  Add RetroWebLauncher to Windows startup? (y/N): "
if /i "%add_startup%"=="y" (
    set STARTUP_PATH=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\RetroWebLauncher.lnk
    powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('%STARTUP_PATH%'); $s.TargetPath = '%~dp0start.bat'; $s.WorkingDirectory = '%~dp0'; $s.WindowStyle = 7; $s.Description = 'RetroWebLauncher Auto-Start'; $s.Save()"
    echo  [OK] Added to Windows startup
) else (
    echo  [INFO] Skipped startup configuration
)
echo.

:: Step 6: Firewall rule
echo  Step 6: Firewall configuration...
set /p add_firewall="  Add firewall rule for network access? (y/N): "
if /i "%add_firewall%"=="y" (
    netsh advfirewall firewall show rule name="RetroWebLauncher" >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        netsh advfirewall firewall add rule name="RetroWebLauncher" dir=in action=allow protocol=TCP localport=3000
        echo  [OK] Firewall rule added for port 3000
    ) else (
        echo  [INFO] Firewall rule already exists
    )
) else (
    echo  [INFO] Skipped firewall configuration
)
echo.

:: Done!
echo  =========================================
echo   Setup Complete!
echo  =========================================
echo.
echo  To start RetroWebLauncher:
echo    - Double-click start.bat
echo    - Or run from Start Menu
echo.
echo  Then open in your browser:
echo    http://localhost:3000
echo.
echo  For other devices on your network:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do echo    http://%%b:3000
)
echo.
set /p start_now="  Start RetroWebLauncher now? (Y/n): "
if /i not "%start_now%"=="n" (
    start "" "%~dp0start.bat"
    timeout /t 3 /nobreak >nul
    start http://localhost:3000
)
echo.
pause
