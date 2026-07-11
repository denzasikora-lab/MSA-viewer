@echo off
setlocal EnableDelayedExpansion
REM Quick start script for MSA Viewer with BLAST
cd /d "%~dp0"
set "SILENT=0"
if /i "%~1"=="silent" set "SILENT=1"

if "%SILENT%"=="0" echo Checking Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
    if exist "%USERPROFILE%\miniconda3\node.exe" (
        set "PATH=%USERPROFILE%\miniconda3;%USERPROFILE%\miniconda3\Library\bin;%PATH%"
        if "%SILENT%"=="0" echo Found Node.js in miniconda3, added to PATH
    )
)
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    if "%SILENT%"=="0" pause
    exit /b 1
)

if "%SILENT%"=="0" (
    echo Node.js found:
    node --version
    echo.
)

REM If port 3000 is taken, restart only when it is a stale server from another folder
set "NEED_START=1"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING"') do set "OLD_PID=%%a"
if defined OLD_PID (
    set "MATCH=diff"
    for /f "delims=" %%m in ('powershell -NoProfile -Command "try { $i = (Invoke-WebRequest -Uri 'http://127.0.0.1:3000/api/viewer-info' -UseBasicParsing -TimeoutSec 3).Content | ConvertFrom-Json; if ((Resolve-Path $i.root -ErrorAction Stop).Path -ieq (Resolve-Path '%CD%' -ErrorAction Stop).Path) { 'same' } else { 'diff' } } catch { 'diff' }"') do set "MATCH=%%m"
    if "!MATCH!"=="same" (
        if "%SILENT%"=="0" (
            echo Server already running from this folder on port 3000.
            echo   URL : http://localhost:3000
            echo   Stop: run stop-server.bat
        )
        set "NEED_START=0"
    ) else (
        if "%SILENT%"=="0" echo Stale server on port 3000 - restarting from this folder...
        call "%~dp0stop-server.bat"
    )
)

if "%NEED_START%"=="0" exit /b 0

if "%SILENT%"=="0" (
    echo.
    echo Installing Node.js dependencies...
)
call npm install --silent >nul 2>&1

if "%SILENT%"=="0" (
    echo.
    echo Starting MSA Viewer Server in background window...
)
start "MSA Viewer Server" /min cmd /k "cd /d "%~dp0" && node server.js"

if "%SILENT%"=="0" (
    echo.
    echo Server started. It runs in its own window independent of this terminal.
    echo   URL : http://localhost:3000
    echo   Stop: run stop-server.bat (or close the MSA Viewer Server window)
    echo   Auto-start at login: run install-autostart.bat
    echo.
)
