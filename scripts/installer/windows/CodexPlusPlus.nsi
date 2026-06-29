Unicode true
!include "MUI2.nsh"

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!define ROOT "..\..\.."

Name "Codex 泰盈定制版"
OutFile "${ROOT}\dist\windows\CodexPlusTaiying-${VERSION}-windows-x64-setup.exe"
InstallDir "$LOCALAPPDATA\Programs\Codex 泰盈定制版"
InstallDirRegKey HKCU "Software\CodexPlusTaiying" "InstallDir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

!define MUI_ICON "${ROOT}\apps\codex-plus-manager\src-tauri\icons\icon.ico"
!define MUI_UNICON "${ROOT}\apps\codex-plus-manager\src-tauri\icons\icon.ico"
!define MUI_FINISHPAGE_RUN
!define MUI_FINISHPAGE_RUN_TEXT "立即打开 Codex 泰盈定制版"
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

Section "安装主程序" SEC_MAIN
  SectionIn RO
  SetOutPath "$INSTDIR\app"

  nsExec::ExecToLog 'taskkill /IM codex-plus-plus.exe /F'
  Pop $0
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus-manager.exe /F'
  Pop $0

  File "${ROOT}\dist\windows\app\codex-plus-plus.exe"
  File "${ROOT}\dist\windows\app\codex-plus-plus-manager.exe"

  Delete "$INSTDIR\Codex 泰盈定制版管理工具.lnk"
  Delete "$SMPROGRAMS\Codex 泰盈定制版\Codex 泰盈定制版管理工具.lnk"
  CreateShortcut "$INSTDIR\Codex 泰盈定制版管理工具.lnk" "$INSTDIR\app\codex-plus-plus-manager.exe" "" "$INSTDIR\app\codex-plus-plus-manager.exe"
  CreateDirectory "$SMPROGRAMS\Codex 泰盈定制版"
  CreateShortcut "$SMPROGRAMS\Codex 泰盈定制版\Codex 泰盈定制版.lnk" "$INSTDIR\app\codex-plus-plus.exe" "" "$INSTDIR\app\codex-plus-plus.exe"
  CreateShortcut "$SMPROGRAMS\Codex 泰盈定制版\Codex 泰盈定制版管理工具.lnk" "$INSTDIR\app\codex-plus-plus-manager.exe" "" "$INSTDIR\app\codex-plus-plus-manager.exe"
  CreateShortcut "$SMPROGRAMS\Codex 泰盈定制版\卸载 Codex 泰盈定制版.lnk" "$INSTDIR\app\uninstall.exe" "" "$INSTDIR\app\codex-plus-plus-manager.exe"

  WriteUninstaller "$INSTDIR\app\uninstall.exe"
  WriteRegStr HKCU "Software\CodexPlusTaiying" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusTaiying" "DisplayName" "Codex 泰盈定制版"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusTaiying" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusTaiying" "Publisher" "泰盈"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusTaiying" "DisplayIcon" "$INSTDIR\app\codex-plus-plus-manager.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusTaiying" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusTaiying" "UninstallString" "$INSTDIR\app\uninstall.exe"
SectionEnd

Section "创建桌面快捷方式" SEC_DESKTOP_SHORTCUTS
  CreateShortcut "$DESKTOP\Codex 泰盈定制版.lnk" "$INSTDIR\app\codex-plus-plus.exe" "" "$INSTDIR\app\codex-plus-plus.exe"
  CreateShortcut "$DESKTOP\Codex 泰盈定制版管理工具.lnk" "$INSTDIR\app\codex-plus-plus-manager.exe" "" "$INSTDIR\app\codex-plus-plus-manager.exe"
SectionEnd

Function LaunchInstalledApps
  ExecShell "open" "$INSTDIR\app\codex-plus-plus-manager.exe"
  ExecShell "open" "$INSTDIR\app\codex-plus-plus.exe"
FunctionEnd

Section "Uninstall"
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus.exe /F'
  Pop $0
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus-manager.exe /F'
  Pop $0

  Delete "$INSTDIR\Codex 泰盈定制版管理工具.lnk"
  Delete "$DESKTOP\Codex 泰盈定制版.lnk"
  Delete "$DESKTOP\Codex 泰盈定制版管理工具.lnk"
  Delete "$SMPROGRAMS\Codex 泰盈定制版\Codex 泰盈定制版.lnk"
  Delete "$SMPROGRAMS\Codex 泰盈定制版\Codex 泰盈定制版管理工具.lnk"
  Delete "$SMPROGRAMS\Codex 泰盈定制版\卸载 Codex 泰盈定制版.lnk"
  RMDir "$SMPROGRAMS\Codex 泰盈定制版"

  Delete "$INSTDIR\app\codex-plus-plus.exe"
  Delete "$INSTDIR\app\codex-plus-plus-manager.exe"
  Delete "$INSTDIR\app\uninstall.exe"
  RMDir "$INSTDIR\app"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusTaiying"
  DeleteRegKey HKCU "Software\CodexPlusTaiying"
SectionEnd
