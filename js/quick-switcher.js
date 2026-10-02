/**
 * DocCraft Studio - Quick Switcher & Command Palette (Cmd+K)
 * Real-time full-text search across IndexedDB workspace, quick commands, and keyboard navigation
 */

var quickSwitcherActiveIndex = 0;
var quickSwitcherMatches = [];
var quickSwitcherDebounceTimer = null;

function openQuickSwitcher() {
  const modal = document.getElementById('quickSwitcherModal');
  const input = document.getElementById('quickSwitcherInput');
  if (!modal || !input) return;

  modal.classList.remove('hidden');
  input.value = '';
  quickSwitcherActiveIndex = 0;
  
  // Render default view (recently opened notes & common actions)
  loadInitialQuickSwitcherItems();

  setTimeout(() => {
    input.focus();
    input.select();
  }, 50);
}

function closeQuickSwitcher() {
  const modal = document.getElementById('quickSwitcherModal');
  if (modal) modal.classList.add('hidden');
  if (cmEditor) cmEditor.focus();
}

function toggleQuickSwitcher() {
  const modal = document.getElementById('quickSwitcherModal');
  if (!modal) return;
  if (modal.classList.contains('hidden')) {
    openQuickSwitcher();
  } else {
    closeQuickSwitcher();
  }
}

async function loadInitialQuickSwitcherItems() {
  const [docs, folders] = await Promise.all([dbGetDocuments(), dbGetFolders()]);
  const folderMap = new Map(folders.map(f => [f.id, f.name]));

  // Get recently opened IDs
  let recentIds = [];
  try {
    recentIds = JSON.parse(localStorage.getItem('recently_opened') || '[]');
  } catch(e) {}

  const recentDocs = recentIds
    .map(id => docs.find(d => d.id === id))
    .filter(Boolean);

  const otherDocs = docs.filter(d => !recentIds.includes(d.id));
  const sortedDocs = [...recentDocs, ...otherDocs].slice(0, 10);

  quickSwitcherMatches = [];

  // Add document items
  for (const doc of sortedDocs) {
    const isRecent = recentIds.includes(doc.id);
    const folderName = doc.folderId ? folderMap.get(doc.folderId) : null;
    quickSwitcherMatches.push({
      type: 'document',
      id: doc.id,
      name: doc.name,
      docType: doc.type,
      folderName: folderName,
      updatedAt: doc.updatedAt,
      snippet: null,
      badge: isRecent ? 'Recent' : null
    });
  }

  // Add default quick actions
  appendQuickActions('');

  renderQuickSwitcherResults();
}

function onQuickSwitcherInput(val) {
  clearTimeout(quickSwitcherDebounceTimer);
  quickSwitcherDebounceTimer = setTimeout(() => {
    executeQuickSwitcherSearch(val.trim());
  }, 40);
}

async function executeQuickSwitcherSearch(query) {
  if (!query) {
    loadInitialQuickSwitcherItems();
    return;
  }

  const [docs, folders] = await Promise.all([dbGetDocuments(), dbGetFolders()]);
  const folderMap = new Map(folders.map(f => [f.id, f.name]));

  const lowerQuery = query.toLowerCase();
  const queryTerms = lowerQuery.split(/\s+/).filter(Boolean);

  const docMatches = [];

  for (const doc of docs) {
    const nameLower = doc.name.toLowerCase();
    const content = doc.content || '';
    const contentLower = content.toLowerCase();

    // Check title match
    const titleMatches = queryTerms.every(term => nameLower.includes(term));
    
    // Check content match
    let snippet = null;
    let hasContentMatch = false;

    if (queryTerms.every(term => contentLower.includes(term))) {
      hasContentMatch = true;
      // Extract snippet around first occurrence of the query
      snippet = extractSnippet(content, lowerQuery, queryTerms[0]);
    }

    if (titleMatches || hasContentMatch) {
      let score = 0;
      if (nameLower === lowerQuery) score += 100;
      else if (nameLower.startsWith(lowerQuery)) score += 60;
      else if (titleMatches) score += 40;
      if (hasContentMatch) score += 20;

      const folderName = doc.folderId ? folderMap.get(doc.folderId) : null;

      docMatches.push({
        score: score,
        type: 'document',
        id: doc.id,
        name: doc.name,
        docType: doc.type,
        folderName: folderName,
        updatedAt: doc.updatedAt,
        snippet: snippet,
        badge: titleMatches ? 'Title Match' : 'Content Match'
      });
    }
  }

  // Sort by relevance score, then recent update
  docMatches.sort((a, b) => b.score - a.score || b.updatedAt - a.updatedAt);

  quickSwitcherMatches = docMatches.slice(0, 15);

  // If query doesn't match an existing document exactly, offer "Create note"
  const exactExists = docs.some(d => d.name.toLowerCase() === lowerQuery || d.name.toLowerCase() === `${lowerQuery}.adoc` || d.name.toLowerCase() === `${lowerQuery}.md`);
  if (!exactExists && query.length > 0) {
    quickSwitcherMatches.unshift({
      type: 'create_doc',
      query: query,
      name: `Create new note: "${query}"`,
      badge: 'Action'
    });
  }

  // Append matching actions
  appendQuickActions(lowerQuery);

  quickSwitcherActiveIndex = 0;
  renderQuickSwitcherResults();
}

function appendQuickActions(query) {
  const actions = [
    {
      type: 'action',
      id: 'act-new-note',
      title: 'New Note / Document',
      desc: 'Create a blank note in the workspace',
      icon: 'fa-file-circle-plus text-emerald-500',
      action: () => {
        const name = prompt("Enter note name:", "Untitled");
        if (name && name.trim()) {
          createNewDocument(name.trim()).then(doc => {
            if (doc) openDocumentFromWorkspace(doc.id);
          });
        }
      }
    },
    {
      type: 'action',
      id: 'act-mode-adoc',
      title: 'Switch to AsciiDoc Mode',
      desc: 'Set active syntax mode to AsciiDoc',
      icon: 'fa-file-lines text-teal-500',
      action: () => setMode('asciidoc')
    },
    {
      type: 'action',
      id: 'act-mode-md',
      title: 'Switch to Markdown Mode',
      desc: 'Set active syntax mode to Markdown',
      icon: 'fa-brands fa-markdown text-blue-500',
      action: () => setMode('markdown')
    },
    {
      type: 'action',
      id: 'act-convert-doc',
      title: 'Convert Document (AsciiDoc ⇄ Markdown)',
      desc: 'Open the bidirectional syntax converter',
      icon: 'fa-solid fa-repeat text-indigo-500',
      action: () => openConvertModal()
    },
    {
      type: 'action',
      id: 'act-theme-toggle',
      title: 'Toggle Dark / Light Theme',
      desc: 'Switch application color palette',
      icon: 'fa-solid fa-circle-half-stroke text-amber-500',
      action: () => toggleDarkMode()
    },
    {
      type: 'action',
      id: 'act-export-html',
      title: 'Export Rendered HTML Document',
      desc: 'Export rendered note as standalone HTML',
      icon: 'fa-solid fa-code text-cyan-500',
      action: () => exportRenderedHTML()
    },
    {
      type: 'action',
      id: 'act-download-file',
      title: 'Download Source File (.adoc / .md)',
      desc: 'Save source code directly to disk',
      icon: 'fa-solid fa-download text-violet-500',
      action: () => downloadFile()
    },
    {
      type: 'action',
      id: 'act-daily-note',
      title: "Today's Daily Note (Alt+D)",
      desc: "Jump to or create today's daily journal log",
      icon: 'fa-regular fa-calendar-check text-amber-500',
      action: () => openDailyNote()
    },
    {
      type: 'action',
      id: 'act-table-library',
      title: 'Table Library & Spreadsheet (x-spreadsheet)',
      desc: 'Manage attached tables, scan document tables, and edit in Excel spreadsheet',
      icon: 'fa-solid fa-table-cells text-indigo-500',
      action: () => openTableLibraryModal()
    },
    {
      type: 'action',
      id: 'act-tasks-hub',
      title: 'Global Tasks Hub',
      desc: 'View, filter, and check off all to-dos across all notes',
      icon: 'fa-solid fa-list-check text-indigo-500',
      action: () => openTasksHubModal()
    },
    {
      type: 'action',
      id: 'act-insert-template',
      title: 'Insert Note Template',
      desc: 'Stamp Meeting, Project, Reading or Review template',
      icon: 'fa-solid fa-stamp text-teal-500',
      action: () => openInsertTemplateModal()
    },
    {
      type: 'action',
      id: 'act-knowledge-graph',
      title: 'Interactive Knowledge Graph (Cmd+G)',
      desc: 'Visual force-directed map of notes and WikiLinks',
      icon: 'fa-solid fa-circle-nodes text-violet-500',
      action: () => openKnowledgeGraphModal()
    },
    {
      type: 'action',
      id: 'act-zen-mode',
      title: 'Zen Focus Writing Mode (F11)',
      desc: 'Fullscreen distraction-free editor with typewriter scroll',
      icon: 'fa-solid fa-feather text-emerald-500',
      action: () => toggleZenMode()
    },
    {
      type: 'action',
      id: 'act-import-notes',
      title: 'Import Notes (.adoc / .md)',
      desc: 'Upload document files from computer or drag & drop onto sidebar',
      icon: 'fa-solid fa-file-import text-violet-500',
      action: () => document.getElementById('importDocFileInput').click()
    },
    {
      type: 'action',
      id: 'act-layout-both',
      title: 'Layout: Split View (Code + Preview)',
      desc: 'Show both code editor and live preview (Cmd+Alt+1)',
      icon: 'fa-solid fa-table-columns text-indigo-500',
      action: () => setViewLayout('both')
    },
    {
      type: 'action',
      id: 'act-layout-code',
      title: 'Layout: Code Only (Full Editor)',
      desc: 'Hide preview pane for distraction-free editing (Cmd+Alt+2)',
      icon: 'fa-solid fa-code text-teal-500',
      action: () => setViewLayout('code')
    },
    {
      type: 'action',
      id: 'act-layout-preview',
      title: 'Layout: Preview Only (Reading Mode)',
      desc: 'Hide code editor for full document reading (Cmd+Alt+3)',
      icon: 'fa-regular fa-eye text-emerald-500',
      action: () => setViewLayout('preview')
    },
    {
      type: 'action',
      id: 'act-settings',
      title: 'Open Settings Hub',
      desc: 'Kroki container, colors, zoom, print scale',
      icon: 'fa-solid fa-gear text-slate-500',
      action: () => openSettingsModal()
    },
    {
      type: 'action',
      id: 'act-clear-editor',
      title: 'Clear Editor',
      desc: 'Empty active document content',
      icon: 'fa-solid fa-trash-can text-rose-500',
      action: () => {
        if (confirm("Clear editor content?")) clearEditor();
      }
    }
  ];

  for (const act of actions) {
    if (!query || act.title.toLowerCase().includes(query) || act.desc.toLowerCase().includes(query)) {
      quickSwitcherMatches.push(act);
    }
  }
}

function extractSnippet(text, fullQuery, firstTerm) {
  const lower = text.toLowerCase();
  let idx = lower.indexOf(fullQuery);
  if (idx === -1) idx = lower.indexOf(firstTerm);
  if (idx === -1) return null;

  const start = Math.max(0, idx - 45);
  const end = Math.min(text.length, idx + 80);
  
  let snippet = text.substring(start, end).replace(/\r?\n/g, ' ');
  if (start > 0) snippet = '...' + snippet;
  if (end < text.length) snippet = snippet + '...';

  // Highlight matches inside snippet
  const escapedTerm = (fullQuery || firstTerm).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const highlighted = escapeHtml(snippet).replace(
    new RegExp(`(${escapedTerm})`, 'gi'),
    '<mark class="bg-indigo-100 dark:bg-indigo-500/40 text-indigo-900 dark:text-indigo-200 rounded px-1 font-semibold">$1</mark>'
  );

  return highlighted;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderQuickSwitcherResults() {
  const container = document.getElementById('quickSwitcherResults');
  if (!container) return;

  if (quickSwitcherMatches.length === 0) {
    container.innerHTML = `
      <div class="p-8 text-center text-slate-400 dark:text-slate-400">
        <i class="fa-solid fa-magnifying-glass text-3xl mb-2 opacity-40"></i>
        <p class="text-sm font-medium">No documents or actions found</p>
        <p class="text-xs mt-1">Try another search term or press Enter to create</p>
      </div>
    `;
    return;
  }

  let html = '';

  quickSwitcherMatches.forEach((item, index) => {
    const isSelected = (index === quickSwitcherActiveIndex);
    const selectedClass = isSelected
      ? 'bg-indigo-50/90 dark:bg-indigo-950/70 border-indigo-300 dark:border-indigo-600 shadow-sm'
      : 'border-transparent hover:bg-slate-100/70 dark:hover:bg-slate-700/50';

    if (item.type === 'create_doc') {
      html += `
        <div onclick="selectQuickSwitcherItem(${index})" 
             class="group p-3 rounded-xl border ${selectedClass} cursor-pointer transition-all flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <i class="fa-solid fa-plus text-sm"></i>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-bold text-emerald-800 dark:text-emerald-300 truncate">${escapeHtml(item.name)}</div>
              <div class="text-[11px] text-slate-500 dark:text-slate-400">Press Enter to create and open immediately</div>
            </div>
          </div>
          <span class="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700">
            Create Note ↵
          </span>
        </div>
      `;
    } else if (item.type === 'document') {
      const icon = item.docType === 'asciidoc'
        ? 'fa-solid fa-file-lines text-teal-600 dark:text-teal-400'
        : 'fa-brands fa-markdown text-blue-500 dark:text-blue-400';

      const timeLabel = item.updatedAt ? formatRelativeTime(item.updatedAt) : '';

      html += `
        <div onclick="selectQuickSwitcherItem(${index})" 
             class="group p-2.5 rounded-xl border ${selectedClass} cursor-pointer transition-all">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5 min-w-0 flex-1">
              <i class="${icon} text-sm shrink-0"></i>
              <span class="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : ''}">${escapeHtml(item.name)}</span>
              ${item.folderName ? `
                <span class="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700/80 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600 truncate max-w-[120px]">
                  <i class="fa-regular fa-folder text-[9px] mr-1"></i>${escapeHtml(item.folderName)}
                </span>
              ` : ''}
            </div>
            <div class="flex items-center gap-2 shrink-0">
              ${timeLabel ? `<span class="text-[10px] text-slate-400 dark:text-slate-400 font-mono">${timeLabel}</span>` : ''}
              ${item.badge ? `
                <span class="text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${item.badge === 'Recent' ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-600'}">
                  ${item.badge}
                </span>
              ` : ''}
            </div>
          </div>
          ${item.snippet ? `
            <div class="mt-1 pl-6 text-[11px] text-slate-600 dark:text-slate-300 truncate font-mono">
              ${item.snippet}
            </div>
          ` : ''}
        </div>
      `;
    } else if (item.type === 'action') {
      html += `
        <div onclick="selectQuickSwitcherItem(${index})" 
             class="group p-2.5 rounded-xl border ${selectedClass} cursor-pointer transition-all flex items-center justify-between gap-2">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0 text-xs text-slate-600 dark:text-slate-300">
              <i class="${item.icon}"></i>
            </div>
            <div class="min-w-0">
              <div class="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate ${isSelected ? 'text-indigo-900 dark:text-indigo-300' : ''}">${escapeHtml(item.title)}</div>
              <div class="text-[10px] text-slate-500 dark:text-slate-400 truncate">${escapeHtml(item.desc)}</div>
            </div>
          </div>
          <span class="text-[10px] text-slate-500 dark:text-slate-400 font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700/80 border border-slate-200 dark:border-slate-600">Action</span>
        </div>
      `;
    }
  });

  container.innerHTML = html;

  // Scroll active item into view
  const activeEl = container.children[quickSwitcherActiveIndex];
  if (activeEl) {
    activeEl.scrollIntoView({ block: 'nearest' });
  }
}

function handleQuickSwitcherKeydown(e) {
  if (quickSwitcherMatches.length === 0) {
    if (e.key === 'Escape') {
      closeQuickSwitcher();
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    quickSwitcherActiveIndex = (quickSwitcherActiveIndex + 1) % quickSwitcherMatches.length;
    renderQuickSwitcherResults();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    quickSwitcherActiveIndex = (quickSwitcherActiveIndex - 1 + quickSwitcherMatches.length) % quickSwitcherMatches.length;
    renderQuickSwitcherResults();
  } else if (e.key === 'Enter') {
    e.preventDefault();
    selectQuickSwitcherItem(quickSwitcherActiveIndex);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    closeQuickSwitcher();
  }
}

async function selectQuickSwitcherItem(index) {
  const item = quickSwitcherMatches[index];
  if (!item) return;

  closeQuickSwitcher();

  if (item.type === 'create_doc') {
    const name = item.query.trim();
    if (name) {
      const ext = newDocFormat === 'asciidoc' ? 'adoc' : 'md';
      const fullName = (name.endsWith('.adoc') || name.endsWith('.md')) ? name : `${name}.${ext}`;
      const doc = await createNewDocument(fullName, "");
      if (doc) {
        openDocumentFromWorkspace(doc.id);
        showToast(`Created note: ${doc.name}`);
      }
    }
  } else if (item.type === 'document') {
    openDocumentFromWorkspace(item.id);
  } else if (item.type === 'action' && typeof item.action === 'function') {
    item.action();
  }
}

function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}
