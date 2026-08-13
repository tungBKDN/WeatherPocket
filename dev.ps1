# WeatherPocket dev launcher (no Docker)
# Mo 2 cua so: backend (uvicorn :8001) va frontend (vite :5173).

$ErrorActionPreference = "Stop"

$root     = $PSScriptRoot
$backend  = Join-Path $root "backend"
$frontend = Join-Path $root "frontend\frontend"
$venvAct  = Join-Path $backend ".venv\Scripts\Activate.ps1"

function Assert-Path($p, $msg) {
    if (-not (Test-Path $p)) { Write-Host $msg -ForegroundColor Red; exit 1 }
}

Assert-Path $backend  "Khong thay thu muc backend: $backend"
Assert-Path $frontend "Khong thay thu muc frontend: $frontend"
Assert-Path $venvAct  "Khong thay venv activate: $venvAct  (chay: py -m venv backend/.venv)"

# Viet 2 script tam de Start-Process chay bang -File (tranh loi quote/backtick).
$tmp = $env:TEMP
$beScript = Join-Path $tmp "wp_backend.ps1"
$feScript = Join-Path $tmp "wp_frontend.ps1"

$beBody = @"
Set-Location '$backend'
& '$venvAct'
Write-Host ''
Write-Host '[BACKEND] uvicorn main:app --reload --port 8001' -ForegroundColor Green
uvicorn main:app --reload --port 8001
Write-Host ''
Write-Host '[BACKEND] da dung. Nhan Enter de dong cua so.' -ForegroundColor Yellow
`$null = Read-Host
"@

$feBody = @"
Set-Location '$frontend'
`$env:API_URL = 'http://localhost:8001'
Write-Host '[FRONTEND] npm run dev (vite :5173) -> proxy sang backend :8001' -ForegroundColor Green
npm run dev
Write-Host ''
Write-Host '[FRONTEND] da dung. Nhan Enter de dong cua so.' -ForegroundColor Yellow
`$null = Read-Host
"@

Set-Content -Path $beScript -Value $beBody -Encoding UTF8
Set-Content -Path $feScript -Value $feBody -Encoding UTF8

Write-Host "=> Khoi dong BACKEND (uvicorn :8001)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-File","`"$beScript`""

Write-Host "=> Khoi dong FRONTEND (vite :5174)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit","-File","`"$feScript`""

Write-Host ""
Write-Host "Da mo 2 cua so:" -ForegroundColor Green
Write-Host "  Backend  -> http://localhost:8001"
Write-Host "  Frontend -> http://localhost:5174 (proxy -> backend :8001)"
Write-Host ""
Write-Host "Ghi chu: can co MongoDB o 27017 (local hoac Atlas). Qdrant da la cloud."
Write-Host "Dong 2 cua so do la tat app. Script nay khong can giu."