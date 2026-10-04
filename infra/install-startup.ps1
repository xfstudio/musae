$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node.exe).Source
$startPath = Join-Path $PSScriptRoot 'start-production.mjs'
$dockerDesktopPath = Join-Path $env:ProgramFiles 'Docker\Docker\Docker Desktop.exe'
$launcherPath = Join-Path $projectRoot 'artifacts\start-production.ps1'
$startupFolder = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startupFolder 'Musae Production.lnk'

# Start at this user's Windows sign-in, without opening a console window.
# startOrRestart also picks up the current .env when the deployment is updated.
$launcher = @"
`$ErrorActionPreference = 'Continue'
Set-Location -LiteralPath '$($projectRoot.Replace("'", "''"))'
& docker info --format '{{.ServerVersion}}' *> `$null
if (`$LASTEXITCODE -ne 0 -and (Test-Path -LiteralPath '$($dockerDesktopPath.Replace("'", "''"))')) {
  Start-Process -FilePath '$($dockerDesktopPath.Replace("'", "''"))' -WindowStyle Hidden
}
for (`$attempt = 0; `$attempt -lt 24; `$attempt++) {
  & '$($nodePath.Replace("'", "''"))' '$($startPath.Replace("'", "''"))'
  if (`$LASTEXITCODE -eq 0) { exit 0 }
  Start-Sleep -Seconds 5
}
exit 1
"@
Set-Content -LiteralPath $launcherPath -Value $launcher -Encoding UTF8
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
$shortcut.Arguments = '-NoProfile -NonInteractive -WindowStyle Hidden -ExecutionPolicy Bypass -File "' + $launcherPath + '"'
$shortcut.WorkingDirectory = $projectRoot
$shortcut.WindowStyle = 7
$shortcut.Description = 'Start the Musae production API, web app and browser worker'
$shortcut.Save()
Write-Output "Musae production startup installed: $shortcutPath"
