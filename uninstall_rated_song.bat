@echo off
setlocal EnableDelayedExpansion

set "EXTENSION_NAME=rated_song.js"

echo ========================================================
echo   Spicetify Extension Uninstaller: %EXTENSION_NAME%
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
set "TARGET_FILE=!EXTENSIONS_DIR!\%EXTENSION_NAME%"

echo [INFO] Removing extension from configuration...
:: The minus sign at the end removes the extension from the config list
call spicetify config extensions %EXTENSION_NAME%-

echo [INFO] Applying changes to Spotify...
call spicetify apply

if exist "!TARGET_FILE!" (
    echo [INFO] Deleting extension file...
    del /F /Q "!TARGET_FILE!"
    echo [SUCCESS] Extension file deleted.
) else (
    echo [INFO] Extension file not found in Extensions folder.
)

echo.
echo [SUCCESS] Uninstallation complete!
echo Note: If you did not use the "Delete All Playlists" button in the extension menu,
echo       the playlists will remain in your library and must be deleted manually.
pause