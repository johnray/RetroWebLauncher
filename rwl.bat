@echo off
setlocal EnableDelayedExpansion
title RetroWebLauncher Controller
color 0B

:: Change to script directory
cd /d "%~dp0"

:: Check for command line arguments
if "%~1"=="" goto menu
if /i "%~1"=="start" goto do_start
if /i "%~1"=="stop" goto do_stop
if /i "%~1"=="restart" goto do_restart
if /i "%~1"=="setup" goto do_setup
if /i "%~1"=="install" goto do_install
if /i "%~1"=="status" goto do_status
if /i "%~1"=="portable" goto do_portable
if /i "%~1"=="help" goto do_help
if /i "%~1"=="-h" goto do_help
if /i "%~1"=="--help" goto do_help
goto menu

:menu
cls
echo.
echo  =========================================
echo   RetroWebLauncher Controller
echo  =========================================
echo.
call :check_status_silent
if "!SERVER_RUNNING!"=="1" (
    echo   Status: [RUNNING] on port !PORT!
) else (
    echo   Status: [STOPPED]
)
echo.
echo  =========================================
echo.
echo   1. Start Server
echo   2. Stop Server
echo   3. Restart Server
echo   4. View Status
echo   5. Setup / Configure
echo   6. Install Dependencies
echo   7. Make Portable (download Node.js)
echo   8. Open in Browser
echo   9. Exit
echo.
echo  =========================================
echo.
echo   Command line: rwl [start^|stop^|restart^|setup^|install^|status^|portable^|help]
echo.
set /p "CHOICE=  Enter choice (1-9): "

if "!CHOICE!"=="1" goto do_start
if "!CHOICE!"=="2" goto do_stop
if "!CHOICE!"=="3" goto do_restart
if "!CHOICE!"=="4" goto do_status
if "!CHOICE!"=="5" goto do_setup
if "!CHOICE!"=="6" goto do_install
if "!CHOICE!"=="7" goto do_portable
if "!CHOICE!"=="8" goto do_browser
if "!CHOICE!"=="9" exit /b 0
goto menu

:: =========================================
:: Start Server
:: =========================================
:do_start
echo.
echo  Starting RetroWebLauncher...
echo.

call :check_status_silent
if "!SERVER_RUNNING!"=="1" (
    echo  [WARNING] Server is already running on port !PORT!
    echo.
    set /p "RESTART_IT=  Restart it? (y/N): "
    if /i "!RESTART_IT!"=="y" goto do_restart
    goto return_to_menu
)

call :get_node_path
if "!NODE_CMD!"=="" (
    echo  [ERROR] Node.js not found!
    echo  Run option 7 to download portable Node.js, or install from https://nodejs.org/
    goto return_to_menu
)

:: Check dependencies
if not exist "node_modules\express" (
    echo  [ERROR] Dependencies not installed!
    echo  Running install first...
    call :do_install_internal
    if not exist "node_modules\express" (
        echo  [ERROR] Installation failed!
        goto return_to_menu
    )
)

:: Check config
if not exist "rwl.config.json" (
    echo  [INFO] No configuration found. Running setup...
    call "%~dp0setup.bat"
    if not exist "rwl.config.json" (
        echo  [ERROR] Setup was cancelled or failed.
        goto return_to_menu
    )
)

:: Start the server
echo  [OK] Starting server...
start "RetroWebLauncher" cmd /c "cd /d "%~dp0" && "!NODE_CMD!" src/server/index.js"

:: Wait for startup
timeout /t 2 /nobreak >nul

call :check_status_silent
if "!SERVER_RUNNING!"=="1" (
    echo  [OK] Server started on port !PORT!
    echo.
    echo  Access URLs:
    echo    Local:   http://localhost:!PORT!
    call :show_network_ip
) else (
    echo  [ERROR] Server may have failed to start.
    echo  Check the server window for error messages.
)

goto return_to_menu

:: =========================================
:: Stop Server
:: =========================================
:do_stop
echo.
echo  Stopping RetroWebLauncher...
echo.

call :check_status_silent
if "!SERVER_RUNNING!"=="0" (
    echo  [INFO] Server is not running.
    goto return_to_menu
)

:: Kill the process on the port
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /i ":!PORT! " ^| findstr /i "LISTENING"') do (
    set "PID=%%p"
    if not "!PID!"=="" if not "!PID!"=="0" (
        taskkill /f /pid !PID! >nul 2>&1
        if !ERRORLEVEL! EQU 0 (
            echo  [OK] Stopped process !PID!
        ) else (
            echo  [ERROR] Failed to stop process !PID!
        )
    )
)

:: Verify stopped
timeout /t 1 /nobreak >nul
call :check_status_silent
if "!SERVER_RUNNING!"=="0" (
    echo  [OK] Server stopped successfully.
) else (
    echo  [WARNING] Server may still be running.
)

goto return_to_menu

:: =========================================
:: Restart Server
:: =========================================
:do_restart
echo.
echo  Restarting RetroWebLauncher...

call :check_status_silent
if "!SERVER_RUNNING!"=="1" (
    call :do_stop_internal
    timeout /t 1 /nobreak >nul
)

goto do_start

:: =========================================
:: Status
:: =========================================
:do_status
echo.
echo  =========================================
echo   RetroWebLauncher Status
echo  =========================================
echo.

call :get_port
echo  Configured port: !PORT!
echo.

call :get_node_path
if "!NODE_CMD!"=="" (
    echo  Node.js: NOT FOUND
) else (
    for /f "tokens=*" %%v in ('"!NODE_CMD!" -v 2^>nul') do echo  Node.js: %%v
    if "!USING_PORTABLE!"=="1" (
        echo  ^(Using portable Node.js^)
    ) else (
        echo  ^(Using system Node.js^)
    )
)
echo.

if exist "node_modules\express" (
    echo  Dependencies: INSTALLED
) else (
    echo  Dependencies: NOT INSTALLED
)
echo.

if exist "rwl.config.json" (
    echo  Configuration: FOUND
    for /f "usebackq tokens=2 delims=:," %%a in (`findstr /i "retrobatPath" rwl.config.json 2^>nul`) do (
        set "RB_PATH=%%~a"
        echo  Retrobat path: !RB_PATH!
    )
) else (
    echo  Configuration: NOT FOUND
)
echo.

call :check_status_silent
if "!SERVER_RUNNING!"=="1" (
    echo  Server status: RUNNING on port !PORT!
    echo.
    echo  Access URLs:
    echo    Local:   http://localhost:!PORT!
    call :show_network_ip
) else (
    echo  Server status: STOPPED
)

echo.
goto return_to_menu

:: =========================================
:: Setup
:: =========================================
:do_setup
echo.
call "%~dp0setup.bat"
goto return_to_menu

:: =========================================
:: Install Dependencies
:: =========================================
:do_install
echo.
call :do_install_internal
goto return_to_menu

:do_install_internal
call :get_node_path
if "!NODE_CMD!"=="" (
    echo  [ERROR] Node.js not found!
    echo  Run option 7 to download portable Node.js, or install from https://nodejs.org/
    exit /b 1
)

:: Get npm path (same directory as node)
set "NPM_CMD=npm"
if "!USING_PORTABLE!"=="1" (
    set "NPM_CMD=%~dp0node\npm.cmd"
)

echo  Installing dependencies...
echo.
"!NPM_CMD!" install
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  [ERROR] npm install failed!
    exit /b 1
)
echo.
echo  [OK] Dependencies installed successfully!
exit /b 0

:: =========================================
:: Make Portable (Download Node.js)
:: =========================================
:do_portable
echo.
echo  =========================================
echo   Make RetroWebLauncher Portable
echo  =========================================
echo.
echo  This will download a portable version of Node.js
echo  into this folder, making the app fully self-contained.
echo.
echo  Benefits:
echo    - No system-wide Node.js installation needed
echo    - Copy entire folder to any Windows machine
echo    - Sync via cloud storage or USB drive
echo.

if exist "node\node.exe" (
    echo  [INFO] Portable Node.js already exists.
    for /f "tokens=*" %%v in ('"node\node.exe" -v 2^>nul') do echo  Version: %%v
    echo.
    set /p "REDOWNLOAD=  Re-download? (y/N): "
    if /i not "!REDOWNLOAD!"=="y" goto return_to_menu
    echo  Removing existing Node.js...
    rmdir /s /q "node" 2>nul
)

echo.
echo  Downloading Node.js 20 LTS (portable)...
echo.

:: Create temp directory
if not exist "temp" mkdir "temp"

:: Download Node.js zip
set "NODE_URL=https://nodejs.org/dist/v20.10.0/node-v20.10.0-win-x64.zip"
set "NODE_ZIP=temp\node.zip"

echo  Downloading from nodejs.org...
powershell -ExecutionPolicy Bypass -Command ^
    "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; ^
    $ProgressPreference = 'SilentlyContinue'; ^
    try { ^
        Invoke-WebRequest -Uri '!NODE_URL!' -OutFile '!NODE_ZIP!' -UseBasicParsing; ^
        Write-Host '[OK] Download complete'; ^
    } catch { ^
        Write-Host '[ERROR] Download failed:' $_.Exception.Message; ^
        exit 1; ^
    }"

if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Download failed!
    echo.
    echo  You can manually download Node.js from:
    echo  https://nodejs.org/dist/v20.10.0/node-v20.10.0-win-x64.zip
    echo.
    echo  Extract it to: %~dp0node\
    goto return_to_menu
)

echo.
echo  Extracting Node.js...
powershell -ExecutionPolicy Bypass -Command ^
    "try { ^
        Expand-Archive -Path '!NODE_ZIP!' -DestinationPath 'temp' -Force; ^
        if (Test-Path 'node') { Remove-Item -Path 'node' -Recurse -Force }; ^
        Move-Item -Path 'temp\node-v20.10.0-win-x64' -Destination 'node'; ^
        Write-Host '[OK] Extraction complete'; ^
    } catch { ^
        Write-Host '[ERROR] Extraction failed:' $_.Exception.Message; ^
        exit 1; ^
    }"

if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Extraction failed!
    goto return_to_menu
)

:: Cleanup
del /q "!NODE_ZIP!" 2>nul
rmdir /q "temp" 2>nul

:: Verify
if exist "node\node.exe" (
    echo.
    for /f "tokens=*" %%v in ('"node\node.exe" -v 2^>nul') do echo  [OK] Portable Node.js %%v installed!
    echo.
    echo  RetroWebLauncher is now fully portable!
    echo  You can copy this entire folder to any Windows machine.
    echo.

    :: Install dependencies with portable node
    if not exist "node_modules\express" (
        set /p "INSTALL_NOW=  Install dependencies now? (Y/n): "
        if /i not "!INSTALL_NOW!"=="n" (
            echo.
            call :do_install_internal
        )
    )
) else (
    echo  [ERROR] Something went wrong. node\node.exe not found.
)

goto return_to_menu

:: =========================================
:: Open Browser
:: =========================================
:do_browser
call :get_port
start "" "http://localhost:!PORT!"
goto menu

:: =========================================
:: Help
:: =========================================
:do_help
echo.
echo  RetroWebLauncher Controller
echo  ===========================
echo.
echo  Usage: rwl [command]
echo.
echo  Commands:
echo    start     Start the server
echo    stop      Stop the server
echo    restart   Restart the server
echo    status    Show server status
echo    setup     Run configuration wizard
echo    install   Install Node.js dependencies
echo    portable  Download portable Node.js (makes app fully portable)
echo    help      Show this help message
echo.
echo  Running without arguments opens the interactive menu.
echo.
echo  Portable Mode:
echo    Run 'rwl portable' to download a portable version of Node.js.
echo    This makes the entire app self-contained - you can copy the
echo    folder to any Windows machine and it will work without
echo    installing anything.
echo.
echo  Windows Startup:
echo    To start RetroWebLauncher automatically when Windows starts:
echo    1. Press Win+R, type: shell:startup
echo    2. Create a shortcut to start.bat in that folder
echo    Or use the installer which offers this as an option.
echo.
exit /b 0

:: =========================================
:: Helper Functions
:: =========================================

:get_port
set "PORT=3000"
if exist "rwl.config.json" (
    for /f "usebackq tokens=2 delims=:," %%a in (`findstr /i "port" rwl.config.json 2^>nul`) do (
        set "PORT_RAW=%%a"
        set "PORT_RAW=!PORT_RAW: =!"
        if not "!PORT_RAW!"=="" set "PORT=!PORT_RAW!"
    )
)
exit /b 0

:check_status_silent
call :get_port
set "SERVER_RUNNING=0"
netstat -ano 2>nul | findstr /i ":!PORT! " | findstr /i "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 set "SERVER_RUNNING=1"
exit /b 0

:get_node_path
set "NODE_CMD="
set "USING_PORTABLE=0"

:: Check for portable Node.js first
if exist "%~dp0node\node.exe" (
    set "NODE_CMD=%~dp0node\node.exe"
    set "USING_PORTABLE=1"
    exit /b 0
)

:: Fall back to system Node.js
where node >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "NODE_CMD=node"
    exit /b 0
)

exit /b 1

:show_network_ip
for /f "tokens=2 delims=:" %%a in ('ipconfig 2^>nul ^| findstr /i "IPv4"') do (
    set "IP=%%a"
    set "IP=!IP: =!"
    if not "!IP!"=="" if not "!IP!"=="127.0.0.1" (
        echo    Network: http://!IP!:!PORT!
        exit /b 0
    )
)
exit /b 0

:do_stop_internal
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /i ":!PORT! " ^| findstr /i "LISTENING"') do (
    set "PID=%%p"
    if not "!PID!"=="" if not "!PID!"=="0" (
        taskkill /f /pid !PID! >nul 2>&1
    )
)
exit /b 0

:return_to_menu
echo.
if "%~1"=="" (
    pause
    goto menu
)
exit /b 0
