/**
 * DocCraft Studio - CodeMirror Editor, Rendering Engine & Synchronization
 */

function getEditorValue() {
  return cmEditor ? cmEditor.getValue() : (editor ? editor.value : '');
}

function setEditorValue(val) {
  if (cmEditor) {
    cmEditor.setValue(val);
  } else if (editor) {
    editor.value = val;
  }
}

function insertAtCursor(prefix, suffix = "", defaultText = "") {
  if (cmEditor) {
    const selection = cmEditor.getSelection();
    const textToInsert = selection.length > 0 ? selection : defaultText;
    const replacement = prefix + textToInsert + suffix;
    const from = cmEditor.getCursor("from");
    cmEditor.replaceSelection(replacement);

    if (selection.length === 0 && defaultText.length > 0) {
      const lines = prefix.split('\n');
      const targetLine = from.line + lines.length - 1;
      const targetCh = lines.length > 1 ? lines[lines.length - 1].length : from.ch + prefix.length;
      cmEditor.setSelection({ line: targetLine, ch: targetCh }, { line: targetLine, ch: targetCh + defaultText.length });
    }
    cmEditor.focus();
    renderDocument();
    updatePlantUmlStatus();
    updateTableBadges();
    return;
  }

  if (editor) {
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    const selected = editor.value.substring(start, end);
    const textToInsert = selected.length > 0 ? selected : defaultText;

    const replacement = prefix + textToInsert + suffix;
    editor.setRangeText(replacement, start, end, 'select');
    editor.focus();

    if (selected.length === 0 && defaultText.length > 0) {
      editor.selectionStart = start + prefix.length;
      editor.selectionEnd = start + prefix.length + defaultText.length;
    } else if (selected.length === 0) {
      editor.selectionStart = start + replacement.length;
      editor.selectionEnd = start + replacement.length;
    }
    renderDocument();
  }
}

function wrapText(formatType) {
  if (!cmEditor) return;
  
  const sel = cmEditor.getSelection();
  let prefix = '';
  let suffix = '';
  let defaultVal = '';
  
  if (currentMode === 'asciidoc') {
    switch (formatType) {
      case 'bold': prefix = '*'; suffix = '*'; defaultVal = 'bold text'; break;
      case 'italic': prefix = '_'; suffix = '_'; defaultVal = 'italic text'; break;
      case 'code': prefix = '`'; suffix = '`'; defaultVal = 'code'; break;
      case 'strike': prefix = 'line-through['; suffix = ']'; defaultVal = 'strikethrough text'; break;
    }
  } else {
    switch (formatType) {
      case 'bold': prefix = '**'; suffix = '**'; defaultVal = 'bold text'; break;
      case 'italic': prefix = '*'; suffix = '*'; defaultVal = 'italic text'; break;
      case 'code': prefix = '`'; suffix = '`'; defaultVal = 'code'; break;
      case 'strike': prefix = '~~'; suffix = '~~'; defaultVal = 'strikethrough text'; break;
    }
  }

  if (sel.length > 0) {
    if (sel.startsWith(prefix) && sel.endsWith(suffix)) {
      const unwrapped = sel.substring(prefix.length, sel.length - suffix.length);
      cmEditor.replaceSelection(unwrapped);
      renderDocument();
      queueSaveToIndexedDB();
      return;
    }
  }
  
  insertAtCursor(prefix, suffix, defaultVal);
}

function toggleComment() {
  if (!cmEditor) return;

  const from = cmEditor.getCursor("from");
  const to = cmEditor.getCursor("to");
  
  const startLine = from.line;
  const endLine = to.line;
  
  let allCommented = true;
  const lines = [];
  for (let i = startLine; i <= endLine; i++) {
    const lineText = cmEditor.getLine(i);
    lines.push(lineText);
    
    const isCommented = (currentMode === 'asciidoc') 
      ? lineText.trim().startsWith('//')
      : (lineText.trim().startsWith('<!--') && lineText.trim().endsWith('-->'));
    
    if (lineText.trim().length > 0 && !isCommented) {
      allCommented = false;
    }
  }

  if (lines.every(l => l.trim().length === 0)) {
    allCommented = false;
  }

  cmEditor.operation(() => {
    for (let i = startLine; i <= endLine; i++) {
      const lineText = cmEditor.getLine(i);
      
      if (currentMode === 'asciidoc') {
        if (allCommented) {
          if (lineText.trim().startsWith('//')) {
            const spacesCount = lineText.match(/^\s*/)[0].length;
            const afterSpaces = lineText.substring(spacesCount);
            if (afterSpaces.startsWith('// ')) {
              cmEditor.replaceRange(afterSpaces.substring(3), { line: i, ch: spacesCount }, { line: i, ch: lineText.length });
            } else if (afterSpaces.startsWith('//')) {
              cmEditor.replaceRange(afterSpaces.substring(2), { line: i, ch: spacesCount }, { line: i, ch: lineText.length });
            }
          }
        } else {
          const spacesCount = lineText.match(/^\s*/)[0].length;
          cmEditor.replaceRange('// ', { line: i, ch: spacesCount }, { line: i, ch: spacesCount });
        }
      } else {
        if (allCommented) {
          if (lineText.trim().startsWith('<!--') && lineText.trim().endsWith('-->')) {
            const spacesCount = lineText.match(/^\s*/)[0].length;
            const content = lineText.substring(spacesCount).trim();
            let unwrapped = content.substring(4, content.length - 3);
            if (unwrapped.startsWith(' ') && unwrapped.endsWith(' ')) {
              unwrapped = unwrapped.substring(1, unwrapped.length - 1);
            }
            cmEditor.replaceRange(unwrapped, { line: i, ch: spacesCount }, { line: i, ch: lineText.length });
          }
        } else {
          const spacesCount = lineText.match(/^\s*/)[0].length;
          const content = lineText.substring(spacesCount);
          cmEditor.replaceRange(`<!-- ${content} -->`, { line: i, ch: spacesCount }, { line: i, ch: lineText.length });
        }
      }
    }
  });

  renderDocument();
  queueSaveToIndexedDB();
}

function insertHeader(level) {
  const isAdoc = (currentMode === 'asciidoc');
  const symbol = isAdoc ? '='.repeat(level) : '#'.repeat(level);
  const prefix = `${symbol} `;
  insertAtCursor(`\n${prefix}`, '\n', `Heading level ${level}`);
}

function insertList(type) {
  const isAdoc = (currentMode === 'asciidoc');
  if (type === 'ul') {
    const char = isAdoc ? '* ' : '- ';
    insertAtCursor(`\n${char}`, '\n', 'List item');
  } else if (type === 'ol') {
    const char = isAdoc ? '. ' : '1. ';
    insertAtCursor(`\n${char}`, '\n', 'First numbered item');
  } else if (type === 'check') {
    const prefix = isAdoc ? '* [ ] ' : '- [ ] ';
    insertAtCursor(`\n${prefix}`, '\n', 'Task to do');
  }
}

function insertQuote() {
  if (currentMode === 'asciidoc') {
    insertAtCursor('\n[quote]\n____\n', '\n____\n', 'Your quote here...');
  } else {
    insertAtCursor('\n> ', '\n', 'Your quote here...');
  }
}

function insertCodeBlock() {
  if (currentMode === 'asciidoc') {
    insertAtCursor('\n[source,javascript]\n----\n', '\n----\n', '// Your code here\nconsole.log("Hello!");');
  } else {
    insertAtCursor('\n```javascript\n', '\n```\n', '// Your code here\nconsole.log("Hello!");');
  }
}

function insertHorizontalRule() {
  const hr = currentMode === 'asciidoc' ? "\n'''\n" : "\n---\n";
  insertAtCursor(hr);
}

function insertForcedLineBreak() {
  const breakCode = currentMode === 'asciidoc' ? "\n\n{empty} +\n\n" : "\n\n<br>\n\n";
  insertAtCursor(breakCode);
}

function setMode(mode) {
  if (currentMode === mode) return;
  currentMode = mode;

  unfoldAllPlantUML();

  if (cmEditor) {
    cmEditor.setOption('mode', mode === 'asciidoc' ? 'asciidoc' : 'markdown');
  }

  const btnAscii = document.getElementById('btnModeAsciiDoc');
  const btnMd = document.getElementById('btnModeMarkdown');
  const convertLabel = document.getElementById('btnConvertLabel');
  const modeBadge = document.getElementById('modeBadge');
  const editorLabel = document.getElementById('editorLabel');
  const syntaxStatusLabel = document.getElementById('syntaxStatusLabel');
  const btnBreak = document.getElementById('btnForcedLineBreak');

  if (mode === 'asciidoc') {
    if (btnBreak) btnBreak.title = "Forced line break ({empty} +)";
    if (btnAscii) btnAscii.className = "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-sm bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300";
    if (btnMd) btnMd.className = "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition text-slate-600 dark:text-slate-300 hover:text-slate-900";
    if (modeBadge) {
      modeBadge.innerText = "AsciiDoc";
      modeBadge.className = "text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300 font-semibold uppercase tracking-wider";
    }
    if (editorLabel) editorLabel.innerText = "Editor (AsciiDoc)";
    if (syntaxStatusLabel) syntaxStatusLabel.innerText = "Active syntax: AsciiDoc";
    if (convertLabel) convertLabel.innerText = "Convert to Markdown";
  } else {
    if (btnBreak) btnBreak.title = "Forced line break (<br>)";
    if (btnMd) btnMd.className = "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition shadow-sm bg-white dark:bg-slate-800 text-teal-700 dark:text-teal-300";
    if (btnAscii) btnAscii.className = "px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition text-slate-600 dark:text-slate-300 hover:text-slate-900";
    if (modeBadge) {
      modeBadge.innerText = "Markdown";
      modeBadge.className = "text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 font-semibold uppercase tracking-wider";
    }
    if (editorLabel) editorLabel.innerText = "Editor (Markdown)";
    if (syntaxStatusLabel) syntaxStatusLabel.innerText = "Active syntax: Markdown";
    if (convertLabel) convertLabel.innerText = "Convert to AsciiDoc";
  }

  showToast(`Mode switched to ${mode === 'asciidoc' ? 'AsciiDoc' : 'Markdown'}`);
  renderDocument();
  if (typeof queueSaveToIndexedDB === 'function') {
    queueSaveToIndexedDB();
  }
}

function clearEditor() {
  unfoldAllPlantUML();
  setEditorValue('');
  renderDocument();
  updatePlantUmlStatus();
  updateTableBadges();
  updatePictureBadges();
  showToast("Editor cleared");
}

function editorUndo() {
  if (cmEditor) cmEditor.undo();
}

function editorRedo() {
  if (cmEditor) cmEditor.redo();
}

/**
 * Preprocesses AsciiDoc task checklists to auto-inject [%interactive] option
 * and ensures checkboxes are natively parsed and rendered by Asciidoctor
 */
function preprocessAdocChecklists(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (/^(----|\.\.\.\.|\[source|\[plantuml)/i.test(line)) {
      if (/^(----|\.\.\.\.)/.test(line)) inCodeBlock = !inCodeBlock;
      result.push(line);
      continue;
    }

    if (!inCodeBlock) {
      if (/^\s*(?:\*|\-)\s+\[[ xX*]\]/.test(line)) {
        let prevLineIdx = result.length - 1;
        while (prevLineIdx >= 0 && result[prevLineIdx].trim() === "") {
          prevLineIdx--;
        }
        const prevLine = prevLineIdx >= 0 ? result[prevLineIdx].trim() : "";
        const isAlreadyChecklist = /^\[(%interactive|%checklist|options=.*checklist.*)\]/i.test(prevLine);
        const isPrevItem = /^\s*(?:\*|\-)\s+/.test(prevLine);

        if (!isPrevItem && !isAlreadyChecklist) {
          result.push("[%interactive]");
        }

        const normalizedLine = line.replace(/^(\s*)-\s+(\[[ xX*]\])/, '$1* $2');
        result.push(normalizedLine);
        continue;
      }
    }
    result.push(line);
  }
  return result.join("\n");
}

/**
 * Compiles raw input into formatted HTML based on active mode
 */
function renderDocument() {
  if (!output) return;

  const text = getEditorValue();
  const startTime = performance.now();

  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  if (wordCount) wordCount.innerText = `${words} word${words > 1 ? 's' : ''}`;
  if (charCount) charCount.innerText = `${text.length} char${text.length > 1 ? 's' : ''}`;

  try {
    let renderedHtml = '';
    const wikiPreprocessedText = (typeof preprocessWikiLinksForRendering === 'function')
      ? preprocessWikiLinksForRendering(text, currentMode)
      : text;

    if (currentMode === 'asciidoc') {
      if (!asciidoctorEngine && typeof Asciidoctor !== 'undefined') {
        asciidoctorEngine = Asciidoctor();
      }

      if (asciidoctorEngine) {
        let preparedText = wikiPreprocessedText.replace(/^\[plantuml(.*?)\]\s*\n(\.\.\.\.|----)/gim, '[source,plantuml]\n----');
        preparedText = preprocessAdocChecklists(preparedText);

        const adocAttributes = {
          showtitle: true,
          icons: 'font',
          doctype: 'book'
        };

        if (/^:toc\b/im.test(preparedText)) {
          adocAttributes['toc'] = 'auto';
        }

        adocAttributes['sectnumlevels'] = '5';

        renderedHtml = asciidoctorEngine.convert(preparedText, {
          safe: 'safe',
          attributes: adocAttributes
        });
      } else {
        renderedHtml = '<p class="text-slate-400 italic">Loading AsciiDoc engine...</p>';
      }
    } else {
      if (typeof marked !== 'undefined') {
        renderedHtml = marked.parse(wikiPreprocessedText);
      } else {
        renderedHtml = `<pre>${wikiPreprocessedText}</pre>`;
      }
    }

    const preparedHtml = renderedHtml.replace(/src=["']((?!https?:\/\/|data:)[^"']+)["']/gi, 'src="" data-pending-src="$1"');

    if (typeof DOMPurify !== 'undefined') {
      output.innerHTML = DOMPurify.sanitize(preparedHtml);
    } else {
      output.innerHTML = preparedHtml;
    }

    processKrokiDiagrams();
    processTableFloatingButtons();
    resolveVirtualImagePaths(output);

    if (typeof parseDocumentMetadata === 'function' && typeof renderMetadataCard === 'function') {
      const meta = parseDocumentMetadata(text, currentMode);
      renderMetadataCard(meta);
    }
    if (typeof renderWikiLinksInContainer === 'function') {
      renderWikiLinksInContainer(output);
    }
    if (typeof renderTagPillsInContainer === 'function') {
      renderTagPillsInContainer(output);
    }
    if (typeof processChecklistsInPreview === 'function') {
      processChecklistsInPreview(output);
    }
    if (typeof computeBacklinksForActiveDocument === 'function') {
      computeBacklinksForActiveDocument();
    }
    if (typeof updateGlobalTaskCountBadge === 'function') {
      updateGlobalTaskCountBadge();
    }

    const previewSearchBarElement = document.getElementById('previewSearchBar');
    if (previewSearchBarElement && !previewSearchBarElement.classList.contains('hidden')) {
      originalRenderOutputHtml = output.innerHTML;
      onPreviewSearchQueryChange();
    }
  } catch (err) {
    output.innerHTML = `
      <div class="p-4 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
        <p class="font-semibold flex items-center gap-2">
          <i class="fa-solid fa-triangle-exclamation"></i>
          Error during rendering:
        </p>
        <p class="text-xs font-mono mt-1">${err.message || err}</p>
      </div>
    `;
  }

  const duration = Math.round(performance.now() - startTime);
  if (renderBadge) {
    renderBadge.innerText = `${duration}ms`;
  }
}

async function resolveVirtualImagePaths(targetContainer = output) {
  if (!targetContainer || !currentDocumentId) return;

  const imgTags = targetContainer.querySelectorAll('img[data-pending-src]');
  if (imgTags.length === 0) return;

  const attachments = await dbGetAttachments(currentDocumentId);
  if (attachments.length === 0) return;

  imgTags.forEach(img => {
    const pendingSrc = img.getAttribute('data-pending-src') || '';
    const filename = pendingSrc.split('/').pop();
    const att = attachments.find(a => a.filename === filename);
    if (att) {
      img.src = att.dataUrl;
    }
  });
}

/* Picture Folding & Detection */
function parseAsciiDocImageWidth(attrsStr) {
  if (!attrsStr) return '';
  const attrs = attrsStr.split(',').map(s => s.trim());
  for (const attr of attrs) {
    const namedMatch = attr.match(/^width\s*=\s*["']?([a-zA-Z0-9%]+)["']?$/i);
    if (namedMatch) return namedMatch[1];
  }
  if (attrs[1] && !attrs[1].includes('=')) {
    return attrs[1];
  }
  return '';
}

function findPictureLines() {
  const text = getEditorValue();
  const lines = text.split(/\r?\n/);
  const pictures = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (currentMode === 'asciidoc') {
      const isBlock = line.startsWith('image::');
      const isInline = line.startsWith('image:');
      if (isBlock || isInline) {
        const bracketIdx = line.indexOf('[');
        if (bracketIdx !== -1 && line.endsWith(']')) {
          const prefixLen = isBlock ? 7 : 6;
          const source = line.substring(prefixLen, bracketIdx).trim();
          const attrsStr = line.substring(bracketIdx + 1, line.length - 1).trim();
          const width = parseAsciiDocImageWidth(attrsStr);
          const attrs = attrsStr.split(',').map(s => s.trim());
          const alt = attrs[0] || 'picture';

          pictures.push({
            lineNum: i,
            source: source,
            alt: alt,
            width: width,
            isBlock: isBlock
          });
        }
      }
    } else {
      if (line.startsWith('![')) {
        const splitIdx = line.indexOf('](');
        if (splitIdx !== -1 && line.endsWith(')')) {
          const alt = line.substring(2, splitIdx).trim();
          const source = line.substring(splitIdx + 2, line.length - 1).trim();
          
          pictures.push({
            lineNum: i,
            source: source,
            alt: alt || 'picture',
            width: '',
            isBlock: true
          });
        }
      }
    }
  }
  return pictures;
}

function updatePictureBadges() {
  if (document.activeElement && document.activeElement.classList.contains('pic-pill-width-input')) {
    return;
  }

  activePictureUnfoldWidgets.forEach(w => {
    try { w.clear(); } catch(e) {}
  });
  activePictureUnfoldWidgets = [];

  if (!cmEditor) return;

  const pictures = findPictureLines();
  pictures.forEach(pic => {
    const blockKey = `${pic.lineNum}`;

    if (manuallyUnfoldedPictures.has(pic.lineNum)) {
      const lineContent = cmEditor.getLine(pic.lineNum);
      if (lineContent !== undefined) {
        const pill = document.createElement('span');
        pill.className = 'picture-unfold-pill';
        pill.title = 'Fold this picture code back';

        const widthLabel = pic.width ? ` (${pic.width})` : '';
        pill.innerHTML = `
          <i class="fa-regular fa-image text-emerald-500"></i>
          <span class="font-semibold text-emerald-600 dark:text-emerald-400">Picture:</span>
          <span class="opacity-75 truncate max-w-[80px]">${pic.alt || 'image'}</span>${widthLabel}
          <button class="ml-1 px-1 py-0.5 rounded bg-white hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[9px] font-bold text-emerald-700 dark:text-emerald-300 transition btn-fold-pic">Fold ▴</button>
          <button class="ml-1 px-1 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-800 text-[9px] font-bold text-emerald-800 dark:text-emerald-200 transition btn-edit-pic">Edit ✎</button>
        `;

        pill.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        pill.querySelector('.btn-fold-pic').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          manuallyUnfoldedPictures.delete(pic.lineNum);
          updatePictureBadges();
        });

        pill.querySelector('.btn-edit-pic').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openPictureReplacement(pic.lineNum, pic.source, pic.alt, pic.width);
        });

        const bookmark = cmEditor.setBookmark(
          { line: pic.lineNum, ch: lineContent.length },
          { widget: pill, insertLeft: true }
        );
        activePictureUnfoldWidgets.push(bookmark);
      }
    } else {
      foldPictureLine(pic.lineNum, pic.source, pic.alt, pic.width);
    }
  });
}

function foldPictureLine(lineNum, source, alt, width) {
  if (!cmEditor) return;
  const lineContent = cmEditor.getLine(lineNum);
  if (lineContent === undefined) return;

  const blockKey = `${lineNum}`;
  if (activePictureFoldMarks.has(blockKey)) return;

  const pill = document.createElement('span');
  pill.className = 'picture-fold-pill';
  pill.title = 'Click to unfold this picture code or modify width directly';

  pill.innerHTML = `
    <i class="fa-regular fa-image text-emerald-600"></i>
    <span class="font-semibold text-emerald-800 dark:text-emerald-200">Picture:</span>
    <span class="opacity-75 truncate max-w-[120px]">${alt || 'image'}</span>
    ${currentMode === 'asciidoc' ? `
    <span class="inline-flex items-center gap-1 ml-1.5 pic-pill-width-wrapper">
      <span class="text-[10px] font-bold opacity-60">Width:</span>
      <input type="number" min="5" max="100" step="5" value="${width ? (parseInt(width, 10) || '') : ''}" placeholder="100" class="pic-pill-width-input w-12 px-1 py-0.2 bg-white/20 dark:bg-slate-900/30 border border-slate-300/30 rounded text-[10px] font-bold text-center outline-none focus:ring-1 focus:ring-emerald-500/50 text-emerald-900 dark:text-emerald-100">
      <span class="text-[10px] font-semibold opacity-60">%</span>
    </span>
    ` : `
    <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold">${width ? ` (Width: ${width})` : ''}</span>
    `}
    <button class="ml-1.5 px-1 py-0.5 rounded bg-white hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 shadow-sm transition btn-unfold-pic">Unfold ▾</button>
    <button class="ml-1 px-1 py-0.5 rounded bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/60 dark:hover:bg-emerald-800 text-[10px] font-bold text-emerald-800 dark:text-emerald-200 transition btn-edit-pic">Edit ✎</button>
  `;

  pill.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });

  const inputWidth = pill.querySelector('.pic-pill-width-input');
  if (inputWidth) {
    inputWidth.addEventListener('mousedown', e => e.stopPropagation());
    inputWidth.addEventListener('click', e => e.stopPropagation());
    inputWidth.addEventListener('keydown', e => e.stopPropagation());

    inputWidth.addEventListener('change', (e) => {
      const selStart = e.target.selectionStart;
      const selEnd = e.target.selectionEnd;

      const rawVal = parseInt(e.target.value, 10);
      const newVal = (rawVal && rawVal > 0) ? rawVal + '%' : '';

      let lineText = cmEditor.getLine(lineNum);
      if (lineText) {
        const leadingWhitespace = lineText.match(/^\s*/)[0];
        const isDoubleColon = lineText.trim().startsWith('image::');
        const prefixImage = isDoubleColon ? 'image::' : 'image:';
        
        const bracketIdx = lineText.indexOf('[');
        if (bracketIdx !== -1 && lineText.endsWith(']')) {
          const attrsStr = lineText.substring(bracketIdx + 1, lineText.length - 1);
          let altText = '';
          const attrs = attrsStr.split(',').map(s => s.trim());
          if (attrs[0] && !attrs[0].includes('=')) {
            altText = attrs[0];
          } else {
            const altMatch = attrsStr.match(/alt\s*=\s*["']?([^"']+)["']?/i);
            altText = altMatch ? altMatch[1] : '';
          }

          const newLine = `${leadingWhitespace}${prefixImage}${source}[${altText},width=${newVal}]`;
          
          cmEditor.replaceRange(newLine, { line: lineNum, ch: 0 }, { line: lineNum, ch: cmEditor.getLine(lineNum).length });

          activePictureFoldMarks.delete(blockKey);
          foldPictureLine(lineNum, source, alt, newVal);

          const newMark = activePictureFoldMarks.get(blockKey);
          if (newMark && newMark.replacedWith) {
            const newInput = newMark.replacedWith.querySelector('.pic-pill-width-input');
            if (newInput) {
              newInput.focus();
              try { newInput.setSelectionRange(selStart, selEnd); } catch(err) {}
            }
          }
        }
      }
    });
  }

  pill.querySelector('.btn-unfold-pic').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    manuallyUnfoldedPictures.add(lineNum);
    unfoldPictureLine(lineNum);
  });

  pill.querySelector('.btn-edit-pic').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openPictureReplacement(lineNum, source, alt, width);
  });

  const mark = cmEditor.markText(
    { line: lineNum, ch: 0 },
    { line: lineNum, ch: lineContent.length },
    { collapsed: true, replacedWith: pill }
  );
  activePictureFoldMarks.set(blockKey, mark);
}

function unfoldPictureLine(lineNum) {
  const blockKey = `${lineNum}`;
  const mark = activePictureFoldMarks.get(blockKey);
  if (mark) {
    try { mark.clear(); } catch(e) {}
    activePictureFoldMarks.delete(blockKey);
    updatePictureBadges();
  }
}

function openPictureReplacement(lineNum, source, alt, width) {
  imageReplaceTargetLine = lineNum;
  const imgUrlInput = document.getElementById('imgUrl');
  const imgAltInput = document.getElementById('imgAlt');
  const imgWidthInput = document.getElementById('imgWidth');
  const imgTitleInput = document.getElementById('imgTitle');

  if (imgUrlInput && !source.startsWith('data:')) {
    imgUrlInput.value = source;
  } else if (imgUrlInput) {
    imgUrlInput.value = '';
  }
  if (imgAltInput) {
    imgAltInput.value = alt || '';
  }
  if (imgWidthInput) {
    imgWidthInput.value = width ? (parseInt(width, 10) || '') : '';
  }
  if (imgTitleInput) {
    imgTitleInput.value = '';
    if (currentMode === 'asciidoc' && lineNum > 0) {
      const prevLine = cmEditor.getLine(lineNum - 1) || '';
      const matchTitle = prevLine.trim().match(/^\.([^\s].*)$/);
      if (matchTitle) {
        imgTitleInput.value = matchTitle[1];
      }
    } else if (currentMode === 'markdown' && lineNum < cmEditor.lineCount() - 1) {
      const nextLine = cmEditor.getLine(lineNum + 1) || '';
      const matchTitle = nextLine.trim().match(/^\*([^\s].*)\*$/);
      if (matchTitle) {
        imgTitleInput.value = matchTitle[1];
      }
    }
  }

  openModal('imageModal');
  
  if (source.includes('attachments/')) {
    const filename = source.split('attachments/').pop();
    selectedAttachmentFilename = filename;
    setImageModalTab('local');
  } else {
    selectedAttachmentFilename = null;
    setImageModalTab('web');
  }
}

function replaceImageAndTitleAtLine(lineNum, newImgCode, newTitle) {
  if (!cmEditor) return;
  const lineContent = cmEditor.getLine(lineNum) || '';
  
  let hasTitleAbove = false;
  let prevLine = '';
  if (lineNum > 0) {
    prevLine = cmEditor.getLine(lineNum - 1) || '';
    hasTitleAbove = prevLine.trim().startsWith('.') && !prevLine.trim().startsWith('//');
  }

  let replaceStartLine = lineNum;
  let replaceStartCh = 0;
  let replaceEndLine = lineNum;
  let replaceEndCh = lineContent.length;

  let textToInsert = newImgCode;

  if (currentMode === 'asciidoc') {
    if (newTitle) {
      if (hasTitleAbove) {
        replaceStartLine = lineNum - 1;
        replaceStartCh = 0;
        textToInsert = `.${newTitle}\n${newImgCode}`;
      } else {
        textToInsert = `.${newTitle}\n${newImgCode}`;
      }
    } else {
      if (hasTitleAbove) {
        replaceStartLine = lineNum - 1;
        replaceStartCh = 0;
        textToInsert = newImgCode;
      }
    }
  } else {
    let hasTitleBelow = false;
    if (lineNum < cmEditor.lineCount() - 1) {
      const nextLine = cmEditor.getLine(lineNum + 1) || '';
      if (nextLine.trim().startsWith('*') && nextLine.trim().endsWith('*')) {
        hasTitleBelow = true;
      }
    }

    if (newTitle) {
      textToInsert = `${newImgCode}\n*${newTitle}*`;
    }
    if (hasTitleBelow) {
      replaceEndLine = lineNum + 1;
      replaceEndCh = (cmEditor.getLine(lineNum + 1) || '').length;
    }
  }

  cmEditor.replaceRange(
    textToInsert,
    { line: replaceStartLine, ch: replaceStartCh },
    { line: replaceEndLine, ch: replaceEndCh }
  );
}

/* Bidirectional Text Selection Synchronizers */
function cleanString(str) {
  if (!str) return "";
  try {
    return str.replace(/[^\p{L}\p{N}\s]/gu, ' ').toLowerCase();
  } catch (e) {
    return str.replace(/[^a-zA-Z0-9\s]/g, ' ').toLowerCase();
  }
}

function getContextScore(pContext, eContext, isBefore) {
  const pWords = pContext.trim().split(/\s+/).filter(Boolean);
  const eWords = eContext.trim().split(/\s+/).filter(Boolean);
  
  if (pWords.length === 0 && eWords.length === 0) return 1.0;
  
  if (isBefore) {
    pWords.reverse();
    eWords.reverse();
  }
  
  let matchCount = 0;
  const maxToCompare = Math.min(10, pWords.length);
  for (let i = 0; i < maxToCompare; i++) {
    const pWord = pWords[i];
    let found = false;
    const startWin = Math.max(0, i - 2);
    const endWin = Math.min(eWords.length - 1, i + 2);
    for (let j = startWin; j <= endWin; j++) {
      if (eWords[j] === pWord) {
        found = true;
        break;
      }
    }
    if (found) {
      matchCount += (1.0 / (i + 1));
    }
  }
  return matchCount;
}

function findDOMNodeAtOffset(parent, targetOffset) {
  let currentOffset = 0;
  let foundNode = null;
  let offsetInNode = 0;
  
  function traverse(node) {
    if (foundNode) return;
    
    if (node.nodeType === Node.TEXT_NODE) {
      const len = node.nodeValue.length;
      if (currentOffset + len >= targetOffset) {
        foundNode = node;
        offsetInNode = targetOffset - currentOffset;
        return;
      }
      currentOffset += len;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      for (let i = 0; i < node.childNodes.length; i++) {
        traverse(node.childNodes[i]);
      }
    }
  }
  
  traverse(parent);
  return { node: foundNode, offset: offsetInNode };
}

function getTableTitleLine(editorTable) {
  if (!cmEditor) return editorTable.startLine;
  const startLine = editorTable.startLine;
  if (editorTable.format === 'asciidoc') {
    for (let i = startLine - 1; i >= Math.max(0, startLine - 5); i--) {
      const line = cmEditor.getLine(i);
      if (line === undefined) continue;
      const trimmed = line.trim();
      if (trimmed.startsWith('.') && !trimmed.startsWith('..')) {
        return i;
      }
    }
  } else {
    for (let i = startLine - 1; i >= Math.max(0, startLine - 3); i--) {
      const line = cmEditor.getLine(i);
      if (line === undefined) continue;
      const trimmed = line.trim();
      if (trimmed.match(/^#{1,6}\s+/)) {
        return i;
      }
    }
  }
  return startLine;
}

function syncPreviewSelectionToEditor() {
  if (!cmEditor) return;
  
  const selectionObj = window.getSelection();
  if (!selectionObj || selectionObj.toString().trim() === "") {
    showToast("Please select some text in the Preview first!", false);
    return;
  }

  const selectionText = selectionObj.toString().trim();

  let isInsideTable = false;
  let tableEl = null;
  if (selectionObj.rangeCount > 0) {
    const range = selectionObj.getRangeAt(0);
    let node = range.startContainer;
    let parent = node.parentElement;
    while (parent && parent !== output) {
      if (parent.tagName === 'TABLE') {
        tableEl = parent;
        isInsideTable = true;
        break;
      }
      parent = parent.parentElement;
    }
  }

  if (isInsideTable && tableEl) {
    const allPreviewTables = Array.from(output.querySelectorAll('table'));
    const tableIndex = allPreviewTables.indexOf(tableEl);

    const allEditorTables = findTableBlocks();
    if (tableIndex !== -1 && allEditorTables[tableIndex]) {
      const editorTable = allEditorTables[tableIndex];
      const lineNum = getTableTitleLine(editorTable);
      const lineText = cmEditor.getLine(lineNum);
      
      cmEditor.setSelection({ line: lineNum, ch: 0 }, { line: lineNum, ch: lineText ? lineText.length : 0 });
      cmEditor.scrollIntoView({ line: lineNum, ch: 0 }, 100);
      cmEditor.focus();
      
      if (lineNum !== editorTable.startLine) {
        showToast("Table detected! Navigated to the table title in editor.");
      } else {
        showToast("Table detected! Cursor navigated to the table's first row in editor.");
      }
      return;
    }
  }

  if (selectionObj.rangeCount > 0) {
    try {
      const fullPreviewText = output.textContent;
      const range = selectionObj.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(output);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      const previewStartOffset = preCaretRange.toString().length;
      const previewEndOffset = previewStartOffset + selectionText.length;
      
      const previewBeforeRaw = fullPreviewText.substring(Math.max(0, previewStartOffset - 150), previewStartOffset);
      const previewAfterRaw = fullPreviewText.substring(previewEndOffset, Math.min(fullPreviewText.length, previewEndOffset + 150));
      
      const cleanSelection = cleanString(selectionText);
      const cleanBefore = cleanString(previewBeforeRaw);
      const cleanAfter = cleanString(previewAfterRaw);
      
      const queryWords = cleanSelection.trim().split(/\s+/).filter(Boolean);
      if (queryWords.length > 0) {
        const escapeReg = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexPattern = queryWords.map(escapeReg).join('\\s+');
        const regex = new RegExp(regexPattern, 'gi');
        
        const rawEditorText = cmEditor.getValue();
        const cleanEditorText = cleanString(rawEditorText);
        
        let bestIndex = -1;
        let bestLength = 0;
        let maxScore = -1;
        let match;
        
        while ((match = regex.exec(cleanEditorText)) !== null) {
          const matchIdx = match.index;
          const matchLen = match[0].length;
          
          const editorBefore = cleanEditorText.substring(Math.max(0, matchIdx - 150), matchIdx);
          const editorAfter = cleanEditorText.substring(matchIdx + matchLen, Math.min(cleanEditorText.length, matchIdx + matchLen + 150));
          
          const beforeScore = getContextScore(cleanBefore, editorBefore, true);
          const afterScore = getContextScore(cleanAfter, editorAfter, false);
          const totalScore = beforeScore + afterScore;
          
          if (totalScore > maxScore) {
            maxScore = totalScore;
            bestIndex = matchIdx;
            bestLength = matchLen;
          }
        }
        
        if (bestIndex !== -1 && maxScore >= 0.1) {
          const pos = cmEditor.posFromIndex(bestIndex);
          const endPos = cmEditor.posFromIndex(bestIndex + bestLength);
          
          cmEditor.setSelection(pos, endPos);
          cmEditor.scrollIntoView({ from: pos, to: endPos }, 100);
          cmEditor.focus();
          showToast("Precise context match found in editor!");
          return;
        }
      }
    } catch (e) {
      console.error("Context-aware sync selection to editor failed, falling back", e);
    }
  }

  const docText = cmEditor.getValue();
  const index = docText.indexOf(selectionText);
  if (index !== -1) {
    const pos = cmEditor.posFromIndex(index);
    const endPos = cmEditor.posFromIndex(index + selectionText.length);
    cmEditor.setSelection(pos, endPos);
    cmEditor.scrollIntoView({ from: pos, to: endPos }, 100);
    cmEditor.focus();
    showToast("Cursor navigated to selected text in editor!");
  } else {
    const lowerDoc = docText.toLowerCase();
    const lowerSel = selectionText.toLowerCase();
    const lowerIndex = lowerDoc.indexOf(lowerSel);
    if (lowerIndex !== -1) {
      const pos = cmEditor.posFromIndex(lowerIndex);
      const endPos = cmEditor.posFromIndex(lowerIndex + selectionText.length);
      cmEditor.setSelection(pos, endPos);
      cmEditor.scrollIntoView({ from: pos, to: endPos }, 100);
      cmEditor.focus();
      showToast("Cursor navigated to selected text in editor!");
    } else {
      showToast("Selected text not found in the source code", false);
    }
  }
}

function syncEditorSelectionToPreview() {
  if (!cmEditor || !output) return;
  const rawSelection = cmEditor.getSelection().trim();
  if (!rawSelection) {
    showToast("Please select some text in the Code Editor first!", false);
    return;
  }

  const fromPos = cmEditor.getCursor('from');
  const toPos = cmEditor.getCursor('to');
  const selStartIdx = cmEditor.indexFromPos(fromPos);
  const selEndIdx = cmEditor.indexFromPos(toPos);
  const rawEditorText = cmEditor.getValue();

  try {
    const rawContextBefore = rawEditorText.substring(Math.max(0, selStartIdx - 150), selStartIdx);
    const rawContextAfter = rawEditorText.substring(selEndIdx, Math.min(rawEditorText.length, selEndIdx + 150));

    const cleanSelection = cleanString(rawSelection);
    const cleanBefore = cleanString(rawContextBefore);
    const cleanAfter = cleanString(rawContextAfter);

    const queryWords = cleanSelection.trim().split(/\s+/).filter(Boolean);
    if (queryWords.length > 0) {
      const escapeReg = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regexPattern = queryWords.map(escapeReg).join('\\s+');
      const regex = new RegExp(regexPattern, 'gi');

      const fullPreviewText = output.textContent;
      const cleanPreviewText = cleanString(fullPreviewText);

      let bestIndex = -1;
      let bestLength = 0;
      let maxScore = -1;
      let match;

      while ((match = regex.exec(cleanPreviewText)) !== null) {
        const matchIdx = match.index;
        const matchLen = match[0].length;

        const previewBefore = cleanPreviewText.substring(Math.max(0, matchIdx - 150), matchIdx);
        const previewAfter = cleanPreviewText.substring(matchIdx + matchLen, Math.min(cleanPreviewText.length, matchIdx + matchLen + 150));

        const beforeScore = getContextScore(cleanBefore, previewBefore, true);
        const afterScore = getContextScore(cleanAfter, previewAfter, false);
        const totalScore = beforeScore + afterScore;

        if (totalScore > maxScore) {
          maxScore = totalScore;
          bestIndex = matchIdx;
          bestLength = matchLen;
        }
      }

      if (bestIndex !== -1 && maxScore >= 0.1) {
        const targetInfo = findDOMNodeAtOffset(output, bestIndex);
        if (targetInfo && targetInfo.node) {
          let targetElement = targetInfo.node.nodeType === Node.ELEMENT_NODE 
            ? targetInfo.node 
            : targetInfo.node.parentElement;

          if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

            targetElement.classList.add('bg-yellow-200/50', 'dark:bg-yellow-800/30', 'transition-all', 'duration-500');
            setTimeout(() => {
              targetElement.classList.remove('bg-yellow-200/50', 'dark:bg-yellow-800/30');
            }, 2000);

            showToast("Scrolled to precise text match in Preview!");
            return;
          }
        }
      }
    }
  } catch (e) {
    console.error("Context-aware sync selection to preview failed, falling back", e);
  }

  const searchStr = rawSelection.replace(/^[*_`#~\[\]]+/, '').replace(/[*_`#~\[\]]+$/, '').trim();
  if (!searchStr) {
    showToast("Please select text with alphanumeric content", false);
    return;
  }

  const elements = Array.from(output.querySelectorAll('*'));
  let targetElement = null;
  
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.children.length === 0 || el.tagName === 'P' || el.tagName === 'TD' || el.tagName === 'LI' || el.tagName === 'SPAN' || /^H[1-6]$/.test(el.tagName)) {
      if (el.textContent && (el.textContent.includes(searchStr) || el.textContent.toLowerCase().includes(searchStr.toLowerCase()))) {
        targetElement = el;
        break;
      }
    }
  }

  if (targetElement) {
    targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    targetElement.classList.add('bg-yellow-200/50', 'dark:bg-yellow-800/30', 'transition-all', 'duration-500');
    setTimeout(() => {
      targetElement.classList.remove('bg-yellow-200/50', 'dark:bg-yellow-800/30');
    }, 2000);
    showToast("Scrolled to selected text in Preview!");
  } else {
    showToast("Selected text not found in the rendered preview", false);
  }
}

/* Bidirectional Proportional Scroll Synchronizers */
function handleEditorScroll() {
  const syncCheck = document.getElementById('toggleSyncScroll');
  if (!syncCheck || !syncCheck.checked || isSyncScrolling || !cmEditor) return;

  isSyncScrolling = true;
  const scrollInfo = cmEditor.getScrollInfo();
  const pct = scrollInfo.height > scrollInfo.clientHeight 
    ? (scrollInfo.top / (scrollInfo.height - scrollInfo.clientHeight)) 
    : 0;

  const preview = document.getElementById('previewContainer');
  if (preview) {
    preview.scrollTop = pct * (preview.scrollHeight - preview.clientHeight);
  }
  setTimeout(() => { isSyncScrolling = false; }, 30);
}

function handlePreviewScroll() {
  const syncCheck = document.getElementById('toggleSyncScroll');
  const preview = document.getElementById('previewContainer');
  if (!syncCheck || !syncCheck.checked || isSyncScrolling || !preview || !cmEditor) return;

  isSyncScrolling = true;
  const pct = preview.scrollHeight > preview.clientHeight 
    ? (preview.scrollTop / (preview.scrollHeight - preview.clientHeight)) 
    : 0;

  const scrollInfo = cmEditor.getScrollInfo();
  cmEditor.scrollTo(null, pct * (scrollInfo.height - scrollInfo.clientHeight));
  setTimeout(() => { isSyncScrolling = false; }, 30);
}

function initSidebarResizer() {
  const sidebar = document.getElementById('workspaceSidebar');
  const handle = document.getElementById('sidebarResizeHandle');
  if (!sidebar || !handle) return;

  try {
    const savedWidth = localStorage.getItem('sidebar_width');
    if (savedWidth) {
      sidebar.style.width = `${savedWidth}px`;
    }
  } catch(e) {}

  let startX, startWidth;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    startWidth = parseInt(document.defaultView.getComputedStyle(sidebar).width, 10);
    document.addEventListener('mousemove', doDrag, false);
    document.addEventListener('mouseup', stopDrag, false);
    handle.classList.add('bg-indigo-300', 'dark:bg-indigo-950');
  });

  function doDrag(e) {
    let width = startWidth + (e.clientX - startX);
    if (width < 200) width = 200;
    if (width > 600) width = 600;
    sidebar.style.width = `${width}px`;
  }

  function stopDrag() {
    document.removeEventListener('mousemove', doDrag, false);
    document.removeEventListener('mouseup', stopDrag, false);
    handle.classList.remove('bg-indigo-300', 'dark:bg-indigo-950');
    
    try {
      localStorage.setItem('sidebar_width', sidebar.clientWidth);
    } catch(e) {}
  }
}

function initPumlModalResizer() {
  const container = document.getElementById('pumlModalSplitterContainer');
  const leftCol = document.getElementById('pumlModalEditorCol');
  const handle = document.getElementById('pumlModalSplitterHandle');
  if (!container || !leftCol || !handle) return;

  let startX, startWidth, containerWidth;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    containerWidth = container.clientWidth;
    startWidth = leftCol.clientWidth;
    
    document.addEventListener('mousemove', doDrag, false);
    document.addEventListener('mouseup', stopDrag, false);
    handle.classList.add('bg-indigo-300', 'dark:bg-indigo-950');
  });

  function doDrag(e) {
    const deltaX = e.clientX - startX;
    let newWidth = startWidth + deltaX;
    
    const minW = containerWidth * 0.25;
    const maxW = containerWidth * 0.75;
    
    if (newWidth < minW) newWidth = minW;
    if (newWidth > maxW) newWidth = maxW;
    
    leftCol.style.width = `${newWidth}px`;
  }

  function stopDrag() {
    document.removeEventListener('mousemove', doDrag, false);
    document.removeEventListener('mouseup', stopDrag, false);
    handle.classList.remove('bg-indigo-300', 'dark:bg-indigo-950');
  }
}

function resetMainPanelsSplit() {
  const leftCol = document.getElementById('mainEditorCol');
  if (leftCol) {
    leftCol.style.width = '50%';
    try {
      localStorage.removeItem('main_panels_split');
    } catch(e) {}
    if (cmEditor) {
      cmEditor.refresh();
    }
  }
}

function initMainPanelsResizer() {
  const container = document.getElementById('mainPanelsContainer');
  const leftCol = document.getElementById('mainEditorCol');
  const handle = document.getElementById('mainPanelsSplitterHandle');
  if (!container || !leftCol || !handle) return;

  leftCol.style.width = '50%';
  try {
    const savedSplit = localStorage.getItem('main_panels_split');
    if (savedSplit) {
      leftCol.style.width = `${savedSplit}px`;
    }
  } catch(e) {}

  let startX, startWidth, containerWidth;

  handle.addEventListener('dblclick', () => {
    resetMainPanelsSplit();
  });

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    startX = e.clientX;
    containerWidth = container.clientWidth;
    startWidth = leftCol.clientWidth;
    document.addEventListener('mousemove', doDrag, false);
    document.addEventListener('mouseup', stopDrag, false);
    handle.classList.add('bg-indigo-300', 'dark:bg-indigo-950');
  });

  function doDrag(e) {
    const deltaX = e.clientX - startX;
    let newWidth = startWidth + deltaX;
    
    const minW = containerWidth * 0.20;
    const maxW = containerWidth * 0.80;
    
    if (newWidth < minW) newWidth = minW;
    if (newWidth > maxW) newWidth = maxW;
    
    leftCol.style.width = `${newWidth}px`;
  }

  function stopDrag() {
    document.removeEventListener('mousemove', doDrag, false);
    document.removeEventListener('mouseup', stopDrag, false);
    handle.classList.remove('bg-indigo-300', 'dark:bg-indigo-950');
    
    try {
      localStorage.setItem('main_panels_split', leftCol.clientWidth);
    } catch(e) {}
  }
}

async function downloadFile() {
  const content = getEditorValue();
  const ext = currentMode === 'asciidoc' ? 'adoc' : 'md';
  
  const editorLabel = document.getElementById('editorLabel');
  const activeDocumentName = editorLabel ? editorLabel.innerText.trim() : 'document';
  const nameWithoutExt = activeDocumentName.replace(/\.[^/.]+$/, "");
  const defaultName = `${nameWithoutExt}_${getBackupTimestamp()}.${ext}`;
  
  if (window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: defaultName,
        types: [{
          description: currentMode === 'asciidoc' ? 'AsciiDoc Document' : 'Markdown Document',
          accept: { 'text/plain': [`.${ext}`] }
        }]
      });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      showToast(`File .${ext} saved successfully!`);
      return;
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = defaultName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`File .${ext} downloaded`);
}

function copySourceToClipboard() {
  const text = getEditorValue();
  const el = document.createElement('textarea');
  el.value = text;
  el.setAttribute('readonly', '');
  el.style.position = 'absolute';
  el.style.left = '-9999px';
  document.body.appendChild(el);
  el.select();
  try {
    document.execCommand('copy');
    showToast("Source code copied to clipboard");
  } catch (e) {
    showToast("Copy failed", false);
  }
  document.body.removeChild(el);
}

function toggleCodeMirrorWordWrap(checked) {
  if (cmEditor) {
    cmEditor.setOption('lineWrapping', checked);
    try { localStorage.setItem('ui_word_wrap', checked ? 'on' : 'off'); } catch(e) {}
  }
}

function moveLineUp(cm) {
  if (cm.isReadOnly()) return;
  const selections = cm.listSelections();
  cm.operation(() => {
    const newSelections = [];
    const sorted = [...selections].sort((a, b) => Math.min(a.anchor.line, a.head.line) - Math.min(b.anchor.line, b.head.line));
    
    for (const sel of sorted) {
      const from = Math.min(sel.anchor.line, sel.head.line);
      const to = Math.max(sel.anchor.line, sel.head.line);
      if (from === 0) {
        newSelections.push(sel);
        continue;
      }
      
      const prevLineText = cm.getLine(from - 1);
      const selectedLines = [];
      for (let i = from; i <= to; i++) {
        selectedLines.push(cm.getLine(i));
      }
      
      const fullText = [...selectedLines, prevLineText].join('\n');
      cm.replaceRange(
        fullText,
        { line: from - 1, ch: 0 },
        { line: to, ch: cm.getLine(to).length }
      );
      
      newSelections.push({
        anchor: { line: sel.anchor.line - 1, ch: sel.anchor.ch },
        head: { line: sel.head.line - 1, ch: sel.head.ch }
      });
    }
    cm.setSelections(newSelections);
  });
}

function moveLineDown(cm) {
  if (cm.isReadOnly()) return;
  const selections = cm.listSelections();
  cm.operation(() => {
    const newSelections = [];
    const sorted = [...selections].sort((a, b) => Math.max(b.anchor.line, b.head.line) - Math.max(a.anchor.line, a.head.line));
    const lastLine = cm.lastLine();
    
    for (const sel of sorted) {
      const from = Math.min(sel.anchor.line, sel.head.line);
      const to = Math.max(sel.anchor.line, sel.head.line);
      if (to === lastLine) {
        newSelections.push(sel);
        continue;
      }
      
      const nextLineText = cm.getLine(to + 1);
      const selectedLines = [];
      for (let i = from; i <= to; i++) {
        selectedLines.push(cm.getLine(i));
      }
      
      const fullText = [nextLineText, ...selectedLines].join('\n');
      cm.replaceRange(
        fullText,
        { line: from, ch: 0 },
        { line: to + 1, ch: cm.getLine(to + 1).length }
      );
      
      newSelections.push({
        anchor: { line: sel.anchor.line + 1, ch: sel.anchor.ch },
        head: { line: sel.head.line + 1, ch: sel.head.ch }
      });
    }
    cm.setSelections(newSelections);
  });
}

function addCursorAbove(cm) {
  const selections = cm.listSelections();
  const newSelections = [...selections];
  
  let minLine = Infinity;
  let targetSel = null;
  for (const sel of selections) {
    const headLine = sel.head.line;
    if (headLine < minLine) {
      minLine = headLine;
      targetSel = sel;
    }
  }
  if (minLine === 0 || !targetSel) return;
  
  const targetLine = minLine - 1;
  const targetCh = Math.min(targetSel.head.ch, cm.getLine(targetLine).length);
  
  newSelections.push({
    anchor: { line: targetLine, ch: targetCh },
    head: { line: targetLine, ch: targetCh }
  });
  cm.setSelections(newSelections);
}

function addCursorBelow(cm) {
  const selections = cm.listSelections();
  const newSelections = [...selections];
  
  let maxLine = -1;
  let targetSel = null;
  for (const sel of selections) {
    const headLine = sel.head.line;
    if (headLine > maxLine) {
      maxLine = headLine;
      targetSel = sel;
    }
  }
  if (maxLine === cm.lastLine() || !targetSel) return;
  
  const targetLine = maxLine + 1;
  const targetCh = Math.min(targetSel.head.ch, cm.getLine(targetLine).length);
  
  newSelections.push({
    anchor: { line: targetLine, ch: targetCh },
    head: { line: targetLine, ch: targetCh }
  });
  cm.setSelections(newSelections);
}

function initCodeMirrorEditor() {
  if (typeof CodeMirror === 'undefined') return;
  const raw = document.getElementById('rawEditor');
  if (!raw) return;

  let wrapSetting = true;
  try {
    const savedWrap = localStorage.getItem('ui_word_wrap');
    if (savedWrap === 'off') {
      wrapSetting = false;
    }
  } catch(e) {}

  cmEditor = CodeMirror.fromTextArea(raw, {
    lineNumbers: true,
    lineWrapping: wrapSetting,
    tabSize: 2,
    mode: (currentMode === 'asciidoc') ? 'asciidoc' : 'markdown',
    extraKeys: {
      "Cmd-/": () => { toggleComment(); },
      "Ctrl-/": () => { toggleComment(); },
      "Cmd-F": () => { showSearchReplace(); },
      "Ctrl-F": () => { showSearchReplace(); },
      "Alt-Up": (cm) => moveLineUp(cm),
      "Alt-Down": (cm) => moveLineDown(cm),
      "Ctrl-Alt-Up": (cm) => addCursorAbove(cm),
      "Ctrl-Alt-Down": (cm) => addCursorBelow(cm),
      "Cmd-Alt-Up": (cm) => addCursorAbove(cm),
      "Cmd-Alt-Down": (cm) => addCursorBelow(cm),
      "Esc": (cm) => {
        if (cm.listSelections().length > 1) {
          cm.setSelection(cm.getCursor());
        } else {
          return CodeMirror.Pass;
        }
      }
    }
  });

  const customColoringOverlay = {
    token: function(stream) {
      if (stream.eatSpace()) return null;

      if (stream.match(/[0-9]+/)) {
        return "custom-color-numbers";
      }

      if (stream.match(/[^a-zA-Z0-9\s]/)) {
        return "custom-color-specials";
      }

      stream.match(/[a-zA-Z]+/);
      return null;
    }
  };

  cmEditor.addOverlay(customColoringOverlay);

  const pumlRaw = document.getElementById('pumlEditorCode');
  if (pumlRaw) {
    pumlEditor = CodeMirror.fromTextArea(pumlRaw, {
      lineNumbers: true,
      lineWrapping: true,
      tabSize: 2,
      mode: '',
      extraKeys: {
        "Alt-Up": (cm) => moveLineUp(cm),
        "Alt-Down": (cm) => moveLineDown(cm),
        "Ctrl-Alt-Up": (cm) => addCursorAbove(cm),
        "Ctrl-Alt-Down": (cm) => addCursorBelow(cm),
        "Cmd-Alt-Up": (cm) => addCursorAbove(cm),
        "Cmd-Alt-Down": (cm) => addCursorBelow(cm),
        "Esc": (cm) => {
          if (cm.listSelections().length > 1) {
            cm.setSelection(cm.getCursor());
          } else {
            return CodeMirror.Pass;
          }
        }
      }
    });

    pumlEditor.addOverlay(customColoringOverlay);

    pumlEditor.on('change', () => {
      debouncePumlEditorPreview();
    });
  }

  const wrapInput = document.getElementById('toggleWordWrap');
  if (wrapInput) wrapInput.checked = wrapSetting;

  cmEditor.on('scroll', handleEditorScroll);

  cmEditor.on('keydown', (cm, e) => {
    if (typeof handleWikiLinkKeydown === 'function' && handleWikiLinkKeydown(e)) {
      e.preventDefault();
      e.stopPropagation();
    }
  });

  if (typeof initWikiLinkEditorListeners === 'function') {
    initWikiLinkEditorListeners();
  }

  cmEditor.on('paste', async (cm, e) => {
    const items = (e.clipboardData || e.originalEvent.clipboardData).items;
    for (const item of items) {
      if (item.type.indexOf('image') === 0) {
        e.preventDefault();
        const file = item.getAsFile();
        const att = await processImageFileForAttachment(file);
        if (att) {
          let code = '';
          const virtualPath = `attachments/${att.filename}`;
          const nameWithoutExt = att.filename.replace(/\.[^/.]+$/, "");
          if (currentMode === 'asciidoc') {
            code = `\n.${nameWithoutExt}\nimage::${virtualPath}[${att.filename},width=100%]\n`;
          } else {
            code = `\n*${nameWithoutExt}*\n![${att.filename}](${virtualPath})\n`;
          }
          insertAtCursor(code);
          renderDocument();
        }
      }
    }
  });

  cmEditor.on('change', () => {
    clearTimeout(renderDebounceTimer);
    queueSaveToIndexedDB();

    if (previewSyncMode === 'paused') {
      return;
    }

    const delay = (previewSyncMode === '10s') ? 10000 : 60;
    renderDebounceTimer = setTimeout(() => {
      renderDocument();
      updatePlantUmlStatus();
      updateTableBadges();
      updatePictureBadges();
    }, delay);
  });

  // Typewriter scrolling in Zen Mode
  cmEditor.on('cursorActivity', () => {
    if (typeof isZenModeActive !== 'undefined' && isZenModeActive) {
      const cursor = cmEditor.getCursor();
      const coords = cmEditor.charCoords(cursor, 'local');
      const scrollInfo = cmEditor.getScrollInfo();
      const mid = scrollInfo.clientHeight / 2;
      cmEditor.scrollTo(null, coords.top - mid);
    }
  });
}

/* Search & Replace Module */
var searchMatches = [];
var currentMatchIndex = -1;
var searchMarkedText = [];

function showSearchReplace() {
  const bar = document.getElementById('editorSearchReplaceBar');
  if (!bar) return;
  bar.classList.remove('hidden');
  const input = document.getElementById('searchQuery');
  if (input) {
    input.focus();
    input.select();
  }
  onSearchQueryChange();
}

function hideSearchReplace() {
  const bar = document.getElementById('editorSearchReplaceBar');
  if (bar) bar.classList.add('hidden');
  clearSearchHighlights();
  if (cmEditor) cmEditor.focus();
}

function clearSearchHighlights() {
  searchMarkedText.forEach(mark => {
    try { mark.clear(); } catch(e) {}
  });
  searchMarkedText = [];
  searchMatches = [];
  currentMatchIndex = -1;
  const countLabel = document.getElementById('searchResultCount');
  if (countLabel) countLabel.innerText = "0/0";
}

function onSearchQueryChange() {
  clearSearchHighlights();
  const query = document.getElementById('searchQuery').value;
  if (!query || !cmEditor) return;

  const cursor = cmEditor.getSearchCursor(query, { line: 0, ch: 0 }, { caseFold: true });
  while (cursor.findNext()) {
    const from = cursor.from();
    const to = cursor.to();
    searchMatches.push({ from, to });
    
    const mark = cmEditor.markText(from, to, {
      className: 'bg-yellow-200 dark:bg-yellow-900/60 text-slate-900 dark:text-slate-100 rounded-sm'
    });
    searchMarkedText.push(mark);
  }

  const countLabel = document.getElementById('searchResultCount');
  if (searchMatches.length > 0) {
    currentMatchIndex = 0;
    highlightActiveMatch();
  } else {
    if (countLabel) countLabel.innerText = "0/0";
  }
}

function highlightActiveMatch() {
  if (searchMatches.length === 0 || currentMatchIndex === -1 || !cmEditor) return;

  searchMarkedText.forEach((mark, idx) => {
    try { mark.clear(); } catch(e) {}
    const match = searchMatches[idx];
    const isCurrent = (idx === currentMatchIndex);
    
    const newMark = cmEditor.markText(match.from, match.to, {
      className: isCurrent 
        ? 'bg-amber-400 dark:bg-amber-600 text-black dark:text-white rounded-sm font-bold border border-amber-600 ring-2 ring-amber-400 z-10'
        : 'bg-yellow-200 dark:bg-yellow-900/40 text-slate-900 dark:text-slate-100 rounded-sm'
    });
    searchMarkedText[idx] = newMark;
  });

  const activeMatch = searchMatches[currentMatchIndex];
  cmEditor.scrollIntoView({ from: activeMatch.from, to: activeMatch.to }, 100);
  cmEditor.setSelection(activeMatch.from, activeMatch.to);

  const countLabel = document.getElementById('searchResultCount');
  if (countLabel) {
    countLabel.innerText = `${currentMatchIndex + 1}/${searchMatches.length}`;
  }
}

function searchNext() {
  if (searchMatches.length === 0) return;
  currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
  highlightActiveMatch();
}

function searchPrev() {
  if (searchMatches.length === 0) return;
  currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
  highlightActiveMatch();
}

function replaceCurrent() {
  if (searchMatches.length === 0 || currentMatchIndex === -1 || !cmEditor) return;
  const activeMatch = searchMatches[currentMatchIndex];
  const replaceVal = document.getElementById('replaceQuery').value || '';
  
  cmEditor.replaceRange(replaceVal, activeMatch.from, activeMatch.to);
  onSearchQueryChange();
}

function replaceAll() {
  if (searchMatches.length === 0 || !cmEditor) return;
  const replaceVal = document.getElementById('replaceQuery').value || '';
  const query = document.getElementById('searchQuery').value;
  if (!query) return;

  cmEditor.operation(() => {
    const cursor = cmEditor.getSearchCursor(query, { line: 0, ch: 0 }, { caseFold: true });
    while (cursor.findNext()) {
      cursor.replace(replaceVal);
    }
  });

  showToast("All matches replaced");
  hideSearchReplace();
}

/* Live Preview Search Module */
var previewSearchMatches = [];
var currentPreviewMatchIndex = -1;
var originalRenderOutputHtml = '';

function togglePreviewSearch() {
  const bar = document.getElementById('previewSearchBar');
  if (!bar) return;
  
  if (bar.classList.contains('hidden')) {
    bar.classList.remove('hidden');
    originalRenderOutputHtml = document.getElementById('renderOutput').innerHTML;
    const input = document.getElementById('previewSearchQuery');
    if (input) {
      input.focus();
      input.select();
    }
    onPreviewSearchQueryChange();
  } else {
    bar.classList.add('hidden');
    clearPreviewSearch();
  }
}

function clearPreviewSearch() {
  const renderOutput = document.getElementById('renderOutput');
  if (renderOutput && originalRenderOutputHtml !== '') {
    renderOutput.innerHTML = originalRenderOutputHtml;
  }
  previewSearchMatches = [];
  currentPreviewMatchIndex = -1;
  originalRenderOutputHtml = '';
  const countLabel = document.getElementById('previewSearchResultCount');
  if (countLabel) countLabel.innerText = "0/0";
}

function onPreviewSearchQueryChange() {
  const query = document.getElementById('previewSearchQuery').value.trim();
  const renderOutput = document.getElementById('renderOutput');
  if (!renderOutput) return;

  if (originalRenderOutputHtml !== '') {
    renderOutput.innerHTML = originalRenderOutputHtml;
  } else {
    originalRenderOutputHtml = renderOutput.innerHTML;
  }

  if (!query) {
    const countLabel = document.getElementById('previewSearchResultCount');
    if (countLabel) countLabel.innerText = "0/0";
    return;
  }

  const regex = new RegExp(`(${escapeRegExp(query)})`, 'gi');
  highlightTextNodes(renderOutput, regex);

  previewSearchMatches = Array.from(renderOutput.querySelectorAll('mark.preview-match'));
  
  const countLabel = document.getElementById('previewSearchResultCount');
  if (previewSearchMatches.length > 0) {
    currentPreviewMatchIndex = 0;
    highlightActivePreviewMatch();
  } else {
    currentPreviewMatchIndex = -1;
    if (countLabel) countLabel.innerText = "0/0";
  }
}

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function highlightTextNodes(element, regex) {
  const children = Array.from(element.childNodes);
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.nodeValue;
      if (regex.test(text)) {
        const span = document.createElement('span');
        span.innerHTML = text.replace(regex, '<mark class="preview-match bg-yellow-200 dark:bg-yellow-900/60 text-slate-900 dark:text-slate-100 rounded-sm">$1</mark>');
        element.replaceChild(span, child);
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      if (child.tagName !== 'SCRIPT' && child.tagName !== 'STYLE' && child.tagName !== 'TEXTAREA') {
        highlightTextNodes(child, regex);
      }
    }
  }
}

function highlightActivePreviewMatch() {
  if (previewSearchMatches.length === 0 || currentPreviewMatchIndex === -1) return;

  previewSearchMatches.forEach((mark, idx) => {
    const isCurrent = (idx === currentPreviewMatchIndex);
    if (isCurrent) {
      mark.className = 'preview-match bg-amber-400 dark:bg-amber-600 text-black dark:text-white rounded-sm font-bold border border-amber-600 ring-2 ring-amber-400 z-10';
    } else {
      mark.className = 'preview-match bg-yellow-200 dark:bg-yellow-900/60 text-slate-900 dark:text-slate-100 rounded-sm';
    }
  });

  const activeMark = previewSearchMatches[currentPreviewMatchIndex];
  if (activeMark) {
    activeMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const countLabel = document.getElementById('previewSearchResultCount');
  if (countLabel) {
    countLabel.innerText = `${currentPreviewMatchIndex + 1}/${previewSearchMatches.length}`;
  }
}

function previewSearchNext() {
  if (previewSearchMatches.length === 0) return;
  currentPreviewMatchIndex = (currentPreviewMatchIndex + 1) % previewSearchMatches.length;
  highlightActivePreviewMatch();
}

function previewSearchPrev() {
  if (previewSearchMatches.length === 0) return;
  currentPreviewMatchIndex = (currentPreviewMatchIndex - 1 + previewSearchMatches.length) % previewSearchMatches.length;
  highlightActivePreviewMatch();
}
