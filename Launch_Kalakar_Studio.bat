@echo off
title Kalakar AI Caption & Subtitle Studio
cd /d "%~dp0"
echo ============================================================
echo   Starting Kalakar AI Caption Studio Web Server...
echo ============================================================
echo.
echo Server starting on http://localhost:7860 ...
echo Please keep this window open while using the app!
echo.
set "PY_CMD="

where python >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=python"
    goto :found_python
)

where py >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PY_CMD=py -3"
    goto :found_python
)

if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    set "PY_CMD=%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    goto :found_python
)

if exist "%ProgramFiles%\Python311\python.exe" (
    set "PY_CMD=%ProgramFiles%\Python311\python.exe"
    goto :found_python
)

if exist "C:\Python311\python.exe" (
    set "PY_CMD=C:\Python311\python.exe"
    goto :found_python
)

:found_python
if "%PY_CMD%"=="" (
    echo [ERROR] Python not found! Please install Python 3.11 and add it to PATH.
    pause
    exit /b 1
)

timeout /t 2 /nobreak >nul
start "" "http://localhost:7860"
%PY_CMD% server.py 7860
pause
