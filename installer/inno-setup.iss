; RetroWebLauncher Inno Setup Script
; Requires Inno Setup 6.0 or higher (https://jrsoftware.org/isinfo.php)
; Author: John Ray (johnray@mac.com)

#define MyAppName "RetroWebLauncher"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "John Ray"
#define MyAppURL "https://github.com/johnray/retroweblauncher"
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
OutputDir=..\dist
OutputBaseFilename=RetroWebLauncher-Setup-{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes

; Appearance
WizardStyle=modern
; SetupIconFile=..\assets\icons\app.ico  ; Uncomment if icon exists

; Privileges - admin for firewall rules
PrivilegesRequired=admin
PrivilegesRequiredOverridesAllowed=dialog

; Windows version
MinVersion=10.0

; Uninstaller
UninstallDisplayIcon={app}\assets\icons\app.ico
UninstallDisplayName={#MyAppName}

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupicon"; Description: "Start RetroWebLauncher when Windows starts"; GroupDescription: "Startup:"
Name: "firewallrule"; Description: "Add firewall rule for network access (required for other devices)"; GroupDescription: "Network:"; Flags: checkedonce

[Files]
; Main application files (excluding generated/temp files)
Source: "..\package.json"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\package-lock.json"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
Source: "..\src\*"; DestDir: "{app}\src"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\themes\*"; DestDir: "{app}\themes"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "..\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs skipifsourcedoesntexist

; Batch scripts
Source: "..\rwl.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\start.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\stop.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\setup.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\install.bat"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\dev.bat"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist

; Create empty directories
Source: "..\data\*"; DestDir: "{app}\data"; Flags: ignoreversion skipifsourcedoesntexist createallsubdirs

[Dirs]
Name: "{app}\data"; Permissions: users-full

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Comment: "Launch RetroWebLauncher"
Name: "{group}\{#MyAppName} Controller"; Filename: "{app}\rwl.bat"; WorkingDir: "{app}"; Comment: "Start/Stop/Configure RetroWebLauncher"
Name: "{group}\Stop {#MyAppName}"; Filename: "{app}\stop.bat"; WorkingDir: "{app}"; Comment: "Stop the running server"
Name: "{group}\Configure {#MyAppName}"; Filename: "{app}\setup.bat"; WorkingDir: "{app}"; Comment: "Configure Retrobat path and settings"
Name: "{group}\Install Dependencies"; Filename: "{app}\install.bat"; WorkingDir: "{app}"; Comment: "Reinstall Node.js dependencies"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: desktopicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; WorkingDir: "{app}"; Tasks: startupicon; Flags: runminimized

[Run]
; Run setup wizard (which handles npm install and configuration)
Filename: "{app}\setup.bat"; Description: "Run Setup Wizard (installs dependencies and configures Retrobat path)"; Flags: postinstall nowait skipifsilent

[UninstallRun]
; Stop any running Node.js processes for this app
Filename: "{cmd}"; Parameters: "/c for /f ""tokens=5"" %p in ('netstat -ano 2^>nul ^| findstr "":3000 "" ^| findstr ""LISTENING""') do taskkill /f /pid %p 2>nul"; Flags: runhidden; RunOnceId: "StopServer"

[UninstallDelete]
; Clean up generated files
Type: filesandordirs; Name: "{app}\node_modules"
Type: filesandordirs; Name: "{app}\data"
Type: files; Name: "{app}\rwl.config.json"

[Code]
var
  NodeInstallPage: TOutputMsgMemoWizardPage;
  NpmInstallSuccess: Boolean;

// Check if Node.js is installed and get version
function GetNodeVersion(): String;
var
  TempFile: String;
  ResultCode: Integer;
  Version: AnsiString;
begin
  Result := '';
  TempFile := ExpandConstant('{tmp}\nodeversion.txt');

  if Exec('cmd', '/c node -v > "' + TempFile + '" 2>&1', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ResultCode = 0 then
    begin
      if LoadStringFromFile(TempFile, Version) then
      begin
        Result := Trim(String(Version));
      end;
    end;
  end;

  DeleteFile(TempFile);
end;

// Check if Node.js is installed
function NodeJsInstalled(): Boolean;
begin
  Result := GetNodeVersion() <> '';
end;

// Get Node.js major version number
function GetNodeMajorVersion(): Integer;
var
  Version: String;
  DotPos: Integer;
begin
  Result := 0;
  Version := GetNodeVersion();

  if Version <> '' then
  begin
    // Remove 'v' prefix if present
    if (Length(Version) > 0) and (Version[1] = 'v') then
      Version := Copy(Version, 2, Length(Version) - 1);

    // Get major version (before first dot)
    DotPos := Pos('.', Version);
    if DotPos > 0 then
      Version := Copy(Version, 1, DotPos - 1);

    Result := StrToIntDef(Version, 0);
  end;
end;

// Initialize setup - check prerequisites
function InitializeSetup(): Boolean;
var
  NodeVersion: String;
  NodeMajor: Integer;
  ResultCode: Integer;
begin
  Result := True;

  NodeVersion := GetNodeVersion();

  if NodeVersion = '' then
  begin
    if MsgBox('Node.js is required but not installed.' + #13#10 + #13#10 +
              'Node.js 18 LTS or higher is required to run RetroWebLauncher.' + #13#10 + #13#10 +
              'Would you like to open the Node.js download page now?' + #13#10 +
              '(After installing Node.js, run this installer again)',
              mbError, MB_YESNO) = IDYES then
    begin
      ShellExec('open', 'https://nodejs.org/', '', '', SW_SHOWNORMAL, ewNoWait, ResultCode);
    end;
    Result := False;
  end
  else
  begin
    NodeMajor := GetNodeMajorVersion();

    if NodeMajor < 18 then
    begin
      if MsgBox('Node.js ' + NodeVersion + ' detected, but version 18 or higher is recommended.' + #13#10 + #13#10 +
                'RetroWebLauncher may not work correctly with older versions.' + #13#10 + #13#10 +
                'Continue anyway?', mbConfirmation, MB_YESNO) = IDNO then
      begin
        ShellExec('open', 'https://nodejs.org/', '', '', SW_SHOWNORMAL, ewNoWait, ResultCode);
        Result := False;
      end;
    end
    else
    begin
      // Node.js OK - show version in log
      Log('Node.js ' + NodeVersion + ' detected (major version ' + IntToStr(NodeMajor) + ')');
    end;
  end;
end;

// Check if npm is available
function NpmInstalled(): Boolean;
var
  ResultCode: Integer;
begin
  Result := Exec('cmd', '/c npm -v', '', SW_HIDE, ewWaitUntilTerminated, ResultCode) and (ResultCode = 0);
end;

// Run npm install with visible output
function RunNpmInstall(): Boolean;
var
  ResultCode: Integer;
  AppPath: String;
begin
  Result := False;
  AppPath := ExpandConstant('{app}');

  // Run npm install in a visible command window so user can see progress
  if Exec('cmd', '/c cd /d "' + AppPath + '" && echo Installing dependencies... && npm install && echo. && echo Installation complete! && timeout /t 3',
          '', SW_SHOWNORMAL, ewWaitUntilTerminated, ResultCode) then
  begin
    Result := (ResultCode = 0);
  end;

  // Verify installation by checking for express
  if Result then
  begin
    Result := DirExists(AppPath + '\node_modules\express');
    if not Result then
    begin
      Log('npm install appeared to succeed but express module not found');
    end;
  end;
end;

// After installation steps
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  AppPath: String;
begin
  if CurStep = ssPostInstall then
  begin
    AppPath := ExpandConstant('{app}');

    // Install npm dependencies
    if not DirExists(AppPath + '\node_modules\express') then
    begin
      NpmInstallSuccess := RunNpmInstall();

      if not NpmInstallSuccess then
      begin
        MsgBox('Warning: npm install may not have completed successfully.' + #13#10 + #13#10 +
               'Please run install.bat manually after setup completes to install dependencies.',
               mbError, MB_OK);
      end;
    end
    else
    begin
      NpmInstallSuccess := True;
      Log('Dependencies already installed, skipping npm install');
    end;

    // Add firewall rule if selected
    if WizardIsTaskSelected('firewallrule') then
    begin
      // First try to delete any existing rule (to avoid duplicates)
      Exec('netsh', 'advfirewall firewall delete rule name="RetroWebLauncher"',
           '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

      // Add new rule
      if Exec('netsh', 'advfirewall firewall add rule name="RetroWebLauncher" dir=in action=allow protocol=TCP localport=3000 profile=private,domain',
              '', SW_HIDE, ewWaitUntilTerminated, ResultCode) then
      begin
        if ResultCode = 0 then
          Log('Firewall rule added successfully')
        else
          Log('Failed to add firewall rule, exit code: ' + IntToStr(ResultCode));
      end;
    end;
  end;
end;

// Cleanup on cancel
procedure CancelButtonClick(CurPageID: Integer; var Cancel, Confirm: Boolean);
begin
  Confirm := True;
end;

// Remove firewall rule on uninstall
procedure CurUninstallStepChanged(CurUninstallStep: TUninstallStep);
var
  ResultCode: Integer;
begin
  if CurUninstallStep = usPostUninstall then
  begin
    // Remove firewall rule
    Exec('netsh', 'advfirewall firewall delete rule name="RetroWebLauncher"',
         '', SW_HIDE, ewWaitUntilTerminated, ResultCode);

    // Remove startup shortcut if it exists
    DeleteFile(ExpandConstant('{userstartup}\RetroWebLauncher.lnk'));
  end;
end;

// Custom messages
function UpdateReadyMemo(Space, NewLine, MemoUserInfoInfo, MemoDirInfo, MemoTypeInfo, MemoComponentsInfo, MemoGroupInfo, MemoTasksInfo: String): String;
var
  S: String;
begin
  S := '';

  if MemoDirInfo <> '' then
    S := S + MemoDirInfo + NewLine + NewLine;

  if MemoGroupInfo <> '' then
    S := S + MemoGroupInfo + NewLine + NewLine;

  if MemoTasksInfo <> '' then
    S := S + MemoTasksInfo + NewLine + NewLine;

  S := S + 'Node.js: ' + GetNodeVersion() + NewLine;
  S := S + NewLine;
  S := S + 'After installation:' + NewLine;
  S := S + Space + '1. npm dependencies will be installed automatically' + NewLine;
  S := S + Space + '2. Run Setup Wizard to configure Retrobat path' + NewLine;
  S := S + Space + '3. Start RetroWebLauncher from Start Menu' + NewLine;

  Result := S;
end;
