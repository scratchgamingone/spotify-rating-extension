@echo off
setlocal EnableDelayedExpansion

set "EXTENSION_NAME=rated_song.js"
set "REMOVER_NAME=rated_song_remover.js"
set "SCRIPT_DIR=%~dp0"
set "SOURCE_FILE=!SCRIPT_DIR!%EXTENSION_NAME%"

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
set "REMOVER_FILE=!EXTENSIONS_DIR!\%REMOVER_NAME%"

echo [INFO] Preparing cleanup...
:: Update the extension file to ensure it has the deletion logic
if exist "!SOURCE_FILE!" (
    copy /Y "!SOURCE_FILE!" "!EXTENSIONS_DIR!\" >nul
)

echo [INFO] Creating cleanup script...
set "REMOVER_FILE_PATH=!REMOVER_FILE!"
setlocal DisableDelayedExpansion
(
echo (async function^(^) {
echo     while ^(!window.RatedSong_DeleteAll^) {
echo         await new Promise^(r =^> setTimeout^(r, 100^)^);
echo     }
echo     await new Promise^(r =^> setTimeout^(r, 1000^)^);
echo     await window.RatedSong_DeleteAll^(^);
echo     alert^("All rated playlists have been deleted. You can now close Spotify to complete the uninstallation."^);
echo }^)^(^);
) > "%REMOVER_FILE_PATH%"
endlocal

echo [INFO] Enabling cleanup mode...
call spicetify config extensions %EXTENSION_NAME% %REMOVER_NAME%

echo [INFO] Applying changes to Spotify...
call spicetify apply

echo.
echo ========================================================
echo   ACTION REQUIRED
echo ========================================================
echo 1. Spotify should have restarted. If not, please OPEN Spotify now.
echo 2. Wait for a popup saying "All rated playlists have been deleted".
echo 3. Once you see that popup, press any key here to finish.
echo ========================================================
pause

echo [INFO] Removing extensions from configuration...
call spicetify config extensions %EXTENSION_NAME%- %REMOVER_NAME%-
call spicetify apply

if exist "!TARGET_FILE!" (
    echo [INFO] Deleting extension file...
    del /F /Q "!TARGET_FILE!"
    echo [SUCCESS] Extension file deleted.
) else (
    echo [INFO] Extension file not found in Extensions folder.
)

if exist "!REMOVER_FILE!" del /F /Q "!REMOVER_FILE!"

echo.
echo [SUCCESS] Uninstallation complete!
pause