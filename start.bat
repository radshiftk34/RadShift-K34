@echo off
chcp 65001 > nul
title RadShift_K34 Local Dev Server
cd /d "%~dp0"
cls
echo ==========================================================
echo   RadShift_K34 로컬 서비스 시작
echo ==========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-local.ps1"
if %ERRORLEVEL% neq 0 (
    echo.
    echo 서비스가 종료되었습니다.
    pause
)
