@echo off
title BoneGuard Launcher
color 0A

echo ============================================================
echo   BoneGuard - Clinical Bone Metastasis Detection
echo ============================================================
echo.
echo Starting backend server (port 3001)...
start "BoneGuard Backend" cmd /k "cd /d %~dp0backend && npm run dev"

timeout /t 3 /nobreak >nul

echo Starting frontend server (port 3000)...
start "BoneGuard Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo.
echo ============================================================
echo   Both servers are starting up.
echo   Open your browser at: http://localhost:3000
echo ============================================================
echo.
echo Press any key to open the browser automatically...
pause >nul

start "" "http://localhost:3000"
