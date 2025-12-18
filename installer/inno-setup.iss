; RetroWebLauncher Inno Setup Script
; Requires Inno Setup 6.0 or higher (https://jrsoftware.org/isinfo.php)

#define MyAppName "RetroWebLauncher"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "RetroWebLauncher"
#define MyAppURL "https://github.com/retroweblauncher/retroweblauncher"
#define MyAppExeName "start.bat"

[Setup]
; App info
AppId={{A1B2C3D4-E5F6-7890-ABCD-EF1234567890}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Installation
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
LicenseFile=..\LICENSE
OutputDir=..\dist
OutputBaseFilename=RetroWebLauncher-Setup-{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes

; Appearance
WizardStyle=modern
SetupIconFile=..\assets\icons\app.ico

; Privileges
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; Windows version
MinVersion=10.0

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupicon"; Description: "Start RetroWebLauncher when Windows starts"; GroupDescription: "Startup:"

[Files]
; Main application files
Source: "..\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "node_modules\*,dist\*,installer\*,.git\*,*.db"

; Node modules (installed separately)
; Source: "..\node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"
Name: "{group}\{#MyAppName} (Dev Mode)"; Filename: "{app}\dev.bat"; WorkingDir: "{app}"
Name: "{group}\Configure {#MyAppName}"; Filename: "{app}\setup.bat"; WorkingDir: "{app}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: startupicon

[Run]
; Install Node.js dependencies after installation
Filename: "{cmd}"; Parameters: "/c cd /d ""{app}"" && npm install"; StatusMsg: "Installing dependencies..."; Flags: runhidden waituntilterminated

; Run setup wizard
Filename: "{app}\setup.bat"; Description: "Run Setup Wizard"; Flags: postinstall nowait skipifsilent

; Open in browser
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: postinstall nowait skipifsilent unchecked

[UninstallRun]
; Stop any running instance
Filename: "{cmd}"; Parameters: "/c taskkill /f /im node.exe /fi ""WINDOWTITLE eq RetroWebLauncher*"""; Flags: runhidden

[UninstallDelete]
; Clean up generated files
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\data"
Type: files; Name: "{app}\rwl.config.json"

[Code]
// Check if Node.js is installed
function NodeJsInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('node', '-v', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

// Initialize setup
function InitializeSetup(): Boolean;
begin
  Result := True;

  if not NodeJsInstalled() then
  begin
    if MsgBox('Node.js is required but not installed.' + #13#10 + #13#10 +
              'Would you like to download Node.js now?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      ShellExec('open', 'https://nodejs.org/', '', '', SW_SHOWNORMAL, ewNoWait, ResultCode);
    end;
    Result := False;
  end;
end;

// After installation, add firewall rule
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
begin
  if CurStep = ssPostInstall then
  begin
    // Add firewall rule for network access
    if MsgBox('Would you like to add a firewall rule to allow network access?' + #13#10 +
              'This is required to access RetroWebLauncher from other devices.',
              mbConfirmation, MB_YESNO) = IDYES then
    begin
      Exec('netsh', 'advfirewall firewall add rule name="RetroWebLauncher" dir=in action=allow protocol=TCP localport=3000',
           '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
    end;
  end;
end;

// Remove firewall rule on uninstall
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    Exec('netsh', 'advfirewall firewall delete rule name="RetroWebLauncher"',
         '', SW_HIDE, ewWaitUntilTerminated, ResultCode);
  end;
end;
