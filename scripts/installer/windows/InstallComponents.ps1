param(
  [string]$CodexMsixPath,
  [string]$PythonInstallerPath,
  [string]$CodexMsixUrl,
  [string]$PythonInstallerUrl,
  [switch]$OnlineComponents
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Test-Python3 {
  try {
    $version = (& py -3 --version 2>&1)
    if ($LASTEXITCODE -eq 0 -and ("" + $version) -match "^Python 3\.") {
      return $true
    }
  } catch {}
  try {
    $version = (& python --version 2>&1)
    if ($LASTEXITCODE -eq 0 -and ("" + $version) -match "^Python 3\.") {
      return $true
    }
  } catch {}
  return $false
}

function Resolve-ComponentPath {
  param(
    [string]$PreferredPath,
    [string]$FileName,
    [string]$Url,
    [long]$MinimumBytes
  )

  if ($PreferredPath -and (Test-Path -LiteralPath $PreferredPath)) {
    return $PreferredPath
  }

  if ($PreferredPath) {
    $requiredFilesDir = Split-Path $PreferredPath -Parent
    $packageRoot = Split-Path $requiredFilesDir -Parent
    if ($packageRoot) {
      $rootCandidate = Join-Path $packageRoot $FileName
      if (Test-Path -LiteralPath $rootCandidate) {
        return $rootCandidate
      }
    }
  }

  if (-not $OnlineComponents -or [string]::IsNullOrWhiteSpace($Url)) {
    return ""
  }

  $downloadDir = Join-Path $env:TEMP "CodexPlusComponents"
  New-Item -ItemType Directory -Force $downloadDir | Out-Null
  $out = Join-Path $downloadDir $FileName
  Invoke-WebRequest -Uri $Url -OutFile $out -UseBasicParsing
  if ((Get-Item -LiteralPath $out).Length -lt $MinimumBytes) {
    throw "$FileName is unexpectedly small"
  }
  return $out
}

$jobs = @()
$warnings = New-Object System.Collections.Generic.List[string]

if (-not (Get-AppxPackage -Name "OpenAI.Codex" -ErrorAction SilentlyContinue)) {
  $msix = Resolve-ComponentPath `
    -PreferredPath $CodexMsixPath `
    -FileName "CodexOfficialApp-x64.msix" `
    -Url $CodexMsixUrl `
    -MinimumBytes 100MB
  if ([string]::IsNullOrWhiteSpace($msix)) {
    $warnings.Add("Codex app package was not found.")
  } else {
    $jobs += Start-Job -Name "CodexApp" -ScriptBlock {
      param([string]$PackagePath)
      $ErrorActionPreference = "Stop"
      try {
        Add-AppxPackage -Path $PackagePath -ForceApplicationShutdown
      } catch {
        $existing = Get-AppxPackage -Name "OpenAI.Codex" -ErrorAction SilentlyContinue
        if (-not $existing) {
          throw
        }
      }
    } -ArgumentList $msix
  }
}

if (-not (Test-Python3)) {
  $pythonInstaller = Resolve-ComponentPath `
    -PreferredPath $PythonInstallerPath `
    -FileName "python-3.13.14-amd64.exe" `
    -Url $PythonInstallerUrl `
    -MinimumBytes 20MB
  if ([string]::IsNullOrWhiteSpace($pythonInstaller)) {
    $warnings.Add("Python installer was not found.")
  } else {
    $jobs += Start-Job -Name "Python" -ScriptBlock {
      param([string]$InstallerPath)
      $ErrorActionPreference = "Stop"
      $args = @(
        "/quiet",
        "InstallAllUsers=0",
        "PrependPath=1",
        "Include_launcher=1",
        "Include_pip=1",
        "Include_test=0",
        "Shortcuts=0",
        "SimpleInstall=1"
      )
      $process = Start-Process -FilePath $InstallerPath -ArgumentList $args -Wait -PassThru
      if ($process.ExitCode -ne 0 -and $process.ExitCode -ne 3010) {
        throw "Python installer exited with code $($process.ExitCode)."
      }
    } -ArgumentList $pythonInstaller
  }
}

$failures = New-Object System.Collections.Generic.List[string]
foreach ($job in $jobs) {
  Wait-Job $job | Out-Null
  try {
    Receive-Job $job -ErrorAction Stop | Out-String | Write-Host
  } catch {
    $failures.Add("$($job.Name): $($_.Exception.Message)")
  } finally {
    Remove-Job $job -Force -ErrorAction SilentlyContinue
  }
}

foreach ($warning in $warnings) {
  Write-Warning $warning
}

if ($failures.Count -gt 0) {
  foreach ($failure in $failures) {
    Write-Error $failure
  }
  exit 1
}

if ($warnings.Count -gt 0) {
  exit 2
}

exit 0
