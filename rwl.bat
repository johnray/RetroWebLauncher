@echo off
:: ============================================================================
:: RetroWebLauncher - Batch Wrapper
:: ============================================================================
:: This is a simple wrapper that calls the PowerShell management script.
:: Double-click this file or run from command line: rwl [command]
::
:: Commands: start, stop, restart, status, setup, install, dev, uninstall, help
:: No arguments = interactive menu
:: ============================================================================

:: Change to script directory
cd /d "%~dp0"

:: Check if PowerShell is available
where powershell >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo  ERROR: PowerShell is not available on this system.
    echo  PowerShell is required to run RetroWebLauncher.
    echo.
    echo  PowerShell comes pre-installed on Windows 7 and later.
    echo  If you're seeing this error, your system may need repair.
    echo.
    pause
    exit /b 1
)

:: Run the PowerShell script with all arguments passed through
:: -ExecutionPolicy Bypass allows the script to run without changing system policy
powershell -ExecutionPolicy Bypass -NoProfile -File "%~dp0rwl.ps1" %*

:: Exit with the same error code as PowerShell
exit /b %ERRORLEVEL%
