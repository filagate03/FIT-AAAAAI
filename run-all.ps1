Param(
    [string]$ClientHost = '0.0.0.0',
    [int]$ClientPort = 4173
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Definition

Write-Host "Working directory: $root"

# проверяем, не занят ли порт превью предыдущим процессом
try {
    $existingConnections = Get-NetTCPConnection -LocalPort $ClientPort -State Listen -ErrorAction Stop
    if ($existingConnections) {
        $pids = $existingConnections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            try {
                Write-Host "Stopping old preview process (PID $pid) that was holding port $ClientPort..."
                Stop-Process -Id $pid -Force -ErrorAction Stop
            } catch {
                Write-Warning ("Could not stop process {0}: {1}" -f $pid, $_)
            }
        }
        Start-Sleep -Seconds 1
    }
} catch {
    # no listener, ignore
}

$serverProcess = Start-Process -FilePath pwsh.exe `
    -ArgumentList "-NoLogo -NoProfile -Command cd `"$root`"; npm run server" `
    -PassThru

Write-Host "Server started in window PID $($serverProcess.Id)"

$clientProcess = Start-Process -FilePath pwsh.exe `
    -ArgumentList "-NoLogo -NoProfile -Command cd `"$root`"; npm run preview -- --host $ClientHost --port $ClientPort --strictPort" `
    -PassThru

Write-Host "Client preview started in window PID $($clientProcess.Id)"

Write-Host "Both processes are running. Close their windows or run 'Stop-Process -Id <PID>' to stop them."
