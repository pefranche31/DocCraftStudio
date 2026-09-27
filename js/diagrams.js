/**
 * DocCraft Studio - PlantUML & Kroki Diagram Engine
 * Interactive modal, live rendering, SVG caching, and folding
 */

var pumlModalDebounceTimer = null;

function getPumlEditorValue() {
  return pumlEditor ? pumlEditor.getValue() : (document.getElementById('pumlEditorCode') ? document.getElementById('pumlEditorCode').value : '');
}

function insertPlantUML() {
  openPumlEditorModal(null, null);
}

function updateKrokiBadge() {
  const badgeLabel = document.getElementById('krokiBadgeLabel');
  if (badgeLabel) {
    try {
      const parsed = new URL(krokiBaseUrl);
      if (parsed.hostname === 'kroki.io') {
        badgeLabel.innerText = 'Kroki (Public)';
      } else {
        badgeLabel.innerText = `Kroki: ${parsed.port || '80'}`;
      }
    } catch(e) {
      badgeLabel.innerText = 'Kroki';
    }
  }
}

function syncKrokiSettingsUI() {
  const urlInput = document.getElementById('krokiServerUrl');
  if (urlInput) urlInput.value = krokiBaseUrl;

  const localBtn = document.getElementById('krokiModeLocalBtn');
  const publicBtn = document.getElementById('krokiModePublicBtn');
  const modeBadge = document.getElementById('krokiServerModeBadge');

  const activeBtnClasses = "px-3 py-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20 text-slate-800 dark:text-slate-100 shadow-sm";
  const inactiveBtnClasses = "px-3 py-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm";

  const isPublic = krokiBaseUrl.includes('kroki.io');
  const isLocal = krokiBaseUrl.includes('localhost') || krokiBaseUrl.includes('127.0.0.1');

  if (localBtn) localBtn.className = isLocal ? activeBtnClasses : inactiveBtnClasses;
  if (publicBtn) publicBtn.className = isPublic ? activeBtnClasses : inactiveBtnClasses;

  if (modeBadge) {
    if (isPublic) {
      modeBadge.innerText = "Public (Cloud)";
      modeBadge.className = "text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300";
    } else if (isLocal) {
      modeBadge.innerText = "Local (Offline)";
      modeBadge.className = "text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300";
    } else {
      modeBadge.innerText = "Custom Server";
      modeBadge.className = "text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300";
    }
  }
}

function selectKrokiServerMode(mode) {
  if (mode === 'public') {
    if (krokiBaseUrl === 'https://kroki.io') {
      showToast("Public server is already active", true);
      return;
    }
    // Open dedicated confirmation modal to highlight security and privacy risks
    openModal('publicKrokiWarningModal');
  } else if (mode === 'local') {
    krokiBaseUrl = 'http://localhost:8000';
    try { localStorage.setItem('kroki_url', krokiBaseUrl); } catch(e) {}
    diagramSvgCache.clear();
    syncKrokiSettingsUI();
    updateKrokiBadge();
    renderDocument();
    showToast("Switched to Local Kroki Container (http://localhost:8000)", true);
  }
}

function cancelPublicKrokiModal() {
  closeModal('publicKrokiWarningModal');
  syncKrokiSettingsUI();
}

function confirmPublicKrokiServer() {
  krokiBaseUrl = 'https://kroki.io';
  // Enforce non-persistent privacy: NEVER save public cloud server to localStorage
  try { localStorage.removeItem('kroki_url'); } catch(e) {}
  diagramSvgCache.clear();
  closeModal('publicKrokiWarningModal');
  syncKrokiSettingsUI();
  updateKrokiBadge();
  renderDocument();
  showToast("Public Kroki Server enabled for this session (https://kroki.io)", true);
}

function handleKrokiUrlInput() {
  const inputEl = document.getElementById('krokiServerUrl');
  if (!inputEl) return;
  const val = inputEl.value.trim();
  const localBtn = document.getElementById('krokiModeLocalBtn');
  const publicBtn = document.getElementById('krokiModePublicBtn');
  const modeBadge = document.getElementById('krokiServerModeBadge');

  const activeBtnClasses = "px-3 py-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer bg-white dark:bg-slate-800 border-indigo-500 ring-2 ring-indigo-500/20 text-slate-800 dark:text-slate-100 shadow-sm";
  const inactiveBtnClasses = "px-3 py-2 rounded-lg border text-left flex items-center gap-2 transition cursor-pointer bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm";

  const isPublic = val.includes('kroki.io');
  const isLocal = val.includes('localhost') || val.includes('127.0.0.1');

  if (localBtn) localBtn.className = isLocal ? activeBtnClasses : inactiveBtnClasses;
  if (publicBtn) publicBtn.className = isPublic ? activeBtnClasses : inactiveBtnClasses;

  if (modeBadge) {
    if (isPublic) {
      modeBadge.innerText = "Public (Cloud)";
      modeBadge.className = "text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300";
    } else if (isLocal) {
      modeBadge.innerText = "Local (Offline)";
      modeBadge.className = "text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300";
    } else {
      modeBadge.innerText = "Custom Server";
      modeBadge.className = "text-[10px] px-2 py-0.5 rounded-full font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300";
    }
  }
}

function handleKrokiUrlChange() {
  const inputEl = document.getElementById('krokiServerUrl');
  if (!inputEl) return;
  const val = inputEl.value.trim().replace(/\/+$/, '');
  
  if (val.includes('kroki.io') && krokiBaseUrl !== 'https://kroki.io') {
    selectKrokiServerMode('public');
    return;
  }

  saveKrokiConfig();
  syncKrokiSettingsUI();
}

async function testKrokiConnection() {
  const inputEl = document.getElementById('krokiServerUrl');
  const testUrl = (inputEl && inputEl.value.trim() ? inputEl.value.trim() : krokiBaseUrl).replace(/\/+$/, '');
  const statusText = document.getElementById('krokiStatusText');
  const dot = document.getElementById('krokiStatusDot');
  if (statusText) statusText.innerText = "Testing...";

  const samplePuml = `@startuml\nactor Test\n@enduml`;
  try {
    const res = await fetch(`${testUrl}/plantuml/svg`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: samplePuml,
      signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(5000) : undefined
    });
    if (res.ok) {
      if (statusText) {
        statusText.innerText = "Connected (OK)";
        statusText.className = "px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300";
      }
      if (dot) dot.className = "w-2 h-2 rounded-full bg-emerald-500 inline-block shadow-sm";
      return true;
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    if (statusText) {
      statusText.innerText = "Unreachable";
      statusText.className = "px-2 py-0.5 rounded text-[11px] font-mono bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300";
    }
    if (dot) dot.className = "w-2 h-2 rounded-full bg-amber-500 inline-block shadow-sm";
    return false;
  }
}

function saveKrokiConfig() {
  const inputEl = document.getElementById('krokiServerUrl');
  if (inputEl) {
    krokiBaseUrl = inputEl.value.trim().replace(/\/+$/, '') || 'http://localhost:8000';
    try { localStorage.setItem('kroki_url', krokiBaseUrl); } catch(e) {}
    diagramSvgCache.clear();
    updateKrokiBadge();
    renderDocument();
  }
}

/* PlantUML Folding & Detection Helpers */
function findPlantUmlBlocks() {
  const text = getEditorValue();
  const lines = text.split(/\r?\n/);
  const blocks = [];

  if (currentMode === 'asciidoc') {
    let inPuml = false;
    let startLine = -1;
    let title = '';
    let currentWidth = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const pumlHeader = line.match(/^\[plantuml\b([^\]]*)\]/i);
      if (pumlHeader) {
        startLine = i;
        title = pumlHeader[1].trim() || 'diagram';
        
        // Parse custom width parameter from header
        const widthMatch = line.match(/width=(\d+)/i);
        currentWidth = widthMatch ? parseInt(widthMatch[1], 10) : null;
        continue;
      }
      if (startLine !== -1 && (line.match(/^----$/) || line.match(/^\.\.\.\.$/))) {
        if (!inPuml) {
          inPuml = true;
        } else {
          blocks.push({ startLine, endLine: i, title, width: currentWidth });
          inPuml = false;
          startLine = -1;
          title = '';
          currentWidth = null;
        }
      }
    }
  } else {
    let inPuml = false;
    let startLine = -1;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.match(/^```plantuml/i)) {
        startLine = i;
        inPuml = true;
        continue;
      }
      if (inPuml && line.match(/^```$/)) {
        blocks.push({ startLine, endLine: i, title: 'diagram', width: null });
        inPuml = false;
        startLine = -1;
      }
    }
  }
  return blocks;
}

function debouncePumlEditorPreview() {
  clearTimeout(pumlModalDebounceTimer);
  pumlModalDebounceTimer = setTimeout(updatePumlModalPreview, 250);
}

async function updatePumlModalPreview() {
  const code = getPumlEditorValue().trim();
  const preview = document.getElementById('pumlModalPreview');
  const spinner = document.getElementById('pumlModalSpinner');
  if (!preview) return;

  if (!code) {
    preview.innerHTML = `<p class="text-slate-400 italic text-xs">Enter some PlantUML code to render the diagram</p>`;
    if (spinner) spinner.classList.add('hidden');
    return;
  }

  if (spinner) spinner.classList.remove('hidden');

  try {
    const svgContent = await fetchKrokiSvg(code);
    preview.innerHTML = svgContent;
    const svgEl = preview.querySelector('svg');
    if (svgEl) {
      svgEl.removeAttribute('height');
      svgEl.style.height = 'auto';
      svgEl.style.maxWidth = '100%';
      svgEl.classList.add('mx-auto');
      applyPumlModalZoomTransform(); // Preserve and apply active zoom/pan scale coordinates on keystrokes
    }
  } catch (err) {
    preview.innerHTML = `
      <div class="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs border border-red-200 dark:border-red-800">
        <p class="font-semibold">Kroki Error:</p>
        <p class="font-mono mt-1">${err.message || 'Unable to contact Kroki'}</p>
      </div>
    `;
  } finally {
    if (spinner) spinner.classList.add('hidden');
  }
}

function openPumlEditorModal(startLine = null, endLine = null) {
  currentEditingPumlBlock = { startLine, endLine };
  const codeTextarea = document.getElementById('pumlEditorCode');

  // Reset zoom scale on every opening
  pumlZoomScale = 1.0;
  pumlPanX = 0;
  pumlPanY = 0;

  let currentWidth = 400; // Default size
  let currentTitle = '';  // Default title
  let initialContent = '';

  if (startLine !== null && endLine !== null) {
    // Extract existing title if present on the line above
    if (startLine > 0) {
      const prevLine = cmEditor.getLine(startLine - 1).trim();
      const isAdoc = (currentMode === 'asciidoc');
      const hasTitleAbove = isAdoc
        ? (prevLine.startsWith('.') && !prevLine.startsWith('...'))
        : (prevLine.startsWith('*') && prevLine.endsWith('*'));
      if (hasTitleAbove) {
        currentTitle = isAdoc ? prevLine.substring(1).trim() : prevLine.slice(1, -1).trim();
      }
    }

    // Extract existing width if present on the block starting line (e.g. [plantuml, width=450])
    const headerLine = cmEditor.getLine(startLine) || '';
    const widthMatch = headerLine.match(/width=(\d+)/i);
    if (widthMatch) {
      currentWidth = parseInt(widthMatch[1], 10);
    }

    const codeLines = [];
    const isAdoc = (currentMode === 'asciidoc');
    const startExtractLine = isAdoc ? startLine + 2 : startLine + 1; // Skip [plantuml] and ---- in AsciiDoc, skip ```plantuml in Markdown
    for (let i = startExtractLine; i < endLine; i++) {
      codeLines.push(cmEditor.getLine(i));
    }
    initialContent = codeLines.join('\n');
  } else {
    // Simple class diagram template
    initialContent = `@startuml\nclass User {\n  +String name\n  +void login()\n}\n@enduml`;
  }

  if (pumlEditor) {
    pumlEditor.setValue(initialContent);
    setTimeout(() => pumlEditor.refresh(), 50);
  } else if (codeTextarea) {
    codeTextarea.value = initialContent;
  }

  // Synchronize the numerical input controller state
  const widthInput = document.getElementById('pumlModalWidth');
  if (widthInput) {
    widthInput.value = currentWidth;
  }

  // Synchronize the title input controller state
  const titleInput = document.getElementById('pumlModalTitle');
  if (titleInput) {
    titleInput.value = currentTitle;
  }

  openModal('pumlEditorModal');
  updatePumlModalPreview();
}

/* PlantUML Modal Interactive Zoom & Panning Listeners */
function initPumlModalInteractionListeners() {
  const previewContainer = document.getElementById('pumlModalPreview');
  if (!previewContainer) return;

  // 1. Ctrl + scroll wheel zoom (O(1) responsive vector zoom)
  previewContainer.addEventListener('wheel', (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault(); // Stop entire page-zoom
      const zoomIntensity = 0.05;
      if (e.deltaY < 0) {
        pumlZoomScale += zoomIntensity;
      } else {
        pumlZoomScale -= zoomIntensity;
      }

      if (pumlZoomScale < 0.2) pumlZoomScale = 0.2;
      if (pumlZoomScale > 3.0) pumlZoomScale = 3.0;

      applyPumlModalZoomTransform();
    }
  }, { passive: false });

  // 2. Drag-to-pan canvas support
  previewContainer.addEventListener('mousedown', (e) => {
    if (e.button === 0) {
      isPanningPuml = true;
      previewContainer.style.cursor = 'grabbing';
      panStartX = e.clientX - pumlPanX;
      panStartY = e.clientY - pumlPanY;
    }
  });

  document.addEventListener('mousemove', (e) => {
    if (isPanningPuml) {
      pumlPanX = e.clientX - panStartX;
      pumlPanY = e.clientY - panStartY;
      applyPumlModalZoomTransform();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isPanningPuml) {
      isPanningPuml = false;
      previewContainer.style.cursor = 'grab';
    }
  });
}

function applyPumlModalZoomTransform() {
  const svgEl = document.querySelector('#pumlModalPreview svg');
  if (svgEl) {
    svgEl.style.transform = `translate(${pumlPanX}px, ${pumlPanY}px) scale(${pumlZoomScale})`;
    svgEl.style.transformOrigin = 'center center';
    svgEl.style.transition = isPanningPuml ? 'none' : 'transform 0.15s ease-out';
  }
}

function resetPumlModalZoom() {
  pumlZoomScale = 1.0;
  pumlPanX = 0;
  pumlPanY = 0;
  applyPumlModalZoomTransform();
  showToast("Diagram fitted to page");
}

function savePumlEditorChanges() {
  const codeTextarea = document.getElementById('pumlEditorCode');
  if (!codeTextarea) return;

  let code = getPumlEditorValue().trim();
  if (!code) {
    showToast("Please enter some diagram code first", false);
    return;
  }

  // Automatically enforce matching starting and ending boundaries dynamically
  const startMatch = code.match(/@start([a-z0-9]+)/i);
  if (!startMatch) {
    // Default wrapper fallback
    code = `@startuml\n${code}\n@enduml`;
  } else {
    const type = startMatch[1];
    const endTag = `@end${type}`;
    if (!code.includes(endTag)) {
      code = `${code}\n${endTag}`;
    }
  }

  const widthInput = document.getElementById('pumlModalWidth');
  const width = widthInput ? widthInput.value : 400;

  const titleInput = document.getElementById('pumlModalTitle');
  const title = titleInput ? titleInput.value.trim() : '';

  let finalCodeBlock = '';
  if (currentMode === 'asciidoc') {
    const titleLine = title ? `.${title}\n` : '';
    finalCodeBlock = `${titleLine}[plantuml, width=${width}]\n----\n${code}\n----`;
  } else {
    const titleLine = title ? `*${title}*\n` : '';
    finalCodeBlock = `${titleLine}\`\`\`plantuml\n${code}\n\`\`\``;
  }

  if (currentEditingPumlBlock && currentEditingPumlBlock.startLine !== null) {
    const block = currentEditingPumlBlock;
    let replaceStartLine = block.startLine;

    // Overwrite existing title above if present
    if (replaceStartLine > 0) {
      const prevLine = cmEditor.getLine(replaceStartLine - 1).trim();
      const isAdoc = (currentMode === 'asciidoc');
      const hasTitleAbove = isAdoc
        ? (prevLine.startsWith('.') && !prevLine.startsWith('...'))
        : (prevLine.startsWith('*') && prevLine.endsWith('*'));
      if (hasTitleAbove) {
        replaceStartLine = replaceStartLine - 1;
      }
    }

    const endLineContent = cmEditor.getLine(block.endLine) || '';
    cmEditor.replaceRange(
      finalCodeBlock,
      { line: replaceStartLine, ch: 0 },
      { line: block.endLine, ch: endLineContent.length }
    );
    showToast("Diagram modified successfully");
  } else {
    insertAtCursor(`\n${finalCodeBlock}\n`);
    showToast("Diagram inserted successfully");
  }

  closeModal('pumlEditorModal');
  currentEditingPumlBlock = null;
  renderDocument();
  updatePlantUmlStatus();
}

function updatePlantUmlStatus() {
  // Skip clearing and re-creating if the user is actively focused on an in-badge width input
  if (document.activeElement && document.activeElement.classList.contains('puml-pill-width-input')) {
    return;
  }

  activeFoldMarks.forEach(mark => {
    try { mark.clear(); } catch(e) {}
  });
  activeFoldMarks.clear();

  if (!cmEditor) return;

  const blocks = findPlantUmlBlocks();
  blocks.forEach(block => {
    foldPlantUmlBlock(block.startLine, block.endLine, block.title);
  });
}

function foldPlantUmlBlock(startLine, endLine, title) {
  if (!cmEditor) return;
  const startLineContent = cmEditor.getLine(startLine);
  const endLineContent = cmEditor.getLine(endLine);
  if (startLineContent === undefined || endLineContent === undefined) return;

  const blockKey = `${startLine}-${endLine}`;
  if (activeFoldMarks.has(blockKey)) return;

  // Extract current width for pre-fill
  let widthVal = 400;
  if (currentMode === 'asciidoc') {
    const widthMatch = startLineContent.match(/width=(\d+)/i);
    if (widthMatch) {
      widthVal = parseInt(widthMatch[1], 10);
    }
  }

  const pill = document.createElement('span');
  pill.className = 'plantuml-fold-pill';
  pill.title = 'Click Edit to open visual editor or modify width directly';

  pill.innerHTML = `
    <i class="fa-solid fa-diagram-project text-indigo-500"></i>
    <span class="font-semibold text-indigo-800 dark:text-indigo-200">Diagram:</span>
    <span class="opacity-75 truncate max-w-[120px]">${title || 'structure'}</span>
    ${currentMode === 'asciidoc' ? `
    <span class="inline-flex items-center gap-1 ml-1.5 puml-pill-width-wrapper">
      <span class="text-[10px] font-bold opacity-60">Width:</span>
      <input type="number" min="100" max="2000" step="50" value="${widthVal}" class="puml-pill-width-input w-12 px-1 py-0.2 bg-white/20 dark:bg-slate-900/30 border border-slate-300/30 rounded text-[10px] font-bold text-center outline-none focus:ring-1 focus:ring-indigo-500/50">
      <span class="text-[10px] font-semibold opacity-60">px</span>
    </span>
    ` : ''}
    <button class="ml-2 px-1.5 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/60 dark:hover:bg-indigo-800 text-[10px] font-bold text-indigo-800 dark:text-indigo-200 transition btn-edit-puml">Edit ✎</button>
  `;

  pill.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  // Implement inline width adjustment change listener
  const inputWidth = pill.querySelector('.puml-pill-width-input');
  if (inputWidth) {
    inputWidth.addEventListener('mousedown', e => e.stopPropagation());
    inputWidth.addEventListener('click', e => e.stopPropagation());
    inputWidth.addEventListener('keydown', e => e.stopPropagation());

    inputWidth.addEventListener('change', (e) => {
      const selStart = e.target.selectionStart;
      const selEnd = e.target.selectionEnd;

      const newVal = parseInt(e.target.value, 10) || 400;
      let lineText = cmEditor.getLine(startLine);
      if (lineText) {
        if (lineText.match(/width=\d+/i)) {
          lineText = lineText.replace(/width=\d+/i, `width=${newVal}`);
        } else {
          if (lineText.trim() === '[plantuml]') {
            lineText = `[plantuml, width=${newVal}]`;
          } else {
            lineText = lineText.replace(/\]$/, `, width=${newVal}]`);
          }
        }

        // Sync replacement inside CodeMirror
        cmEditor.replaceRange(lineText, { line: startLine, ch: 0 }, { line: startLine, ch: cmEditor.getLine(startLine).length });

        // Synchronously re-fold to keep the pill visible and focused
        activeFoldMarks.delete(blockKey);
        foldPlantUmlBlock(startLine, endLine, title);

        // Restore focus and selection
        const newMark = activeFoldMarks.get(blockKey);
        if (newMark && newMark.replacedWith) {
          const newInput = newMark.replacedWith.querySelector('.puml-pill-width-input');
          if (newInput) {
            newInput.focus();
            try { newInput.setSelectionRange(selStart, selEnd); } catch(err) {}
          }
        }
      }
    });
  }

  pill.querySelector('.btn-edit-puml').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPumlEditorModal(startLine, endLine);
  });

  const mark = cmEditor.markText(
    { line: startLine, ch: 0 },
    { line: endLine, ch: endLineContent.length },
    { collapsed: true, replacedWith: pill }
  );
  activeFoldMarks.set(blockKey, mark);
}

function unfoldAllPlantUML() {
  activeFoldMarks.forEach(mark => {
    try { mark.clear(); } catch(e) {}
  });
  activeFoldMarks.clear();

  activeTableFoldMarks.forEach(mark => {
    try { mark.clear(); } catch(e) {}
  });
  activeTableFoldMarks.clear();
}

/* Kroki Rendering Engine */
async function fetchKrokiSvg(code) {
  // Extract only the valid content between matching @start... and @end... tags to support all diagram types
  const startMatch = code.match(/@start([a-z0-9]+)/i);
  let cleanCode = code;

  if (startMatch) {
    const type = startMatch[1];
    const startTag = `@start${type}`;
    const endTag = `@end${type}`;
    
    const startIdx = code.indexOf(startTag);
    const endIdx = code.indexOf(endTag);
    
    if (startIdx !== -1 && endIdx !== -1) {
      cleanCode = code.substring(startIdx, endIdx + endTag.length).trim();
    }
  } else {
    if (!code.startsWith('@startuml')) {
      cleanCode = `@startuml\n${code}\n@enduml`;
    }
  }

  try {
    const res = await fetch(`${krokiBaseUrl}/plantuml/svg`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      body: cleanCode,
      signal: (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) ? AbortSignal.timeout(3000) : undefined
    });
    if (res.ok) {
      return await res.text();
    }
    throw new Error(`Serveur Kroki local HTTP ${res.status}`);
  } catch (err) {
    throw err;
  }
}

async function processKrokiDiagrams() {
  if (!output) return;

  const codeBlocks = output.querySelectorAll('pre > code, pre');
  const pumlBlocks = [];
  const blocks = findPlantUmlBlocks();
  let blockIdx = 0;

  codeBlocks.forEach(el => {
    const text = el.textContent.trim();
    if (text.match(/@start([a-z0-9]+)/i) || el.classList.contains('language-plantuml') || el.classList.contains('plantuml')) {
      const pre = el.tagName === 'PRE' ? el : el.closest('pre');
      if (pre && !pre.dataset.krokiProcessed) {
        pre.dataset.krokiProcessed = "true";
        const currentBlock = blocks[blockIdx];
        pumlBlocks.push({
          element: pre,
          code: text,
          width: currentBlock ? currentBlock.width : null,
          startLine: currentBlock ? currentBlock.startLine : null,
          endLine: currentBlock ? currentBlock.endLine : null
        });
        blockIdx++;
      }
    }
  });

  for (const item of pumlBlocks) {
    const code = item.code;
    const container = document.createElement('div');
    container.className = 'my-6 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm transition-all';

    container.innerHTML = `
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-slate-100 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
        <span class="flex items-center gap-1.5 font-medium text-indigo-600 dark:text-indigo-400">
          <i class="fa-solid fa-diagram-project"></i>
          <span>PlantUML Diagram</span>
        </span>
        <div class="flex items-center gap-2">
          ${item.startLine !== null ? `
            <button class="btn-edit-diagram px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-sans text-[10px] font-bold transition flex items-center gap-1 shrink-0 select-none shadow-sm cursor-pointer" title="Edit Diagram Source">
              <i class="fa-solid fa-pen"></i>
              <span>Edit</span>
            </button>
          ` : ''}
          <button class="btn-copy-svg px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition" title="Copy SVG">
            <i class="fa-regular fa-copy"></i>
          </button>
          <button class="btn-download-svg px-2 py-1 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 transition" title="Download SVG">
            <i class="fa-solid fa-download"></i>
          </button>
        </div>
      </div>
      <div class="diagram-render-body flex justify-center items-center py-4 min-h-[120px] text-xs text-slate-400">
        <i class="fa-solid fa-spinner fa-spin mr-2 text-indigo-500"></i> Generating diagram via Kroki...
      </div>
    `;

    item.element.parentNode.insertBefore(container, item.element);
    item.element.classList.add('hidden');

    const renderBody = container.querySelector('.diagram-render-body');
    const btnCopy = container.querySelector('.btn-copy-svg');
    const btnDownload = container.querySelector('.btn-download-svg');

    let svgContent = diagramSvgCache.get(code);
    if (!svgContent) {
      try {
        svgContent = await fetchKrokiSvg(code);
        diagramSvgCache.set(code, svgContent);
      } catch (err) {
        renderBody.innerHTML = `
          <div class="p-3 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg text-xs w-full border border-red-200 dark:border-red-800">
            <strong>Kroki Error:</strong> ${err.message || 'Unable to contact Kroki server.'}
            <div class="mt-2 text-[11px] text-slate-500">Verify that your local container server is running.</div>
          </div>
        `;
        continue;
      }
    }

    renderBody.innerHTML = svgContent;
    const svgEl = renderBody.querySelector('svg');
    if (svgEl) {
      svgEl.removeAttribute('height');
      svgEl.style.height = 'auto';

      // Apply custom width constraint if defined in the block code header
      if (item.width) {
        svgEl.style.width = `${item.width}px`;
        svgEl.style.maxWidth = `${item.width}px`;
      } else {
        svgEl.style.width = '100%';
        svgEl.style.maxWidth = '100%';
      }

      svgEl.classList.add('mx-auto');
    }

    const btnEdit = container.querySelector('.btn-edit-diagram');
    if (btnEdit) {
      btnEdit.onclick = () => {
        openPumlEditorModal(item.startLine, item.endLine);
      };
    }

    if (btnCopy) {
      btnCopy.onclick = () => {
        const el = document.createElement('textarea');
        el.value = svgContent;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        showToast("SVG copied to clipboard");
      };
    }
    if (btnDownload) {
      btnDownload.onclick = () => {
        const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'diagram.svg';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast("SVG file downloaded");
      };
    }
  }
}
