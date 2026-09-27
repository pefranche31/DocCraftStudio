/**
 * DocCraft Studio - Tags, Metadata (Frontmatter), Pinned Notes & Trash Engine
 */

var activeTagFilter = null; // null | string (e.g. 'project')
var isViewingTrash = false;

/* --------------------------------------------------------------------------
 * Tag Indexing & Extraction
 * -------------------------------------------------------------------------- */

/**
 * Extracts hashtags from document content (excluding code blocks)
 */
function extractTagsFromContent(content, mode = 'asciidoc') {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const tags = new Set();
  let inCodeBlock = false;

  for (const line of lines) {
    if (mode === 'asciidoc') {
      if (line.match(/^----\s*$/) || line.match(/^\.\.\.\.\s*$/) || line.match(/^\[source/i) || line.match(/^\[plantuml/i)) {
        if (line.match(/^----\s*$/) || line.match(/^\.\.\.\.\s*$/)) inCodeBlock = !inCodeBlock;
        continue;
      }
    } else {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
    }

    if (inCodeBlock) continue;

    // Match tags: #tag or #tag/subtag (must begin with a letter, no hex color e.g. #fff)
    const tagMatches = line.matchAll(/(?:^|[^\w#&])#([a-zA-Z][a-zA-Z0-9_\-\/]*)/g);
    for (const m of tagMatches) {
      const tag = m[1].toLowerCase();
      // Ignore common markdown heading false positives (e.g. empty #)
      if (tag.length > 1 || /^[a-zA-Z]/.test(tag)) {
        tags.add(tag);
      }
    }
  }

  return Array.from(tags);
}

/**
 * Scans all non-trash documents to build an index of all tags
 */
async function getWorkspaceTagsIndex() {
  const docs = await dbGetDocuments();
  const tagsMap = new Map(); // tagName -> Array<{ id, name, type }>

  for (const doc of docs) {
    if (doc.isTrash) continue;
    const docTags = extractTagsFromContent(doc.content, doc.type);

    // Also check metadata frontmatter tags
    const meta = parseDocumentMetadata(doc.content, doc.type);
    if (meta && meta.tags) {
      const rawTags = Array.isArray(meta.tags) ? meta.tags : String(meta.tags).split(/[, ]+/);
      rawTags.forEach(t => {
        const clean = String(t).trim().replace(/^#/, '').toLowerCase();
        if (clean) docTags.push(clean);
      });
    }

    const uniqueDocTags = [...new Set(docTags)];
    for (const tag of uniqueDocTags) {
      if (!tagsMap.has(tag)) tagsMap.set(tag, []);
      tagsMap.get(tag).push({ id: doc.id, name: doc.name, type: doc.type });
    }
  }

  // Convert to sorted array
  const sortedTags = Array.from(tagsMap.entries()).map(([tag, docsList]) => ({
    name: tag,
    count: docsList.length,
    docs: docsList
  }));

  sortedTags.sort((a, b) => a.name.localeCompare(b.name));
  return sortedTags;
}

function filterNotesByTag(tag) {
  if (activeTagFilter === tag) {
    activeTagFilter = null; // Toggle off
  } else {
    activeTagFilter = tag;
    isViewingTrash = false;
  }
  renderWorkspaceDocList();
}

function clearTagFilter() {
  activeTagFilter = null;
  renderWorkspaceDocList();
}

/**
 * Transforms narrative hashtags in the preview pane into stylish clickable badge pills
 */
function renderTagPillsInContainer(container = output) {
  if (!container) return;

  const walker = document.createTreeWalker(
    container,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: function(node) {
        let parent = node.parentElement;
        while (parent && parent !== container) {
          const tag = parent.tagName;
          if (tag === 'PRE' || tag === 'CODE' || tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA' || parent.classList.contains('tag-pill') || parent.classList.contains('wikilink')) {
            return NodeFilter.FILTER_REJECT;
          }
          parent = parent.parentElement;
        }
        return (node.nodeValue && /(?:^|[^\w#&])#([a-zA-Z][a-zA-Z0-9_\-\/]*)/.test(node.nodeValue)) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      }
    }
  );

  const textNodes = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode);
  }

  const tagRegex = /(?:^|(\s))#([a-zA-Z][a-zA-Z0-9_\-\/]*)/g;

  textNodes.forEach(node => {
    const text = node.nodeValue;
    if (!tagRegex.test(text)) return;
    tagRegex.lastIndex = 0;

    const fragment = document.createDocumentFragment();
    let lastIdx = 0;
    let match;

    while ((match = tagRegex.exec(text)) !== null) {
      const matchStart = match.index + (match[1] ? match[1].length : 0);
      const matchEnd = match.index + match[0].length;
      const tagName = match[2];

      if (matchStart > lastIdx) {
        fragment.appendChild(document.createTextNode(text.substring(lastIdx, matchStart)));
      }

      const pill = document.createElement('span');
      pill.className = 'tag-pill inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded text-[11px] font-mono font-semibold bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer select-none';
      pill.title = `Filter notes tagged #${tagName}`;
      pill.innerHTML = `<span class="opacity-60">#</span><span>${escapeHtml(tagName)}</span>`;

      pill.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        filterNotesByTag(tagName);
      };

      fragment.appendChild(pill);
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

/* --------------------------------------------------------------------------
 * Starred / Pinned Notes Management
 * -------------------------------------------------------------------------- */

async function togglePinDocument(docId, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }
  const doc = await dbGetDocument(docId);
  if (!doc) return;

  doc.isPinned = !doc.isPinned;
  await dbSaveDocument(doc);
  renderWorkspaceDocList();
  showToast(doc.isPinned ? `Pinned: ${doc.name}` : `Unpinned: ${doc.name}`);
}

/* --------------------------------------------------------------------------
 * Frontmatter / Metadata Parser & Inspector
 * -------------------------------------------------------------------------- */

function parseDocumentMetadata(text, mode = currentMode) {
  if (!text) return null;
  const meta = {};

  if (mode === 'markdown') {
    const yamlMatch = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (yamlMatch) {
      const yamlContent = yamlMatch[1];
      const lines = yamlContent.split(/\r?\n/);
      for (const line of lines) {
        const colonIdx = line.indexOf(':');
        if (colonIdx !== -1) {
          const key = line.slice(0, colonIdx).trim().toLowerCase();
          let val = line.slice(colonIdx + 1).trim();
          // Array notation e.g. [a, b]
          if (val.startsWith('[') && val.endsWith(']')) {
            val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
          } else {
            val = val.replace(/^['"]|['"]$/g, '');
          }
          if (key) meta[key] = val;
        }
      }
    }
  } else {
    // AsciiDoc document attributes: :key: value
    const lines = text.split(/\r?\n/).slice(0, 30); // Inspect top 30 lines
    for (const line of lines) {
      const attrMatch = line.match(/^:([a-zA-Z0-9_\-]+):\s*(.*)$/);
      if (attrMatch) {
        const key = attrMatch[1].toLowerCase();
        let val = attrMatch[2].trim();
        if (key === 'tags' || key === 'keywords') {
          val = val.split(/[, ]+/).filter(Boolean);
        }
        meta[key] = val;
      }
    }
  }

  return Object.keys(meta).length > 0 ? meta : null;
}

function renderMetadataCard(metadata) {
  const target = document.getElementById('documentMetadataCard');
  if (!target) return;

  if (!metadata || Object.keys(metadata).length === 0) {
    target.classList.add('hidden');
    target.innerHTML = '';
    return;
  }

  target.classList.remove('hidden');

  let entriesHtml = '';
  for (const [key, val] of Object.entries(metadata)) {
    // Filter internal or noisy keys
    if (key === 'toc' || key === 'sectnumlevels' || key === 'doctype' || key === 'showtitle' || key === 'icons') continue;

    let displayVal = '';
    if (Array.isArray(val)) {
      displayVal = val.map(item => `
        <span onclick="filterNotesByTag('${escapeHtml(item)}')" class="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 cursor-pointer">
          #${escapeHtml(item)}
        </span>
      `).join(' ');
    } else {
      displayVal = `<span class="font-medium text-slate-700 dark:text-slate-200">${escapeHtml(String(val))}</span>`;
    }

    entriesHtml += `
      <div class="flex items-center gap-2 text-xs">
        <span class="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">${escapeHtml(key)}:</span>
        <div class="flex flex-wrap items-center gap-1">${displayVal}</div>
      </div>
    `;
  }

  target.innerHTML = `
    <div class="mb-4 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 backdrop-blur-sm flex flex-wrap items-center gap-x-6 gap-y-2">
      <div class="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider shrink-0 mr-1">
        <i class="fa-solid fa-tags text-indigo-500"></i>
        <span>Metadata</span>
      </div>
      ${entriesHtml}
    </div>
  `;
}

/* --------------------------------------------------------------------------
 * Soft Delete / Trash Bin Engine
 * -------------------------------------------------------------------------- */

function toggleTrashView(show) {
  isViewingTrash = (show !== undefined) ? show : !isViewingTrash;
  if (isViewingTrash) {
    activeTagFilter = null;
  }
  renderWorkspaceDocList();
}

async function restoreDocumentFromTrash(docId) {
  const doc = await dbGetDocument(docId);
  if (!doc) return;

  doc.isTrash = false;
  delete doc.trashedAt;
  doc.updatedAt = Date.now();
  await dbSaveDocument(doc);

  showToast(`Restored: ${doc.name}`);
  renderWorkspaceDocList();
  openDocumentFromWorkspace(doc.id);
}

async function permanentlyDeleteDocument(docId) {
  const doc = await dbGetDocument(docId);
  if (!doc) return;

  if (confirm(`Permanently delete "${doc.name}"?\nThis cannot be undone.`)) {
    await dbDeleteDocument(docId);
    showToast(`Permanently deleted: ${doc.name}`);
    renderWorkspaceDocList();
  }
}

async function emptyTrash() {
  const docs = await dbGetDocuments();
  const trashedDocs = docs.filter(d => d.isTrash);
  if (trashedDocs.length === 0) {
    showToast("Trash is already empty");
    return;
  }

  if (confirm(`Empty Trash? Permanently delete all ${trashedDocs.length} trashed document(s)?`)) {
    for (const d of trashedDocs) {
      await dbDeleteDocument(d.id);
    }
    showToast("Trash emptied");
    renderWorkspaceDocList();
  }
}
