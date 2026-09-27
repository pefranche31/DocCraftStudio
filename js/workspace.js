/**
 * DocCraft Studio - Workspace Management & Persistence
 * Tree hierarchy, folders, drag & drop, file exports & backups
 */

function getBackupTimestamp() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}h${minutes}`;
}

var pendingCreateItemType = 'asciidoc'; // 'asciidoc' | 'markdown' | 'folder'

async function openCreateItemModal(type = 'asciidoc') {
  pendingCreateItemType = type;
  
  const modal = document.getElementById('createItemModal');
  const titleEl = document.getElementById('createItemModalTitle');
  const nameInput = document.getElementById('createItemName');
  const selectEl = document.getElementById('createItemFolderSelect');
  const submitBtn = document.getElementById('createItemSubmitBtn');
  if (!modal || !nameInput || !selectEl) return;

  nameInput.value = '';
  
  const templateGroup = document.getElementById('createItemTemplateGroup');
  const templateSelect = document.getElementById('createItemTemplateSelect');

  if (type === 'folder') {
    if (templateGroup) templateGroup.classList.add('hidden');
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-folder-plus text-amber-500 mr-2"></i>New Folder`;
    nameInput.placeholder = "Folder name (e.g. Projects, Personal)...";
    if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-plus mr-1"></i>Create Folder`;
  } else {
    if (templateGroup) templateGroup.classList.remove('hidden');
    if (templateSelect) {
      let tplOptions = `
        <option value="default">Default Header (Title, Date, Tags, Status)</option>
        <option value="blank">Blank Note (Completely Empty)</option>
      `;

      const getTplsFn = window.getAllAvailableTemplates || (typeof getAllAvailableTemplates === 'function' ? getAllAvailableTemplates : null);
      if (getTplsFn) {
        const allTpls = getTplsFn();
        const availableList = Object.entries(allTpls).filter(([k, t]) => {
          if (!t.format || t.format === 'auto') return true;
          return t.format === type;
        });

        if (availableList.length > 0) {
          tplOptions += `<optgroup label="Available Templates">`;
          availableList.forEach(([k, t]) => {
            tplOptions += `<option value="${k}">${escapeHtml(t.name)}</option>`;
          });
          tplOptions += `</optgroup>`;
        }
      }
      templateSelect.innerHTML = tplOptions;
      templateSelect.value = "default";
    }

    if (type === 'markdown') {
      if (titleEl) titleEl.innerHTML = `<i class="fa-brands fa-markdown text-blue-500 mr-2"></i>New Markdown Note`;
      nameInput.placeholder = "Note title (e.g. Sprint Review)...";
      if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-plus mr-1"></i>Create Note`;
    } else {
      if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-file-lines text-teal-600 mr-2"></i>New AsciiDoc Note`;
      nameInput.placeholder = "Note title (e.g. Architecture Brief)...";
      if (submitBtn) submitBtn.innerHTML = `<i class="fa-solid fa-plus mr-1"></i>Create Note`;
    }
  }

  // Populate folder select options hierarchically
  const folders = await dbGetFolders();
  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

  let defaultFolderId = "";
  if (selectedWorkspaceNode && selectedWorkspaceNode.type === 'folder') {
    defaultFolderId = selectedWorkspaceNode.id;
  } else if (currentDocumentId) {
    const curDoc = await dbGetDocument(currentDocumentId);
    if (curDoc && curDoc.folderId) {
      defaultFolderId = curDoc.folderId;
    }
  }

  const optionsHtml = buildFolderSelectOptionsHtml(folders, null, 0, defaultFolderId);
  selectEl.innerHTML = `
    <option value="" ${defaultFolderId === "" ? 'selected' : ''}>🏠 Root Workspace</option>
    ${optionsHtml}
  `;

  modal.classList.remove('hidden');
  setTimeout(() => {
    nameInput.focus();
    nameInput.select();
  }, 50);
}

function buildFolderSelectOptionsHtml(folders, parentId, depth, selectedId) {
  const children = folders.filter(f => (f.parentId || null) === (parentId || null));
  let html = '';
  for (const f of children) {
    const indent = '&nbsp;&nbsp;'.repeat(depth);
    const isSelected = (f.id === selectedId) ? 'selected' : '';
    html += `<option value="${f.id}" ${isSelected}>${indent}📁 ${escapeHtml(f.name)}</option>`;
    html += buildFolderSelectOptionsHtml(folders, f.id, depth + 1, selectedId);
  }
  return html;
}

function closeCreateItemModal() {
  const modal = document.getElementById('createItemModal');
  if (modal) modal.classList.add('hidden');
}

async function submitCreateItemModal() {
  const nameInput = document.getElementById('createItemName');
  const selectEl = document.getElementById('createItemFolderSelect');
  if (!nameInput) return;

  const rawName = nameInput.value.trim();
  if (!rawName) {
    showToast("Please enter a name", false);
    return;
  }

  const targetFolderId = (selectEl && selectEl.value) ? selectEl.value : null;

  if (pendingCreateItemType === 'folder') {
    const newId = 'folder-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    const folderObj = {
      id: newId,
      name: rawName,
      parentId: targetFolderId
    };

    await dbSaveFolder(folderObj);
    selectedWorkspaceNode = { type: 'folder', id: newId };
    expandedFolders.add(newId);
    if (targetFolderId) expandedFolders.add(targetFolderId);

    renderWorkspaceDocList();
    closeCreateItemModal();
    showToast(`Created folder: ${rawName}`);
  } else {
    const ext = (pendingCreateItemType === 'markdown') ? 'md' : 'adoc';
    const fullName = (rawName.endsWith('.adoc') || rawName.endsWith('.md')) ? rawName : `${rawName}.${ext}`;
    const noteTitle = fullName.replace(/\.(adoc|md)$/i, '');

    const templateSelect = document.getElementById('createItemTemplateSelect');
    const chosenTemplateKey = templateSelect ? templateSelect.value : 'default';

    let initialContent = null; // null triggers default header in createNewDocument
    if (chosenTemplateKey === 'blank') {
      initialContent = ""; // explicitly empty note
    } else if (chosenTemplateKey !== 'default') {
      const getTplContentFn = window.getNoteTemplateContent || (typeof getNoteTemplateContent === 'function' ? getNoteTemplateContent : null);
      if (getTplContentFn) {
        initialContent = getTplContentFn(chosenTemplateKey, noteTitle, pendingCreateItemType);
      }
    }

    const docObj = await createNewDocument(fullName, initialContent);
    if (docObj) {
      if (targetFolderId) {
        docObj.folderId = targetFolderId;
        await dbSaveDocument(docObj);
        expandedFolders.add(targetFolderId);
      }
      closeCreateItemModal();
      openDocumentFromWorkspace(docObj.id);
      showToast(`Created note: ${docObj.name}`);
    }
  }
}

function toggleWorkspaceSidebar(open) {
  // Sidebar is permanently visible on desktop
}

function selectWorkspaceNode(type, id) {
  selectedWorkspaceNode = { type, id };
  renderWorkspaceDocList();
}

function toggleFolderExpand(folderId) {
  if (expandedFolders.has(folderId)) {
    expandedFolders.delete(folderId);
  } else {
    expandedFolders.add(folderId);
  }
  renderWorkspaceDocList();
}

async function renameFolderFromWorkspace(id) {
  const folder = await dbGetFolder(id);
  if (!folder) return;

  const newName = prompt("Rename folder:", folder.name);
  if (newName && newName.trim() && newName.trim() !== folder.name) {
    folder.name = newName.trim();
    await dbSaveFolder(folder);
    renderWorkspaceDocList();
    showToast(`Renamed folder to: ${folder.name}`);
  }
}

async function deleteFolderFromWorkspace(id) {
  const folder = await dbGetFolder(id);
  if (!folder) return;

  if (confirm(`Are you sure you want to delete ${folder.name} and ALL its subfolders and documents?`)) {
    await cascadeDeleteFolder(id);
    
    const currentDoc = await dbGetDocument(currentDocumentId);
    if (!currentDoc || currentDoc.folderId === id) {
      const docs = await dbGetDocuments();
      if (docs.length > 0) {
        openDocumentFromWorkspace(docs[0].id);
      } else {
        const defaultDoc = await createNewDocument("Untitled.adoc", "");
        openDocumentFromWorkspace(defaultDoc.id);
      }
    } else {
      renderWorkspaceDocList();
    }
    showToast(`Deleted folder: ${folder.name}`);
  }
}

async function renderWorkspaceDocList() {
  const container = document.getElementById('workspaceDocList');
  if (!container) return;

  const [allDocs, folders] = await Promise.all([dbGetDocuments(), dbGetFolders()]);

  allDocs.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));
  folders.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true }));

  const docs = allDocs.filter(d => !d.isTrash);
  const trashedDocs = allDocs.filter(d => d.isTrash);

  // 1. TRASH VIEW MODE
  if (isViewingTrash) {
    let trashHtml = `
      <div class="mb-3 p-2 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300">
          <i class="fa-solid fa-trash-can"></i>
          <span>Trash (${trashedDocs.length})</span>
        </div>
        <div class="flex items-center gap-1">
          ${trashedDocs.length > 0 ? `
            <button onclick="emptyTrash()" class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 hover:bg-rose-700 text-white transition cursor-pointer">
              Empty
            </button>
          ` : ''}
          <button onclick="toggleTrashView(false)" class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-300 transition cursor-pointer">
            Done
          </button>
        </div>
      </div>
    `;

    if (trashedDocs.length === 0) {
      trashHtml += `
        <div class="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
          <i class="fa-regular fa-trash-can text-2xl mb-1 opacity-40 block"></i>
          <span>Trash is empty</span>
        </div>
      `;
    } else {
      trashHtml += `<div class="space-y-1.5">`;
      trashedDocs.forEach(td => {
        const icon = td.type === 'asciidoc' ? 'fa-file-lines text-teal-600' : 'fa-brands fa-markdown text-blue-500';
        trashHtml += `
          <div class="p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between gap-2 text-xs">
            <div class="flex items-center gap-2 min-w-0 flex-1">
              <i class="fa-solid ${icon} text-xs shrink-0"></i>
              <span class="truncate font-medium text-slate-700 dark:text-slate-200 line-through opacity-75">${escapeHtml(td.name)}</span>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              <button onclick="restoreDocumentFromTrash('${td.id}')" title="Restore note" class="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">
                <i class="fa-solid fa-rotate-left"></i>
                <span>Restore</span>
              </button>
              <button onclick="permanentlyDeleteDocument('${td.id}')" title="Delete permanently" class="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer">
                <i class="fa-regular fa-trash-can text-xs"></i>
              </button>
            </div>
          </div>
        `;
      });
      trashHtml += `</div>`;
    }

    container.innerHTML = trashHtml;
    return;
  }

  // 2. TAG FILTERED VIEW MODE
  if (activeTagFilter) {
    let tagFilteredHtml = `
      <div class="mb-3 p-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center justify-between text-xs">
        <div class="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300">
          <i class="fa-solid fa-tag"></i>
          <span>Tag: #${escapeHtml(activeTagFilter)}</span>
        </div>
        <button onclick="clearTagFilter()" class="px-2 py-0.5 rounded text-[10px] font-bold bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 border border-slate-200 dark:border-slate-700 transition cursor-pointer">
          Clear ✕
        </button>
      </div>
    `;

    const filteredDocs = docs.filter(doc => {
      const tags = extractTagsFromContent(doc.content, doc.type);
      const meta = parseDocumentMetadata(doc.content, doc.type);
      if (meta && meta.tags) {
        const rawTags = Array.isArray(meta.tags) ? meta.tags : String(meta.tags).split(/[, ]+/);
        rawTags.forEach(t => tags.push(String(t).trim().replace(/^#/, '').toLowerCase()));
      }
      return tags.includes(activeTagFilter.toLowerCase());
    });

    if (filteredDocs.length === 0) {
      tagFilteredHtml += `
        <div class="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
          <i class="fa-solid fa-tag text-2xl mb-1 opacity-40 block"></i>
          <span>No notes found with tag #${escapeHtml(activeTagFilter)}</span>
        </div>
      `;
    } else {
      tagFilteredHtml += `<div class="space-y-1">`;
      filteredDocs.forEach(doc => {
        tagFilteredHtml += renderDocRow(doc);
      });
      tagFilteredHtml += `</div>`;
    }

    container.innerHTML = tagFilteredHtml;
    return;
  }

  // 3. NORMAL HIERARCHICAL WORKSPACE VIEW
  // Map folders by parentId
  const foldersByParent = new Map();
  folders.forEach(f => {
    const pId = f.parentId || null;
    if (!foldersByParent.has(pId)) foldersByParent.set(pId, []);
    foldersByParent.get(pId).push(f);
  });

  // Map docs by folderId
  const docsByFolder = new Map();
  docs.forEach(d => {
    const fId = d.folderId || null;
    if (!docsByFolder.has(fId)) docsByFolder.set(fId, []);
    docsByFolder.get(fId).push(d);
  });

  let html = '';

  function renderDocRow(doc) {
    const isCurrent = (doc.id === currentDocumentId);
    const icon = doc.type === 'asciidoc' ? 'fa-file-lines text-teal-600 dark:text-teal-400' : 'fa-brands fa-markdown text-blue-500 dark:text-blue-400';
    const isPinned = !!doc.isPinned;
    
    return `
      <div draggable="true" 
           ondragstart="event.stopPropagation(); event.dataTransfer.setData('text/plain', 'doc:${doc.id}'); event.dataTransfer.setData('docId', '${doc.id}');"
           class="group flex items-center justify-between p-2 rounded-xl border ${isCurrent ? 'bg-indigo-50/70 dark:bg-indigo-950/50 border-indigo-200 dark:border-indigo-800 font-semibold' : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/20 hover:bg-white dark:bg-slate-900/10 dark:hover:bg-slate-800/40'} transition-all cursor-grab active:cursor-grabbing select-none" onclick="openDocumentFromWorkspace('${doc.id}')">
        <div class="flex items-center gap-1.5 min-w-0 flex-1">
          <button onclick="togglePinDocument('${doc.id}', event)" title="${isPinned ? 'Unpin note' : 'Pin note to top'}" class="p-0.5 text-slate-300 dark:text-slate-600 hover:text-amber-400 dark:hover:text-amber-300 transition shrink-0 cursor-pointer">
            <i class="fa-solid fa-star text-[11px] ${isPinned ? 'text-amber-400 dark:text-amber-300' : 'opacity-0 group-hover:opacity-100'}"></i>
          </button>
          <i class="fa-solid ${icon} text-xs shrink-0"></i>
          <div class="min-w-0 flex-1">
            <div class="text-xs truncate text-slate-700 dark:text-slate-200 ${isCurrent ? 'text-indigo-900 dark:text-indigo-200' : ''}">${escapeHtml(doc.name)}</div>
          </div>
        </div>
        
        <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
          <button onclick="event.stopPropagation(); renameDocumentFromWorkspace('${doc.id}')" title="Rename note" class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer">
            <i class="fa-regular fa-pen-to-square text-[10px]"></i>
          </button>
          <button onclick="event.stopPropagation(); deleteDocumentFromWorkspace('${doc.id}')" title="Move note to Trash" class="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer">
            <i class="fa-regular fa-trash-can text-[10px]"></i>
          </button>
        </div>
      </div>
    `;
  }

  function getSelectClass(type, id) {
    const isSelected = (selectedWorkspaceNode && selectedWorkspaceNode.type === type && selectedWorkspaceNode.id === id);
    return isSelected 
      ? 'bg-indigo-50/75 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 font-semibold' 
      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/40';
  }

  // A. Pinned / Starred Notes Section
  const pinnedDocs = docs.filter(d => d.isPinned);
  if (pinnedDocs.length > 0) {
    html += `
      <div class="mb-3">
        <div class="flex items-center gap-1.5 px-1.5 py-1 text-[10px] font-bold text-amber-500 dark:text-amber-400 uppercase tracking-wider select-none mb-1">
          <i class="fa-solid fa-star text-[10px]"></i>
          <span>Pinned Notes (${pinnedDocs.length})</span>
        </div>
        <div class="space-y-1">
          ${pinnedDocs.map(doc => renderDocRow(doc)).join('')}
        </div>
      </div>
      <div class="h-px bg-slate-100 dark:bg-slate-700/60 my-2"></div>
    `;
  }

  // B. Tags Explorer Section
  try {
    const tagsList = await getWorkspaceTagsIndex();
    if (tagsList.length > 0) {
      html += `
        <div class="mb-3">
          <div class="flex items-center justify-between px-1.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none mb-1">
            <span class="flex items-center gap-1.5">
              <i class="fa-solid fa-tags text-[10px]"></i>
              <span>Tags</span>
            </span>
            <span class="text-[9px] font-mono opacity-60">${tagsList.length}</span>
          </div>
          <div class="flex flex-wrap gap-1 px-1">
            ${tagsList.slice(0, 15).map(t => `
              <button onclick="filterNotesByTag('${escapeHtml(t.name)}')" title="${t.count} note(s) tagged #${escapeHtml(t.name)}" class="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/60 text-slate-700 hover:text-indigo-600 dark:text-indigo-300 dark:hover:text-indigo-200 border border-slate-200 dark:border-slate-700 transition cursor-pointer select-none">
                <span>#${escapeHtml(t.name)}</span>
                <span class="opacity-60 text-[9px] font-bold font-sans dark:text-slate-400">${t.count}</span>
              </button>
            `).join('')}
          </div>
        </div>
        <div class="h-px bg-slate-100 dark:bg-slate-700/60 my-2"></div>
      `;
    }
  } catch(err) {
    console.error("Tags rendering error:", err);
  }

  // C. Recently Opened section
  try {
    const recentIds = JSON.parse(localStorage.getItem('recently_opened') || '[]');
    const recentDocs = recentIds
      .map(id => docs.find(d => d.id === id))
      .filter(Boolean);

    if (recentDocs.length > 0) {
      html += `
        <div class="mb-3">
          <div class="flex items-center gap-1.5 px-1.5 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none mb-1">
            <i class="fa-regular fa-clock"></i>
            <span>Recently Opened</span>
          </div>
          <div class="space-y-1">
            ${recentDocs.map(doc => renderDocRow(doc)).join('')}
          </div>
        </div>
        <div class="h-px bg-slate-100 dark:bg-slate-700/60 my-2"></div>
      `;
    }
  } catch (e) {
    console.error("Recently opened rendering error:", e);
  }

  // D. Root Workspace Drop Target
  const isRootSelected = (!selectedWorkspaceNode || selectedWorkspaceNode.type === 'root');
  html += `
    <div onclick="selectWorkspaceNode('root', null)" 
         ondragover="event.preventDefault(); this.classList.add('border-indigo-400', 'border-dashed');" 
         ondragleave="this.classList.remove('border-indigo-400', 'border-dashed');" 
         ondrop="handleDocDrop(event, null, 'Root Workspace')"
         class="flex items-center justify-between p-1.5 rounded-lg border text-xs cursor-pointer ${isRootSelected ? 'bg-indigo-50/55 dark:bg-indigo-950/20 border-indigo-200/50 dark:border-indigo-800/40 text-indigo-600 dark:text-indigo-400 font-semibold' : 'border-transparent text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700/40'} select-none mb-1 transition-all">
      <div class="flex items-center gap-2">
        <i class="fa-solid fa-house-laptop text-sm shrink-0"></i>
        <span>Root Workspace</span>
      </div>
      <span class="text-[10px] opacity-60 font-mono">${(docsByFolder.get(null) || []).length}</span>
    </div>
    <div class="h-px bg-slate-100 dark:bg-slate-700/60 my-2"></div>
  `;

  // E. Recursive folder branch renderer
  function renderFolderBranch(folder, depth = 0) {
    const isExpanded = expandedFolders.has(folder.id);
    const folderClass = getSelectClass('folder', folder.id);
    const arrowIcon = isExpanded ? 'fa-chevron-down' : 'fa-chevron-right';
    const folderIcon = isExpanded ? 'fa-folder-open' : 'fa-folder';

    const childFolders = foldersByParent.get(folder.id) || [];
    const childDocs = docsByFolder.get(folder.id) || [];
    const totalCount = childFolders.length + childDocs.length;

    let branchHtml = `
      <div class="space-y-1">
        <div draggable="true"
             ondragstart="event.stopPropagation(); event.dataTransfer.setData('text/plain', 'folder:${folder.id}'); event.dataTransfer.setData('folderId', '${folder.id}');"
             onclick="selectWorkspaceNode('folder', '${folder.id}')" 
             ondragover="event.preventDefault(); event.stopPropagation(); this.classList.add('border-indigo-400', 'border-dashed');" 
             ondragleave="this.classList.remove('border-indigo-400', 'border-dashed');" 
             ondrop="event.stopPropagation(); handleDocDrop(event, '${folder.id}', '${escapeHtml(folder.name)}')"
             class="group flex items-center justify-between p-1.5 rounded-lg border text-xs cursor-grab active:cursor-grabbing ${folderClass} transition-all">
          <div class="flex items-center gap-1.5 min-w-0 flex-1">
            <button onclick="event.stopPropagation(); toggleFolderExpand('${folder.id}')" class="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer">
              <i class="fa-solid ${arrowIcon} text-[9px] shrink-0"></i>
            </button>
            <i class="fa-solid ${folderIcon} text-amber-500 text-sm shrink-0"></i>
            <span class="truncate font-medium text-slate-700 dark:text-slate-200">${escapeHtml(folder.name)}</span>
            <span class="text-[10px] text-slate-400 font-mono">(${totalCount})</span>
          </div>
          <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1">
            <button onclick="event.stopPropagation(); renameFolderFromWorkspace('${folder.id}')" title="Rename folder" class="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition cursor-pointer">
              <i class="fa-regular fa-pen-to-square text-[10px]"></i>
            </button>
            <button onclick="event.stopPropagation(); deleteFolderFromWorkspace('${folder.id}')" title="Delete folder & contents" class="p-1 text-slate-400 hover:text-red-500 transition cursor-pointer">
              <i class="fa-regular fa-trash-can text-[10px]"></i>
            </button>
          </div>
        </div>

        ${isExpanded ? `
          <div class="pl-3.5 border-l border-slate-200 dark:border-slate-700 ml-2 space-y-1 pt-0.5 pb-1">
            ${childFolders.map(cf => renderFolderBranch(cf, depth + 1)).join('')}
            ${childDocs.map(cd => renderDocRow(cd)).join('')}
            ${totalCount === 0 ? `
              <div class="text-[10px] text-slate-400 italic py-1 pl-1 select-none">Empty folder</div>
            ` : ''}
          </div>
        ` : ''}
      </div>
    `;

    return branchHtml;
  }

  // Render top-level folders (parentId === null)
  const rootFolders = foldersByParent.get(null) || [];
  rootFolders.forEach(rf => {
    html += renderFolderBranch(rf, 0);
  });

  // Render root documents (folderId === null)
  const rootDocs = docsByFolder.get(null) || [];
  if (rootDocs.length > 0) {
    if (rootFolders.length > 0) {
      html += `<div class="h-px bg-slate-100 dark:bg-slate-700/60 my-2"></div>`;
    }
    rootDocs.forEach(doc => {
      html += renderDocRow(doc);
    });
  }

  // F. Trash Bin Bottom Link
  html += `
    <div class="pt-2 mt-4 border-t border-slate-100 dark:border-slate-700/60">
      <div onclick="toggleTrashView(true)" title="Open Trash Bin" class="flex items-center justify-between p-2 rounded-xl text-xs text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50/50 dark:hover:bg-rose-950/20 cursor-pointer select-none transition-all">
        <span class="flex items-center gap-2">
          <i class="fa-solid fa-trash-can text-xs"></i>
          <span>Trash</span>
        </span>
        <span class="font-mono text-[10px] px-1.5 py-0.2 rounded-full ${trashedDocs.length > 0 ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 font-bold' : 'opacity-60'}">
          ${trashedDocs.length}
        </span>
      </div>
    </div>
  `;

  container.innerHTML = html;
}

async function isFolderDescendant(checkFolderId, potentialAncestorId) {
  if (!checkFolderId || !potentialAncestorId) return false;
  if (checkFolderId === potentialAncestorId) return true;
  let cur = await dbGetFolder(checkFolderId);
  while (cur && cur.parentId) {
    if (cur.parentId === potentialAncestorId) return true;
    cur = await dbGetFolder(cur.parentId);
  }
  return false;
}

async function handleDocDrop(e, targetFolderId, targetFolderName) {
  e.preventDefault();
  
  const target = e.currentTarget;
  if (target) {
    target.classList.remove('border-indigo-400', 'border-dashed');
  }

  const rawData = e.dataTransfer.getData('text/plain') || '';
  const folderId = e.dataTransfer.getData('folderId') || (rawData.startsWith('folder:') ? rawData.slice(7) : null);
  const docId = e.dataTransfer.getData('docId') || (rawData.startsWith('doc:') ? rawData.slice(4) : (rawData && !rawData.startsWith('folder:') ? rawData : null));

  // 1. Handling Folder Drag & Drop
  if (folderId) {
    if (targetFolderId === folderId) return; // Cannot drop onto itself

    const isLoop = await isFolderDescendant(targetFolderId, folderId);
    if (isLoop) {
      showToast("Cannot move a folder into its own subfolder", false);
      return;
    }

    const folder = await dbGetFolder(folderId);
    if (!folder) return;
    if (folder.parentId === targetFolderId) return;

    folder.parentId = targetFolderId;
    await dbSaveFolder(folder);

    if (targetFolderId) {
      expandedFolders.add(targetFolderId);
    }

    renderWorkspaceDocList();
    showToast(`Moved folder "${folder.name}" to ${targetFolderName}`);
    return;
  }

  // 2. Handling Document Drag & Drop
  if (docId) {
    const docObj = await dbGetDocument(docId);
    if (!docObj) return;
    if (docObj.folderId === targetFolderId) return;

    docObj.folderId = targetFolderId;
    docObj.updatedAt = Date.now();
    await dbSaveDocument(docObj);

    if (targetFolderId) {
      expandedFolders.add(targetFolderId);
    }

    renderWorkspaceDocList();
    showToast(`Moved "${docObj.name}" to ${targetFolderName}`);
  }
}

function recordRecentlyOpened(id) {
  if (!id) return;
  try {
    let list = JSON.parse(localStorage.getItem('recently_opened') || '[]');
    list = list.filter(item => item !== id);
    list.unshift(id);
    if (list.length > 5) {
      list = list.slice(0, 5);
    }
    localStorage.setItem('recently_opened', JSON.stringify(list));
  } catch(e) {
    console.error("Failed to save recently opened doc:", e);
  }
}

async function openDocumentFromWorkspace(id) {
  const docObj = await dbGetDocument(id);
  if (!docObj) return;

  currentDocumentId = docObj.id;
  setEditorValue(docObj.content);
  setMode(docObj.type);

  const editorLabel = document.getElementById('editorLabel');
  if (editorLabel) editorLabel.innerText = docObj.name;

  recordRecentlyOpened(docObj.id);

  updateSaveStatus('synced', 'Saved');
  renderWorkspaceDocList();
  toggleWorkspaceSidebar(false);
}

async function renameDocumentFromWorkspace(id) {
  const docObj = await dbGetDocument(id);
  if (!docObj) return;

  const newName = prompt("Rename document:", docObj.name);
  if (newName && newName.trim() && newName.trim() !== docObj.name) {
    const cleanedName = newName.trim();
    const ext = cleanedName.split('.').pop().toLowerCase();
    const type = (ext === 'md' || ext === 'markdown') ? 'markdown' : 'asciidoc';
    
    docObj.name = cleanedName;
    docObj.type = type;
    docObj.updatedAt = Date.now();
    await dbSaveDocument(docObj);
    
    if (currentDocumentId === id) {
      setMode(type);
      const editorLabel = document.getElementById('editorLabel');
      if (editorLabel) editorLabel.innerText = cleanedName;
    }

    renderWorkspaceDocList();
    showToast(`Renamed document to: ${cleanedName}`);
  }
}

async function deleteDocumentFromWorkspace(id) {
  const docObj = await dbGetDocument(id);
  if (!docObj) return;

  if (docObj.isTrash) {
    if (confirm(`Permanently delete "${docObj.name}"? This cannot be undone.`)) {
      await dbDeleteDocument(id);
      showToast(`Permanently deleted: ${docObj.name}`);
      renderWorkspaceDocList();
    }
    return;
  }

  // Soft delete to Trash
  docObj.isTrash = true;
  docObj.trashedAt = Date.now();
  await dbSaveDocument(docObj);
  showToast(`Moved to Trash: ${docObj.name}`);

  if (currentDocumentId === id) {
    const docs = await dbGetDocuments();
    const activeDocs = docs.filter(d => !d.isTrash);
    if (activeDocs.length > 0) {
      openDocumentFromWorkspace(activeDocs[0].id);
    } else {
      const defaultDoc = await createNewDocument("Untitled.adoc", "");
      openDocumentFromWorkspace(defaultDoc.id);
    }
  } else {
    renderWorkspaceDocList();
  }
}

async function createConvertedCopy() {
  if (!currentDocumentId) return;
  const originalDoc = await dbGetDocument(currentDocumentId);
  if (!originalDoc) return;

  const isAscii = (originalDoc.type === 'asciidoc');
  const targetType = isAscii ? 'markdown' : 'asciidoc';
  const targetExt = isAscii ? 'md' : 'adoc';
  
  const originalBaseName = originalDoc.name.replace(/\.(adoc|md)$/i, '');
  const newName = `${originalBaseName}-converted.${targetExt}`;

  const convertedContent = isAscii 
    ? convertAsciiDocToMarkdown(originalDoc.content)
    : convertMarkdownToAsciiDoc(originalDoc.content);

  const newDoc = await createNewDocument(newName, convertedContent);
  if (newDoc) {
    if (originalDoc.folderId) {
      newDoc.folderId = originalDoc.folderId;
      await dbSaveDocument(newDoc);
    }
    openDocumentFromWorkspace(newDoc.id);
    showToast(`Created converted copy: ${newDoc.name}`);
  }
}

/* Image Attachment Gallery Handlers */
function setImageModalTab(tab) {
  activeImageTab = tab;
  const webBtn = document.getElementById('tabImgWebBtn');
  const localBtn = document.getElementById('tabImgLocalBtn');
  const webContent = document.getElementById('tabImgWebContent');
  const localContent = document.getElementById('tabImgLocalContent');

  if (tab === 'web') {
    if (webBtn) webBtn.className = "flex-1 py-2 text-center border-b-2 border-teal-500 text-teal-600 dark:text-teal-400";
    if (localBtn) localBtn.className = "flex-1 py-2 text-center border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300";
    if (webContent) webContent.classList.remove('hidden');
    if (localContent) localContent.classList.add('hidden');
  } else {
    if (localBtn) localBtn.className = "flex-1 py-2 text-center border-b-2 border-teal-500 text-teal-600 dark:text-teal-400";
    if (webBtn) webBtn.className = "flex-1 py-2 text-center border-b-2 border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300";
    if (localContent) {
      localContent.classList.remove('hidden');
      localContent.classList.add('flex');
    }
    if (webContent) webContent.classList.add('hidden');
    renderAttachedImagesGallery();
  }
}

function selectAttachmentCard(filename) {
  selectedAttachmentFilename = filename;
  renderAttachedImagesGallery();

  const altInput = document.getElementById('imgAlt');
  if (altInput && !altInput.value) {
    altInput.value = filename;
  }
}

async function handleImageAttachmentUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const att = await processImageFileForAttachment(file);
  if (att) {
    selectedAttachmentFilename = att.filename;
    renderAttachedImagesGallery();
  }
  event.target.value = '';
}

async function renderAttachedImagesGallery() {
  const container = document.getElementById('attachedImagesGallery');
  if (!container) return;

  if (!currentDocumentId) {
    container.innerHTML = `<p class="text-center text-slate-400 text-xs py-4">No active document</p>`;
    return;
  }

  const attachments = await dbGetAttachments(currentDocumentId);
  if (attachments.length === 0) {
    container.innerHTML = `
      <div class="col-span-3 text-center text-slate-400 text-xs py-8">
        <i class="fa-regular fa-image text-2xl mb-1 block opacity-55"></i>
        <span>No pictures attached yet</span>
      </div>
    `;
    return;
  }

  if (!selectedAttachmentFilename && attachments.length > 0) {
    selectedAttachmentFilename = attachments[0].filename;
  }

  let html = '';
  attachments.forEach(att => {
    const isSelected = (att.filename === selectedAttachmentFilename);
    const cardClass = isSelected 
      ? 'border-teal-500 dark:border-teal-400 ring-2 ring-teal-500/50 bg-teal-50/20 dark:bg-teal-950/25' 
      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-slate-50 dark:bg-slate-900';

    html += `
      <div class="relative group border rounded-xl overflow-hidden h-16 cursor-pointer flex items-center justify-center shadow-sm transition-all duration-150 ${cardClass}" onclick="selectAttachmentCard('${att.filename}')">
        <img src="${att.dataUrl}" class="max-h-full max-w-full object-contain p-1" alt="${att.filename}">
        
        ${isSelected ? `
          <div class="absolute top-1 left-1 bg-teal-600 text-white w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold shadow">
            <i class="fa-solid fa-check"></i>
          </div>
        ` : ''}

        <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[8px] text-white font-semibold">
          <span>Select</span>
        </div>
        <button onclick="event.stopPropagation(); deleteAttachmentFromGallery('${att.id}', '${att.filename}')" title="Delete attachment" class="absolute top-1 right-1 w-4.5 h-4.5 rounded-full bg-red-500/80 hover:bg-red-600 text-[8px] text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow">
          <i class="fa-solid fa-times"></i>
        </button>
      </div>
    `;
  });

  container.innerHTML = html;
}

function insertAttachedImage(dataUrl, filename) {
  selectAttachmentCard(filename);
  setImageModalTab('local');
}

async function deleteAttachmentFromGallery(id, filename) {
  if (confirm("Are you sure you want to delete this attachment?")) {
    await dbDeleteAttachment(id);
    if (selectedAttachmentFilename === filename) {
      selectedAttachmentFilename = null;
    }
    renderAttachedImagesGallery();
    showToast("Attachment deleted");
  }
}

/* Document & Workspace Export/Backup Handlers */
async function exportActiveDocumentAndPictures() {
  if (!currentDocumentId) return;
  const docObj = await dbGetDocument(currentDocumentId);
  if (!docObj) return;

  const attachments = await dbGetAttachments(currentDocumentId);

  let exportContent = getEditorValue();
  if (docObj.type === 'asciidoc' && attachments.length > 0) {
    if (!exportContent.match(/^:imagesdir:/m)) {
      if (exportContent.startsWith('=')) {
        exportContent = exportContent.replace(/^(=[^\n]*\n)([\s\S]*)$/, '$1:imagesdir: ./\n$2');
      } else {
        exportContent = `:imagesdir: ./\n\n${exportContent}`;
      }
    }
  }

  if (typeof window.showDirectoryPicker === 'function') {
    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite'
      });

      const fileHandle = await dirHandle.getFileHandle(docObj.name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(exportContent);
      await writable.close();

      if (attachments.length > 0) {
        const subDirHandle = await dirHandle.getDirectoryHandle('attachments', { create: true });
        for (const att of attachments) {
          try {
            const attFileHandle = await subDirHandle.getFileHandle(att.filename, { create: true });
            const attWritable = await attFileHandle.createWritable();
            const blob = dataURLToBlob(att.dataUrl);
            await attWritable.write(blob);
            await attWritable.close();
          } catch(e) {
            console.error(`Failed to write attachment ${att.filename}:`, e);
          }
        }
      }

      showToast(`Successfully exported document & ${attachments.length} images!`);
    } catch (err) {
      console.error("Directory picker error:", err);
      if (err.name !== 'AbortError') {
        showToast("Export failed", false);
      }
    }
  } else {
    try {
      const docBlob = new Blob([exportContent], { type: 'text/plain' });
      const docUrl = URL.createObjectURL(docBlob);
      const docA = document.createElement('a');
      docA.href = docUrl;
      docA.download = docObj.name;
      document.body.appendChild(docA);
      docA.click();
      document.body.removeChild(docA);
      URL.revokeObjectURL(docUrl);

      for (const att of attachments) {
        const blob = dataURLToBlob(att.dataUrl);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = att.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      showToast(`Successfully exported document & ${attachments.length} images!`);
    } catch(e) {
      console.error("Fallback export error:", e);
      showToast("Export failed", false);
    }
  }
}

async function exportRenderedHTML() {
  if (!output) return;
  
  const content = output.innerHTML;
  const editorLabel = document.getElementById('editorLabel');
  const activeDocumentName = editorLabel ? editorLabel.innerText.trim() : 'document';
  
  const isDark = document.documentElement.classList.contains('dark');
  const bgColor = isDark ? '#0f172a' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  
  let headLinks = '';
  document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
    if (link.href && (link.href.startsWith('http://') || link.href.startsWith('https://'))) {
      headLinks += `  <link rel="stylesheet" href="${link.href}">\n`;
    }
  });
  
  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${activeDocumentName}</title>
${headLinks}
  <style>
    body {
      background-color: ${bgColor};
      color: ${textColor};
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
      padding: 2rem;
      max-width: 900px;
      margin: 0 auto;
      line-height: 1.6;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body class="${isDark ? 'dark bg-slate-900 text-slate-100' : 'bg-white text-slate-900'}">
  <div id="renderOutput" class="markdown-body asciidoc-content prose dark:prose-invert max-w-none">
    ${content}
  </div>
</body>
</html>`;

  const nameWithoutExt = activeDocumentName.replace(/\.[^/.]+$/, "");
  const defaultName = `${nameWithoutExt}_${getBackupTimestamp()}.html`;

  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{
          description: 'Standalone HTML Document',
          accept: { 'text/html': ['.html'] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(fullHtml);
      await writable.close();
      showToast("Rendered HTML saved successfully!");
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
  const a = document.createElement('a');
  a.download = defaultName;
  a.href = URL.createObjectURL(blob);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showToast("Rendered HTML exported successfully!");
}

function openAppBackupModal() {
  const modal = document.getElementById('appBackupModal');
  if (modal) modal.classList.remove('hidden');
}

function closeAppBackupModal() {
  const modal = document.getElementById('appBackupModal');
  if (modal) modal.classList.add('hidden');
}

function exportApplicationBackup() {
  openAppBackupModal();
}

async function startAppBackup() {
  const optionBoth = document.getElementById('backupOptionAppAndData');
  const includeData = optionBoth ? optionBoth.checked : true;
  closeAppBackupModal();
  await packageAndDownloadProjectZip(includeData);
}

async function packageAndDownloadProjectZip(includeData = true) {
  if (typeof JSZip === 'undefined') {
    showToast("JSZip library not available", false);
    return;
  }

  showToast("Packaging ZIP archive in memory...");
  const zip = new JSZip();

  // 1. Load project files from embedded manifest (or fallback to HTTP fetch)
  let appFilesPackaged = false;
  if (window.DocCraftProjectFiles && Object.keys(window.DocCraftProjectFiles).length > 0) {
    for (const [relPath, item] of Object.entries(window.DocCraftProjectFiles)) {
      if (item.isBinary) {
        zip.file(relPath, item.data, { base64: true });
      } else {
        zip.file(relPath, item.data);
      }
    }
    appFilesPackaged = true;
  }

  // Fallback to HTTP fetch if manifest wasn't present
  if (!appFilesPackaged && window.location.protocol !== 'file:') {
    const textFiles = [
      'index.html', 'build.js', 'DevPlan.md', 'css/styles.css',
      'js/state.js', 'js/converters.js', 'js/db.js', 'js/diagrams.js',
      'js/table-editor.js', 'js/workspace.js', 'js/ui.js', 'js/editor.js',
      'js/quick-switcher.js', 'js/wikilinks.js', 'js/tags-metadata.js', 'js/productivity.js', 'js/graph.js', 'js/app.js',
      'vendor/codemirror/mode/asciidoc/asciidoc.js', 'vendor/codemirror/mode/markdown/markdown.min.js',
      'vendor/codemirror/codemirror.min.js', 'vendor/codemirror/codemirror.min.css',
      'vendor/codemirror/addon/search/searchcursor.min.js', 'vendor/codemirror/addon/fold/foldgutter.min.js',
      'vendor/codemirror/addon/fold/foldgutter.min.css', 'vendor/codemirror/addon/fold/foldcode.min.js',
      'vendor/fontawesome/css/all.min.css', 'vendor/asciidoctor/asciidoctor.min.js',
      'vendor/marked/marked.min.js', 'vendor/tailwind/tailwind.js', 'vendor/fonts/fonts.css',
      'vendor/dompurify/purify.min.js', 'vendor/jszip/jszip.min.js'
    ];
    for (const tf of textFiles) {
      try {
        const res = await fetch(tf);
        if (res.ok) zip.file(tf, await res.text());
      } catch(e) {}
    }
    appFilesPackaged = true;
  }

  // Fallback to DOM capture
  if (!appFilesPackaged) {
    zip.file('index.html', "<!DOCTYPE html>\n" + document.documentElement.outerHTML);
  }

  // 2. If includeData is requested: add workspace-data/ folder containing complete notes & attachments!
  if (includeData) {
    const [docs, folders] = await Promise.all([dbGetDocuments(), dbGetFolders()]);
    const attachments = [];
    for (const d of docs) {
      const atts = await dbGetAttachments(d.id);
      attachments.push(...atts);
    }

    const backupObj = {
      version: 1,
      exportedAt: Date.now(),
      folders: folders,
      documents: docs,
      attachments: attachments
    };

    const dataFolder = zip.folder('workspace-data');
    dataFolder.file('workspace-backup.json', JSON.stringify(backupObj, null, 2));

    // Also include readable individual note files inside workspace-data/notes/
    const notesFolder = dataFolder.folder('notes');
    docs.filter(d => !d.isTrash).forEach(d => {
      notesFolder.file(d.name, d.content || '');
    });

    // And images inside workspace-data/attachments/
    if (attachments.length > 0) {
      const attFolder = dataFolder.folder('attachments');
      for (const att of attachments) {
        try {
          attFolder.file(att.filename, dataURLToBlob(att.dataUrl));
        } catch(e) {}
      }
    }
  }

  // 3. Generate and download ZIP directly to Downloads folder
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });

  const fileName = includeData
    ? `DocCraftStudio_FullBackup_${getBackupTimestamp()}.zip`
    : `DocCraftStudio_App_${getBackupTimestamp()}.zip`;

  const a = document.createElement('a');
  a.href = URL.createObjectURL(zipBlob);
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);

  showToast("ZIP archive downloaded to your Downloads folder!");
}

function dataURLToBlob(dataURL) {
  const parts = dataURL.split(';base64,');
  const contentType = parts[0].split(':')[1];
  const raw = window.atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);
  for (let i = 0; i < rawLength; ++i) {
    uInt8Array[i] = raw.charCodeAt(i);
  }
  return new Blob([uInt8Array], { type: contentType });
}

async function exportWorkspaceJSON() {
  try {
    const [docs, folders] = await Promise.all([dbGetDocuments(), dbGetFolders()]);
    
    const attachments = [];
    for (const docObj of docs) {
      const atts = await dbGetAttachments(docObj.id);
      attachments.push(...atts);
    }

    const backupObj = {
      version: 1,
      exportedAt: Date.now(),
      folders: folders,
      documents: docs,
      attachments: attachments
    };

    const jsonString = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const backupTimestamp = `${year}-${month}-${day}_${hours}h${minutes}`;
    const backupFileName = `doccraft-workspace-backup-${backupTimestamp}.json`;

    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: backupFileName,
          types: [{
            description: 'Workspace Backup (JSON)',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        showToast("Workspace backup saved successfully!");
      } catch(err) {
        if (err.name !== 'AbortError') throw err;
      }
    } else {
      const a = document.createElement('a');
      a.href = url;
      a.download = backupFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showToast("Workspace backup downloaded");
    }
    URL.revokeObjectURL(url);
  } catch(err) {
    console.error("Backup error:", err);
    showToast("Backup failed", false);
  }
}

async function restoreWorkspaceFromData(data) {
  if (!data || !Array.isArray(data.documents) || !Array.isArray(data.folders) || !Array.isArray(data.attachments)) {
    throw new Error("Invalid backup data structure");
  }

  const clearAll = confirm("Click OK to OVERWRITE and replace current workspace items, or CANCEL to MERGE (import alongside existing items).");

  if (clearAll) {
    const tx = dbInstance.transaction(['documents', 'folders', 'attachments'], 'readwrite');
    await Promise.all([
      tx.objectStore('documents').clear(),
      tx.objectStore('folders').clear(),
      tx.objectStore('attachments').clear()
    ]);
    expandedFolders.clear();
  }

  for (const folder of data.folders) {
    await dbSaveFolder(folder);
  }

  for (const docObj of data.documents) {
    await dbSaveDocument(docObj);
  }

  for (const att of data.attachments) {
    await dbSaveAttachment(att);
  }

  renderWorkspaceDocList();
  showToast("Workspace restored successfully!");

  const docs = await dbGetDocuments();
  if (docs.length > 0) {
    openDocumentFromWorkspace(docs[0].id);
  } else {
    const defaultDoc = await createNewDocument("Untitled.adoc", "");
    openDocumentFromWorkspace(defaultDoc.id);
  }
}

async function importWorkspaceArchive(event) {
  const file = event.target.files[0];
  if (!file) return;

  const fileName = file.name.toLowerCase();

  if (fileName.endsWith('.json')) {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        await restoreWorkspaceFromData(data);
        event.target.value = '';
      } catch(err) {
        console.error("JSON restore error:", err);
        showToast("Restore failed: " + (err.message || err), false);
        event.target.value = '';
      }
    };
    reader.readAsText(file);
    return;
  }

  if (fileName.endsWith('.zip')) {
    if (typeof JSZip === 'undefined') {
      showToast("JSZip library not available", false);
      return;
    }

    try {
      showToast("Reading ZIP archive in memory...");
      const zip = await JSZip.loadAsync(file);

      // Find workspace-backup.json
      let backupFile = zip.file('workspace-data/workspace-backup.json') || zip.file('workspace-backup.json');
      if (!backupFile) {
        const matches = zip.file(/workspace-backup\.json$/i);
        if (matches && matches.length > 0) backupFile = matches[0];
      }

      if (!backupFile) {
        throw new Error("No workspace-backup.json found inside ZIP archive");
      }

      const jsonText = await backupFile.async('text');
      const data = JSON.parse(jsonText);
      await restoreWorkspaceFromData(data);
      event.target.value = '';
    } catch(err) {
      console.error("ZIP restore error:", err);
      showToast("Restore failed: " + (err.message || err), false);
      event.target.value = '';
    }
  }
}

async function importWorkspaceJSON(event) {
  return importWorkspaceArchive(event);
}

async function importDocumentsFromFiles(eventOrFiles, targetFolderId = null) {
  let files = [];
  if (eventOrFiles.target && eventOrFiles.target.files) {
    files = Array.from(eventOrFiles.target.files);
  } else if (eventOrFiles.dataTransfer && eventOrFiles.dataTransfer.files) {
    files = Array.from(eventOrFiles.dataTransfer.files);
  } else if (Array.isArray(eventOrFiles)) {
    files = eventOrFiles;
  }

  if (files.length === 0) return;

  let importedCount = 0;
  let lastImportedDoc = null;

  for (const file of files) {
    const ext = file.name.split('.').pop().toLowerCase();
    const isDoc = ['adoc', 'asciidoc', 'md', 'markdown', 'txt'].includes(ext);
    if (!isDoc) continue;

    try {
      const content = await file.text();
      let docName = file.name;
      if (ext === 'asciidoc') docName = docName.replace(/\.asciidoc$/i, '.adoc');
      if (ext === 'markdown') docName = docName.replace(/\.markdown$/i, '.md');
      if (ext === 'txt') docName = docName.replace(/\.txt$/i, '.md');

      // Duplicate name protection
      const existingDocs = await dbGetDocuments();
      let finalName = docName;
      let counter = 1;
      while (existingDocs.some(d => !d.isTrash && d.name.toLowerCase() === finalName.toLowerCase())) {
        const baseName = docName.replace(/\.(adoc|md)$/i, '');
        const extPart = docName.endsWith('.md') ? '.md' : '.adoc';
        finalName = `${baseName}_${counter}${extPart}`;
        counter++;
      }

      const docObj = await createNewDocument(finalName, content);
      if (docObj) {
        if (targetFolderId) {
          docObj.folderId = targetFolderId;
          await dbSaveDocument(docObj);
        } else if (selectedWorkspaceNode && selectedWorkspaceNode.type === 'folder') {
          docObj.folderId = selectedWorkspaceNode.id;
          await dbSaveDocument(docObj);
        }
        lastImportedDoc = docObj;
        importedCount++;
      }
    } catch(err) {
      console.error("Error reading imported file:", file.name, err);
    }
  }

  const fileInput = document.getElementById('importDocFileInput');
  if (fileInput) fileInput.value = '';

  if (importedCount > 0) {
    renderWorkspaceDocList();
    if (lastImportedDoc) {
      openDocumentFromWorkspace(lastImportedDoc.id);
    }
    showToast(`Successfully imported ${importedCount} note${importedCount > 1 ? 's' : ''}!`);
  } else {
    showToast("No compatible .adoc or .md files found to import", false);
  }
}

function initSidebarFileDrop() {
  const sidebar = document.getElementById('workspaceSidebar');
  if (!sidebar) return;

  sidebar.addEventListener('dragover', (e) => {
    if (e.dataTransfer && e.dataTransfer.types && Array.from(e.dataTransfer.types).includes('Files')) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      sidebar.classList.add('ring-2', 'ring-indigo-500', 'ring-inset');
    }
  });

  sidebar.addEventListener('dragleave', (e) => {
    sidebar.classList.remove('ring-2', 'ring-indigo-500', 'ring-inset');
  });

  sidebar.addEventListener('drop', (e) => {
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const hasDocs = Array.from(e.dataTransfer.files).some(f => {
        const ext = f.name.split('.').pop().toLowerCase();
        return ['adoc', 'asciidoc', 'md', 'markdown', 'txt'].includes(ext);
      });

      if (hasDocs) {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.remove('ring-2', 'ring-indigo-500', 'ring-inset');
        importDocumentsFromFiles(e);
      }
    }
  });
}

async function initWorkspace() {
  try {
    await initDB();
    initSidebarFileDrop();
    
    const docs = await dbGetDocuments();
    if (docs.length === 0) {
      const defaultDoc = await createNewDocument("Untitled.adoc", "");
      currentDocumentId = defaultDoc.id;
    } else {
      currentDocumentId = docs[0].id;
    }

    const activeDoc = await dbGetDocument(currentDocumentId);
    if (activeDoc) {
      setEditorValue(activeDoc.content);
      setMode(activeDoc.type);
      
      const editorLabel = document.getElementById('editorLabel');
      if (editorLabel) editorLabel.innerText = activeDoc.name;

      recordRecentlyOpened(activeDoc.id);

      renderDocument();
      setTimeout(() => {
        updatePlantUmlStatus();
        updateTableBadges();
        updatePictureBadges();
      }, 60);
      updateSaveStatus('synced', 'Saved');
    }

    isInitialLoading = false;
    renderWorkspaceDocList();
  } catch (err) {
    console.error("Workspace init error:", err);
    showToast("Error loading local workspace database", false);
  }
}
