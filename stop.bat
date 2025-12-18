@echo off
setlocal EnableDelayedExpansion
title RetroWebLauncher - Stop Server
color 0C

echo.
echo  =========================================
echo   RetroWebLauncher - Stop Server
echo  =========================================
echo.

:: Change to script directory
cd /d "%~dp0"

:: Read port from config (default 3000)
set "PORT=3000"
if exist "rwl.config.json" (
    for /f "usebackq tokens=2 delims=:," %%a in (`findstr /i "port" rwl.config.json 2^>nul`) do (
        set "PORT_RAW=%%a"
        set "PORT_RAW=!PORT_RAW: =!"
        if not "!PORT_RAW!"=="" set "PORT=!PORT_RAW!"
    )
)

echo  Looking for server on port !PORT!...
echo.

:: Find processes listening on the port
set "FOUND_PROCESS=0"
for /f "tokens=5" %%p in ('netstat -ano 2^>nul ^| findstr /i ":!PORT! " ^| findstr /i "LISTENING"') do (
    set "PID=%%p"

    :: Skip if PID is 0 or empty
    if not "!PID!"=="" if not "!PID!"=="0" (
        echo  Found process PID: !PID!

        :: Get process name
        for /f "tokens=1" %%n in ('tasklist /fi "PID eq !PID!" /nh 2^>nul ^| findstr /i "."') do (
            echo  Process name: %%n
        )

        set "FOUND_PROCESS=1"

        echo.
        set /p "KILL_IT=  Stop this process? (Y/n): "
        if /i not "!KILL_IT!"=="n" (
            echo  Stopping process !PID!...
            taskkill /f /pid !PID! >nul 2>&1
            if %ERRORLEVEL% EQU 0 (
                echo  [OK] Process stopped successfully!
            ) else (
                echo  [ERROR] Failed to stop process. Try running as Administrator.
            )
        ) else (
            echo  Skipped.
        )
        echo.
    )
)

if "!FOUND_PROCESS!"=="0" (
    echo  [INFO] No server found running on port !PORT!
    echo.

    :: Also check for any node processes that might be RetroWebLauncher
    echo  Checking for Node.js processes...

    set "NODE_FOUND=0"
    for /f "tokens=1,2" %%a in ('tasklist /fi "IMAGENAME eq node.exe" /nh 2^>nul ^| findstr /i "node"') do (
        if "!NODE_FOUND!"=="0" (
            echo.
            echo  Node.js processes found:
        )
        echo    PID: %%b
        set "NODE_FOUND=1"
    )

    if "!NODE_FOUND!"=="1" (
        echo.
        set /p "KILL_ALL_NODE=  Stop ALL Node.js processes? (y/N): "
        if /i "!KILL_ALL_NODE!"=="y" (
            echo  Stopping all Node.js processes...
            taskkill /f /im node.exe >nul 2>&1
            if %ERRORLEVEL% EQU 0 (
                echo  [OK] All Node.js processes stopped!
            ) else (
                echo  [ERROR] Failed to stop processes. Try running as Administrator.
            )
        )
    ) else (
        echo  [INFO] No Node.js processes found.
    )
)

echo.
echo  =========================================
echo.
pause
exit /b 0
