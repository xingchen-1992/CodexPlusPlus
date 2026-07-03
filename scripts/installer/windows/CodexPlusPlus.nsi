Unicode true
!include "MUI2.nsh"

!ifndef VERSION
  !define VERSION "0.0.0"
!endif
!define ROOT "..\..\.."
!define CODEX_MSIX_FILENAME "CodexOfficialApp-x64.msix"
!define CODEX_MSIX_DIR "RequiredFiles"
!define CODEX_MSIX_URL "https://codexapp.agentsmirror.com/latest/win-x64"
!define NODE_RUNTIME_FILENAME "node-v24.18.0-win-x64.zip"
!define NODE_RUNTIME_DIR "RequiredFiles"
!define NODE_RUNTIME_URL "https://nodejs.org/dist/v24.18.0/node-v24.18.0-win-x64.zip"
!define PYTHON_INSTALLER_FILENAME "python-3.13.14-amd64.exe"
!define PYTHON_INSTALLER_DIR "RequiredFiles"
!define PYTHON_INSTALLER_URL "https://www.python.org/ftp/python/3.13.14/python-3.13.14-amd64.exe"

!ifdef UPDATE_ONLY
Name "Codex官方管理工具更新器"
OutFile "${ROOT}\dist\windows\CodexPlusOfficial-${VERSION}-windows-x64-updater.exe"
!else
!ifdef ONLINE_COMPONENTS
Name "Codex官方管理工具在线安装器"
OutFile "${ROOT}\dist\windows\CodexPlusOfficial-${VERSION}-windows-x64-online.exe"
!else
Name "Codex官方管理工具"
OutFile "${ROOT}\dist\windows\CodexPlusOfficial-${VERSION}-windows-x64-setup.exe"
!endif
!endif
InstallDir "$LOCALAPPDATA\Programs\Codex官方管理工具"
InstallDirRegKey HKCU "Software\CodexOfficialManager" "InstallDir"
RequestExecutionLevel user
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

  DetailPrint "Closing running Codex manager processes..."
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus-manager.exe /F'
  Pop $0
  nsExec::ExecToLog 'taskkill /IM codex-plus-plus.exe /F'
  Pop $0
  !insertmacro RemoveLegacyVisibleEntries

  File "${ROOT}\dist\windows\app\codex-plus-plus.exe"
  File "${ROOT}\dist\windows\app\codex-plus-plus-manager.exe"
  SetOutPath "$INSTDIR\app\resources\official-proxy"
  File /nonfatal /r "${ROOT}\dist\windows\app\resources\official-proxy\*.*"
  SetOutPath "$INSTDIR\app\resources\node"
  File /nonfatal /r "${ROOT}\dist\windows\app\resources\node\*.*"
  SetOutPath "$INSTDIR\app"
  SetOutPath "$INSTDIR\app\Codex"
  File /nonfatal /r "${ROOT}\dist\windows\app\Codex\*.*"
  SetOutPath "$INSTDIR\app"

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

!ifndef UPDATE_ONLY
Section "安装 Node 运行时" SEC_NODE
  IfFileExists "$INSTDIR\app\resources\node\node.exe" node_done 0
  StrCpy $0 "$EXEDIR\${NODE_RUNTIME_DIR}\${NODE_RUNTIME_FILENAME}"
  IfFileExists "$0" node_zip_found 0
!ifdef ONLINE_COMPONENTS
  StrCpy $0 "$TEMP\CodexPlusComponents\${NODE_RUNTIME_FILENAME}"
  DetailPrint "Downloading Node runtime..."
  nsExec::ExecToLog `powershell -NoProfile -ExecutionPolicy Bypass -Command "$$ErrorActionPreference='Stop'; $$ProgressPreference='SilentlyContinue'; $$out='$0'; New-Item -ItemType Directory -Force (Split-Path $$out) | Out-Null; Invoke-WebRequest -Uri '${NODE_RUNTIME_URL}' -OutFile $$out -UseBasicParsing; if ((Get-Item $$out).Length -lt 20MB) { throw 'Node runtime is unexpectedly small' }; exit 0"`
  Pop $1
  StrCmp $1 "0" node_zip_found 0
  MessageBox MB_ICONEXCLAMATION "Node 运行时下载失败。管理工具仍可使用；需要托管 Skills 时请重新运行在线安装器或使用完整离线包。"
  Goto node_done
!else
  MessageBox MB_ICONEXCLAMATION "未找到 Node 运行时。请重新下载完整离线包后再运行。"
  Goto node_done
!endif

  node_zip_found:
  DetailPrint "Installing Node runtime..."
  nsExec::ExecToLog `powershell -NoProfile -ExecutionPolicy Bypass -Command "$$ErrorActionPreference='Stop'; $$zip='$0'; $$dest='$INSTDIR\app\resources\node'; $$parent=Split-Path $$dest -Parent; New-Item -ItemType Directory -Force $$parent | Out-Null; $$extract=Join-Path $$parent ('node-extract-' + [Guid]::NewGuid().ToString('N')); New-Item -ItemType Directory -Force $$extract | Out-Null; try { $$tar=Join-Path $$env:WINDIR 'System32\tar.exe'; if (Test-Path $$tar) { & $$tar -xf $$zip -C $$extract; if ($$LASTEXITCODE -ne 0) { throw 'tar failed' } } else { Expand-Archive -Force -LiteralPath $$zip -DestinationPath $$extract }; $$source=Get-ChildItem -LiteralPath $$extract -Directory | Where-Object { $$_.Name -like 'node-v*-win-x64' } | Select-Object -First 1; if (-not $$source) { throw 'node root not found' }; if (Test-Path $$dest) { Remove-Item $$dest -Recurse -Force }; Move-Item -LiteralPath $$source.FullName -Destination $$dest -Force; if (-not (Test-Path (Join-Path $$dest 'node.exe'))) { throw 'node.exe missing' }; exit 0 } finally { if (Test-Path $$extract) { Remove-Item $$extract -Recurse -Force -ErrorAction SilentlyContinue } }"`
  Pop $1
  StrCmp $1 "0" node_done 0
  MessageBox MB_ICONEXCLAMATION "Node 运行时安装失败。管理工具仍可使用；需要托管 Skills 时请重新运行在线安装器或使用完整离线包。"

  node_done:
SectionEnd

Section "并行安装 Codex 应用和 Python" SEC_RUNTIME_COMPONENTS
  InitPluginsDir
  File /oname=$PLUGINSDIR\InstallComponents.ps1 "${ROOT}\scripts\installer\windows\InstallComponents.ps1"
  DetailPrint "Installing Codex app and Python in parallel..."
!ifdef ONLINE_COMPONENTS
  nsExec::ExecToLog `powershell -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\InstallComponents.ps1" -CodexMsixPath "$EXEDIR\${CODEX_MSIX_DIR}\${CODEX_MSIX_FILENAME}" -PythonInstallerPath "$EXEDIR\${PYTHON_INSTALLER_DIR}\${PYTHON_INSTALLER_FILENAME}" -CodexMsixUrl "${CODEX_MSIX_URL}" -PythonInstallerUrl "${PYTHON_INSTALLER_URL}" -OnlineComponents`
!else
  nsExec::ExecToLog `powershell -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\InstallComponents.ps1" -CodexMsixPath "$EXEDIR\${CODEX_MSIX_DIR}\${CODEX_MSIX_FILENAME}" -PythonInstallerPath "$EXEDIR\${PYTHON_INSTALLER_DIR}\${PYTHON_INSTALLER_FILENAME}"`
!endif
  Pop $1
  StrCmp $1 "0" components_done 0
  MessageBox MB_ICONEXCLAMATION "Codex 应用或 Python 未完全安装成功。管理工具仍可使用；如需完整环境，请重新运行完整离线包或在线安装器。"

  components_done:
SectionEnd
!endif

Section "创建桌面快捷方式" SEC_DESKTOP_SHORTCUTS
  CreateShortcut "$DESKTOP\Codex官方管理工具.lnk" "$INSTDIR\app\codex-plus-plus-manager.exe" "" "$INSTDIR\app\codex-plus-plus-manager.exe"
SectionEnd

Section "-首次运行准备"
  DetailPrint "Preparing Codex managed Skills and plugin marketplace..."
  nsExec::ExecToLog '"$INSTDIR\app\codex-plus-plus-manager.exe" --postinstall-prewarm'
  Pop $0
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
  RMDir /r "$INSTDIR\app\Codex"
  RMDir /r "$INSTDIR\app\resources"
  RMDir "$INSTDIR\app"
  RMDir "$INSTDIR"

  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\CodexOfficialManager"
  DeleteRegKey HKCU "Software\CodexOfficialManager"
SectionEnd
