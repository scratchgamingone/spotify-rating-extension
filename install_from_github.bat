@echo off
setlocal EnableDelayedExpansion

set "EXTENSION_NAME=rated_song.js"
:: URL to the raw file on GitHub
set "REPO_URL=https://raw.githubusercontent.com/scratchgamingone/spotify-rating-extension/main/rated_song.js"

echo ========================================================
echo   Spicetify Extension Installer (GitHub Version)
echo ========================================================

:: Check if Spicetify is installed
where spicetify >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Spicetify is not found in your PATH.
    echo Please install Spicetify first.
    pause
    exit /b 1
)

:: Get Spicetify Config Directory
for /f "delims=" %%i in ('spicetify config-dir') do set "SPICETIFY_DIR=%%i"
if "!SPICETIFY_DIR!"=="" set "SPICETIFY_DIR=%APPDATA%\spicetify"

set "EXTENSIONS_DIR=!SPICETIFY_DIR!\Extensions"
if not exist "!EXTENSIONS_DIR!" mkdir "!EXTENSIONS_DIR!"

echo [INFO] Downloading latest version from GitHub...
powershell -Command "Invoke-WebRequest -Uri '!REPO_URL!' -OutFile '!EXTENSIONS_DIR!\%EXTENSION_NAME%'"

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to download extension. Please check your internet connection.
    pause
    exit /b 1
)

echo [INFO] Enabling extension...
call spicetify config extensions %EXTENSION_NAME%
call spicetify apply

echo.
echo [SUCCESS] Extension installed from GitHub!
pause