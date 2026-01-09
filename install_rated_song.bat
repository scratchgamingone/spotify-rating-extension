@echo off
setlocal EnableDelayedExpansion

:: Name of the extension file (must match the JS file name)
set "EXTENSION_NAME=rated_song.js"

:: Get the directory where this script is running
set "SCRIPT_DIR=%~dp0"
set "SOURCE_FILE=!SCRIPT_DIR!%EXTENSION_NAME%"

echo ========================================================
echo   Spicetify Extension Installer: %EXTENSION_NAME%
echo ========================================================

:: Check if source file exists
if not exist "!SOURCE_FILE!" (
    echo [ERROR] Could not find "!SOURCE_FILE!"
    echo Make sure this bat file is in the same folder as the .js file.
    pause
    exit /b 1
)

:: Check if Spicetify is installed/in path
where spicetify >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Spicetify is not found in your PATH.
    echo Please install Spicetify first.
    pause
    exit /b 1
)

:: Get Spicetify Config Directory
for /f "delims=" %%i in ('spicetify config-dir') do set "SPICETIFY_DIR=%%i"

:: Fallback to default locations if detection failed
if "!SPICETIFY_DIR!"=="" set "SPICETIFY_DIR=%APPDATA%\spicetify"
if not exist "!SPICETIFY_DIR!" set "SPICETIFY_DIR=%APPDATA%\spicetify"
if not exist "!SPICETIFY_DIR!" set "SPICETIFY_DIR=%USERPROFILE%\.spicetify"

if not exist "!SPICETIFY_DIR!" (
    echo [ERROR] Spicetify config directory not found at "!SPICETIFY_DIR!".
    pause
    exit /b 1
)

set "EXTENSIONS_DIR=!SPICETIFY_DIR!\Extensions"

:: Create Extensions folder if it doesn't exist
if not exist "!EXTENSIONS_DIR!" mkdir "!EXTENSIONS_DIR!"

:: Copy the extension file
echo [INFO] Updating "%EXTENSION_NAME%" in Extensions folder...
copy /Y "!SOURCE_FILE!" "!EXTENSIONS_DIR!\" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to copy file.
    pause
    exit /b 1
)

:: Enable the extension (Overwriting list to clean up previous errors)
echo [INFO] Setting extension in configuration...
call spicetify config extensions %EXTENSION_NAME%

:: Apply changes
echo [INFO] Applying changes to Spotify...
call spicetify apply

echo.
echo [SUCCESS] Extension installed and applied!
echo Opening Spicetify folder...
start "" "!SPICETIFY_DIR!"
exit