' ============================================================================
' RetroWebLauncher - Silent Launcher
' ============================================================================
' This VBScript launches the server completely hidden - no windows, no taskbar.
' Used for Windows startup auto-launch.
'
' To stop the server, run: rwl-stop.bat (or .\rwl.ps1 stop)
' ============================================================================

Option Explicit

Dim objShell, scriptDir, psCommand

Set objShell = CreateObject("WScript.Shell")

' Get the directory where this script is located
scriptDir = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)

' Build the PowerShell command
' -WindowStyle Hidden: PowerShell window is hidden
' -ExecutionPolicy Bypass: Allow script to run
' -NoProfile: Faster startup, no profile loading
' -File: Run the script file
psCommand = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -NoProfile -File """ & scriptDir & "\rwl.ps1"" start -Silent -NoBrowser"

' Run with window style 0 (hidden) - the second parameter
' 0 = Hide, 1 = Normal, 2 = Minimized, 7 = Minimized (no activate)
objShell.Run psCommand, 0, False

Set objShell = Nothing
