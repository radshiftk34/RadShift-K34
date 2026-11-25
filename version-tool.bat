@echo off
chcp 65001 > nul
title RadShift_K34 Git & Version Manager
cd /d "%~dp0"
cls
node "%~dp0scripts\version-manager.mjs" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo 실행이 종료되었습니다.
    pause
)
