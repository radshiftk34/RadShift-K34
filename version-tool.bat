@echo off
chcp 65001 > nul
title RadShift_K34 Git & Version Manager
cls
node "%~dp0scripts\version-manager.mjs" %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo 실행 중 종료되었거나 오류가 발생했습니다.
    pause
)
