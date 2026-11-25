@echo off
chcp 65001 > nul
title RadShift_K34 Local Dev Server
cls
echo ==========================================================
echo   RadShift_K34 로컬 서비스 런처
echo ==========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo 서비스 실행 중 오류가 발생했습니다.
    pause
)
