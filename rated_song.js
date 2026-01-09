(async function RatedSongExtension() {
    // 1. Wait for Spicetify Platform API to be ready
    while (!Spicetify?.Platform?.RootlistAPI || !Spicetify?.Platform?.LibraryAPI || !Spicetify?.Platform?.PlaylistAPI) {
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Extra delay to ensure User session is active and library is loaded
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Store URIs for quick access
    const ratingPlaylists = {};
    const validLikedUris = new Set();
    const ratedSongsCache = new Map();
    let topbarBtnWidget = null;

    // 2. Function to check and create rating playlists
    async function ensurePlaylistsExist() {
        try {
            const rootAPI = Spicetify.Platform.RootlistAPI;
            let rootContent = await rootAPI.getContents();
            if (!rootContent || !rootContent.items) return;
            
            // Define playlist names (10/10 down to 0.5/10)
            const playlistNames = [];
            for (let i = 20; i >= 1; i--) {
                const val = i / 2;
                playlistNames.push(`${val}/10`);
            }

            // 1. Remove "Rated Song" folder if it exists (Reverting to Root structure)
            const folder = rootContent.items.find(item => item.type === 'folder' && item.name === 'Rated Song');
            if (folder) {
                console.log("[Rated Song] Removing folder:", folder.uri);
                await rootAPI.remove([folder.uri]);
                Spicetify.showNotification("Removing Rated Song folder...");
                await new Promise(r => setTimeout(r, 1000));
                rootContent = await rootAPI.getContents();
            }

            // 1.5 Remove duplicate playlists
            const duplicatesToDelete = [];
            for (const name of playlistNames) {
                const matches = rootContent.items.filter(item => item.type === 'playlist' && item.name === name);
                if (matches.length > 1) {
                    // Keep the first one, delete the rest
                    for (let i = 1; i < matches.length; i++) {
                        duplicatesToDelete.push(matches[i].uri);
                    }
                }
            }

            if (duplicatesToDelete.length > 0) {
                console.log("[Rated Song] Removing duplicate playlists:", duplicatesToDelete);
                await rootAPI.remove(duplicatesToDelete);
                Spicetify.showNotification(`Removed ${duplicatesToDelete.length} duplicate playlists.`);
                await new Promise(r => setTimeout(r, 1000));
                rootContent = await rootAPI.getContents();
            }

            // 2. Ensure Playlists exist in Root
            let createdCount = 0;
            for (const name of playlistNames) {
                const existing = rootContent.items.find(item => item.type === 'playlist' && item.name === name);
                if (existing) {
                    ratingPlaylists[name] = existing.uri;
                } else {
                    await rootAPI.createPlaylist(name, { before: 'start' });
                    createdCount++;
                    await new Promise(r => setTimeout(r, 200));
                }
            }

            // 3. Final Refresh to capture URIs of newly created playlists
            if (createdCount > 0) {
                rootContent = await rootAPI.getContents();
                for (const name of playlistNames) {
                    const existing = rootContent.items.find(item => item.type === 'playlist' && item.name === name);
                    if (existing) {
                        ratingPlaylists[name] = existing.uri;
                    }
                }
                Spicetify.showNotification(`Restored ${createdCount} rating playlists.`);
            }

            // 4. Automatically Sort Playlists (10/10 at top)
            try {
                const orderedUris = [];
                for (const name of playlistNames) {
                    const found = rootContent.items.find(item => item.type === 'playlist' && item.name === name);
                    if (found) orderedUris.push(found.uri);
                }
                if (orderedUris.length > 0) {
                    await rootAPI.add(orderedUris, { before: 'start' });
                }
            } catch (e) {
                console.error("[Rated Song] Error sorting playlists:", e);
            }
        } catch (error) {
            console.error("[Rated Song] Error ensuring playlists exist:", error);
        }
    }

    // CSS for Modal
    const style = document.createElement('style');
    style.innerHTML = `
    .rated-song-modal-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 20px;
        padding: 20px;
    }
    .rated-song-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 10px;
        width: 100%;
    }
    .rated-song-btn {
        background-color: #152106;
        color: #ffffff;
        border: none;
        border-radius: 8px;
        padding: 15px 5px;
        font-weight: bold;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .rated-song-btn:hover {
        background-color: #444444;
        transform: translateY(-2px);
        box-shadow: 0 4px 8px rgba(0,0,0,0.3);
    }
    .rated-song-btn.selected {
        background-color: #1db954;
        color: #ffffff;
    }
    .rated-song-clear-btn {
        margin-top: 15px;
        background-color: #ff4444;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 20px;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s;
    }
    `;
    document.head.appendChild(style);

    // 2.4 Build Cache (Performance & UI)
    async function buildCache() {
        for (const [name, uri] of Object.entries(ratingPlaylists)) {
            try {
                const rating = parseFloat(name.split('/')[0]);
                const contents = await Spicetify.Platform.PlaylistAPI.getContents(uri);
                for (const item of contents.items) {
                    ratedSongsCache.set(item.uri, rating);
                }
            } catch (e) {}
        }
        checkCurrentSong();
    }

    // Helper: Remove song from rating playlists (Optimized with Cache)
    async function updateSongRating(trackUri) {
        let wasRemoved = false;
        
        // 1. Check cache to find specific playlist
        const cachedRating = ratedSongsCache.get(trackUri);
        if (cachedRating) {
            const name = `${cachedRating}/10`;
            const playlistUri = ratingPlaylists[name];
            if (playlistUri) {
                try {
                    const contents = await Spicetify.Platform.PlaylistAPI.getContents(playlistUri);
                    const itemsToRemove = contents.items.filter(item => item.uri === trackUri || item.link === trackUri);
                    if (itemsToRemove.length > 0) {
                        const body = itemsToRemove.map(item => ({ uri: item.uri, uid: item.uid }));
                        await Spicetify.Platform.PlaylistAPI.remove(playlistUri, body);
                        wasRemoved = true;
                    }
                } catch (e) {}
            }
            ratedSongsCache.delete(trackUri);
        }
        return wasRemoved;
    }

    // Helper: Apply rating to a song (Used by Modal and Hotkeys)
    async function rateSong(trackUri, ratingValue) {
        const name = `${ratingValue}/10`;
        let playlistUri = ratingPlaylists[name];

        // Fallback: If URI is missing, try to find it in Root
        if (!playlistUri) {
            try {
                const rootContent = await Spicetify.Platform.RootlistAPI.getContents();
                const found = rootContent.items.find(item => item.type === 'playlist' && item.name === name);
                if (found) {
                    playlistUri = found.uri;
                    ratingPlaylists[name] = found.uri;
                }
            } catch (e) {}
        }

        if (!playlistUri) {
            Spicetify.showNotification(`Error: Playlist ${name} not found!`);
            return;
        }

        Spicetify.showNotification(`Rating as ${name}...`);
        try {
            const wasMoved = await updateSongRating(trackUri);
            
            // Retry mechanism for adding to playlist (3 attempts)
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    await Spicetify.Platform.PlaylistAPI.add(playlistUri, [trackUri], { before: 'start' });
                    break;
                } catch (e) {
                    if (attempt === 3) throw e;
                    await new Promise(r => setTimeout(r, 500));
                }
            }
            
            ratedSongsCache.set(trackUri, ratingValue);

            // Auto-like/unlike based on rating threshold (5/10)
            try {
                if (ratingValue >= 5) {
                    validLikedUris.add(trackUri);
                    await Spicetify.Platform.LibraryAPI.add({uris: [trackUri]});
                } else {
                    validLikedUris.delete(trackUri);
                    await Spicetify.Platform.LibraryAPI.remove({uris: [trackUri]});
                }
            } catch (e) {
                console.error("[Rated Song] Auto-like/unlike failed:", e);
            }

            if (wasMoved) {
                Spicetify.showNotification(`Moved to ${name}!`);
            } else {
                Spicetify.showNotification(`Rated ${name}!`);
            }
        } catch (err) {
            console.error("[Rated Song] Rate failed:", err);
            Spicetify.showNotification("Error updating rating");
        }
        checkCurrentSong();
    }

    // Helper: Delete all extension playlists (Cleanup)
    async function deletePlaylists() {
        const rootAPI = Spicetify.Platform.RootlistAPI;
        try {
            const rootContent = await rootAPI.getContents();
            const toRemove = [];
            
            // Generate expected names
            const playlistNames = [];
            for (let i = 20; i >= 1; i--) {
                playlistNames.push(`${i/2}/10`);
            }

            for (const name of playlistNames) {
                const matches = rootContent.items.filter(item => item.type === 'playlist' && item.name === name);
                matches.forEach(m => toRemove.push(m.uri));
            }

            if (toRemove.length > 0) {
                await rootAPI.remove(toRemove);
                Spicetify.showNotification(`Deleted ${toRemove.length} playlists.`);
            } else {
                Spicetify.showNotification("No rating playlists found.");
            }
        } catch (e) {
            console.error("Error deleting playlists:", e);
            Spicetify.showNotification("Error deleting playlists");
        }
    }

    function showRatingModal(trackUri) {
        const modalContent = document.createElement("div");
        modalContent.className = "rated-song-modal-content";
        const grid = document.createElement("div");
        grid.className = "rated-song-grid";
        const buttons = {};

        for (let i = 1; i <= 20; i++) {
            const val = i / 2;
            const name = `${val}/10`;
            const btn = document.createElement("button");
            btn.className = "rated-song-btn";
            btn.innerText = name;
            btn.onclick = async () => {
                Spicetify.PopupModal.hide();
                await rateSong(trackUri, val);
            };
            buttons[name] = btn;
            grid.appendChild(btn);
        }

        // Random Rate Button
        const randomBtn = document.createElement("button");
        randomBtn.className = "rated-song-btn";
        randomBtn.innerText = "Random";
        randomBtn.onclick = () => {
            const keys = Object.keys(buttons);
            const randomKey = keys[Math.floor(Math.random() * keys.length)];
            if (buttons[randomKey]) buttons[randomKey].click();
        };
        grid.appendChild(randomBtn);

        modalContent.appendChild(grid);

        // Clear Rating Button
        const clearBtn = document.createElement("button");
        clearBtn.className = "rated-song-clear-btn";
        clearBtn.innerText = "Clear Rating";
        clearBtn.onclick = async () => {
            Spicetify.PopupModal.hide();
            const wasRemoved = await updateSongRating(trackUri);
            validLikedUris.delete(trackUri);
            await Spicetify.Platform.LibraryAPI.remove({uris: [trackUri]});
            Spicetify.showNotification(wasRemoved ? "Rating cleared!" : "Song was not rated.");
            checkCurrentSong();
        };
        modalContent.appendChild(clearBtn);

        // Delete All Playlists Button
        const deleteDataBtn = document.createElement("button");
        deleteDataBtn.className = "rated-song-clear-btn";
        deleteDataBtn.style.backgroundColor = "#333";
        deleteDataBtn.innerText = "Delete All Playlists";
        deleteDataBtn.onclick = () => {
            const confirmContainer = document.createElement("div");
            confirmContainer.className = "rated-song-modal-content";
            
            const warningText = document.createElement("p");
            warningText.innerText = "Are you sure you want to delete all rating playlists?\nThis cannot be undone.";
            warningText.style.textAlign = "center";
            warningText.style.color = "var(--spice-text)";
            warningText.style.fontSize = "14px";
            
            const btnRow = document.createElement("div");
            btnRow.style.display = "flex";
            btnRow.style.gap = "20px";
            btnRow.style.justifyContent = "center";
            btnRow.style.width = "100%";
            
            const noBtn = document.createElement("button");
            noBtn.className = "rated-song-btn";
            noBtn.innerText = "Cancel";
            noBtn.style.padding = "10px 30px";
            noBtn.style.backgroundColor = "#555";
            noBtn.onclick = () => showRatingModal(trackUri);
            
            const yesBtn = document.createElement("button");
            yesBtn.className = "rated-song-clear-btn";
            yesBtn.innerText = "Yes, Delete";
            yesBtn.style.marginTop = "0";
            yesBtn.style.padding = "10px 30px";
            yesBtn.onclick = async () => {
                Spicetify.PopupModal.hide();
                await deletePlaylists();
            };
            
            btnRow.appendChild(noBtn);
            btnRow.appendChild(yesBtn);
            
            confirmContainer.appendChild(warningText);
            confirmContainer.appendChild(btnRow);
            
            Spicetify.PopupModal.display({ title: "Confirm Deletion", content: confirmContainer });
        };
        modalContent.appendChild(deleteDataBtn);

        Spicetify.PopupModal.display({ title: "Rate Song", content: modalContent, isLarge: true });

        // Highlight current rating
        (async () => {
            for (const [name, playlistUri] of Object.entries(ratingPlaylists)) {
                try {
                    const contents = await Spicetify.Platform.PlaylistAPI.getContents(playlistUri);
                    if (contents.items.some(item => item.uri === trackUri)) {
                        if (buttons[name]) buttons[name].classList.add("selected");
                        break;
                    }
                } catch (e) {}
            }
        })();
    }

    // 2.5 Function to sync Liked Songs (Mirror Rated >= 5/10)
    async function syncLikedSongs() {
        const libraryAPI = Spicetify.Platform.LibraryAPI;
        const playlistAPI = Spicetify.Platform.PlaylistAPI;
        if (!libraryAPI) return;
        if (!libraryAPI.getTracks) {
            console.warn("[Rated Song] LibraryAPI.getTracks not available.");
            return;
        }

        validLikedUris.clear();

        // 1. Collect all songs that SHOULD be liked (Rating >= 5)
        for (const [name, uri] of Object.entries(ratingPlaylists)) {
            const rating = parseFloat(name.split('/')[0]);
            if (rating >= 5) {
                try {
                    const contents = await playlistAPI.getContents(uri);
                    contents.items.forEach(item => {
                        // Include tracks and local files
                        if (item.uri.includes(":track:") || item.uri.includes(":local:")) validLikedUris.add(item.uri);
                    });
                } catch (e) {
                    console.error(`[Rated Song] Error syncing ${name}:`, e);
                }
            }
        }

        // 2. Get current Liked Songs and diff
        try {
            const likedContent = await libraryAPI.getTracks({ limit: 50000 });
            const currentLiked = likedContent.items || [];
            const currentLikedUris = new Set(currentLiked.map(item => item.uri));

            const toAdd = [...validLikedUris].filter(uri => !currentLikedUris.has(uri));
            
            // Remove if in Liked but NOT in the "should be liked" set.
            // This explicitly removes:
            // 1. Songs that are not in ANY rated playlist (Unrated)
            // 2. Songs that are in a rated playlist below 5/10
            const toRemove = [...currentLikedUris].filter(uri => !validLikedUris.has(uri));

            if (toAdd.length > 0) await libraryAPI.add({ uris: toAdd });
            if (toRemove.length > 0) await libraryAPI.remove({ uris: toRemove });

            if (toAdd.length > 0 || toRemove.length > 0) {
                Spicetify.showNotification(`Synced Liked: +${toAdd.length} / -${toRemove.length}`);
            }
        } catch (e) {
            console.error("[Rated Song] Error syncing Liked Songs:", e);
        }
    }

    // 2.6 Override LibraryAPI.add and remove to enforce rules
    function enforceLikedRule() {
        if (!Spicetify.Platform.LibraryAPI) return;
        const originalAdd = Spicetify.Platform.LibraryAPI.add;
        const originalRemove = Spicetify.Platform.LibraryAPI.remove;

        if (!originalAdd || !originalRemove) return;

        Spicetify.Platform.LibraryAPI.add = async function(data) {
            const uris = data.uris || [];
            const allowed = uris.filter(uri => validLikedUris.has(uri));
            
            if (allowed.length !== uris.length) {
                Spicetify.showNotification("Song must be rated ≥ 5/10 to Like.");
                // Ensure UI reverts (remove blocked items)
                const blocked = uris.filter(uri => !validLikedUris.has(uri));
                Spicetify.Platform.LibraryAPI.remove({uris: blocked}).catch(()=>{});
            }
            
            if (allowed.length > 0) {
                return originalAdd.call(this, { ...data, uris: allowed });
            }
            return Promise.resolve();
        };

        Spicetify.Platform.LibraryAPI.remove = async function(data) {
            const uris = data.uris || [];
            
            // 1. Perform the removal from Liked Songs
            const result = await originalRemove.call(this, data);

            // 2. If successful, also remove from rating playlists
            let anyRatingRemoved = false;
            for (const uri of uris) {
                if (validLikedUris.has(uri)) validLikedUris.delete(uri);
                const removed = await updateSongRating(uri);
                if (removed) anyRatingRemoved = true;
            }
            
            if (anyRatingRemoved) Spicetify.showNotification("Removed from Liked Songs & Ratings.");
            return result;
        };
    }

    // 2.7 Check Current Song (UI & Auto-Skip)
    function checkCurrentSong() {
        const track = Spicetify.Player.data?.item;
        if (!track) return;
        
        const rating = ratedSongsCache.get(track.uri);
        
        if (topbarBtnWidget) {
            topbarBtnWidget.label = rating ? `★ ${rating}` : "Rate Song";
            topbarBtnWidget.element.title = rating ? `Current Rating: ${rating}/10` : "Rate Song";
            topbarBtnWidget.active = !!rating;
        }

        const autoSkip = localStorage.getItem("rated_song_autoskip") !== "false";

        if (autoSkip && rating && rating <= 1) {
            Spicetify.showNotification(`Skipping low rated song (${rating}/10)`);
            Spicetify.Player.next();
        }
    }

    // 2.8 Observer to auto-restore playlists if deleted
    function setupPlaylistObserver() {
        const rootAPI = Spicetify.Platform.RootlistAPI;
        if (!rootAPI) return;

        const playlistNames = [];
        for (let i = 20; i >= 1; i--) {
            playlistNames.push(`${i/2}/10`);
        }

        let isRunning = false;

        rootAPI.getEvents().addListener("operation_complete", async () => {
            if (isRunning) return;
            isRunning = true;
            
            // Wait for UI to settle
            await new Promise(r => setTimeout(r, 1000));
            
            try {
                const rootContent = await rootAPI.getContents();
                let needsRestore = false;
                
                for (const name of playlistNames) {
                    const exists = rootContent.items.find(item => item.type === 'playlist' && item.name === name);
                    if (!exists) {
                        needsRestore = true;
                        break;
                    }
                }

                if (needsRestore) await ensurePlaylistsExist();
            } catch(e) {}
            
            isRunning = false;
        });
    }

    // 3. Register Context Menu, Hotkeys, and UI
    function registerInterface() {
        new Spicetify.ContextMenu.Item(
            "Rate Song",
            (uris) => {
                if (uris.length > 0) showRatingModal(uris[0]);
            },
            (uris) => {
                return uris.length === 1 && (uris[0].includes(":track:") || uris[0].includes(":local:"));
            }
        ).register();

        // Hotkeys
        document.addEventListener("keydown", (e) => {
            const track = Spicetify.Player.data?.item;
            const isTrack = track && (track.uri.includes(":track:") || track.uri.includes(":local:"));
            
            if (!isTrack) return;

            // Ctrl + Alt + R: Open Menu
            if (e.ctrlKey && e.altKey && e.code === "KeyR") showRatingModal(track.uri);

            // Alt + 1-9: Instant Rate
            if (e.altKey && !e.ctrlKey && !e.shiftKey && e.code.startsWith("Digit")) {
                const val = parseInt(e.code.replace("Digit", ""));
                if (val >= 1 && val <= 9) {
                    rateSong(track.uri, val);
                }
            }
        });

        // Topbar Button (Quick access to rate current song)
        if (Spicetify.Topbar) {
            // SVG Icon for compatibility
            const starIcon = `<svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M8 .19l2.47 5.01 5.53.8-4 3.9.94 5.51L8 12.8l-4.94 2.6.94-5.5-4-3.9 5.53-.8L8 .19z"></path></svg>`;
            topbarBtnWidget = new Spicetify.Topbar.Button("Rate Song", starIcon, () => {
                const track = Spicetify.Player.data?.item;
                if (track) showRatingModal(track.uri);
            });
        }
        
        Spicetify.Player.addEventListener("songchange", checkCurrentSong);
    }

    // 4. Execute
    await ensurePlaylistsExist();
    setupPlaylistObserver();
    await buildCache();
    await syncLikedSongs();
    enforceLikedRule();
    registerInterface();
})();