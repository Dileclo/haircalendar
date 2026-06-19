# Auto-deploy script — pull latest changes, rebuild, restart
$ErrorActionPreference = "Stop"
Write-Host "=== Hail Deploy ===" -ForegroundColor Cyan

# Kill existing server
$pids = (Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue).OwningProcess | Select-Object -Unique
foreach ($pid in $pids) {
    if ($pid -gt 0) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "Killed PID $pid on port 3000"
    }
}

# Pull latest
Write-Host "Pulling latest changes..." -ForegroundColor Yellow
git pull origin master

# Build
Write-Host "Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "BUILD FAILED!" -ForegroundColor Red
    exit 1
}

# Start server
Write-Host "Starting server..." -ForegroundColor Green
Start-Process -NoNewWindow -FilePath "npx" -ArgumentList "next start -p 3000 -H 0.0.0.0"
Write-Host "=== Deploy complete ===" -ForegroundColor Cyan
Write-Host "Server: http://localhost:3000"
