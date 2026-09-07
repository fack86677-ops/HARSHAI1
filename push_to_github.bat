@echo off
title Push Harsh Caption Generator to GitHub
cls
echo ========================================================
echo  Harsh Caption Generator - GitHub Push Utility
echo ========================================================
echo.
echo Repo Target: https://github.com/fack86677-ops/HARSHAI1.git
echo.
set "GIT_CMD=git"
where git >nul 2>&1
if %ERRORLEVEL% neq 0 (
    if exist "%LOCALAPPDATA%\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd\git.exe" (
        set "GIT_CMD=%LOCALAPPDATA%\Microsoft\WinGet\Packages\Git.MinGit_Microsoft.Winget.Source_8wekyb3d8bbwe\cmd\git.exe"
    ) else if exist "%ProgramFiles%\Git\cmd\git.exe" (
        set "GIT_CMD=%ProgramFiles%\Git\cmd\git.exe"
    )
)

set /p TOKEN="Apna GitHub Personal Access Token (PAT) yahan enter karein: "

if "%TOKEN%"=="" (
    echo [ERROR] Token enter nahi kiya gaya!
    pause
    exit /b
)

echo.
echo [1/3] Staging and Committing all files...
"%GIT_CMD%" add -A
"%GIT_CMD%" commit -m "Harsh Caption Generator - Full Stack Update" 2>nul

echo [2/3] Setting remote with authentication...
"%GIT_CMD%" remote set-url origin https://%TOKEN%@github.com/fack86677-ops/HARSHAI1.git 2>nul || "%GIT_CMD%" remote add origin https://%TOKEN%@github.com/fack86677-ops/HARSHAI1.git

echo [3/3] Pushing to main branch...
"%GIT_CMD%" push -u origin main --force

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo  [SUCCESS] Code successfully pushed to GitHub!
    echo  URL: https://github.com/fack86677-ops/HARSHAI1
    echo ========================================================
) else (
    echo.
    echo [ERROR] Push fail ho gaya. Kripya apna Token check karein.
)

echo.
pause
