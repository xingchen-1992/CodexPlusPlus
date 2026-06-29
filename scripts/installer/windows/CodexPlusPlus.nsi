Unicode true
!include "MUI2.nsh"

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!define ROOT "..\..\.."

Name "Codex++ 雷神版"
OutFile "${ROOT}\dist\windows\CodexPlusLeishen-${VERSION}-windows-x64-setup.exe"
InstallDir "$LOCALAPPDATA\Programs\Codex++ 雷神版"
InstallDirRegKey HKCU "Software\CodexPlusLeishen" "InstallDir"
RequestExecutionLevel admin
SetCompressor /SOLID lzma

!define MUI_ICON "${ROOT}\apps\codex-plus-manager\src-tauri\icons\icon.ico"
!define MUI_UNICON "${ROOT}\apps\codex-plus-manager\src-tauri\icons\icon.ico"

!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "SimpChinese"
!insertmacro MUI_LANGUAGE "English"

Section "Install"
  SetOutPath "$INSTDIR"

  nsExec::ExecToLog 'taskkill /IM codex-plus-plus.exe /F'
  Pop $0
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus-manager.exe /F'
  Pop $0

  File "${ROOT}\dist\windows\app\codex-plus-plus.exe"
  File "${ROOT}\dist\windows\app\codex-plus-plus-manager.exe"

  Delete "$SMPROGRAMS\Codex++ 雷神版\Codex++ 雷神版管理工具.lnk"

  CreateShortcut "$DESKTOP\Codex++ 雷神版.lnk" "$INSTDIR\codex-plus-plus.exe" "" "$INSTDIR\codex-plus-plus.exe"
  CreateShortcut "$DESKTOP\Codex++ 雷神版管理工具.lnk" "$INSTDIR\codex-plus-plus-manager.exe" "" "$INSTDIR\codex-plus-plus-manager.exe"
  CreateDirectory "$SMPROGRAMS\Codex++ 雷神版"
  CreateShortcut "$SMPROGRAMS\Codex++ 雷神版\Codex++ 雷神版.lnk" "$INSTDIR\codex-plus-plus.exe" "" "$INSTDIR\codex-plus-plus.exe"
  CreateShortcut "$SMPROGRAMS\Codex++ 雷神版\Codex++ 雷神版管理工具.lnk" "$INSTDIR\codex-plus-plus-manager.exe" "" "$INSTDIR\codex-plus-plus-manager.exe"
  CreateShortcut "$SMPROGRAMS\Codex++ 雷神版\卸载 Codex++ 雷神版.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\codex-plus-plus-manager.exe"

  WriteUninstaller "$INSTDIR\uninstall.exe"
  WriteRegStr HKCU "Software\CodexPlusLeishen" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusLeishen" "DisplayName" "Codex++ 雷神版"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusLeishen" "DisplayVersion" "${VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusLeishen" "Publisher" "雷神启航"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusLeishen" "DisplayIcon" "$INSTDIR\codex-plus-plus-manager.exe"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusLeishen" "InstallLocation" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusLeishen" "UninstallString" "$INSTDIR\uninstall.exe"
SectionEnd

Section "Uninstall"
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus.exe /F'
  Pop $0
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus-manager.exe /F'
  Pop $0

  Delete "$DESKTOP\Codex++ 雷神版.lnk"
  Delete "$DESKTOP\Codex++ 雷神版管理工具.lnk"
  Delete "$SMPROGRAMS\Codex++ 雷神版\Codex++ 雷神版.lnk"
  Delete "$SMPROGRAMS\Codex++ 雷神版\Codex++ 雷神版管理工具.lnk"
  Delete "$SMPROGRAMS\Codex++ 雷神版\卸载 Codex++ 雷神版.lnk"
  RMDir "$SMPROGRAMS\Codex++ 雷神版"

  Delete "$INSTDIR\codex-plus-plus.exe"
  Delete "$INSTDIR\codex-plus-plus-manager.exe"
  Delete "$INSTDIR\uninstall.exe"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexPlusLeishen"
  DeleteRegKey HKCU "Software\CodexPlusLeishen"
SectionEnd
