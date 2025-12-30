@echo off
:: ============================================================================
:: RetroWebLauncher - Stop Server
:: ============================================================================
:: Double-click this file to stop the RetroWebLauncher server.
:: ============================================================================

cd /d "%~dp0"
echo.
echo   Stopping RetroWebLauncher server...
echo.
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0rwl.ps1" stop -Silent
if %ERRORLEVEL% EQU 0 (
    echo.
    echo   Server stopped successfully.
) else (
    echo.
    echo   Server may not have been running.
)
echo.
timeout /t 3 >nul
