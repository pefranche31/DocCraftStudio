/**
 * DocCraft Studio - WikiLinks & Backlinks Engine
 * Bidirectional note linking ([[Note Title]]), CodeMirror autocomplete, Cmd+Click navigation, and Backlinks inspector
 */

var wikilinkAutocompleteActive = false;
var wikilinkAutocompleteIndex = 0;
var wikilinkAutocompleteMatches = [];
var activeBacklinksTab = 'linked'; // 'linked' | 'unlinked'
var currentBacklinksData = { linked: [], unlinked: [] };

/**
 * Navigates to a note by title or creates it if it doesn't exist
 */
async function navigateToWikiLink(targetRaw) {
  if (!targetRaw) return;
  const target = targetRaw.trim();
  const docs = await dbGetDocuments();

  const lowerTarget = target.toLowerCase();
  const targetWithoutExt = lowerTarget.replace(/\.(adoc|md)$/i, '');

  // 1. Search for matching document
  const found = docs.find(d => {
    const docLower = d.name.toLowerCase();
    const docWithoutExt = docLower.replace(/\.(adoc|md)$/i, '');
    return docLower === lowerTarget || 
           docWithoutExt === targetWithoutExt ||
           docLower === `${targetWithoutExt}.adoc` ||
           docLower === `${targetWithoutExt}.md`;
  });

  if (found) {
    openDocumentFromWorkspace(found.id);
    showToast(`Jumped to note: ${found.name}`);
    return;
  }

  // 2. Note not found: offer creation
  const defaultExt = currentMode === 'asciidoc' ? 'adoc' : 'md';
  const newName = (target.endsWith('.adoc') || target.endsWith('.md')) ? target : `${target}.${defaultExt}`;

  if (confirm(`Note "${target}" does not exist yet.\nWould you like to create "${newName}" now?`)) {
    const newDoc = await createNewDocument(newName, "");
    if (newDoc) {
      openDocumentFromWorkspace(newDoc.id);
      showToast(`Created and opened note: ${newDoc.name}`);
    }
  }
}

/**
 * Preprocesses document text to convert [[Note Title]] and [[Note Title|Alias]] into
 * safe passthrough HTML nodes BEFORE passing to Asciidoctor or Marked, preventing
 * Asciidoctor from swallowing [[...]] as empty anchors.
 */
function preprocessWikiLinksForRendering(text, mode = currentMode) {
  if (!text) return '';
  const lines = text.split(/\r?\n/);
  const output = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Delimited code blocks protection
    if (mode === 'asciidoc') {
      if (line.match(/^----\s*$/) || line.match(/^\.\.\.\.\s*$/) || line.match(/^\[source/i) || line.match(/^\[plantuml/i)) {
        if (line.match(/^----\s*$/) || line.match(/^\.\.\.\.\s*$/)) {
          inCodeBlock = !inCodeBlock;
        }
        output.push(line);
        continue;
      }
    } else {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        output.push(line);
        continue;
      }
    }

    if (inCodeBlock) {
      output.push(line);
      continue;
    }

    // Replace [[target|alias]] and [[target]]
    const replaced = line.replace(/\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g, (match, target, alias) => {
      const cleanTarget = target.trim();
      const cleanAlias = alias ? alias.trim() : cleanTarget;
      const escapedTarget = escapeWikiAttr(cleanTarget);
      const escapedAlias = escapeWikiAttr(cleanAlias);
      const textAlias = escapeWikiHtml(cleanAlias);

      if (mode === 'asciidoc') {
        return `pass:[<span class="wikilink-node" data-target="${escapedTarget}" data-alias="${escapedAlias}">${textAlias}</span>]`;
      } else {
        return `<span class="wikilink-node" data-target="${escapedTarget}" data-alias="${escapedAlias}">${textAlias}</span>`;
      }
    });

    output.push(replaced);
  }

  return output.join('\n');
}

function escapeWikiAttr(str) {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/**
 * Transforms narrative text nodes and preprocessed wikilink-node elements in the preview container
 * to render rich, interactive, clickable [[WikiLinks]].
 */
async function renderWikiLinksInContainer(container = output) {
  if (!container) return;

  const docs = await dbGetDocuments();
  const docNames = new Set();
  docs.forEach(d => {
    docNames.add(d.name.toLowerCase());
    docNames.add(d.name.replace(/\.(adoc|md)$/i, '').toLowerCase());
  });

  // 1. Process all preprocessed <span class="wikilink-node">
  const nodes = container.querySelectorAll('.wikilink-node, span[data-target]');
  nodes.forEach(el => {
    const target = el.getAttribute('data-target') || el.textContent.trim();
    const alias = el.getAttribute('data-alias') || el.textContent.trim() || target;
    const exists = docNames.has(target.toLowerCase()) || 
                   docNames.has(target.replace(/\.(adoc|md)$/i, '').toLowerCase()) ||
                   docNames.has(`${target.toLowerCase()}.adoc`) ||
                   docNames.has(`${target.toLowerCase()}.md`);

    el.className = exists
      ? 'wikilink inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline decoration-indigo-300 dark:decoration-indigo-600 decoration-1 hover:decoration-2 transition-colors cursor-pointer select-none'
      : 'wikilink inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 underline decoration-dashed decoration-indigo-400/60 transition-colors cursor-pointer select-none opacity-85';

    el.title = exists ? `Jump to note: ${target}` : `Note "${target}" does not exist yet. Click to create.`;
    el.innerHTML = `<i class="fa-solid fa-link text-[10px] opacity-75"></i><span>${escapeWikiHtml(alias)}</span>`;

    el.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      navigateToWikiLink(target);
    };
  });

  // 2. Also process any raw plain text [[...]] that remained in text nodes
  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        // Skip code blocks, pre, textareas, styles, and scripts
        let parent = node.parentElement;
        while (parent && parent !== container) {
          const tag = parent.tagName;
          if (tag === 'PRE' || tag === 'CODE' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || parent.classList.contains('wikilink') || parent.classList.contains('wikilink-node')) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentElement;
        }
        return (node.nodeValue && node.nodeValue.includes('[[')) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  const wikiRegex = /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g;

  textNodes.forEach(node => {
    const text = node.nodeValue;
    if (!wikiRegex.test(text)) return;
    wikiRegex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIdx = 0;
    let match;

    while ((match = wikiRegex.exec(text)) !== null) {
      const matchStart = match.index;
      const matchEnd = match.index + match[0].length;

      // Append preceding plain text
      if (matchStart > lastIdx) {
        fragment.appendChild(document.createTextNode(text.substring(lastIdx, matchStart)));
      }

      const target = match[1].trim();
      const alias = match[2] ? match[2].trim() : target;
      const exists = docNames.has(target.toLowerCase()) || 
                     docNames.has(target.replace(/\.(adoc|md)$/i, '').toLowerCase());

      // Create interactive wikilink tag
      const link = document.createElement('a');
      link.href = 'javascript:void(0);';
      link.className = exists
        ? 'wikilink inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 underline decoration-indigo-300 dark:decoration-indigo-600 decoration-1 hover:decoration-2 transition-colors cursor-pointer select-none'
        : 'wikilink inline-flex items-center gap-1 font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-300 underline decoration-dashed decoration-indigo-400/60 transition-colors cursor-pointer select-none opacity-85';

      link.title = exists ? `Jump to note: ${target}` : `Note "${target}" does not exist yet. Click to create.`;
      link.innerHTML = `<i class="fa-solid fa-link text-[10px] opacity-75"></i><span>${escapeWikiHtml(alias)}</span>`;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        navigateToWikiLink(target);
      });

      fragment.appendChild(link);
      lastIdx = matchEnd;
    }

    if (lastIdx < text.length) {
      fragment.appendChild(document.createTextNode(text.substring(lastIdx)));
    }

    if (node.parentNode) {
      node.parentNode.replaceChild(fragment, node);
    }
  });
}

function escapeWikiHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* --------------------------------------------------------------------------
 * CodeMirror Editor WikiLink Autocomplete Popup Engine
 * -------------------------------------------------------------------------- */

function initWikiLinkEditorListeners() {
  if (!cmEditor) return;

  // 1. Editor Cmd+Click (or Ctrl+Click) on [[Note]] to navigate
  cmEditor.getWrapperElement().addEventListener('mousedown', (e) => {
    if (e.metaKey || e.ctrlKey) {
      const coords = { left: e.clientX, top: e.clientY };
      const pos = cmEditor.coordsChar(coords);
      const lineText = cmEditor.getLine(pos.line);
      if (!lineText) return;

      const wikiRegex = /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g;
      let match;
      while ((match = wikiRegex.exec(lineText)) !== null) {
        const startCh = match.index;
        const endCh = match.index + match[0].length;
        if (pos.ch >= startCh && pos.ch <= endCh) {
          e.preventDefault();
          e.stopPropagation();
          const target = match[1].trim();
          navigateToWikiLink(target);
          return;
        }
      }
    }
  });

  // 2. Change cursor to pointer when hovering over [[...]] while holding Cmd/Ctrl
  cmEditor.getWrapperElement().addEventListener('mousemove', (e) => {
    if (e.metaKey || e.ctrlKey) {
      const coords = { left: e.clientX, top: e.clientY };
      const pos = cmEditor.coordsChar(coords);
      const lineText = cmEditor.getLine(pos.line);
      if (lineText) {
        const wikiRegex = /\[\[([^\]\|]+)(?:\|([^\]]+))?\]\]/g;
        let match;
        let isOverLink = false;
        while ((match = wikiRegex.exec(lineText)) !== null) {
          if (pos.ch >= match.index && pos.ch <= match.index + match[0].length) {
            isOverLink = true;
            break;
          }
        }
        cmEditor.getWrapperElement().style.cursor = isOverLink ? 'pointer' : '';
        return;
      }
    }
    cmEditor.getWrapperElement().style.cursor = '';
  });

  // 3. Autocomplete triggers on typing
  cmEditor.on('cursorActivity', () => {
    checkWikiLinkAutocompleteTrigger();
  });
}

async function checkWikiLinkAutocompleteTrigger() {
  if (!cmEditor) return;

  const cursor = cmEditor.getCursor();
  const lineText = cmEditor.getLine(cursor.line);
  if (!lineText) {
    hideWikiLinkAutocomplete();
    return;
  }

  const beforeCursor = lineText.slice(0, cursor.ch);
  const openIdx = beforeCursor.lastIndexOf('[[');

  if (openIdx === -1) {
    hideWikiLinkAutocomplete();
    return;
  }

  // Ensure there is no closing ]] between [[ and cursor
  if (beforeCursor.indexOf(']]', openIdx) !== -1) {
    hideWikiLinkAutocomplete();
    return;
  }

  const rawQuery = beforeCursor.slice(openIdx + 2).trim().toLowerCase();
  
  const docs = await dbGetDocuments();
  const matches = docs.filter(d => {
    const nameWithoutExt = d.name.replace(/\.(adoc|md)$/i, '');
    return d.name.toLowerCase().includes(rawQuery) || nameWithoutExt.toLowerCase().includes(rawQuery);
  }).slice(0, 8);

  if (matches.length === 0 && rawQuery.length > 0) {
    wikilinkAutocompleteMatches = [{
      isNew: true,
      name: beforeCursor.slice(openIdx + 2).trim()
    }];
  } else {
    wikilinkAutocompleteMatches = matches;
  }

  wikilinkAutocompleteIndex = 0;
  showWikiLinkAutocomplete(openIdx);
}

function showWikiLinkAutocomplete(openIdx) {
  const popup = document.getElementById('wikilinksAutocomplete');
  if (!popup) return;

  wikilinkAutocompleteActive = true;
  popup.classList.remove('hidden');

  // Compute cursor screen coordinates
  const cursor = cmEditor.getCursor();
  const coords = cmEditor.cursorCoords(cursor, 'page');
  
  popup.style.left = `${Math.min(coords.left, window.innerWidth - 300)}px`;
  popup.style.top = `${coords.bottom + 6}px`;

  renderWikiLinkAutocompleteList(openIdx);
}

function hideWikiLinkAutocomplete() {
  const popup = document.getElementById('wikilinksAutocomplete');
  if (popup) popup.classList.add('hidden');
  wikilinkAutocompleteActive = false;
  wikilinkAutocompleteMatches = [];
}

function renderWikiLinkAutocompleteList(openIdx) {
  const popup = document.getElementById('wikilinksAutocomplete');
  if (!popup) return;

  let html = '';
  wikilinkAutocompleteMatches.forEach((item, idx) => {
    const isSelected = (idx === wikilinkAutocompleteIndex);
    const selectedClass = isSelected 
      ? 'bg-indigo-50 dark:bg-indigo-950/70 border-indigo-200 dark:border-indigo-700/80 font-semibold' 
      : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/40';

    if (item.isNew) {
      html += `
        <div onclick="insertWikiLinkFromAutocomplete('${escapeWikiHtml(item.name)}')" 
             class="px-3 py-2 flex items-center justify-between gap-2 border-l-2 cursor-pointer transition ${selectedClass}">
          <div class="flex items-center gap-2 min-w-0">
            <i class="fa-solid fa-plus text-emerald-500"></i>
            <span class="truncate text-slate-800 dark:text-slate-100">Create note: "${escapeWikiHtml(item.name)}"</span>
          </div>
          <span class="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">New ↵</span>
        </div>
      `;
    } else {
      const isAdoc = (item.type === 'asciidoc');
      const icon = isAdoc ? 'fa-solid fa-file-lines text-teal-600' : 'fa-brands fa-markdown text-blue-500';
      const cleanTitle = item.name.replace(/\.(adoc|md)$/i, '');

      html += `
        <div onclick="insertWikiLinkFromAutocomplete('${escapeWikiHtml(cleanTitle)}')" 
             class="px-3 py-2 flex items-center justify-between gap-2 border-l-2 cursor-pointer transition ${selectedClass}">
          <div class="flex items-center gap-2 min-w-0">
            <i class="${icon} text-xs"></i>
            <span class="truncate text-slate-800 dark:text-slate-100">${escapeWikiHtml(cleanTitle)}</span>
          </div>
          <span class="text-[9px] font-mono text-slate-400 uppercase">${item.type}</span>
        </div>
      `;
    }
  });

  popup.innerHTML = html;
}

function handleWikiLinkKeydown(e) {
  if (!wikilinkAutocompleteActive || wikilinkAutocompleteMatches.length === 0) return false;

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    wikilinkAutocompleteIndex = (wikilinkAutocompleteIndex + 1) % wikilinkAutocompleteMatches.length;
    renderWikiLinkAutocompleteList();
    return true;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    wikilinkAutocompleteIndex = (wikilinkAutocompleteIndex - 1 + wikilinkAutocompleteMatches.length) % wikilinkAutocompleteMatches.length;
    renderWikiLinkAutocompleteList();
    return true;
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    e.preventDefault();
    const item = wikilinkAutocompleteMatches[wikilinkAutocompleteIndex];
    if (item) {
      const title = item.isNew ? item.name : item.name.replace(/\.(adoc|md)$/i, '');
      insertWikiLinkFromAutocomplete(title);
    }
    return true;
  } else if (e.key === 'Escape') {
    e.preventDefault();
    hideWikiLinkAutocomplete();
    return true;
  }

  return false;
}

function insertWikiLinkFromAutocomplete(title) {
  if (!cmEditor) return;

  const cursor = cmEditor.getCursor();
  const lineText = cmEditor.getLine(cursor.line);
  const openIdx = lineText.slice(0, cursor.ch).lastIndexOf('[[');

  if (openIdx !== -1) {
    const replacement = `[[${title}]]`;
    cmEditor.replaceRange(
      replacement,
      { line: cursor.line, ch: openIdx },
      { line: cursor.line, ch: cursor.ch }
    );
    cmEditor.setCursor({ line: cursor.line, ch: openIdx + replacement.length });
    cmEditor.focus();
    renderDocument();
    queueSaveToIndexedDB();
  }

  hideWikiLinkAutocomplete();
}

/* --------------------------------------------------------------------------
 * Backlinks & Mentions Engine
 * -------------------------------------------------------------------------- */

async function computeBacklinksForActiveDocument() {
  if (!currentDocumentId) return;

  const activeDoc = await dbGetDocument(currentDocumentId);
  if (!activeDoc) return;

  const allDocs = await dbGetDocuments();
  const titleWithoutExt = activeDoc.name.replace(/\.(adoc|md)$/i, '');
  const exactName = activeDoc.name;

  const linked = [];
  const unlinked = [];

  const wikiRegex = new RegExp(`\\[\\[(?:${escapeRegex(exactName)}|${escapeRegex(titleWithoutExt)})(?:\\|[^\\]]+)?\\]\\]`, 'i');
  const titlePlainRegex = new RegExp(`\\b${escapeRegex(titleWithoutExt)}\\b`, 'i');

  for (const doc of allDocs) {
    if (doc.id === activeDoc.id) continue; // Skip self

    const content = doc.content || '';
    
    // 1. Linked reference check
    if (wikiRegex.test(content)) {
      const snippet = extractBacklinkSnippet(content, titleWithoutExt, true);
      linked.push({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        snippet: snippet
      });
      continue; // If it's already linked, don't double count as unlinked
    }

    // 2. Unlinked mention check (must have title without ext in plain text)
    if (titleWithoutExt.length >= 3 && titlePlainRegex.test(content)) {
      const snippet = extractBacklinkSnippet(content, titleWithoutExt, false);
      unlinked.push({
        id: doc.id,
        name: doc.name,
        type: doc.type,
        snippet: snippet
      });
    }
  }

  currentBacklinksData = { linked, unlinked };
  updateBacklinksUI();
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractBacklinkSnippet(content, targetTitle, isWiki) {
  const lower = content.toLowerCase();
  const targetLower = targetTitle.toLowerCase();
  
  let idx = lower.indexOf(targetLower);
  if (idx === -1) idx = 0;

  const start = Math.max(0, idx - 45);
  const end = Math.min(content.length, idx + targetTitle.length + 55);

  let snippet = content.substring(start, end).replace(/\r?\n/g, ' ');
  if (start > 0) snippet = '...' + snippet;
  if (end < content.length) snippet = snippet + '...';

  const escaped = escapeRegex(targetTitle);
  const regex = new RegExp(`(${escaped})`, 'gi');
  
  return escapeWikiHtml(snippet).replace(
    regex,
    '<mark class="bg-indigo-100 dark:bg-indigo-500/40 text-indigo-900 dark:text-indigo-200 rounded px-1 font-semibold">$1</mark>'
  );
}

function updateBacklinksUI() {
  const badge = document.getElementById('backlinksCountBadge');
  const total = currentBacklinksData.linked.length + currentBacklinksData.unlinked.length;

  if (badge) {
    badge.innerText = total;
    if (total > 0) {
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  const tabLinked = document.getElementById('tabBacklinksLinked');
  const tabUnlinked = document.getElementById('tabBacklinksUnlinked');
  if (tabLinked) tabLinked.innerText = `Linked References (${currentBacklinksData.linked.length})`;
  if (tabUnlinked) tabUnlinked.innerText = `Unlinked Mentions (${currentBacklinksData.unlinked.length})`;

  renderBacklinksList();
}

function toggleBacklinksDrawer() {
  const drawer = document.getElementById('backlinksDrawer');
  if (!drawer) return;

  if (drawer.classList.contains('hidden')) {
    drawer.classList.remove('hidden');
    computeBacklinksForActiveDocument();
  } else {
    drawer.classList.add('hidden');
  }
}

function toggleBacklinksTab(tab) {
  activeBacklinksTab = tab;
  const tabLinked = document.getElementById('tabBacklinksLinked');
  const tabUnlinked = document.getElementById('tabBacklinksUnlinked');

  if (tab === 'linked') {
    if (tabLinked) tabLinked.className = "px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-600 text-white shadow-xs cursor-pointer";
    if (tabUnlinked) tabUnlinked.className = "px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer";
  } else {
    if (tabUnlinked) tabUnlinked.className = "px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-600 text-white shadow-xs cursor-pointer";
    if (tabLinked) tabLinked.className = "px-2.5 py-1 rounded-md text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer";
  }

  renderBacklinksList();
}

function renderBacklinksList() {
  const container = document.getElementById('backlinksList');
  if (!container) return;

  const items = (activeBacklinksTab === 'linked') 
    ? currentBacklinksData.linked 
    : currentBacklinksData.unlinked;

  if (items.length === 0) {
    container.innerHTML = `
      <div class="py-6 text-center text-slate-400 dark:text-slate-500 text-xs">
        <i class="fa-solid fa-link-slash text-xl mb-1 opacity-50 block"></i>
        <span>No ${activeBacklinksTab === 'linked' ? 'linked references' : 'unlinked mentions'} found for this note.</span>
      </div>
    `;
    return;
  }

  let html = '';
  items.forEach(item => {
    const icon = item.type === 'asciidoc' ? 'fa-file-lines text-teal-600' : 'fa-brands fa-markdown text-blue-500';

    html += `
      <div class="group p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-xs transition-all">
        <div class="flex items-center justify-between gap-2 mb-1">
          <div onclick="openDocumentFromWorkspace('${item.id}')" class="flex items-center gap-2 cursor-pointer min-w-0">
            <i class="fa-solid ${icon} text-xs shrink-0"></i>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-300 truncate">${escapeWikiHtml(item.name)}</span>
          </div>
          ${activeBacklinksTab === 'unlinked' ? `
            <button onclick="linkUnlinkedMention('${item.id}')" title="Convert mention to [[WikiLink]]" class="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition cursor-pointer">
              Link 🔗
            </button>
          ` : `
            <button onclick="openDocumentFromWorkspace('${item.id}')" title="Open source note" class="text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs cursor-pointer">
              <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
            </button>
          `}
        </div>
        <div onclick="openDocumentFromWorkspace('${item.id}')" class="text-[11px] text-slate-600 dark:text-slate-300 font-mono pl-5 cursor-pointer leading-relaxed">
          ${item.snippet}
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function linkUnlinkedMention(sourceDocId) {
  const activeDoc = await dbGetDocument(currentDocumentId);
  const sourceDoc = await dbGetDocument(sourceDocId);
  if (!activeDoc || !sourceDoc) return;

  const titleWithoutExt = activeDoc.name.replace(/\.(adoc|md)$/i, '');
  const regex = new RegExp(`\\b${escapeRegex(titleWithoutExt)}\\b`, 'i');

  if (regex.test(sourceDoc.content)) {
    sourceDoc.content = sourceDoc.content.replace(regex, `[[${titleWithoutExt}]]`);
    sourceDoc.updatedAt = Date.now();
    await dbSaveDocument(sourceDoc);
    showToast(`Converted mention into [[${titleWithoutExt}]] in ${sourceDoc.name}`);
    computeBacklinksForActiveDocument();
  }
}
