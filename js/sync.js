/**
 * DocCraft Studio - Multi-Device File Sync Engine
 * Manages direct local disk persistence using the File System Access API
 * Supports seamless synchronization with Google Drive, Syncthing, Dropbox, etc.
 */

var fileSyncHandle = null;
var fileSyncFileName = '';
var fileSyncStatus = 'local'; // 'local' | 'connected' | 'syncing' | 'permission_prompt' | 'error' | 'unsupported'
var fileSyncLastModified = 0;
var fileSyncLastSavedAt = 0;
var fileSyncDebounceTimer = null;
var isSyncWriting = false;
var isSyncReading = false;
var externalChangesWaiting = false;

// Initialize the sync engine
async function initFileSyncEngine() {
  if (!('showOpenFilePicker' in window)) {
    fileSyncStatus = 'unsupported';
    updateSyncStatusUI();
    return;
  }

  try {
    const config = await dbGetConfig('sync_file_config');
    if (config && config.handle) {
      fileSyncHandle = config.handle;
      fileSyncFileName = config.fileName || fileSyncHandle.name;
      fileSyncLastSavedAt = config.lastSavedAt || 0;
      
      const perm = await fileSyncHandle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        fileSyncStatus = 'connected';
        await readDiskFileMetadata(true);
      } else if (perm === 'prompt') {
        fileSyncStatus = 'permission_prompt';
      } else {
        fileSyncStatus = 'error';
      }
    } else {
      fileSyncStatus = 'local';
    }
  } catch (err) {
    console.error("Sync init error:", err);
    fileSyncStatus = 'error';
  }

  updateSyncStatusUI();

  // Watch for external file changes when user returns to the tab
  window.addEventListener('focus', () => {
    checkForExternalFileChanges();
  });
}

// Request permission from the user (must be called via user gesture)
async function requestSyncFilePermission() {
  if (!fileSyncHandle) return;
  try {
    const perm = await fileSyncHandle.requestPermission({ mode: 'readwrite' });
    if (perm === 'granted') {
      fileSyncStatus = 'connected';
      showToast(`Connected to ${fileSyncFileName}`);
      await readDiskFileMetadata(true);
      updateSyncStatusUI();
      checkForExternalFileChanges();
    } else {
      fileSyncStatus = 'error';
      updateSyncStatusUI();
      showToast("Permission denied for sync file", false);
    }
  } catch (err) {
    console.error("Request permission error:", err);
    fileSyncStatus = 'error';
    updateSyncStatusUI();
  }
}

// Connect an existing JSON file
async function connectExistingSyncFile() {
  if (!('showOpenFilePicker' in window)) return;
  try {
    const [handle] = await window.showOpenFilePicker({
      types: [{
        description: 'DocCraft JSON Data',
        accept: { 'application/json': ['.json'] }
      }]
    });
    
    await finishConnectingHandle(handle);
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error("Connect file error:", err);
      showToast("Failed to connect file", false);
    }
  }
}

// Create a new JSON sync file and export current workspace
async function createNewSyncFile() {
  if (!('showSaveFilePicker' in window)) return;
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'doccraft-data.json',
      types: [{
        description: 'DocCraft JSON Data',
        accept: { 'application/json': ['.json'] }
      }]
    });
    
    await finishConnectingHandle(handle, true);
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error("Create file error:", err);
      showToast("Failed to create file", false);
    }
  }
}

// Internal: Finalize handle connection
async function finishConnectingHandle(handle, isNew = false) {
  const perm = await handle.requestPermission({ mode: 'readwrite' });
  if (perm !== 'granted') {
    showToast("Permission denied", false);
    return;
  }

  fileSyncHandle = handle;
  fileSyncFileName = handle.name;
  fileSyncStatus = 'connected';
  
  if (isNew) {
    // Immediately write current workspace to the new file
    await flushDiskSync(true);
  } else {
    // Reading existing file
    isSyncReading = true;
    try {
      const file = await fileSyncHandle.getFile();
      if (file.size === 0) {
        // File is empty, export to it
        await flushDiskSync(true);
      } else {
        const text = await file.text();
        let data = null;
        try {
          data = JSON.parse(text);
        } catch (e) {
          throw new Error("Invalid JSON format");
        }
        
        if (data && Array.isArray(data.documents)) {
          // Compare with local
          const localDocs = await dbGetDocuments();
          if (localDocs.length <= 1) {
            // Local is effectively empty, load directly
            await loadWorkspaceFromDiskData(data, 'overwrite');
          } else {
            // Prompt user for conflict resolution
            openSyncConflictModal(data);
            isSyncReading = false;
            return;
          }
        } else {
          throw new Error("Invalid DocCraft data structure");
        }
      }
    } catch (err) {
      console.error("Read file error:", err);
      showToast("Selected file is not valid DocCraft JSON data", false);
      disconnectSyncFile();
      isSyncReading = false;
      return;
    }
    isSyncReading = false;
  }

  // Save to IndexedDB config
  await dbSaveConfig({ 
    key: 'sync_file_config', 
    handle: fileSyncHandle, 
    fileName: fileSyncFileName, 
    lastSavedAt: Date.now() 
  });
  
  updateSyncStatusUI();
  showToast(`Sync active: ${fileSyncFileName}`);
  if (document.getElementById('syncModal') && !document.getElementById('syncModal').classList.contains('hidden')) {
    renderSyncModalContent();
  }
}

// Disconnect current file
async function disconnectSyncFile() {
  fileSyncHandle = null;
  fileSyncFileName = '';
  fileSyncStatus = 'local';
  fileSyncLastModified = 0;
  fileSyncLastSavedAt = 0;
  externalChangesWaiting = false;
  
  await dbDeleteConfig('sync_file_config');
  updateSyncStatusUI();
  
  const banner = document.getElementById('externalChangesBanner');
  if (banner) banner.classList.add('hidden');
  
  showToast("Disconnected from sync file. Operating in local mode.");
  if (document.getElementById('syncModal') && !document.getElementById('syncModal').classList.contains('hidden')) {
    renderSyncModalContent();
  }
}

// Schedule disk synchronization for any data mutation
function scheduleDiskSync(delayMs = 1200) {
  if (fileSyncStatus !== 'connected' || !fileSyncHandle) return;
  if (isSyncReading || isInitialLoading) return;
  
  updateSyncStatusUI('syncing');

  clearTimeout(fileSyncDebounceTimer);
  if (delayMs === 0) {
    writeWorkspaceToSyncFile();
  } else {
    fileSyncDebounceTimer = setTimeout(writeWorkspaceToSyncFile, delayMs);
  }
}

// Force immediate flush to disk (e.g. Cmd+S)
async function flushDiskSync(force = false) {
  if (fileSyncStatus !== 'connected' || !fileSyncHandle) {
    if (force) showToast("Not connected to any sync file", false);
    return;
  }
  clearTimeout(fileSyncDebounceTimer);
  await writeWorkspaceToSyncFile();
}

// Write IndexedDB payload to disk
async function writeWorkspaceToSyncFile() {
  if (isSyncWriting || isSyncReading || !fileSyncHandle) return;
  isSyncWriting = true;
  updateSyncStatusUI('syncing');

  try {
    const [docs, folders, attachments] = await Promise.all([
      dbGetDocuments(), 
      dbGetFolders(), 
      dbGetAllAttachments()
    ]);
    
    const payload = {
      version: 1,
      app: "DocCraft Studio",
      exportedAt: Date.now(),
      folders: folders,
      documents: docs,
      attachments: attachments
    };
    
    const jsonString = JSON.stringify(payload, null, 2);
    
    const writable = await fileSyncHandle.createWritable();
    await writable.write(jsonString);
    await writable.close();
    
    fileSyncLastSavedAt = Date.now();
    await readDiskFileMetadata(false); // Update fileSyncLastModified
    
    await dbSaveConfig({ 
      key: 'sync_file_config', 
      handle: fileSyncHandle, 
      fileName: fileSyncFileName, 
      lastSavedAt: fileSyncLastSavedAt 
    });
    
    fileSyncStatus = 'connected';
    externalChangesWaiting = false;
    updateSyncStatusUI('synced');
  } catch (err) {
    console.error("Disk write error:", err);
    if (err.name === 'NotAllowedError') {
      fileSyncStatus = 'permission_prompt';
    } else {
      fileSyncStatus = 'error';
      showToast("Disk sync failed", false);
    }
    updateSyncStatusUI();
  } finally {
    isSyncWriting = false;
  }
}

// Read basic file metadata from disk
async function readDiskFileMetadata(updateSavedAt = false) {
  if (!fileSyncHandle) return;
  try {
    const file = await fileSyncHandle.getFile();
    fileSyncLastModified = file.lastModified;
    if (updateSavedAt) {
      fileSyncLastSavedAt = Date.now();
    }
  } catch (err) {
    console.warn("Could not read disk file metadata:", err);
  }
}

// Check if file was modified externally (by Google Drive / Syncthing)
async function checkForExternalFileChanges() {
  if (fileSyncStatus !== 'connected' || !fileSyncHandle || isSyncWriting || isSyncReading) return;
  
  try {
    const perm = await fileSyncHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') {
      fileSyncStatus = 'permission_prompt';
      updateSyncStatusUI();
      return;
    }
    
    const file = await fileSyncHandle.getFile();
    // Allow 2000ms grace period for clock/write drift
    if (file.lastModified > fileSyncLastModified + 2000 && file.lastModified > fileSyncLastSavedAt + 2000) {
      externalChangesWaiting = true;
      updateSyncStatusUI();
      showExternalChangesBanner(true);
    }
  } catch (err) {
    console.warn("Check external changes error:", err);
  }
}

// Load workspace directly from a file handle data object
async function loadWorkspaceFromDiskData(data, mergeMode = 'overwrite') {
  isSyncReading = true;
  try {
    if (mergeMode === 'overwrite') {
      const tx = dbInstance.transaction(['documents', 'folders', 'attachments'], 'readwrite');
      await Promise.all([
        new Promise((resolve, reject) => { const req = tx.objectStore('documents').clear(); req.onsuccess = resolve; req.onerror = reject; }),
        new Promise((resolve, reject) => { const req = tx.objectStore('folders').clear(); req.onsuccess = resolve; req.onerror = reject; }),
        new Promise((resolve, reject) => { const req = tx.objectStore('attachments').clear(); req.onsuccess = resolve; req.onerror = reject; })
      ]);
      expandedFolders.clear();
    }

    for (const folder of data.folders) { await dbSaveFolder(folder); }
    for (const docObj of data.documents) { await dbSaveDocument(docObj); }
    for (const att of (data.attachments || [])) { await dbSaveAttachment(att); }

    await readDiskFileMetadata(true); // Update timestamps
    await dbSaveConfig({ 
      key: 'sync_file_config', 
      handle: fileSyncHandle, 
      fileName: fileSyncFileName, 
      lastSavedAt: fileSyncLastSavedAt 
    });

    externalChangesWaiting = false;
    showExternalChangesBanner(false);
    
    renderWorkspaceDocList();
    
    // Refresh current document or open first
    const docs = await dbGetDocuments();
    let targetDocId = null;
    
    if (currentDocumentId && docs.find(d => d.id === currentDocumentId)) {
      targetDocId = currentDocumentId;
    } else if (docs.length > 0) {
      targetDocId = docs[0].id;
    } else {
      const defaultDoc = await createNewDocument("Untitled.adoc", "");
      targetDocId = defaultDoc.id;
    }
    
    if (targetDocId) {
      openDocumentFromWorkspace(targetDocId);
    }
    
    showToast("Workspace reloaded from disk.");
  } catch (err) {
    console.error("Reload workspace error:", err);
    showToast("Failed to reload workspace", false);
  } finally {
    isSyncReading = false;
    updateSyncStatusUI();
  }
}

// Action triggered from the external changes banner
async function triggerReloadFromExternalChanges() {
  if (!fileSyncHandle) return;
  try {
    const file = await fileSyncHandle.getFile();
    const text = await file.text();
    const data = JSON.parse(text);
    await loadWorkspaceFromDiskData(data, 'overwrite');
  } catch (err) {
    console.error("External reload error:", err);
    showToast("Error loading external changes", false);
  }
}

// --- UI Methods ---

function openSyncModal() {
  const modal = document.getElementById('syncModal');
  if (modal) {
    renderSyncModalContent();
    modal.classList.remove('hidden');
  }
}

function closeSyncModal() {
  const modal = document.getElementById('syncModal');
  if (modal) modal.classList.add('hidden');
}

function showExternalChangesBanner(show) {
  const banner = document.getElementById('externalChangesBanner');
  if (banner) {
    if (show) banner.classList.remove('hidden');
    else banner.classList.add('hidden');
  }
}

function openSyncConflictModal(data) {
  const modal = document.getElementById('syncConflictModal');
  if (!modal) return;
  
  modal.dataset.pendingData = JSON.stringify(data);
  modal.classList.remove('hidden');
}

function closeSyncConflictModal() {
  const modal = document.getElementById('syncConflictModal');
  if (modal) {
    modal.classList.add('hidden');
    delete modal.dataset.pendingData;
  }
}

function resolveSyncConflict(mode) {
  const modal = document.getElementById('syncConflictModal');
  if (!modal || !modal.dataset.pendingData) return;
  
  const data = JSON.parse(modal.dataset.pendingData);
  closeSyncConflictModal();
  
  if (mode === 'overwrite' || mode === 'merge') {
    loadWorkspaceFromDiskData(data, mode);
  } else if (mode === 'export') {
    flushDiskSync(true);
  }
}

function updateSyncStatusUI(tempState = null) {
  const statusIcon = document.getElementById('syncStatusIcon');
  const statusText = document.getElementById('syncStatusText');
  const statusDot = document.getElementById('syncStatusDot');
  
  if (!statusIcon || !statusText || !statusDot) return;
  
  const effStatus = tempState || (externalChangesWaiting ? 'external_changes' : fileSyncStatus);

  if (fileSyncStatus === 'unsupported') {
    statusDot.className = 'w-2 h-2 rounded-full bg-slate-300 inline-block shadow-sm';
    statusIcon.className = 'fa-solid fa-ban text-[11px] text-slate-400';
    statusText.innerText = 'Local (Offline)';
    statusText.title = "Direct disk sync not supported in this browser. Use Chrome/Brave/Edge.";
  } else if (effStatus === 'local') {
    statusDot.className = 'w-2 h-2 rounded-full bg-slate-400 inline-block shadow-sm';
    statusIcon.className = 'fa-solid fa-database text-[11px] text-slate-500';
    statusText.innerText = 'Sync: Local';
  } else if (effStatus === 'connected' || effStatus === 'synced') {
    statusDot.className = 'w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-sm';
    statusIcon.className = 'fa-solid fa-arrows-rotate text-[11px] text-emerald-600';
    statusText.innerText = `Sync: ${fileSyncFileName}`;
  } else if (effStatus === 'syncing') {
    statusDot.className = 'w-2 h-2 rounded-full bg-amber-400 inline-block shadow-sm animate-pulse';
    statusIcon.className = 'fa-solid fa-spinner fa-spin text-[11px] text-amber-500';
    statusText.innerText = 'Syncing...';
  } else if (effStatus === 'permission_prompt') {
    statusDot.className = 'w-2 h-2 rounded-full bg-indigo-500 inline-block shadow-sm animate-pulse';
    statusIcon.className = 'fa-solid fa-hand-pointer text-[11px] text-indigo-600';
    statusText.innerText = 'Sync: Click to authorize';
  } else if (effStatus === 'external_changes') {
    statusDot.className = 'w-2 h-2 rounded-full bg-indigo-500 inline-block shadow-sm animate-bounce';
    statusIcon.className = 'fa-solid fa-cloud-arrow-down text-[11px] text-indigo-600';
    statusText.innerText = 'Sync: Updates available';
  } else if (effStatus === 'error') {
    statusDot.className = 'w-2 h-2 rounded-full bg-red-500 inline-block shadow-sm';
    statusIcon.className = 'fa-solid fa-circle-exclamation text-[11px] text-red-600';
    statusText.innerText = 'Sync: Error';
  }

  // Update saveStatusBadge in editor if connected
  const saveBadge = document.getElementById('saveStatusBadge');
  const saveLabel = document.getElementById('saveStatusText');
  const saveIcon = document.getElementById('saveStatusIcon');
  
  if (saveBadge && saveLabel && saveIcon && (fileSyncStatus === 'connected' || fileSyncStatus === 'syncing')) {
    if (effStatus === 'syncing') {
      saveLabel.innerText = "Saving to disk...";
      saveIcon.className = 'fa-solid fa-spinner fa-spin text-amber-500';
      saveBadge.className = 'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 font-sans border border-amber-200 dark:border-amber-800';
    } else {
      saveLabel.innerText = `Saved to disk`;
      saveIcon.className = 'fa-solid fa-hard-drive text-emerald-500';
      saveBadge.className = 'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-sans border border-emerald-200 dark:border-emerald-800';
    }
  } else if (saveLabel && saveLabel.innerText.startsWith("Saved to disk")) {
    updateSaveStatus('synced', 'Saved (Local)');
  }
}

// Renders dynamic content inside the Sync Modal
async function renderSyncModalContent() {
  const contentDiv = document.getElementById('syncModalDynamicContent');
  if (!contentDiv) return;

  if (fileSyncStatus === 'unsupported') {
    contentDiv.innerHTML = `
      <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
        <p class="font-bold text-slate-800 dark:text-slate-100 mb-2"><i class="fa-solid fa-ban text-red-500 mr-2"></i>Not Supported in this Browser</p>
        <p class="mb-2">Direct local file synchronization utilizes the <strong>File System Access API</strong>, which is currently only available on Chromium-based browsers like Google Chrome, Microsoft Edge, Opera, and Brave.</p>
        <p>You can continue using DocCraft Studio seamlessly in 100% offline local IndexedDB mode. For backups, please use the manual Workspace JSON Backup button.</p>
      </div>
    `;
    return;
  }

  if (fileSyncStatus === 'permission_prompt') {
    contentDiv.innerHTML = `
      <div class="p-4 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl border border-indigo-200 dark:border-indigo-800 text-sm text-indigo-800 dark:text-indigo-200 flex flex-col items-center justify-center text-center space-y-3">
        <div class="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center">
          <i class="fa-solid fa-shield-halved text-2xl text-indigo-500"></i>
        </div>
        <div>
          <p class="font-bold mb-1">Browser Permission Required</p>
          <p class="text-xs opacity-80">DocCraft needs permission to access your synchronized file: <br><strong>${escapeHtml(fileSyncFileName)}</strong></p>
        </div>
        <button onclick="requestSyncFilePermission()" class="px-5 py-2 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold shadow-sm transition">
          <i class="fa-solid fa-check mr-1.5"></i> Authorize Access
        </button>
      </div>
    `;
    return;
  }

  if (fileSyncStatus === 'local') {
    contentDiv.innerHTML = `
      <div class="space-y-4">
        <div class="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300">
          <p class="font-bold text-slate-800 dark:text-slate-100 mb-2"><i class="fa-solid fa-database text-slate-400 mr-2"></i>Local Mode (IndexedDB)</p>
          <p>Your workspace is currently saved exclusively in the browser's local database. It is not synchronized with any external folder.</p>
        </div>
        <div class="grid grid-cols-1 gap-3">
          <button onclick="connectExistingSyncFile()" class="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 hover:border-indigo-400 hover:shadow-sm rounded-xl text-left flex items-start gap-3 transition">
            <div class="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/40 flex flex-shrink-0 items-center justify-center">
              <i class="fa-solid fa-folder-open text-indigo-600 dark:text-indigo-400 text-lg"></i>
            </div>
            <div>
              <p class="font-bold text-sm text-slate-800 dark:text-slate-100 mb-0.5">Connect Existing JSON File</p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Open a doccraft-data.json file synced from another computer (Google Drive, Syncthing).</p>
            </div>
          </button>
          
          <button onclick="createNewSyncFile()" class="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-emerald-200 dark:border-emerald-700 hover:border-emerald-400 hover:shadow-sm rounded-xl text-left flex items-start gap-3 transition">
            <div class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/40 flex flex-shrink-0 items-center justify-center">
              <i class="fa-solid fa-file-circle-plus text-emerald-600 dark:text-emerald-400 text-lg"></i>
            </div>
            <div>
              <p class="font-bold text-sm text-slate-800 dark:text-slate-100 mb-0.5">Create New Sync File</p>
              <p class="text-[11px] text-slate-500 dark:text-slate-400">Export your current workspace to a new JSON file and maintain continuous sync.</p>
            </div>
          </button>
        </div>
      </div>
    `;
    return;
  }

  // Connected state
  const docsCount = (await dbGetDocuments()).length;
  const foldersCount = (await dbGetFolders()).length;
  const imgsCount = (await dbGetAllAttachments()).length;

  const dateStr = fileSyncLastSavedAt ? new Date(fileSyncLastSavedAt).toLocaleString() : 'Never';

  contentDiv.innerHTML = `
    <div class="space-y-4">
      <div class="p-4 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-sm flex items-start justify-between">
        <div>
          <p class="font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-2">
            <i class="fa-solid fa-arrows-rotate"></i>
            Active Synchronization
          </p>
          <p class="text-xs text-emerald-700 dark:text-emerald-400/80 mb-0.5"><span class="font-semibold text-emerald-800 dark:text-emerald-300">File:</span> ${escapeHtml(fileSyncFileName)}</p>
          <p class="text-xs text-emerald-700 dark:text-emerald-400/80"><span class="font-semibold text-emerald-800 dark:text-emerald-300">Last Synced:</span> ${dateStr}</p>
        </div>
        <div class="text-right flex flex-col items-end gap-1">
          <span class="inline-flex px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200 rounded text-[10px] font-bold">
            ${docsCount} docs
          </span>
          <span class="inline-flex px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200 rounded text-[10px] font-bold">
            ${foldersCount} folders
          </span>
          <span class="inline-flex px-2 py-0.5 bg-emerald-200 dark:bg-emerald-800/80 text-emerald-800 dark:text-emerald-200 rounded text-[10px] font-bold">
            ${imgsCount} imgs
          </span>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <button onclick="flushDiskSync(true)" class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 h-16 shadow-sm">
          <i class="fa-solid fa-upload text-base"></i>
          <span>Push to File</span>
        </button>
        <button onclick="triggerReloadFromExternalChanges()" class="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/40 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 rounded-lg text-xs font-bold transition flex flex-col items-center justify-center gap-1.5 h-16 shadow-sm">
          <i class="fa-solid fa-download text-base"></i>
          <span>Reload from File</span>
        </button>
      </div>
      
      <button onclick="disconnectSyncFile()" class="w-full px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 border border-slate-200 dark:border-slate-700 hover:border-red-200 dark:hover:border-red-800 rounded-lg text-xs font-bold transition flex items-center justify-center gap-2">
        <i class="fa-solid fa-link-slash"></i>
        <span>Disconnect File</span>
      </button>
    </div>
  `;
}
