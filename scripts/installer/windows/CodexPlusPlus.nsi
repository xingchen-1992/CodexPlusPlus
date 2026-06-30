Unicode true
!include "MUI2.nsh"

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!define ROOT "..\..\.."

Name "Codex官方管理工具"
OutFile "${ROOT}\dist\windows\CodexPlusOfficial-${VERSION}-windows-x64-setup.exe"
InstallDir "$LOCALAPPDATA\Programs\Codex官方管理工具"
InstallDirRegKey HKCU "Software\CodexOfficialManager" "InstallDir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

!define MUI_ICON "${ROOT}\apps\codex-plus-manager\src-tauri\icons\icon.ico"
!define MUI_UNICON "${ROOT}\apps\codex-plus-manager\src-tauri\icons\icon.ico"
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "立即打开 Codex官方管理工具"
!define MUI_FINISHPAGE_RUN_FUNCTION LaunchInstalledApps

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_COMPONENTS
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

!macro RemoveLegacyVisibleEntries
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -Command "$$ErrorActionPreference=''SilentlyContinue''; $$shortcutPatterns=@(''Codex*版.lnk'',''Codex*管理工具.lnk''); foreach($$dir in @([Environment]::GetFolderPath(''Desktop''),[Environment]::GetFolderPath(''CommonDesktopDirectory''))){ if($$dir -and (Test-Path -LiteralPath $$dir)){ foreach($$pattern in $$shortcutPatterns){ Get-ChildItem -LiteralPath $$dir -Filter $$pattern -Force | Remove-Item -Force } } }; $$dirPatterns=@(''Codex*版'',''Codex*管理工具''); foreach($$base in @((Join-Path ([Environment]::GetFolderPath(''StartMenu'')) ''Programs''),(Join-Path ([Environment]::GetFolderPath(''CommonStartMenu'')) ''Programs''),(Join-Path $$env:LOCALAPPDATA ''Programs''))){ if($$base -and (Test-Path -LiteralPath $$base)){ foreach($$pattern in $$dirPatterns){ Get-ChildItem -LiteralPath $$base -Directory -Filter $$pattern -Force | Remove-Item -Recurse -Force } } }; $$uninstall=''HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall''; if(Test-Path $$uninstall){ Get-ChildItem $$uninstall | Where-Object { $$_.PSChildName -like ''CodexPlus*'' -or (Get-ItemProperty $$_.PSPath).DisplayName -like ''Codex*版'' -or (Get-ItemProperty $$_.PSPath).DisplayName -like ''Codex*管理工具'' } | Remove-Item -Recurse -Force }; $$software=''HKCU:\Software''; if(Test-Path $$software){ Get-ChildItem $$software | Where-Object { $$_.PSChildName -like ''CodexPlus*'' } | Remove-Item -Recurse -Force }"'
  Pop $0
!macroend

Section "安装主程序" SEC_MAIN
  SectionIn RO
  SetOutPath "$INSTDIR\app"

  nsExec::ExecToLog 'taskkill /IM codex-plus-plus.exe /F'
  Pop $0
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus-manager.exe /F'
  Pop $0
  !insertmacro RemoveLegacyVisibleEntries

  File "${ROOT}\dist\windows\app\codex-plus-plus.exe"
  File "${ROOT}\dist\windows\app\codex-plus-plus-manager.exe"

  Delete "$INSTDIR\Codex官方管理工具.lnk"
  Delete "$SMPROGRAMS\Codex官方管理工具\Codex官方管理工具.lnk"
  CreateShortcut "$INSTDIR\Codex官方管理工具.lnk" "$INSTDIR\app\codex-plus-plus-manager.exe" "" "$INSTDIR\app\codex-plus-plus-manager.exe"
  CreateDirectory "$SMPROGRAMS\Codex官方管理工具"
  CreateShortcut "$SMPROGRAMS\Codex官方管理工具\Codex官方管理工具.lnk" "$INSTDIR\app\codex-plus-plus-manager.exe" "" "$INSTDIR\app\codex-plus-plus-manager.exe"
  CreateShortcut "$SMPROGRAMS\Codex官方管理工具\卸载 Codex官方管理工具.lnk" "$INSTDIR\app\uninstall.exe" "" "$INSTDIR\app\codex-plus-plus-manager.exe"

  WriteUninstaller "$INSTDIR\app\uninstall.exe"
  WriteRegStr HKCU "Software\CodexOfficialManager" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexOfficialManager" "DisplayName" "Codex官方管理工具"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexOfficialManager" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexOfficialManager" "Publisher" "官方"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexOfficialManager" "DisplayIcon" "$INSTDIR\app\codex-plus-plus-manager.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexOfficialManager" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexOfficialManager" "UninstallString" "$INSTDIR\app\uninstall.exe"
SectionEnd

Section "创建桌面快捷方式" SEC_DESKTOP_SHORTCUTS
  CreateShortcut "$DESKTOP\Codex官方管理工具.lnk" "$INSTDIR\app\codex-plus-plus-manager.exe" "" "$INSTDIR\app\codex-plus-plus-manager.exe"
SectionEnd

Function LaunchInstalledApps
  ExecShell "open" "$INSTDIR\app\codex-plus-plus-manager.exe"
FunctionEnd

Section "Uninstall"
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus.exe /F'
  Pop $0
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus-manager.exe /F'
  Pop $0
  !insertmacro RemoveLegacyVisibleEntries

  Delete "$INSTDIR\Codex官方管理工具.lnk"
  Delete "$DESKTOP\Codex官方管理工具.lnk"
  Delete "$SMPROGRAMS\Codex官方管理工具\Codex官方管理工具.lnk"
  Delete "$SMPROGRAMS\Codex官方管理工具\卸载 Codex官方管理工具.lnk"
  RMDir "$SMPROGRAMS\Codex官方管理工具"

  Delete "$INSTDIR\app\codex-plus-plus.exe"
  Delete "$INSTDIR\app\codex-plus-plus-manager.exe"
  Delete "$INSTDIR\app\uninstall.exe"
  RMDir "$INSTDIR\app"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexOfficialManager"
  DeleteRegKey HKCU "Software\CodexOfficialManager"
SectionEnd
