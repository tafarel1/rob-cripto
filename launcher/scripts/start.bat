@echo off
title RoboCrypto Launcher
cd /d "%~dp0\..\.."

echo ==========================================
echo      RoboCrypto Launcher System
echo ==========================================
echo.

:: Check for PowerShell
where powershell >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] PowerShell is required but not found.
    echo Please install PowerShell or check your system path.
    pause
    exit /b 1
)

:: Execute Bootstrap (Bypass execution policy for this run)
powershell -NoProfile -ExecutionPolicy Bypass -File "launcher\scripts\bootstrap.ps1"

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] O launcher encontrou um erro fatal.
    echo Verifique as mensagens acima.
    pause
)
