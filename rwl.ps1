#Requires -Version 5.1
<#
.SYNOPSIS
    RetroWebLauncher - Management Script

.DESCRIPTION
    A comprehensive management tool for RetroWebLauncher.
    Handles installation, configuration, and server management.
    Always uses portable Node.js for maximum portability.

.PARAMETER Command
    The command to execute: install, setup, start, stop, restart, status, config, dev, uninstall, help

.EXAMPLE
    .\rwl.ps1                    # Opens interactive menu
    .\rwl.ps1 start              # Starts the server
    .\rwl.ps1 start -Silent      # Starts without prompts (for automation)
    .\rwl.ps1 install -Upgrade   # Reinstall/upgrade Node.js

.NOTES
    Author: RetroWebLauncher Team
    Version: 1.0.0
#>

param(
    [Parameter(Position = 0)]
    [ValidateSet('install', 'setup', 'start', 'stop', 'restart', 'status', 'config', 'dev', 'uninstall', 'help', 'menu', '')]
    [string]$Command = '',

    [switch]$Force,
    [switch]$Silent,
    [switch]$NoBrowser,
    [switch]$Upgrade
)

# ============================================================================
# CONFIGURATION & INITIALIZATION
# ============================================================================

$script:AppName = "RetroWebLauncher"
$script:Version = "1.0.0"
$script:ConfigFile = "rwl.config.json"
$script:LogFile = "rwl.log"
$script:DefaultPort = 3000
$script:NodeVersion = "20.10.0"
$script:NodeUrl = "https://nodejs.org/dist/v$script:NodeVersion/node-v$script:NodeVersion-win-x64.zip"

# Process management constants
$script:StopTimeoutSeconds = 10
$script:StartTimeoutSeconds = 15

# Set location to script directory
$script:ScriptDir = $PSScriptRoot
if (-not $script:ScriptDir) {
    $script:ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
}
if (-not $script:ScriptDir) {
    $script:ScriptDir = Get-Location
}

try {
    Set-Location $script:ScriptDir -ErrorAction Stop
}
catch {
    Write-Host "ERROR: Cannot access script directory: $script:ScriptDir" -ForegroundColor Red
    exit 1
}

# Initialize log directory
$script:LogDir = Join-Path $script:ScriptDir "logs"
$script:LogPath = Join-Path $script:LogDir $script:LogFile

# ============================================================================
# LOGGING SYSTEM
# ============================================================================

function Initialize-Logging {
    if (-not (Test-Path $script:LogDir)) {
        New-Item -ItemType Directory -Path $script:LogDir -Force | Out-Null
    }

    # Rotate log if too large (> 5MB)
    if (Test-Path $script:LogPath) {
        $logSize = (Get-Item $script:LogPath).Length
        if ($logSize -gt 5MB) {
            $backupPath = "$script:LogPath.old"
            if (Test-Path $backupPath) { Remove-Item $backupPath -Force }
            Rename-Item $script:LogPath $backupPath -Force
        }
    }
}

function Write-Log {
    param(
        [string]$Message,
        [ValidateSet('INFO', 'WARN', 'ERROR', 'DEBUG')]
        [string]$Level = 'INFO'
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"

    try {
        Add-Content -Path $script:LogPath -Value $logEntry -ErrorAction SilentlyContinue
    }
    catch {
        # Silently fail if we can't write to log
    }
}

# Initialize logging at script start
Initialize-Logging
Write-Log "========== Session started: $Command =========="

# ============================================================================
# DISPLAY HELPERS - Console Output
# ============================================================================

function Write-Success {
    param([string]$Message)
    Write-Host "  [" -NoNewline
    Write-Host "OK" -ForegroundColor Green -NoNewline
    Write-Host "] $Message"
    Write-Log $Message -Level INFO
}

function Write-Error2 {
    param([string]$Message)
    Write-Host "  [" -NoNewline
    Write-Host "ERROR" -ForegroundColor Red -NoNewline
    Write-Host "] $Message"
    Write-Log $Message -Level ERROR
}

function Write-Warning2 {
    param([string]$Message)
    Write-Host "  [" -NoNewline
    Write-Host "WARN" -ForegroundColor Yellow -NoNewline
    Write-Host "] $Message"
    Write-Log $Message -Level WARN
}

function Write-Info {
    param([string]$Message)
    Write-Host "  [" -NoNewline
    Write-Host "INFO" -ForegroundColor Cyan -NoNewline
    Write-Host "] $Message"
    Write-Log $Message -Level INFO
}

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "  " -NoNewline
    Write-Host $Message -ForegroundColor Cyan
    Write-Host "  $("-" * ($Message.Length))" -ForegroundColor DarkGray
    Write-Log "Step: $Message" -Level INFO
}

function Write-Header {
    param([string]$Title)
    if (-not $Silent) {
        Clear-Host
    }
    $width = 50
    $border = "=" * $width

    Write-Host ""
    Write-Host "  $border" -ForegroundColor Cyan
    $padding = [math]::Floor(($width - $Title.Length) / 2)
    $paddedTitle = (" " * $padding) + $Title
    Write-Host "  $paddedTitle" -ForegroundColor White
    Write-Host "  $border" -ForegroundColor Cyan
    Write-Host ""
    Write-Log "=== $Title ===" -Level INFO
}

function Write-Banner {
    if ($Silent) { return }
    Clear-Host
    Write-Host ""
    Write-Host "      ____       _             _    _      _     " -ForegroundColor Cyan
    Write-Host "     |  _ \ ___ | |_ _ __ ___ | |  | | ___| |__  " -ForegroundColor Cyan
    Write-Host "     | |_) / _ \| __| '__/ _ \| |  | |/ _ \ '_ \ " -ForegroundColor Blue
    Write-Host "     |  _ <  __/| |_| | | (_) | |/\| |  __/ |_) |" -ForegroundColor Blue
    Write-Host "     |_| \_\___| \__|_|  \___/|__/\__/\___|_.__/ " -ForegroundColor DarkBlue
    Write-Host "                                    " -NoNewline
    Write-Host "Launcher" -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "     " -NoNewline
    Write-Host "Web Frontend for RetroBat" -ForegroundColor DarkGray
    Write-Host "     " -NoNewline
    Write-Host "v$script:Version" -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Box {
    param(
        [string[]]$Lines,
        [ConsoleColor]$BorderColor = 'DarkGray',
        [ConsoleColor]$TextColor = 'White',
        [int]$Padding = 2
    )

    if ($Silent) { return }

    $maxLength = ($Lines | Measure-Object -Maximum -Property Length).Maximum
    $width = $maxLength + ($Padding * 2)

    Write-Host "  +" -NoNewline -ForegroundColor $BorderColor
    Write-Host ("-" * $width) -NoNewline -ForegroundColor $BorderColor
    Write-Host "+" -ForegroundColor $BorderColor

    foreach ($line in $Lines) {
        Write-Host "  |" -NoNewline -ForegroundColor $BorderColor
        Write-Host (" " * $Padding) -NoNewline
        Write-Host $line.PadRight($maxLength) -NoNewline -ForegroundColor $TextColor
        Write-Host (" " * $Padding) -NoNewline
        Write-Host "|" -ForegroundColor $BorderColor
    }

    Write-Host "  +" -NoNewline -ForegroundColor $BorderColor
    Write-Host ("-" * $width) -NoNewline -ForegroundColor $BorderColor
    Write-Host "+" -ForegroundColor $BorderColor
}

function Write-ProgressBar {
    param(
        [int]$Percent,
        [int]$Width = 30,
        [string]$Status = ""
    )

    if ($Silent) { return }

    $filled = [math]::Floor($Width * $Percent / 100)
    $empty = $Width - $filled

    Write-Host "`r  [" -NoNewline
    Write-Host ("=" * $filled) -NoNewline -ForegroundColor Green
    if ($filled -lt $Width) {
        Write-Host ">" -NoNewline -ForegroundColor Green
        Write-Host ("-" * [math]::Max(0, $empty - 1)) -NoNewline -ForegroundColor DarkGray
    }
    Write-Host "] " -NoNewline
    Write-Host "$Percent%" -NoNewline -ForegroundColor Cyan
    if ($Status) {
        Write-Host " - $Status" -NoNewline -ForegroundColor DarkGray
    }
    Write-Host "          " -NoNewline  # Clear trailing text
}

function Confirm-Action {
    param(
        [string]$Message,
        [bool]$Default = $true
    )

    # In silent mode, always use default
    if ($Silent) {
        Write-Log "Auto-confirming (silent mode): $Message -> $Default" -Level DEBUG
        return $Default
    }

    $options = if ($Default) { "(Y/n)" } else { "(y/N)" }
    Write-Host ""
    Write-Host "  $Message " -NoNewline
    Write-Host $options -NoNewline -ForegroundColor DarkGray
    Write-Host ": " -NoNewline

    $response = Read-Host
    if ([string]::IsNullOrWhiteSpace($response)) {
        return $Default
    }
    return $response -match '^[Yy]'
}

function Read-UserInput {
    param(
        [string]$Prompt,
        [string]$Default = "",
        [switch]$Required
    )

    # In silent mode, return default
    if ($Silent) {
        if ($Required -and -not $Default) {
            Write-Log "Silent mode: Required input '$Prompt' has no default" -Level ERROR
            return $null
        }
        return $Default
    }

    Write-Host ""
    Write-Host "  $Prompt" -NoNewline
    if ($Default) {
        Write-Host " [$Default]" -NoNewline -ForegroundColor DarkGray
    }
    Write-Host ": " -NoNewline

    $response = Read-Host
    if ([string]::IsNullOrWhiteSpace($response)) {
        if ($Required -and -not $Default) {
            Write-Error2 "This field is required."
            return Read-UserInput -Prompt $Prompt -Default $Default -Required:$Required
        }
        return $Default
    }
    return $response
}

function Pause-ForUser {
    param([string]$Message = "Press any key to continue...")
    if ($Silent) { return }
    Write-Host ""
    Write-Host "  $Message" -ForegroundColor DarkGray
    $null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')
}

# ============================================================================
# SYSTEM DETECTION HELPERS
# ============================================================================

function Get-NodePath {
    <#
    .SYNOPSIS
        Gets portable Node.js path
    .OUTPUTS
        Hashtable with NodePath, NpmPath, Version, IsInstalled
    #>

    $result = @{
        NodePath = $null
        NpmPath = $null
        Version = $null
        IsInstalled = $false
    }

    $portableNode = Join-Path $script:ScriptDir "node\node.exe"
    $portableNpm = Join-Path $script:ScriptDir "node\npm.cmd"

    if (Test-Path $portableNode) {
        $result.NodePath = $portableNode
        $result.NpmPath = $portableNpm
        $result.IsInstalled = $true

        try {
            $versionOutput = & $portableNode -v 2>&1
            if ($LASTEXITCODE -eq 0) {
                $result.Version = ($versionOutput -replace '^v', '').Trim()
            }
            else {
                $result.Version = "unknown"
            }
        }
        catch {
            $result.Version = "error"
            Write-Log "Error getting Node version: $_" -Level ERROR
        }
    }

    return $result
}

function Test-NodeInstalled {
    $portableNode = Join-Path $script:ScriptDir "node\node.exe"
    return Test-Path $portableNode
}

function Get-Config {
    <#
    .SYNOPSIS
        Reads and returns the entire config object, with defaults for missing values
    #>

    $configPath = Join-Path $script:ScriptDir $script:ConfigFile

    $defaults = @{
        retrobatPath = ""
        port = $script:DefaultPort
        arcadeName = "My Arcade"
        theme = "classic-arcade"
        defaultView = "wheel"
        showHiddenGames = $false
        attractMode = @{
            enabled = $true
            idleTimeout = 300
        }
        ai = @{
            enabled = $false
            provider = "ollama"
        }
    }

    if (-not (Test-Path $configPath)) {
        return $defaults
    }

    try {
        $content = Get-Content $configPath -Raw -ErrorAction Stop
        if ([string]::IsNullOrWhiteSpace($content)) {
            Write-Log "Config file is empty, using defaults" -Level WARN
            return $defaults
        }

        $config = $content | ConvertFrom-Json -ErrorAction Stop

        # Merge with defaults (in case config is missing keys)
        foreach ($key in $defaults.Keys) {
            if ($null -eq $config.$key) {
                $config | Add-Member -NotePropertyName $key -NotePropertyValue $defaults[$key] -Force
            }
        }

        return $config
    }
    catch {
        Write-Log "Error reading config: $($_.Exception.Message)" -Level ERROR
        return $defaults
    }
}

function Get-ConfigValue {
    param([string]$Key, $Default = $null)

    $config = Get-Config
    $value = $config.$Key
    if ($null -ne $value) { return $value }
    return $Default
}

function Save-Config {
    param([hashtable]$Config)

    $configPath = Join-Path $script:ScriptDir $script:ConfigFile

    try {
        $Config | ConvertTo-Json -Depth 5 | Set-Content $configPath -Encoding UTF8 -ErrorAction Stop
        Write-Log "Configuration saved" -Level INFO
        return $true
    }
    catch {
        Write-Log "Failed to save config: $($_.Exception.Message)" -Level ERROR
        return $false
    }
}

function Get-ServerPort {
    return [int](Get-ConfigValue -Key "port" -Default $script:DefaultPort)
}

function Test-PortInUse {
    param([int]$Port)

    try {
        $listener = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        return ($null -ne $listener -and $listener.Count -gt 0)
    }
    catch {
        # Fallback to netstat
        $netstat = netstat -ano 2>$null | Select-String ":$Port\s+.*LISTENING"
        return ($null -ne $netstat)
    }
}

function Get-ProcessesOnPort {
    <#
    .SYNOPSIS
        Gets ALL processes listening on a specific port
    .OUTPUTS
        Array of Process objects
    #>
    param([int]$Port)

    $processes = @()

    try {
        # Method 1: Get-NetTCPConnection (preferred)
        $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($connections) {
            $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $pids) {
                $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                if ($proc) { $processes += $proc }
            }
        }
    }
    catch {
        Write-Log "Get-NetTCPConnection failed, using netstat fallback" -Level DEBUG
    }

    # Method 2: Netstat fallback
    if ($processes.Count -eq 0) {
        try {
            $netstat = netstat -ano 2>$null
            $listening = $netstat | Select-String ":$Port\s+.*LISTENING"
            if ($listening) {
                $pids = $listening | ForEach-Object {
                    if ($_ -match '\s(\d+)\s*$') { $matches[1] }
                } | Sort-Object -Unique

                foreach ($pid in $pids) {
                    if ($pid -and $pid -ne '0') {
                        $proc = Get-Process -Id $pid -ErrorAction SilentlyContinue
                        if ($proc) { $processes += $proc }
                    }
                }
            }
        }
        catch {
            Write-Log "Netstat fallback also failed: $_" -Level ERROR
        }
    }

    return $processes
}

function Get-NetworkIPs {
    $ips = @()

    try {
        $adapters = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -ne '127.0.0.1' -and
                $_.PrefixOrigin -in @('Dhcp', 'Manual') -and
                $_.AddressState -eq 'Preferred'
            }
        $ips = $adapters | Select-Object -ExpandProperty IPAddress
    }
    catch {
        # Fallback to ipconfig parsing
        $ipconfig = ipconfig 2>$null
        $matches = [regex]::Matches($ipconfig, 'IPv4.*?:\s*(\d+\.\d+\.\d+\.\d+)')
        $ips = $matches | ForEach-Object { $_.Groups[1].Value } | Where-Object { $_ -ne '127.0.0.1' }
    }

    return $ips
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-InternetConnection {
    $urls = @(
        "https://nodejs.org",
        "https://registry.npmjs.org",
        "https://www.google.com"
    )

    foreach ($url in $urls) {
        try {
            $request = [System.Net.WebRequest]::Create($url)
            $request.Method = "HEAD"
            $request.Timeout = 5000
            $response = $request.GetResponse()
            $response.Close()
            return $true
        }
        catch {
            continue
        }
    }

    # Final fallback: ping
    try {
        $ping = Test-Connection -ComputerName "8.8.8.8" -Count 1 -Quiet -ErrorAction SilentlyContinue
        return $ping
    }
    catch {
        return $false
    }
}

function Test-DependenciesInstalled {
    $nodeModules = Join-Path $script:ScriptDir "node_modules"
    $express = Join-Path $nodeModules "express"
    $socketIo = Join-Path $nodeModules "socket.io"

    return (Test-Path $express) -and (Test-Path $socketIo)
}

function Test-ConfigExists {
    $configPath = Join-Path $script:ScriptDir $script:ConfigFile
    if (-not (Test-Path $configPath)) { return $false }

    # Also verify it's valid JSON with required fields
    try {
        $config = Get-Content $configPath -Raw | ConvertFrom-Json
        return ($null -ne $config.retrobatPath -and $config.retrobatPath -ne "")
    }
    catch {
        return $false
    }
}

# ============================================================================
# PROCESS MANAGEMENT - Robust Stop/Start
# ============================================================================

function Stop-ServerProcess {
    <#
    .SYNOPSIS
        Robustly stops the server process(es)
    .DESCRIPTION
        Uses multiple methods to ensure the server is stopped:
        1. Find processes by port
        2. Graceful termination attempt
        3. Force kill if needed
        4. Verify port is free
    .OUTPUTS
        $true if server is stopped, $false otherwise
    #>
    param(
        [int]$Port = (Get-ServerPort),
        [switch]$Quiet
    )

    Write-Log "Attempting to stop server on port $Port" -Level INFO

    # Check if anything is running
    if (-not (Test-PortInUse -Port $Port)) {
        if (-not $Quiet) { Write-Info "No server running on port $Port" }
        Write-Log "No server found on port $Port" -Level INFO
        return $true
    }

    # Get all processes on the port
    $processes = Get-ProcessesOnPort -Port $Port

    if ($processes.Count -eq 0) {
        # Port is in use but we can't find the process - try harder
        Write-Log "Port in use but process not found via normal methods" -Level WARN

        # Try to find node.exe processes running our script
        $nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue | Where-Object {
            $_.MainWindowTitle -like "*RetroWebLauncher*" -or
            $_.CommandLine -like "*index.js*"
        }
        if ($nodeProcesses) {
            $processes = $nodeProcesses
        }
    }

    $killed = $false

    foreach ($proc in $processes) {
        if (-not $Quiet) { Write-Info "Stopping $($proc.ProcessName) (PID: $($proc.Id))..." }
        Write-Log "Stopping process: $($proc.ProcessName) PID=$($proc.Id)" -Level INFO

        try {
            # Method 1: Graceful stop
            $proc.CloseMainWindow() | Out-Null

            # Wait briefly for graceful shutdown
            $waited = 0
            while (-not $proc.HasExited -and $waited -lt 3) {
                Start-Sleep -Milliseconds 500
                $waited++
                $proc.Refresh()
            }

            # Method 2: Force kill if still running
            if (-not $proc.HasExited) {
                Write-Log "Graceful shutdown failed, force killing PID $($proc.Id)" -Level WARN
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            }

            $killed = $true
            if (-not $Quiet) { Write-Success "Process $($proc.Id) stopped" }
            Write-Log "Process $($proc.Id) stopped successfully" -Level INFO
        }
        catch {
            Write-Log "Failed to stop process $($proc.Id): $($_.Exception.Message)" -Level ERROR
            if (-not $Quiet) { Write-Error2 "Could not stop process $($proc.Id): $($_.Exception.Message)" }
        }
    }

    # Also try taskkill as nuclear option
    if (Test-PortInUse -Port $Port) {
        Write-Log "Port still in use after stop attempts, trying taskkill" -Level WARN

        try {
            # Kill by port using netstat + taskkill
            $netstat = netstat -ano 2>$null | Select-String ":$Port\s+.*LISTENING"
            if ($netstat) {
                $pids = $netstat | ForEach-Object {
                    if ($_ -match '\s(\d+)\s*$') { $matches[1] }
                } | Sort-Object -Unique

                foreach ($pid in $pids) {
                    if ($pid -and $pid -ne '0') {
                        Write-Log "Taskkill on PID $pid" -Level INFO
                        taskkill /F /PID $pid 2>$null | Out-Null
                    }
                }
            }
        }
        catch {
            Write-Log "Taskkill failed: $_" -Level ERROR
        }
    }

    # Verify with timeout
    $timeout = $script:StopTimeoutSeconds
    $elapsed = 0

    while ((Test-PortInUse -Port $Port) -and $elapsed -lt $timeout) {
        Start-Sleep -Seconds 1
        $elapsed++
        if (-not $Quiet -and -not $Silent) {
            Write-Host "`r  Waiting for port to be released... ($elapsed/$timeout sec)" -NoNewline
        }
    }

    if (-not $Quiet -and -not $Silent) { Write-Host "" }

    $portFree = -not (Test-PortInUse -Port $Port)

    if ($portFree) {
        Write-Log "Server stopped successfully, port $Port is free" -Level INFO
        return $true
    }
    else {
        Write-Log "Failed to stop server - port $Port still in use after $timeout seconds" -Level ERROR
        if (-not $Quiet) {
            Write-Error2 "Could not free port $Port after $timeout seconds"
            Write-Info "Try running as Administrator, or manually kill the process"
        }
        return $false
    }
}

function Start-ServerProcess {
    <#
    .SYNOPSIS
        Starts the server process
    .OUTPUTS
        $true if server started successfully, $false otherwise
    #>
    param(
        [switch]$OpenBrowser
    )

    $node = Get-NodePath
    if (-not $node.IsInstalled) {
        Write-Error2 "Node.js is not installed"
        return $false
    }

    $port = Get-ServerPort
    $serverScript = Join-Path $script:ScriptDir "src\server\index.js"

    if (-not (Test-Path $serverScript)) {
        Write-Error2 "Server script not found: $serverScript"
        Write-Log "Server script missing: $serverScript" -Level ERROR
        return $false
    }

    Write-Log "Starting server: $($node.NodePath) $serverScript" -Level INFO
    Write-Info "Launching server..."

    try {
        # Prepare start info
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $node.NodePath
        $psi.Arguments = "`"$serverScript`""
        $psi.WorkingDirectory = $script:ScriptDir
        $psi.UseShellExecute = $true

        if ($Silent) {
            $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Hidden
        }
        else {
            $psi.WindowStyle = [System.Diagnostics.ProcessWindowStyle]::Minimized
        }

        $process = [System.Diagnostics.Process]::Start($psi)

        if ($null -eq $process) {
            throw "Process.Start returned null"
        }

        Write-Log "Server process started with PID $($process.Id)" -Level INFO

        # Wait for server to start listening
        Write-Info "Waiting for server to start..."

        $timeout = $script:StartTimeoutSeconds
        $elapsed = 0
        $started = $false

        while ($elapsed -lt $timeout -and -not $started) {
            Start-Sleep -Milliseconds 500
            $elapsed += 0.5

            # Check if process died
            $process.Refresh()
            if ($process.HasExited) {
                Write-Log "Server process exited prematurely with code $($process.ExitCode)" -Level ERROR
                Write-Error2 "Server process exited unexpectedly (exit code: $($process.ExitCode))"
                return $false
            }

            $started = Test-PortInUse -Port $port

            if (-not $Silent -and -not $started) {
                Write-Host "`r  Waiting... ($([math]::Floor($elapsed))/$timeout sec)" -NoNewline
            }
        }

        if (-not $Silent) { Write-Host "" }

        if ($started) {
            Write-Log "Server started successfully on port $port" -Level INFO

            Write-Host ""
            Write-Host "  =========================================" -ForegroundColor Green
            Write-Host "   Server Started Successfully!" -ForegroundColor Green
            Write-Host "  =========================================" -ForegroundColor Green
            Write-Host ""

            $ips = Get-NetworkIPs

            Write-Host "  Access URLs:" -ForegroundColor White
            Write-Host "    Local:   " -NoNewline
            Write-Host "http://localhost:$port" -ForegroundColor Cyan

            if ($ips -and $ips.Count -gt 0) {
                Write-Host "    Network: " -NoNewline
                Write-Host "http://$($ips[0]):$port" -ForegroundColor Cyan
            }

            Write-Host ""
            Write-Host "  To stop: " -NoNewline
            Write-Host ".\rwl.ps1 stop" -ForegroundColor Yellow
            Write-Host ""

            # Open browser only if requested and not in silent mode
            if ($OpenBrowser -and -not $Silent) {
                Start-Sleep -Milliseconds 500
                try {
                    Start-Process "http://localhost:$port"
                    Write-Log "Opened browser" -Level INFO
                }
                catch {
                    Write-Log "Could not open browser: $_" -Level WARN
                }
            }

            return $true
        }
        else {
            Write-Log "Server failed to start within $timeout seconds" -Level ERROR
            Write-Error2 "Server did not start within $timeout seconds"
            Write-Info "Check the server window for error messages"

            # Try to kill the hung process
            try { Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue } catch {}

            return $false
        }
    }
    catch {
        Write-Log "Failed to start server: $($_.Exception.Message)" -Level ERROR
        Write-Error2 "Failed to start server: $($_.Exception.Message)"
        return $false
    }
}

# ============================================================================
# NODE.JS INSTALLATION
# ============================================================================

function Install-PortableNode {
    <#
    .SYNOPSIS
        Downloads and installs portable Node.js
    #>
    param(
        [switch]$ShowHeader = $true,
        [switch]$ForceReinstall = $false
    )

    if ($ShowHeader -and -not $Silent) {
        Write-Header "Installing Portable Node.js"
    }
    else {
        Write-Step "Installing Portable Node.js"
    }

    $portablePath = Join-Path $script:ScriptDir "node"
    $nodeExe = Join-Path $portablePath "node.exe"

    # Check if already installed
    if ((Test-Path $nodeExe) -and -not $ForceReinstall) {
        $existingVersion = & $nodeExe -v 2>$null
        Write-Success "Portable Node.js already installed ($existingVersion)"
        Write-Log "Node.js already installed: $existingVersion" -Level INFO
        return $true
    }

    # Remove existing if forcing reinstall
    if ((Test-Path $portablePath) -and $ForceReinstall) {
        Write-Info "Removing existing Node.js installation..."
        try {
            Remove-Item $portablePath -Recurse -Force -ErrorAction Stop
            Write-Success "Removed existing installation"
        }
        catch {
            Write-Error2 "Could not remove existing installation: $($_.Exception.Message)"
            return $false
        }
    }

    # Check internet
    Write-Info "Checking internet connection..."
    if (-not (Test-InternetConnection)) {
        Write-Error2 "No internet connection!"
        Write-Log "No internet connection for Node.js download" -Level ERROR
        Write-Host ""
        Write-Host "  To install manually:" -ForegroundColor Yellow
        Write-Host "  1. Download: " -NoNewline
        Write-Host $script:NodeUrl -ForegroundColor Cyan
        Write-Host "  2. Extract to: " -NoNewline
        Write-Host $portablePath -ForegroundColor Cyan
        return $false
    }
    Write-Success "Internet connection available"

    # Create temp directory
    $tempDir = Join-Path $script:ScriptDir "temp"
    $zipPath = Join-Path $tempDir "node.zip"

    try {
        if (-not (Test-Path $tempDir)) {
            New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
        }

        Write-Info "Downloading Node.js v$script:NodeVersion (~30 MB)..."
        Write-Log "Downloading Node.js from $script:NodeUrl" -Level INFO
        Write-Host ""

        # Download with progress
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

        $webClient = New-Object System.Net.WebClient

        if ($Silent) {
            # Simple download without progress for silent mode
            $webClient.DownloadFile($script:NodeUrl, $zipPath)
        }
        else {
            # Download with progress bar
            $uri = New-Object System.Uri($script:NodeUrl)
            $request = [System.Net.HttpWebRequest]::Create($uri)
            $request.Method = "GET"
            $request.Timeout = 120000
            $response = $request.GetResponse()
            $totalBytes = $response.ContentLength
            $responseStream = $response.GetResponseStream()
            $fileStream = [System.IO.File]::Create($zipPath)

            $buffer = New-Object byte[] 65536
            $totalRead = 0

            while (($bytesRead = $responseStream.Read($buffer, 0, $buffer.Length)) -gt 0) {
                $fileStream.Write($buffer, 0, $bytesRead)
                $totalRead += $bytesRead
                $percent = [math]::Floor(($totalRead / $totalBytes) * 100)
                Write-ProgressBar -Percent $percent -Status "$([math]::Round($totalRead / 1MB, 1)) / $([math]::Round($totalBytes / 1MB, 1)) MB"
            }

            $fileStream.Close()
            $responseStream.Close()
            $response.Close()
            Write-Host ""
        }

        Write-Success "Download complete"
        Write-Log "Download complete: $zipPath" -Level INFO

        # Extract
        Write-Info "Extracting..."

        Expand-Archive -Path $zipPath -DestinationPath $tempDir -Force -ErrorAction Stop

        # Find extracted folder
        $extractedFolder = Get-ChildItem $tempDir -Directory | Where-Object { $_.Name -like "node-*" } | Select-Object -First 1

        if (-not $extractedFolder) {
            throw "Could not find extracted Node.js folder"
        }

        # Move to final location
        Move-Item $extractedFolder.FullName $portablePath -Force -ErrorAction Stop

        Write-Success "Extraction complete"
        Write-Log "Node.js extracted to $portablePath" -Level INFO
    }
    catch {
        Write-Error2 "Installation failed: $($_.Exception.Message)"
        Write-Log "Node.js installation failed: $($_.Exception.Message)" -Level ERROR
        return $false
    }
    finally {
        # Cleanup temp files
        if (Test-Path $zipPath) { Remove-Item $zipPath -Force -ErrorAction SilentlyContinue }
        if (Test-Path $tempDir) { Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue }
    }

    # Verify
    if (Test-Path $nodeExe) {
        $version = & $nodeExe -v 2>$null
        Write-Success "Portable Node.js $version installed!"
        Write-Log "Node.js installation verified: $version" -Level INFO
        return $true
    }
    else {
        Write-Error2 "Installation verification failed - node.exe not found"
        Write-Log "Node.js verification failed" -Level ERROR
        return $false
    }
}

function Ensure-NodeInstalled {
    <#
    .SYNOPSIS
        Ensures Node.js is installed, auto-installing if needed
    #>

    if (Test-NodeInstalled) {
        return $true
    }

    Write-Log "Node.js not installed, will auto-install" -Level INFO

    if (-not $Silent) {
        Write-Warning2 "Portable Node.js is not installed."
        Write-Info "RetroWebLauncher requires Node.js to run."
        Write-Host ""
    }

    # In silent mode or if user confirms, install automatically
    if ($Silent -or (Confirm-Action -Message "Download and install Node.js now? (~30 MB)" -Default $true)) {
        return Install-PortableNode -ShowHeader:(-not $Silent)
    }

    return $false
}

# ============================================================================
# COMMAND: INSTALL
# ============================================================================

function Invoke-Install {
    Write-Header "Install Dependencies"

    # Step 1: Ensure Node.js
    Write-Step "Checking Node.js"

    if ($Upgrade -and (Test-NodeInstalled)) {
        Write-Info "Upgrade flag set - reinstalling Node.js..."
        if (-not (Install-PortableNode -ShowHeader:$false -ForceReinstall:$true)) {
            return $false
        }
    }
    elseif (-not (Ensure-NodeInstalled)) {
        Write-Error2 "Cannot install dependencies without Node.js."
        return $false
    }

    $node = Get-NodePath
    Write-Success "Node.js v$($node.Version) ready"

    # Step 2: Check internet
    Write-Step "Checking Internet Connection"

    if (-not (Test-InternetConnection)) {
        Write-Warning2 "Cannot reach npm registry!"
        if (-not $Silent) {
            if (-not (Confirm-Action -Message "Try anyway?" -Default $false)) {
                return $false
            }
        }
        else {
            Write-Error2 "No internet connection in silent mode - aborting"
            return $false
        }
    }
    else {
        Write-Success "Internet connection available"
    }

    # Step 3: Clean install option
    $nodeModulesPath = Join-Path $script:ScriptDir "node_modules"
    if (Test-Path $nodeModulesPath) {
        Write-Step "Existing Installation Detected"

        if ($Force -or (Confirm-Action -Message "Perform clean install (delete node_modules)?" -Default $false)) {
            Write-Info "Removing old node_modules..."
            try {
                Remove-Item $nodeModulesPath -Recurse -Force -ErrorAction Stop
                Write-Success "Old node_modules removed"
            }
            catch {
                Write-Error2 "Could not remove node_modules: $($_.Exception.Message)"
                Write-Info "Close any programs using files in this folder and try again."
                return $false
            }
        }
    }

    # Step 4: Install
    Write-Step "Installing Dependencies"
    Write-Info "This may take 1-5 minutes depending on your connection."
    Write-Host ""
    Write-Log "Running npm install" -Level INFO

    $maxAttempts = 3
    $attempt = 0
    $success = $false

    while ($attempt -lt $maxAttempts -and -not $success) {
        $attempt++
        if (-not $Silent) {
            Write-Host "  Attempt $attempt of $maxAttempts..." -ForegroundColor DarkGray
            Write-Host ""
        }

        try {
            $npmArgs = "install --loglevel=error"
            $process = Start-Process -FilePath $node.NpmPath -ArgumentList $npmArgs -Wait -PassThru -NoNewWindow

            if ($process.ExitCode -eq 0) {
                $success = $true
                Write-Log "npm install succeeded" -Level INFO
            }
            else {
                throw "npm exited with code $($process.ExitCode)"
            }
        }
        catch {
            Write-Log "npm install attempt $attempt failed: $($_.Exception.Message)" -Level WARN
            if (-not $Silent) {
                Write-Host ""
                Write-Error2 "npm install failed: $($_.Exception.Message)"
            }

            if ($attempt -lt $maxAttempts) {
                Write-Info "Clearing npm cache before retry..."
                Start-Process -FilePath $node.NpmPath -ArgumentList "cache clean --force" -Wait -NoNewWindow -ErrorAction SilentlyContinue

                if (-not $Silent -and -not (Confirm-Action -Message "Retry installation?" -Default $true)) {
                    break
                }
            }
        }
    }

    if (-not $success) {
        Write-Log "npm install failed after $maxAttempts attempts" -Level ERROR
        Write-Host ""
        Write-Error2 "Installation failed after $maxAttempts attempts."
        Write-Host ""
        Write-Host "  Troubleshooting:" -ForegroundColor Yellow
        Write-Host "    - Check your internet connection"
        Write-Host "    - Check firewall/proxy settings"
        Write-Host "    - Try running as Administrator"
        return $false
    }

    # Step 5: Verify
    Write-Step "Verifying Installation"

    $requiredModules = @("express", "socket.io", "fast-xml-parser")
    $optionalModules = @("better-sqlite3", "chokidar", "qrcode")
    $allGood = $true

    foreach ($mod in $requiredModules) {
        $modPath = Join-Path $nodeModulesPath $mod
        if (Test-Path $modPath) {
            Write-Success "$mod installed"
        }
        else {
            Write-Error2 "$mod NOT installed!"
            $allGood = $false
        }
    }

    foreach ($mod in $optionalModules) {
        $modPath = Join-Path $nodeModulesPath $mod
        if (Test-Path $modPath) {
            Write-Success "$mod installed"
        }
        else {
            Write-Warning2 "$mod not installed (optional)"
        }
    }

    Write-Host ""
    if ($allGood) {
        Write-Host "  =========================================" -ForegroundColor Green
        Write-Host "   Installation Complete!" -ForegroundColor Green
        Write-Host "  =========================================" -ForegroundColor Green
        Write-Host ""

        if (-not (Test-ConfigExists)) {
            Write-Host "  Next: Run " -NoNewline
            Write-Host ".\rwl.ps1 setup" -ForegroundColor Cyan -NoNewline
            Write-Host " to configure"
            Write-Host ""

            if (-not $Silent -and (Confirm-Action -Message "Run setup now?" -Default $true)) {
                return Invoke-Setup
            }
        }
        else {
            Write-Host "  Run " -NoNewline
            Write-Host ".\rwl.ps1 start" -ForegroundColor Cyan -NoNewline
            Write-Host " to launch the server"
        }
    }

    return $allGood
}

# ============================================================================
# INSTALLATION DIRECTORY MANAGEMENT
# ============================================================================

function Get-SourceFiles {
    <#
    .SYNOPSIS
        Returns list of files/folders to copy during installation
    #>
    return @(
        @{ Name = "rwl.ps1"; Type = "File"; Required = $true }
        @{ Name = "rwl.bat"; Type = "File"; Required = $true }
        @{ Name = "package.json"; Type = "File"; Required = $true }
        @{ Name = "src"; Type = "Directory"; Required = $true }
        @{ Name = "themes"; Type = "Directory"; Required = $true }
        @{ Name = "assets"; Type = "Directory"; Required = $false }
        @{ Name = "data"; Type = "Directory"; Required = $false }
        @{ Name = "docs"; Type = "Directory"; Required = $false }
        @{ Name = "README.md"; Type = "File"; Required = $false }
        @{ Name = "LICENSE"; Type = "File"; Required = $false }
        @{ Name = ".gitignore"; Type = "File"; Required = $false }
        @{ Name = "IMPLEMENTATION_PLAN.md"; Type = "File"; Required = $false }
    )
}

function Test-IsSourceDirectory {
    <#
    .SYNOPSIS
        Checks if the current directory contains the source files
    #>
    param([string]$Path = $script:ScriptDir)

    $srcPath = Join-Path $Path "src\server\index.js"
    $pkgPath = Join-Path $Path "package.json"

    return (Test-Path $srcPath) -and (Test-Path $pkgPath)
}

function Copy-ToInstallDirectory {
    <#
    .SYNOPSIS
        Copies RetroWebLauncher to a new installation directory
    .PARAMETER Destination
        Target installation directory
    .OUTPUTS
        $true if successful, $false otherwise
    #>
    param(
        [Parameter(Mandatory = $true)]
        [string]$Destination
    )

    Write-Log "Copying to installation directory: $Destination" -Level INFO

    # Create destination if it doesn't exist
    if (-not (Test-Path $Destination)) {
        try {
            New-Item -ItemType Directory -Path $Destination -Force | Out-Null
            Write-Success "Created directory: $Destination"
            Write-Log "Created directory: $Destination" -Level INFO
        }
        catch {
            Write-Error2 "Could not create directory: $($_.Exception.Message)"
            Write-Log "Failed to create directory: $($_.Exception.Message)" -Level ERROR
            return $false
        }
    }

    # Check if destination already has files
    $existingFiles = Get-ChildItem $Destination -ErrorAction SilentlyContinue
    if ($existingFiles -and $existingFiles.Count -gt 0) {
        Write-Warning2 "Destination directory is not empty."

        # Check if it's already a RetroWebLauncher installation
        if (Test-IsSourceDirectory -Path $Destination) {
            Write-Info "Existing RetroWebLauncher installation detected."
            if (-not (Confirm-Action -Message "Overwrite existing installation?" -Default $false)) {
                return $false
            }
        }
        else {
            if (-not (Confirm-Action -Message "Directory contains files. Continue anyway?" -Default $false)) {
                return $false
            }
        }
    }

    # Copy files
    Write-Step "Copying Files"

    $sourceFiles = Get-SourceFiles
    $successCount = 0
    $failCount = 0

    foreach ($item in $sourceFiles) {
        $sourcePath = Join-Path $script:ScriptDir $item.Name
        $destPath = Join-Path $Destination $item.Name

        if (-not (Test-Path $sourcePath)) {
            if ($item.Required) {
                Write-Error2 "Required file missing: $($item.Name)"
                $failCount++
            }
            continue
        }

        try {
            if ($item.Type -eq "Directory") {
                # Copy directory recursively
                if (Test-Path $destPath) {
                    Remove-Item $destPath -Recurse -Force -ErrorAction Stop
                }
                Copy-Item $sourcePath $destPath -Recurse -Force -ErrorAction Stop
                Write-Success "Copied: $($item.Name)/"
            }
            else {
                # Copy file
                Copy-Item $sourcePath $destPath -Force -ErrorAction Stop
                Write-Success "Copied: $($item.Name)"
            }
            $successCount++
        }
        catch {
            Write-Error2 "Failed to copy $($item.Name): $($_.Exception.Message)"
            Write-Log "Copy failed for $($item.Name): $($_.Exception.Message)" -Level ERROR
            if ($item.Required) {
                $failCount++
            }
        }
    }

    Write-Host ""
    Write-Info "Copied $successCount items"

    if ($failCount -gt 0) {
        Write-Error2 "$failCount required items failed to copy"
        return $false
    }

    Write-Log "Installation copy complete: $successCount items" -Level INFO
    return $true
}

function Select-InstallDirectory {
    <#
    .SYNOPSIS
        Prompts user for installation directory
    .OUTPUTS
        Selected path or $null if cancelled
    #>

    Write-Step "Installation Directory"

    Write-Host "  Where would you like to install RetroWebLauncher?"
    Write-Host ""
    Write-Host "  Current location: " -NoNewline
    Write-Host $script:ScriptDir -ForegroundColor Cyan
    Write-Host ""

    # Suggest a default path
    $defaultPath = "C:\RetroWebLauncher"

    # If we're already in a reasonable location, offer to stay
    $currentIsReasonable = $script:ScriptDir -notmatch '\\(Temp|Downloads|Desktop)\\' -and
                           $script:ScriptDir -notmatch '\\AppData\\Local\\Temp'

    if ($currentIsReasonable) {
        Write-Host "  Options:" -ForegroundColor Yellow
        Write-Host "    1. Use current location (recommended if you placed files here)"
        Write-Host "    2. Choose a different location"
        Write-Host ""
        Write-Host "  Choice [1]: " -NoNewline
        $choice = Read-Host

        if ([string]::IsNullOrWhiteSpace($choice) -or $choice -eq "1") {
            Write-Success "Using current location"
            return $null  # null means "use current location"
        }
    }

    # Ask for path
    Write-Host ""
    Write-Host "  Enter installation path"
    Write-Host "  Example: " -NoNewline
    Write-Host "C:\RetroWebLauncher" -ForegroundColor Cyan -NoNewline
    Write-Host " or " -NoNewline
    Write-Host "D:\Games\RetroWebLauncher" -ForegroundColor Cyan

    $installPath = Read-UserInput -Prompt "Install to" -Default $defaultPath

    if ([string]::IsNullOrWhiteSpace($installPath)) {
        return $null
    }

    # Clean up path
    $installPath = $installPath -replace '^["'']+|["'']+$', ''
    $installPath = [System.IO.Path]::GetFullPath($installPath)

    # Check if it's the same as current
    if ($installPath -eq $script:ScriptDir) {
        Write-Info "Same as current location - no copy needed"
        return $null
    }

    return $installPath
}

function Invoke-InstallToDirectory {
    <#
    .SYNOPSIS
        Handles the full installation-to-directory process
    .OUTPUTS
        $true to continue setup in new location, $false to continue in current, $null on error
    #>

    # Only offer this in interactive mode
    if ($Silent) {
        return $false  # Continue in current location
    }

    # Check if we're in a source directory
    if (-not (Test-IsSourceDirectory)) {
        Write-Error2 "Source files not found. Cannot copy installation."
        return $false
    }

    $targetDir = Select-InstallDirectory

    if ($null -eq $targetDir) {
        # User chose current location
        return $false
    }

    Write-Host ""
    Write-Info "Installing to: $targetDir"
    Write-Host ""

    if (-not (Copy-ToInstallDirectory -Destination $targetDir)) {
        Write-Error2 "Installation copy failed"
        return $null
    }

    Write-Host ""
    Write-Host "  =========================================" -ForegroundColor Green
    Write-Host "   Files Copied Successfully!" -ForegroundColor Green
    Write-Host "  =========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Installed to: " -NoNewline
    Write-Host $targetDir -ForegroundColor Cyan
    Write-Host ""

    # Launch setup from new location
    if (Confirm-Action -Message "Continue setup from new location?" -Default $true) {
        Write-Info "Launching setup from new location..."
        Write-Host ""

        $newScript = Join-Path $targetDir "rwl.ps1"
        Start-Process "powershell.exe" -ArgumentList "-ExecutionPolicy Bypass -File `"$newScript`" setup" -WorkingDirectory $targetDir

        Write-Info "Setup launched in new window. You can close this window."
        return $true  # Signal to exit current script
    }

    return $false
}

# ============================================================================
# COMMAND: SETUP
# ============================================================================

function Invoke-Setup {
    Write-Header "Setup Wizard"

    if (-not $Silent) {
        Write-Box -Lines @(
            "Welcome to RetroWebLauncher Setup!",
            "",
            "This wizard will help you:",
            "  1. Choose installation directory",
            "  2. Install Node.js (portable)",
            "  3. Install dependencies",
            "  4. Configure your RetroBat path",
            "  5. Create shortcuts (optional)"
        ) -TextColor White
        Write-Host ""
    }

    # Step 0: Installation Directory (interactive only)
    if (-not $Silent) {
        $installResult = Invoke-InstallToDirectory

        if ($installResult -eq $true) {
            # Setup launched from new location - exit this instance
            return $true
        }
        elseif ($null -eq $installResult) {
            # Error occurred
            return $false
        }
        # $false means continue in current location
    }

    # Check admin status
    if (Test-IsAdmin) {
        Write-Success "Running with administrator privileges"
    }
    else {
        Write-Info "Running without administrator privileges"
        if (-not $Silent) {
            Write-Host "       Some features (firewall rules) may require admin." -ForegroundColor DarkGray
        }
    }

    # Step 1: Install Node.js
    Write-Step "Step 1: Node.js (Portable)"

    if (-not (Ensure-NodeInstalled)) {
        Write-Error2 "Setup cannot continue without Node.js."
        return $false
    }

    $node = Get-NodePath
    Write-Success "Node.js v$($node.Version) ready"

    # Step 2: Dependencies
    Write-Step "Step 2: Dependencies"

    if (Test-DependenciesInstalled) {
        Write-Success "Dependencies already installed"
    }
    else {
        Write-Info "Installing dependencies..."
        $process = Start-Process -FilePath $node.NpmPath -ArgumentList "install --loglevel=error" -Wait -PassThru -NoNewWindow

        if ($process.ExitCode -ne 0) {
            Write-Error2 "Failed to install dependencies."
            if ($Silent -or -not (Confirm-Action -Message "Continue setup anyway?" -Default $false)) {
                return $false
            }
        }
        else {
            Write-Success "Dependencies installed"
        }
    }

    # Step 3: Configure RetroBat Path
    Write-Step "Step 3: Configure RetroBat Path"

    $retrobatPath = $null
    $currentPath = Get-ConfigValue -Key "retrobatPath"

    if ($currentPath -and -not $Force) {
        Write-Info "Current path: $currentPath"
        if (-not (Confirm-Action -Message "Change RetroBat path?" -Default $false)) {
            $retrobatPath = $currentPath
        }
    }

    if (-not $retrobatPath) {
        # Auto-detect
        $commonPaths = @(
            "C:\RetroBat",
            "D:\RetroBat",
            "E:\RetroBat",
            "C:\Games\RetroBat",
            "D:\Games\RetroBat",
            "E:\Games\RetroBat",
            "$env:USERPROFILE\RetroBat"
        )

        $foundPath = $commonPaths | Where-Object {
            Test-Path (Join-Path $_ "emulatorLauncher.exe")
        } | Select-Object -First 1

        if ($foundPath) {
            Write-Success "Found RetroBat at: $foundPath"
            if (Confirm-Action -Message "Use this path?" -Default $true) {
                $retrobatPath = $foundPath
            }
        }

        if (-not $retrobatPath) {
            if ($Silent) {
                Write-Error2 "RetroBat path required but not found in silent mode"
                return $false
            }

            Write-Host ""
            Write-Host "  Enter the full path to your RetroBat installation."
            Write-Host "  Example: " -NoNewline
            Write-Host "E:\RetroBat" -ForegroundColor Cyan

            $retrobatPath = Read-UserInput -Prompt "RetroBat path" -Required

            if (-not $retrobatPath) {
                Write-Error2 "RetroBat path is required"
                return $false
            }

            $retrobatPath = $retrobatPath -replace '^["'']+|["'']+$', ''

            if (-not (Test-Path $retrobatPath)) {
                Write-Warning2 "Path does not exist: $retrobatPath"
                if (-not (Confirm-Action -Message "Continue anyway?" -Default $false)) {
                    return $false
                }
            }
            else {
                $emulatorPath = Join-Path $retrobatPath "emulatorLauncher.exe"
                if (Test-Path $emulatorPath) {
                    Write-Success "emulatorLauncher.exe found"
                }
                else {
                    Write-Warning2 "emulatorLauncher.exe not found"
                    if (-not (Confirm-Action -Message "Continue anyway?" -Default $false)) {
                        return $false
                    }
                }
            }
        }
    }

    # Step 4: Arcade Name
    Write-Step "Step 4: Arcade Name"

    $currentName = Get-ConfigValue -Key "arcadeName" -Default "My Arcade"

    if ($Silent) {
        $arcadeName = $currentName
        Write-Info "Using arcade name: $arcadeName"
    }
    else {
        Write-Host "  This name appears in the header and screensaver."
        $arcadeName = Read-UserInput -Prompt "Arcade name" -Default $currentName
    }

    # Step 5: Save Configuration
    Write-Step "Step 5: Save Configuration"

    $config = @{
        retrobatPath = $retrobatPath
        port = Get-ConfigValue -Key "port" -Default $script:DefaultPort
        arcadeName = $arcadeName
        theme = Get-ConfigValue -Key "theme" -Default "classic-arcade"
        defaultView = Get-ConfigValue -Key "defaultView" -Default "wheel"
        showHiddenGames = Get-ConfigValue -Key "showHiddenGames" -Default $false
        attractMode = @{
            enabled = $true
            idleTimeout = 300
        }
        ai = @{
            enabled = $false
            provider = "ollama"
        }
    }

    if (Save-Config -Config $config) {
        Write-Success "Configuration saved to $script:ConfigFile"
    }
    else {
        Write-Error2 "Failed to save configuration"
        return $false
    }

    # Step 6: Shortcuts (skip in silent mode)
    if (-not $Silent) {
        Write-Step "Step 6: Shortcuts (Optional)"

        if (Confirm-Action -Message "Create Start Menu shortcut?" -Default $true) {
            try {
                $startMenuPath = [Environment]::GetFolderPath('StartMenu') + "\Programs"
                $shortcutPath = Join-Path $startMenuPath "RetroWebLauncher.lnk"

                $shell = New-Object -ComObject WScript.Shell
                $shortcut = $shell.CreateShortcut($shortcutPath)
                $shortcut.TargetPath = Join-Path $script:ScriptDir "rwl.bat"
                $shortcut.WorkingDirectory = $script:ScriptDir
                $shortcut.Description = "RetroWebLauncher - Web frontend for RetroBat"
                $shortcut.Save()

                Write-Success "Start Menu shortcut created"
            }
            catch {
                Write-Warning2 "Could not create shortcut: $($_.Exception.Message)"
            }
        }

        # Step 7: Windows Startup
        Write-Step "Step 7: Auto-Start (Optional)"

        if (Confirm-Action -Message "Start RetroWebLauncher when Windows starts?" -Default $false) {
            try {
                $startupPath = [Environment]::GetFolderPath('Startup')
                $shortcutPath = Join-Path $startupPath "RetroWebLauncher.lnk"

                $shell = New-Object -ComObject WScript.Shell
                $shortcut = $shell.CreateShortcut($shortcutPath)
                $shortcut.TargetPath = Join-Path $script:ScriptDir "rwl.bat"
                $shortcut.Arguments = "start -Silent"
                $shortcut.WorkingDirectory = $script:ScriptDir
                $shortcut.WindowStyle = 7
                $shortcut.Description = "RetroWebLauncher Auto-Start"
                $shortcut.Save()

                Write-Success "Added to Windows startup"
            }
            catch {
                Write-Warning2 "Could not add to startup: $($_.Exception.Message)"
            }
        }

        # Step 8: Firewall
        Write-Step "Step 8: Firewall (Optional)"

        $port = Get-ServerPort
        if (-not (Test-IsAdmin)) {
            Write-Info "Firewall configuration requires administrator privileges."
        }
        elseif (Confirm-Action -Message "Add firewall rule for network access (port $port)?" -Default $false) {
            try {
                $existingRule = Get-NetFirewallRule -DisplayName "RetroWebLauncher" -ErrorAction SilentlyContinue
                if ($existingRule) {
                    Write-Info "Firewall rule already exists"
                }
                else {
                    New-NetFirewallRule -DisplayName "RetroWebLauncher" -Direction Inbound -Action Allow -Protocol TCP -LocalPort $port | Out-Null
                    Write-Success "Firewall rule added for port $port"
                }
            }
            catch {
                Write-Warning2 "Could not add firewall rule: $($_.Exception.Message)"
            }
        }
    }

    # Done!
    Write-Host ""
    Write-Host "  =========================================" -ForegroundColor Green
    Write-Host "   Setup Complete!" -ForegroundColor Green
    Write-Host "  =========================================" -ForegroundColor Green
    Write-Host ""

    $port = Get-ServerPort
    $ips = Get-NetworkIPs

    Write-Host "  Access from this computer:" -ForegroundColor White
    Write-Host "    http://localhost:$port" -ForegroundColor Cyan

    if ($ips -and $ips.Count -gt 0) {
        Write-Host ""
        Write-Host "  Access from other devices:" -ForegroundColor White
        foreach ($ip in $ips) {
            Write-Host "    http://${ip}:$port" -ForegroundColor Cyan
        }
    }

    if (-not $Silent) {
        Write-Host ""
        Write-Box -Lines @(
            "This app is fully portable!",
            "Copy this folder to any Windows PC."
        ) -BorderColor Green -TextColor Green
    }

    Write-Host ""

    if (Confirm-Action -Message "Start RetroWebLauncher now?" -Default $true) {
        return Invoke-Start
    }

    return $true
}

# ============================================================================
# COMMAND: CONFIG
# ============================================================================

function Invoke-Config {
    Write-Header "Configuration"

    if (-not (Test-ConfigExists)) {
        Write-Warning2 "No configuration found. Running setup..."
        return Invoke-Setup
    }

    $config = Get-Config

    Write-Host "  Current Configuration:" -ForegroundColor White
    Write-Host "  ----------------------" -ForegroundColor DarkGray
    Write-Host "  1. RetroBat Path:  $($config.retrobatPath)"
    Write-Host "  2. Arcade Name:    $($config.arcadeName)"
    Write-Host "  3. Port:           $($config.port)"
    Write-Host "  4. Theme:          $($config.theme)"
    Write-Host "  5. Default View:   $($config.defaultView)"
    Write-Host ""
    Write-Host "  0. Back / Save"
    Write-Host ""

    if ($Silent) {
        Write-Info "Cannot edit config in silent mode"
        return $true
    }

    $changed = $false

    while ($true) {
        Write-Host "  Edit which setting? (0-5): " -NoNewline
        $choice = Read-Host

        switch ($choice) {
            "0" { break }
            "1" {
                $newPath = Read-UserInput -Prompt "New RetroBat path" -Default $config.retrobatPath
                if ($newPath -ne $config.retrobatPath) {
                    $config.retrobatPath = $newPath
                    $changed = $true
                    Write-Success "RetroBat path updated"
                }
            }
            "2" {
                $newName = Read-UserInput -Prompt "New arcade name" -Default $config.arcadeName
                if ($newName -ne $config.arcadeName) {
                    $config.arcadeName = $newName
                    $changed = $true
                    Write-Success "Arcade name updated"
                }
            }
            "3" {
                $newPort = Read-UserInput -Prompt "New port" -Default $config.port
                try {
                    $portNum = [int]$newPort
                    if ($portNum -ne $config.port) {
                        $config.port = $portNum
                        $changed = $true
                        Write-Success "Port updated (restart required)"
                    }
                }
                catch {
                    Write-Error2 "Invalid port number"
                }
            }
            "4" {
                Write-Host "  Available themes: classic-arcade, dark-modern"
                $newTheme = Read-UserInput -Prompt "New theme" -Default $config.theme
                if ($newTheme -ne $config.theme) {
                    $config.theme = $newTheme
                    $changed = $true
                    Write-Success "Theme updated"
                }
            }
            "5" {
                Write-Host "  Available views: wheel, grid"
                $newView = Read-UserInput -Prompt "New default view" -Default $config.defaultView
                if ($newView -ne $config.defaultView) {
                    $config.defaultView = $newView
                    $changed = $true
                    Write-Success "Default view updated"
                }
            }
            default {
                if ($choice -eq "") { break }
                Write-Warning2 "Invalid choice"
            }
        }

        if ($choice -eq "0" -or $choice -eq "") { break }
    }

    if ($changed) {
        # Convert PSCustomObject to hashtable for saving
        $configHash = @{}
        $config.PSObject.Properties | ForEach-Object {
            $configHash[$_.Name] = $_.Value
        }

        if (Save-Config -Config $configHash) {
            Write-Success "Configuration saved"
        }
        else {
            Write-Error2 "Failed to save configuration"
            return $false
        }
    }
    else {
        Write-Info "No changes made"
    }

    return $true
}

# ============================================================================
# COMMAND: START
# ============================================================================

function Invoke-Start {
    Write-Header "Start Server"

    # Pre-flight checks
    Write-Step "Pre-flight Checks"

    # Node.js
    if (-not (Ensure-NodeInstalled)) {
        return $false
    }
    $node = Get-NodePath
    Write-Success "Node.js v$($node.Version)"

    # Dependencies
    if (-not (Test-DependenciesInstalled)) {
        Write-Warning2 "Dependencies not installed"
        if ($Silent -or (Confirm-Action -Message "Install dependencies now?" -Default $true)) {
            Write-Info "Installing dependencies..."
            $process = Start-Process -FilePath $node.NpmPath -ArgumentList "install --loglevel=error" -Wait -PassThru -NoNewWindow
            if ($process.ExitCode -ne 0) {
                Write-Error2 "Failed to install dependencies"
                return $false
            }
            Write-Success "Dependencies installed"
        }
        else {
            return $false
        }
    }
    else {
        Write-Success "Dependencies installed"
    }

    # Configuration
    if (-not (Test-ConfigExists)) {
        Write-Warning2 "Configuration not found"
        if ($Silent) {
            Write-Error2 "Cannot run setup in silent mode - run setup first"
            return $false
        }
        if (Confirm-Action -Message "Run setup now?" -Default $true) {
            if (-not (Invoke-Setup)) {
                return $false
            }
            # Check if server was already started by setup
            if (Test-PortInUse -Port (Get-ServerPort)) {
                return $true
            }
        }
        else {
            return $false
        }
    }
    else {
        Write-Success "Configuration found"
    }

    # Port check
    $port = Get-ServerPort
    if (Test-PortInUse -Port $port) {
        Write-Warning2 "Port $port is already in use!"

        $processes = Get-ProcessesOnPort -Port $port
        foreach ($proc in $processes) {
            Write-Info "Process: $($proc.ProcessName) (PID: $($proc.Id))"
        }

        if ($Silent) {
            Write-Info "Silent mode: stopping existing process..."
            if (-not (Stop-ServerProcess -Port $port -Quiet)) {
                return $false
            }
        }
        else {
            Write-Host ""
            Write-Host "  Options:" -ForegroundColor Yellow
            Write-Host "    1. Stop existing and start fresh"
            Write-Host "    2. Cancel"
            Write-Host ""
            Write-Host "  Choice [1]: " -NoNewline
            $choice = Read-Host
            if ([string]::IsNullOrWhiteSpace($choice)) { $choice = "1" }

            if ($choice -eq "1") {
                if (-not (Stop-ServerProcess -Port $port)) {
                    return $false
                }
            }
            else {
                return $false
            }
        }
    }
    else {
        Write-Success "Port $port is available"
    }

    # Start
    Write-Step "Starting Server"

    $openBrowser = -not $Silent -and -not $NoBrowser
    return Start-ServerProcess -OpenBrowser:$openBrowser
}

# ============================================================================
# COMMAND: STOP
# ============================================================================

function Invoke-Stop {
    if (-not $Silent) {
        Write-Header "Stop Server"
        Write-Step "Stopping Server"
    }

    $port = Get-ServerPort
    $result = Stop-ServerProcess -Port $port -Quiet:$Silent

    if ($result -and -not $Silent) {
        Write-Host ""
        Write-Success "Server stopped"
    }

    return $result
}

# ============================================================================
# COMMAND: RESTART
# ============================================================================

function Invoke-Restart {
    Write-Header "Restart Server"

    $port = Get-ServerPort

    if (Test-PortInUse -Port $port) {
        Write-Step "Stopping Current Server"
        if (-not (Stop-ServerProcess -Port $port)) {
            Write-Error2 "Could not stop existing server"
            return $false
        }
        Write-Success "Server stopped"
        Start-Sleep -Seconds 1
    }

    Write-Step "Starting Server"
    $openBrowser = -not $Silent -and -not $NoBrowser
    return Start-ServerProcess -OpenBrowser:$openBrowser
}

# ============================================================================
# COMMAND: STATUS
# ============================================================================

function Invoke-Status {
    Write-Header "Server Status"

    $port = Get-ServerPort
    $isRunning = Test-PortInUse -Port $port

    # Status display
    Write-Host ""
    if ($isRunning) {
        Write-Host "  +--------------------+" -ForegroundColor Green
        Write-Host "  |  Status: " -NoNewline -ForegroundColor Green
        Write-Host "RUNNING" -NoNewline -ForegroundColor White
        Write-Host "   |" -ForegroundColor Green
        Write-Host "  +--------------------+" -ForegroundColor Green
    }
    else {
        Write-Host "  +--------------------+" -ForegroundColor Red
        Write-Host "  |  Status: " -NoNewline -ForegroundColor Red
        Write-Host "STOPPED" -NoNewline -ForegroundColor White
        Write-Host "   |" -ForegroundColor Red
        Write-Host "  +--------------------+" -ForegroundColor Red
    }
    Write-Host ""

    # Configuration
    Write-Step "Configuration"
    Write-Host "  Port:           $port"

    $arcadeName = Get-ConfigValue -Key "arcadeName" -Default "(not configured)"
    Write-Host "  Arcade Name:    $arcadeName"

    $retrobatPath = Get-ConfigValue -Key "retrobatPath" -Default "(not configured)"
    Write-Host "  RetroBat Path:  $retrobatPath"

    $theme = Get-ConfigValue -Key "theme" -Default "(not configured)"
    Write-Host "  Theme:          $theme"

    # Node.js
    Write-Step "Node.js (Portable)"
    if (Test-NodeInstalled) {
        $node = Get-NodePath
        Write-Host "  Status:         " -NoNewline
        Write-Host "Installed" -ForegroundColor Green
        Write-Host "  Version:        v$($node.Version)"
    }
    else {
        Write-Host "  Status:         " -NoNewline
        Write-Host "NOT INSTALLED" -ForegroundColor Red
    }

    # Dependencies
    Write-Step "Dependencies"
    if (Test-DependenciesInstalled) {
        Write-Host "  Status:         " -NoNewline
        Write-Host "Installed" -ForegroundColor Green
    }
    else {
        Write-Host "  Status:         " -NoNewline
        Write-Host "NOT INSTALLED" -ForegroundColor Red
    }

    # URLs if running
    if ($isRunning) {
        Write-Step "Access URLs"
        Write-Host "  Local:          " -NoNewline
        Write-Host "http://localhost:$port" -ForegroundColor Cyan

        $ips = Get-NetworkIPs
        if ($ips) {
            foreach ($ip in $ips) {
                Write-Host "  Network:        " -NoNewline
                Write-Host "http://${ip}:$port" -ForegroundColor Cyan
            }
        }

        $processes = Get-ProcessesOnPort -Port $port
        if ($processes.Count -gt 0) {
            Write-Step "Process Info"
            foreach ($proc in $processes) {
                Write-Host "  PID:            $($proc.Id)"
                Write-Host "  Name:           $($proc.ProcessName)"
                try {
                    Write-Host "  Memory:         $([math]::Round($proc.WorkingSet64 / 1MB, 1)) MB"
                }
                catch {}
            }
        }
    }

    # Log file location
    Write-Step "Logs"
    Write-Host "  Log file:       $script:LogPath"

    Write-Host ""
    return $true
}

# ============================================================================
# COMMAND: DEV
# ============================================================================

function Invoke-Dev {
    Write-Header "Development Mode"

    if (-not (Ensure-NodeInstalled)) {
        return $false
    }

    $node = Get-NodePath

    if (-not (Test-DependenciesInstalled)) {
        Write-Warning2 "Dependencies not installed."
        if (Confirm-Action -Message "Install dependencies now?" -Default $true) {
            $process = Start-Process -FilePath $node.NpmPath -ArgumentList "install" -Wait -PassThru -NoNewWindow
            if ($process.ExitCode -ne 0) {
                Write-Error2 "Failed to install dependencies"
                return $false
            }
        }
        else {
            return $false
        }
    }

    # Stop existing server if running
    $port = Get-ServerPort
    if (Test-PortInUse -Port $port) {
        Write-Info "Stopping existing server..."
        Stop-ServerProcess -Port $port -Quiet | Out-Null
    }

    Write-Info "Starting in development mode (file watching enabled)"
    Write-Info "Server will auto-restart when files change"
    Write-Host ""
    Write-Host "  Access: " -NoNewline
    Write-Host "http://localhost:$port" -ForegroundColor Cyan
    Write-Host "  Press " -NoNewline
    Write-Host "Ctrl+C" -ForegroundColor Yellow -NoNewline
    Write-Host " to stop"
    Write-Host ""

    $serverScript = Join-Path $script:ScriptDir "src\server\index.js"
    & $node.NodePath --watch $serverScript
}

# ============================================================================
# COMMAND: UNINSTALL
# ============================================================================

function Invoke-Uninstall {
    Write-Header "Uninstall"

    Write-Warning2 "This will remove RetroWebLauncher components."
    Write-Host ""
    Write-Host "  What would you like to remove?" -ForegroundColor Yellow
    Write-Host "    1. Shortcuts only"
    Write-Host "    2. Shortcuts + node_modules"
    Write-Host "    3. Shortcuts + node_modules + Node.js"
    Write-Host "    4. Everything (full reset)"
    Write-Host "    5. Cancel"
    Write-Host ""

    if ($Silent) {
        Write-Info "Cannot uninstall in silent mode without -Force"
        return $false
    }

    Write-Host "  Choice: " -NoNewline
    $choice = Read-Host

    if ($choice -eq "5" -or [string]::IsNullOrWhiteSpace($choice)) {
        Write-Info "Cancelled"
        return $true
    }

    # Stop server
    $port = Get-ServerPort
    if (Test-PortInUse -Port $port) {
        Write-Step "Stopping Server"
        Stop-ServerProcess -Port $port -Quiet | Out-Null
    }

    # Remove shortcuts
    Write-Step "Removing Shortcuts"

    $startMenuShortcut = [Environment]::GetFolderPath('StartMenu') + "\Programs\RetroWebLauncher.lnk"
    $startupShortcut = [Environment]::GetFolderPath('Startup') + "\RetroWebLauncher.lnk"

    if (Test-Path $startMenuShortcut) {
        Remove-Item $startMenuShortcut -Force -ErrorAction SilentlyContinue
        Write-Success "Removed Start Menu shortcut"
    }
    if (Test-Path $startupShortcut) {
        Remove-Item $startupShortcut -Force -ErrorAction SilentlyContinue
        Write-Success "Removed Startup shortcut"
    }

    if ([int]$choice -ge 2) {
        Write-Step "Removing node_modules"
        $nodeModules = Join-Path $script:ScriptDir "node_modules"
        if (Test-Path $nodeModules) {
            Remove-Item $nodeModules -Recurse -Force -ErrorAction SilentlyContinue
            Write-Success "Removed node_modules"
        }
    }

    if ([int]$choice -ge 3) {
        Write-Step "Removing Node.js"
        $portableNode = Join-Path $script:ScriptDir "node"
        if (Test-Path $portableNode) {
            Remove-Item $portableNode -Recurse -Force -ErrorAction SilentlyContinue
            Write-Success "Removed portable Node.js"
        }
    }

    if ([int]$choice -ge 4) {
        Write-Step "Removing Configuration & Data"

        $configPath = Join-Path $script:ScriptDir $script:ConfigFile
        if (Test-Path $configPath) {
            Remove-Item $configPath -Force -ErrorAction SilentlyContinue
            Write-Success "Removed configuration"
        }

        $dataDir = Join-Path $script:ScriptDir "data"
        Get-ChildItem "$dataDir\*.db" -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-Success "Removed database files"

        if (Test-Path $script:LogDir) {
            Remove-Item $script:LogDir -Recurse -Force -ErrorAction SilentlyContinue
            Write-Success "Removed logs"
        }

        if (Test-IsAdmin) {
            try {
                Remove-NetFirewallRule -DisplayName "RetroWebLauncher" -ErrorAction SilentlyContinue
                Write-Success "Removed firewall rule"
            }
            catch {}
        }
    }

    Write-Host ""
    Write-Host "  =========================================" -ForegroundColor Green
    Write-Host "   Uninstall Complete" -ForegroundColor Green
    Write-Host "  =========================================" -ForegroundColor Green

    return $true
}

# ============================================================================
# COMMAND: HELP
# ============================================================================

function Show-Help {
    Write-Banner

    Write-Host "  Usage: " -NoNewline
    Write-Host ".\rwl.ps1 [command] [options]" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "  Commands:" -ForegroundColor Yellow
    Write-Host "    install     Install Node.js and dependencies"
    Write-Host "    setup       First-time configuration wizard"
    Write-Host "    start       Start the server"
    Write-Host "    stop        Stop the server"
    Write-Host "    restart     Restart the server"
    Write-Host "    status      Show server status"
    Write-Host "    config      Edit configuration"
    Write-Host "    dev         Development mode (auto-reload)"
    Write-Host "    uninstall   Remove components"
    Write-Host "    help        Show this help"
    Write-Host ""

    Write-Host "  Options:" -ForegroundColor Yellow
    Write-Host "    -Silent     No prompts, auto-accept defaults (for automation)"
    Write-Host "    -Force      Force operations (clean install, etc.)"
    Write-Host "    -NoBrowser  Don't open browser after starting"
    Write-Host "    -Upgrade    Reinstall/upgrade Node.js"
    Write-Host ""

    Write-Host "  Examples:" -ForegroundColor Yellow
    Write-Host "    .\rwl.ps1                    " -NoNewline
    Write-Host "# Interactive menu" -ForegroundColor DarkGray
    Write-Host "    .\rwl.ps1 start              " -NoNewline
    Write-Host "# Start server" -ForegroundColor DarkGray
    Write-Host "    .\rwl.ps1 start -Silent      " -NoNewline
    Write-Host "# Start for automation" -ForegroundColor DarkGray
    Write-Host "    .\rwl.ps1 install -Upgrade   " -NoNewline
    Write-Host "# Reinstall Node.js" -ForegroundColor DarkGray
    Write-Host ""

    Write-Host "  Logs:" -ForegroundColor Yellow
    Write-Host "    Log file: $script:LogPath"
    Write-Host ""
}

# ============================================================================
# INTERACTIVE MENU
# ============================================================================

function Show-Menu {
    while ($true) {
        Write-Banner

        $port = Get-ServerPort
        $isRunning = Test-PortInUse -Port $port
        $nodeInstalled = Test-NodeInstalled
        $depsInstalled = Test-DependenciesInstalled

        # Status line
        Write-Host "     Status: " -NoNewline
        if ($isRunning) {
            Write-Host "RUNNING" -NoNewline -ForegroundColor Green
            Write-Host " on port $port" -ForegroundColor DarkGray
        }
        else {
            Write-Host "STOPPED" -ForegroundColor Red
        }

        Write-Host "     Node: " -NoNewline
        if ($nodeInstalled) {
            Write-Host "OK" -ForegroundColor Green -NoNewline
        }
        else {
            Write-Host "Missing" -ForegroundColor Red -NoNewline
        }
        Write-Host "  |  Deps: " -NoNewline
        if ($depsInstalled) {
            Write-Host "OK" -ForegroundColor Green
        }
        else {
            Write-Host "Missing" -ForegroundColor Red
        }

        Write-Host ""
        Write-Host "  ================================================" -ForegroundColor DarkGray
        Write-Host ""

        Write-Host "     " -NoNewline
        Write-Host "SERVER" -ForegroundColor White
        Write-Host "     1. Start Server"
        Write-Host "     2. Stop Server"
        Write-Host "     3. Restart Server"
        Write-Host "     4. View Status"
        Write-Host ""

        Write-Host "     " -NoNewline
        Write-Host "SETUP" -ForegroundColor White
        Write-Host "     5. First-Time Setup"
        Write-Host "     6. Install/Update Dependencies"
        Write-Host "     7. Edit Configuration"
        Write-Host ""

        Write-Host "     " -NoNewline
        Write-Host "TOOLS" -ForegroundColor White
        Write-Host "     8. Open in Browser"
        Write-Host "     9. Development Mode"
        Write-Host ""

        Write-Host "     0. Exit"
        Write-Host ""
        Write-Host "  ================================================" -ForegroundColor DarkGray
        Write-Host "     CLI: rwl [start|stop|status|setup|install|config|help]" -ForegroundColor DarkGray
        Write-Host ""
        Write-Host "     Choice: " -NoNewline

        $choice = Read-Host

        switch ($choice) {
            "1" { Invoke-Start; Pause-ForUser }
            "2" { Invoke-Stop; Pause-ForUser }
            "3" { Invoke-Restart; Pause-ForUser }
            "4" { Invoke-Status; Pause-ForUser }
            "5" { Invoke-Setup; Pause-ForUser }
            "6" { Invoke-Install; Pause-ForUser }
            "7" { Invoke-Config; Pause-ForUser }
            "8" {
                $p = Get-ServerPort
                Start-Process "http://localhost:$p"
            }
            "9" { Invoke-Dev }
            "0" { return }
            "q" { return }
            "Q" { return }
            default {}
        }
    }
}

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

try {
    switch ($Command.ToLower()) {
        'install'   { $result = Invoke-Install; if (-not $Silent) { Pause-ForUser } }
        'setup'     { $result = Invoke-Setup; if (-not $Silent) { Pause-ForUser } }
        'start'     { $result = Invoke-Start; if (-not $Silent) { Pause-ForUser } }
        'stop'      { $result = Invoke-Stop; if (-not $Silent) { Pause-ForUser } }
        'restart'   { $result = Invoke-Restart; if (-not $Silent) { Pause-ForUser } }
        'status'    { $result = Invoke-Status; if (-not $Silent) { Pause-ForUser } }
        'config'    { $result = Invoke-Config; if (-not $Silent) { Pause-ForUser } }
        'dev'       { Invoke-Dev }
        'uninstall' { $result = Invoke-Uninstall; if (-not $Silent) { Pause-ForUser } }
        'help'      { Show-Help }
        ''          { Show-Menu }
        'menu'      { Show-Menu }
        default     { Show-Help }
    }
}
catch {
    Write-Log "Unhandled exception: $($_.Exception.Message)" -Level ERROR
    Write-Log $_.ScriptStackTrace -Level ERROR
    Write-Error2 "An unexpected error occurred: $($_.Exception.Message)"
    if (-not $Silent) { Pause-ForUser }
    exit 1
}

Write-Log "Session ended" -Level INFO
