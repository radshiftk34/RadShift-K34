@echo off
chcp 65001 > nul
title RadShift_K34 Git and Version Manager
cd /d "%~dp0"
cls
call node "%~dp0scripts\version-manager.mjs" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo 실행 중 오류가 발생했습니다.
)
echo.
pause
