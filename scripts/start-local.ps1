# RadShift_K34 로컬 개발 서비스 시작 스크립트
# - 포트 5173을 점유 중인 기존 서비스 종료
# - 백그라운드 브라우저 자동 실행 예약
# - Vite 개발 서버 시작 (HMR 및 콘솔 로그 출력)

$port = 5173
$targetUrl = "http://localhost:$port/RadShift-K34/"

Write-Host "`n==========================================================" -ForegroundColor Cyan
Write-Host "  🚀 RadShift_K34 로컬 개발 서비스 시작" -ForegroundColor Cyan
Write-Host "  - 대상 URL: $targetUrl" -ForegroundColor DarkGray
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. 포트 점유 프로세스 확인 및 종료
Write-Host "`n[1/3] 포트 $port 점유 프로세스 확인 중..." -ForegroundColor Yellow

$killed = $false
try {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if ($connections) {
        $pidsToKill = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($procId in $pidsToKill) {
            $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($p) {
                Write-Host "  -> 기존 실행 중인 프로세스 감지 (PID: $procId, 프로세스명: $($p.ProcessName))" -ForegroundColor Red
                Write-Host "  -> 안전하게 종료합니다..." -ForegroundColor Red
                Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
                $killed = $true
            }
        }
    }
} catch {
    # NetTCPConnection 실패 시 netstat 대안 검색
    $netstatOut = netstat -ano | Select-String ":$port\s+.*LISTENING"
    if ($netstatOut) {
        foreach ($line in $netstatOut) {
            $parts = ($line.ToString().Trim() -split "\s+")
            $procId = $parts[-1]
            if ($procId -match "^\d+$") {
                Write-Host "  -> netstat 감지 PID: $procId 종료 중..." -ForegroundColor Red
                Stop-Process -Id [int]$procId -Force -ErrorAction SilentlyContinue
                $killed = $true
            }
        }
    }
}

if ($killed) {
    Start-Sleep -Milliseconds 1200
    Write-Host "  -> 기존 서비스가 성공적으로 종료되었습니다." -ForegroundColor Green
} else {
    Write-Host "  -> 실행 중인 기존 서비스가 없습니다. 포트 $port 사용 가능." -ForegroundColor Green
}

# 2. 브라우저 자동 실행 예약 (2.5초 후 대기열에서 브라우저 열기)
Write-Host "`n[2/3] 서비스 시작 후 브라우저 자동 오픈 예약 ($targetUrl)..." -ForegroundColor Yellow
Start-Job -ScriptBlock {
    param($url)
    Start-Sleep -Milliseconds 2200
    Start-Process $url
} -ArgumentList $targetUrl | Out-Null

# 3. Vite 개발 서버 실행
Write-Host "`n[3/3] Vite 개발 서버를 구동합니다..." -ForegroundColor Green
Write-Host "  * 브라우저가 잠시 후 자동으로 열립니다." -ForegroundColor Cyan
Write-Host "  * 종료하려면 콘솔 창에서 [Ctrl + C]를 누르세요.`n" -ForegroundColor DarkGray
Write-Host "----------------------------------------------------------" -ForegroundColor DarkGray

npm run dev
