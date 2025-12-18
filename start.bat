@echo off
setlocal EnableDelayedExpansion
title RetroWebLauncher
color 0B

:: Change to script directory
cd /d "%~dp0"
if %ERRORLEVEL% NEQ 0 (
    echo  [ERROR] Failed to change to script directory!
    pause
    exit /b 1
)

:: =========================================
:: Detect Node.js (portable or system)
:: =========================================
set "NODE_CMD="
set "NPM_CMD="

:: Check for portable Node.js first
if exist "%~dp0node\node.exe" (
    set "NODE_CMD=%~dp0node\node.exe"
    set "NPM_CMD=%~dp0node\npm.cmd"
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
echo  =========================================
echo   ERROR: Node.js not found!
echo  =========================================
echo.
echo  Options:
echo    1. Run 'rwl portable' to download portable Node.js
echo    2. Install Node.js from https://nodejs.org/
echo.
pause
exit /b 1

:node_found

:: =========================================
:: Pre-flight checks
:: =========================================

:: Check if node_modules exists
if not exist "node_modules" (
    echo.
    echo  =========================================
    echo   ERROR: Dependencies not installed!
    echo  =========================================
    echo.
    echo  The node_modules folder is missing.
    echo  Please run install.bat or rwl install first.
    echo.
    set /p "RUN_INSTALL=  Run install now? (Y/n): "
    if /i not "!RUN_INSTALL!"=="n" (
        call "%~dp0install.bat"
        if %ERRORLEVEL% NEQ 0 exit /b 1
    ) else (
        pause
        exit /b 1
    )
)

:: Check for critical dependencies
if not exist "node_modules\express" (
    echo.
    echo  [ERROR] Critical dependency 'express' missing!
    echo  Please run: rwl install
    echo.
    pause
    exit /b 1
)

:: Check if configuration file exists
if not exist "rwl.config.json" (
    echo.
    echo  =========================================
    echo   Configuration Required
    echo  =========================================
    echo.
    echo  No configuration file found.
    echo  Running first-time setup...
    echo.
    timeout /t 2 /nobreak >nul
    call "%~dp0setup.bat"
    if %ERRORLEVEL% NEQ 0 (
        echo  [ERROR] Setup failed or was cancelled.
        pause
        exit /b 1
    )
)

:: Read port from config (default 3000)
set "PORT=3000"
for /f "usebackq tokens=2 delims=:," %%a in (`findstr /i "port" rwl.config.json 2^>nul`) do (
    set "PORT_RAW=%%a"
    set "PORT_RAW=!PORT_RAW: =!"
    if not "!PORT_RAW!"=="" set "PORT=!PORT_RAW!"
)

:: Check if port is already in use
netstat -ano 2>nul | findstr /i ":!PORT! " | findstr /i "LISTENING" >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo.
    echo  =========================================
    echo   WARNING: Port !PORT! is already in use!
    echo  =========================================
    echo.
    echo  Another application is using port !PORT!.
    echo  RetroWebLauncher may already be running.
    echo.
    echo  Options:
    echo    1. Continue anyway ^(may fail^)
    echo    2. Stop existing process
    echo    3. Exit
    echo.
    set /p "PORT_CHOICE=  Enter choice (1-3): "

    if "!PORT_CHOICE!"=="2" (
        echo.
        echo  Stopping existing process...

        :: Find and kill node processes on this port
        for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /i ":!PORT! " ^| findstr /i "LISTENING"') do (
            echo  Killing process %%p...
            taskkill /f /pid %%p >nul 2>&1
        )

        timeout /t 2 /nobreak >nul

        :: Verify port is free
        netstat -ano 2>nul | findstr /i ":!PORT! " | findstr /i "LISTENING" >nul 2>&1
        if %ERRORLEVEL% EQU 0 (
            echo  [ERROR] Could not free port !PORT!
            echo  Please manually close the application using this port.
            pause
            exit /b 1
        )
        echo  [OK] Port !PORT! is now available
    ) else if "!PORT_CHOICE!"=="3" (
        exit /b 0
    )
    echo.
)

:: =========================================
:: Start the server
:: =========================================
cls
echo.
echo  =========================================
echo   RetroWebLauncher
echo  =========================================
echo.
echo  Starting server on port !PORT!...
echo.
echo  Access URLs:
echo    Local:   http://localhost:!PORT!
echo.

:: Show network IPs
set "SHOWN_IP=0"
for /f "tokens=2 delims=:" %%a in ('ipconfig 2^>nul ^| findstr /i "IPv4"') do (
    set "IP=%%a"
    set "IP=!IP: =!"
    if not "!IP!"=="" if not "!IP!"=="127.0.0.1" (
        if "!SHOWN_IP!"=="0" (
            echo    Network: http://!IP!:!PORT!
            set "SHOWN_IP=1"
        )
    )
)

echo.
echo  Press Ctrl+C to stop the server.
echo.
echo  =========================================
echo.

:: Run the server
"!NODE_CMD!" src/server/index.js
set "EXIT_CODE=%ERRORLEVEL%"

:: Server has stopped
echo.
echo  =========================================

if %EXIT_CODE% EQU 0 (
    echo   Server stopped normally.
) else (
    echo   Server stopped with error code: %EXIT_CODE%
    echo.
    echo   Common issues:
    echo     - Port already in use
    echo     - Missing dependencies ^(run rwl install^)
    echo     - Invalid configuration
    echo     - Database locked by another process
    echo.
    echo   Check the error messages above for details.
)

echo  =========================================
echo.
pause
exit /b %EXIT_CODE%
