@echo off
title RoboCrypto Setup
cd /d "%~dp0\..\.."
echo ==========================================
echo      RoboCrypto Environment Setup
echo ==========================================
echo.
echo [1/4] Installing Root dependencies...
call npm install
if %errorlevel% neq 0 echo Warning: Root npm install failed.

echo.
echo [2/4] Installing Backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 echo Warning: Backend npm install failed.
cd ..

echo.
echo [3/4] Installing Frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 echo Warning: Frontend npm install failed.
cd ..

echo.
echo [4/4] Creating Desktop Shortcut...
set "SHORTCUT_PATH=%userprofile%\Desktop\RoboCrypto Launcher.lnk"
set "TARGET_PATH=%~dp0start.bat"
set "WORKING_DIR=%~dp0"
powershell "$s=(New-Object -COM WScript.Shell).CreateShortcut('%SHORTCUT_PATH%');$s.TargetPath='%TARGET_PATH%';$s.WorkingDirectory='%WORKING_DIR%';$s.Save()"

echo.
echo ==========================================
echo      Setup Complete!
echo ==========================================
echo You can now start the application using the "RoboCrypto Launcher" on your Desktop.
pause
