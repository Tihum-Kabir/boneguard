@echo off
title BoneGuard Setup
color 0B

echo ============================================================
echo   BoneGuard - First Time Setup
echo ============================================================
echo.

echo [1/2] Installing backend dependencies...
cd /d %~dp0backend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Backend install failed. Is Node.js installed?
    echo Download from https://nodejs.org
    pause
    exit /b 1
)

echo.
echo [2/2] Installing frontend dependencies...
cd /d %~dp0frontend
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Frontend install failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Setup complete!
echo   Now double-click start.bat to run the app.
echo ============================================================
echo.
pause
