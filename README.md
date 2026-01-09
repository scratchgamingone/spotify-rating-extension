# Rated Song - Spicetify Extension

[![GitHub Repository](https://img.shields.io/badge/GitHub-Repository-blue?logo=github)](https://github.com/scratchgamingone/spotify-rating-extension)

**Rated Song** is a Spicetify extension that lets you rate your music on a scale of **0.5 to 10**. It automatically organizes your library into specific playlists based on your ratings and keeps your "Liked Songs" perfectly synced with your top-rated tracks.

## ⚠️ Important Warning: Liked Songs Sync

This extension **takes control** of your "Liked Songs" library to keep it synced with your ratings:
*   **You cannot manually "Like" a song** unless you rate it **5/10 or higher**.
*   If you manually "Unlike" a song, its rating will be **deleted**.
*   Songs rated **below 5/10** are automatically **Unliked**.

## 🌟 Features

*   **Precision Rating:** Rate any song from 0.5/10 to 10/10.
*   **Automatic Playlists:** The extension creates and manages 20 playlists for you (e.g., `10/10`, `9.5/10`, ... `0.5/10`).
*   **Smart "Liked Songs" Sync:**
    *   If you rate a song **5/10 or higher**, it is automatically **Liked** (added to Liked Songs).
    *   If you rate a song **below 5/10**, it is automatically **Unliked**.
    *   If you manually "Unlike" a song, its rating is removed.
*   **Quick Access:**
    *   **Right-click** any song and select "Rate Song".
    *   Click the **Star button** in the top bar.
    *   **Menu Hotkey:** Press **Ctrl + Alt + R** to open the rating menu.
    *   **Instant Rate:** Press **Alt + 1** through **Alt + 9** to instantly rate the current song (e.g., `Alt+5` rates it 5/10).
*   **Smart Features:**
    *   **Visual Indicator:** The top bar button updates to show the rating of the current song (e.g., `★ 8.5`).
    *   **Auto-Skip:** Songs rated **1/10 or lower** are automatically skipped.

## 🛠️ Prerequisites

Before installing this extension, you must have **Spicetify** installed on your computer.

### How to install Spicetify (Windows)
1.  Open **PowerShell** (Search for "PowerShell" in the Start menu).
2.  Copy and paste the following command, then press **Enter**:
    ```powershell
    iwr -useb https://raw.githubusercontent.com/spicetify/spicetify-cli/master/install.ps1 | iex
    ```
3.  Once installed, type `spicetify` and press Enter to verify it works.
4.  (Optional) If you haven't applied Spicetify to Spotify yet, run:
    ```powershell
    spicetify backup apply
    ```

## 📥 Installation

1.  Download the files from the [GitHub Repository](https://github.com/scratchgamingone/spotify-rating-extension).
2.  Ensure you have the following files in the same folder:
    *   `rated_song.js` (The extension code)
    *   `install_rated_song.bat` (The installer)
    *   `uninstall_rated_song.bat` (The uninstaller)
3.  Double-click **`install_rated_song.bat`**.
4.  A window will pop up showing the installation progress. Once it says **"Extension installed and applied!"**, Spotify will reload.
5.  You are done!

### Alternative: Install from GitHub
If you have `install_from_github.bat`, you can simply run it to download and install the latest version directly from the repository without needing to manually download the `.js` file.

## 🚀 How to Use

1.  **Rate a Song:**
    *   Play a song.
    *   Press **Alt + 8** to instantly rate it 8/10, or **Ctrl + Alt + R** to open the full menu.
    *   Select a rating (e.g., `8.5/10`).
2.  **Check Playlists:**
    *   Go to your Library. You will see new playlists created for each rating.
3.  **Clear a Rating:**
    *   Open the rating menu and click **"Clear Rating"**, or simply "Unlike" the song in Spotify.

## 🗑️ Uninstalling

1.  **Delete Playlists:** Open the rating menu (Ctrl+Alt+R) and click **"Delete All Playlists"**.
    *   *Note: Do this BEFORE uninstalling, otherwise you will have to delete the playlists manually.*
2.  **Remove Extension:** Double-click **`uninstall_rated_song.bat`**.

## ❓ Troubleshooting

*   **Playlists didn't appear?** Restart Spotify. The extension needs a moment to create them on the first run.
*   **Extension not working?** Run the `install_rated_song.bat` file again to update Spicetify.
*   **Alt + Number keys not working?** If the instant rating shortcuts don't work on your system, or if you need to rate a song **10/10** or use **decimals** (e.g., 8.5), please use **Ctrl + Alt + R** or right-click the song to open the full menu.

---
*Note: This extension requires the Spotify Desktop app and Spicetify CLI.*

## 👨‍💻 For Developers

*   **`upload_to_github.bat`**: A script to automatically commit and push changes to the repository.