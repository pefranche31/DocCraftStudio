/**
 * DocCraft Studio - Visual Spreadsheet Table Editor
 * Table parsing, in-place badge management, visual grid editor, CSV import/export
 */

var showTableEditorPreview = false;
var cellValueBeforeFocus = '';

/**
 * Splits a table line respecting backticks and parentheses
 */
function splitTableCells(line) {
  let str = line.trim();
  
  const cells = [];
  let current = '';
  let inBacktick = false;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (ch === '`') {
      inBacktick = !inBacktick;
      current += ch;
    } else if (ch === '|' && !inBacktick) {
      const trimmedCurrent = current.trim();
      // In AsciiDoc, a style prefix must be immediately adjacent to the pipe (no space before '|')
      const charBeforePipe = i > 0 ? str[i - 1] : '';
      const hasSpaceBefore = (charBeforePipe === ' ' || charBeforePipe === '\t');

      if (!hasSpaceBefore && trimmedCurrent !== "" && /^[adehjlmsv0-9<>^\.]{1,4}$/i.test(trimmedCurrent)) {
        // It's a prefix, keep it with the pipe!
        current += ch;
      } else {
        // It's a real cell boundary!
        cells.push(current.trim());
        current = '';
      }
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  
  // If the first cell was empty because the line started with '|', remove it
  if (cells.length > 0 && cells[0] === "" && str.startsWith('|')) {
    cells.shift();
  }
  // If the last cell was empty because the line ended with '|', remove it
  if (cells.length > 0 && cells[cells.length - 1] === "" && str.endsWith('|')) {
    cells.pop();
  }
  return cells;
}

/**
 * Parses key attributes from an AsciiDoc table attribute line
 */
function parseAsciiDocTableAttributes(line) {
  const attrs = { cols: '', width: '', hasHeader: false };
  const content = line.slice(1, -1).trim();
  
  // Find cols
  const colsMatch = content.match(/cols\s*=\s*"([^"]+)"/) || content.match(/cols\s*=\s*([^,\]]+)/);
  if (colsMatch) {
    attrs.cols = colsMatch[1].trim();
  }
  
  // Find width
  const widthMatch = content.match(/width\s*=\s*"([^"%\s\]]+%?)"/) || content.match(/width\s*=\s*([^,\]%\s]+%?)/);
  if (widthMatch) {
    attrs.width = widthMatch[1].trim();
  }
  
  // Find options
  const optionsMatch = content.match(/options\s*=\s*"([^"]+)"/) || content.match(/options\s*=\s*([^,\]]+)/);
  if (optionsMatch) {
    if (optionsMatch[1].includes('header')) {
      attrs.hasHeader = true;
    }
  } else if (content.includes('header')) {
    attrs.hasHeader = true;
  }
  return attrs;
}

/**
 * Finds table blocks in AsciiDoc and Markdown
 */
function findTableBlocks() {
  const text = getEditorValue();
  const lines = text.split(/\r?\n/);
  const tables = [];

  if (currentMode === 'asciidoc') {
    let startLine = -1;
    let tableTitle = '';
    let activeDelimiter = '';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.startsWith('.') && startLine === -1) {
        tableTitle = line.substring(1).trim();
      }

      const matchDelimiter = line.match(/^\|={3,}$/);
      if (matchDelimiter) {
        const delim = matchDelimiter[0];
        if (startLine === -1) {
          startLine = i;
          activeDelimiter = delim;
        } else {
          // Match only the exact same starting delimiter length for strict nesting safety
          if (delim === activeDelimiter) {
            let rangeStart = startLine;
            let tableWidth = '';
            let tableHasHeader = false;
            if (startLine > 0) {
              const prev = lines[startLine - 1].trim();
              if (prev.startsWith('[') && prev.endsWith(']')) {
                rangeStart = startLine - 1;
                const attrs = parseAsciiDocTableAttributes(prev);
                tableWidth = attrs.width;
                tableHasHeader = attrs.hasHeader;
              }
            }
            tables.push({
              format: 'asciidoc',
              startLine: rangeStart,
              badgeLine: startLine,
              endLine: i,
              title: tableTitle || 'AsciiDoc Table',
              hasHeader: tableHasHeader,
              width: tableWidth || ''
            });
            startLine = -1;
            tableTitle = '';
            activeDelimiter = '';
          }
        }
      }
    }
  } else {
    // Markdown table detection
    let startLine = -1;
    let tableTitle = '';
    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1].trim();

      if (startLine === -1) {
        if (line.match(/^#{1,4}\s+(.*)$/) && nextLine.startsWith('|')) {
          tableTitle = line.replace(/^#{1,4}\s+/, '').trim();
        }

        if (line.startsWith('|') && line.endsWith('|') && nextLine.startsWith('|') && nextLine.includes('-')) {
          startLine = i;
        }
      } else {
        if (!line.startsWith('|')) {
          tables.push({
            format: 'markdown',
            startLine: startLine,
            badgeLine: startLine,
            endLine: i - 1,
            title: tableTitle || 'Markdown Table',
            hasHeader: true
          });
          startLine = -1;
          tableTitle = '';
        }
      }
    }
    if (startLine !== -1) {
      tables.push({
        format: 'markdown',
        startLine: startLine,
        badgeLine: startLine,
        endLine: lines.length - 1,
        title: tableTitle || 'Markdown Table',
        hasHeader: true
      });
    }
  }

  return tables;
}

/**
 * Updates inline "Table Edit ✎" pills in CodeMirror
 */
function updateTableBadges() {
  if (document.activeElement && document.activeElement.classList.contains('tbl-pill-width-input')) {
    return;
  }

  activeTableFoldMarks.forEach(mark => {
    try { mark.clear(); } catch(e) {}
  });
  activeTableFoldMarks.clear();

  activeTableUnfoldWidgets.forEach(w => {
    try { w.clear(); } catch(e) {}
  });
  activeTableUnfoldWidgets = [];

  if (!cmEditor) return;

  const tables = findTableBlocks();
  tables.forEach((tbl) => {
    const blockKey = `${tbl.startLine}-${tbl.endLine}`;

    if (manuallyUnfoldedTables.has(tbl.startLine)) {
      const lineContent = cmEditor.getLine(tbl.startLine);
      if (lineContent !== undefined) {
        const pill = document.createElement('span');
        pill.className = 'table-unfold-pill';
        pill.title = 'Fold this table block back';
        pill.innerHTML = `
          <i class="fa-solid fa-table text-blue-500"></i>
          <span class="font-semibold text-blue-600 dark:text-blue-400">Table:</span>
          <span class="opacity-75 truncate max-w-[120px]">${tbl.title || 'Data'}</span>
          ${tbl.format === 'asciidoc' && tbl.width ? `
          <span class="text-[10px] text-blue-600 dark:text-blue-400 font-mono font-semibold"> (Width: ${tbl.width})</span>
          ` : ''}
          <button class="ml-1.5 px-1.5 py-0.5 rounded bg-white hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-[9px] font-bold text-blue-700 dark:text-blue-300 transition btn-fold-table">Fold ▴</button>
          <button class="ml-1 px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/40 dark:hover:bg-blue-800 text-[9px] font-bold text-blue-800 dark:text-blue-200 transition btn-edit-table">Edit ✎</button>
        `;

        pill.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        pill.querySelector('.btn-fold-table').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          manuallyUnfoldedTables.delete(tbl.startLine);
          updateTableBadges();
        });

        pill.querySelector('.btn-edit-table').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openTableVisualEditor(tbl);
        });

        const bookmark = cmEditor.setBookmark(
          { line: tbl.startLine, ch: lineContent.length },
          { widget: pill, insertLeft: true }
        );
        activeTableUnfoldWidgets.push(bookmark);
      }
    } else {
      const lineContent = cmEditor.getLine(tbl.startLine);
      const endLineContent = cmEditor.getLine(tbl.endLine);
      if (lineContent !== undefined && endLineContent !== undefined) {
        const pill = document.createElement('span');
        pill.className = 'table-fold-pill';
        pill.title = 'Click to unfold table code or modify width directly';
        pill.innerHTML = `
          <i class="fa-solid fa-table text-blue-500"></i>
          <span class="font-semibold text-blue-800 dark:text-blue-200">Table:</span>
          <span class="opacity-75 truncate max-w-[120px]">${tbl.title || 'Data'}</span>
          ${tbl.format === 'asciidoc' ? `
          <span class="inline-flex items-center gap-1 ml-1.5 tbl-pill-width-wrapper">
            <span class="text-[10px] font-bold opacity-60">Width:</span>
            <input type="number" min="5" max="100" step="5" value="${tbl.width ? (parseInt(tbl.width, 10) || '') : ''}" placeholder="100" class="tbl-pill-width-input w-12 px-1 py-0.2 bg-white/20 dark:bg-slate-900/30 border border-slate-300/30 rounded text-[10px] font-bold text-center outline-none focus:ring-1 focus:ring-blue-500/50 text-slate-800 dark:text-slate-100">
            <span class="text-[10px] font-semibold opacity-60">%</span>
          </span>
          ` : ''}
          <button class="ml-1.5 px-1.5 py-0.5 rounded bg-white hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-[10px] font-bold text-blue-700 dark:text-blue-300 shadow-sm transition btn-unfold-table">Unfold ▾</button>
          <button class="ml-1 px-1.5 py-0.5 rounded bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-[10px] font-bold text-blue-800 dark:text-blue-200 transition btn-edit-table">Edit ✎</button>
        `;

        pill.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
        });

        const inputWidth = pill.querySelector('.tbl-pill-width-input');
        if (inputWidth) {
          inputWidth.addEventListener('mousedown', e => e.stopPropagation());
          inputWidth.addEventListener('click', e => e.stopPropagation());
          inputWidth.addEventListener('keydown', e => e.stopPropagation());

          inputWidth.addEventListener('change', (e) => {
            e.stopPropagation();
            const rawVal = parseInt(e.target.value, 10);
            const newVal = (rawVal && rawVal > 0) ? rawVal + '%' : '';
            
            const tableData = parseTableBlock(tbl);
            tableData.width = newVal;
            let newTableCode = serializeTableToString(tableData);
            if (newTableCode.endsWith('\n')) {
              newTableCode = newTableCode.slice(0, -1);
            }

            let replaceStartLine = tableData.startLine;
            if (replaceStartLine > 0) {
              const prevTitle = cmEditor.getLine(replaceStartLine - 1).trim();
              if (prevTitle.startsWith('.') && !prevTitle.startsWith('...')) {
                replaceStartLine = replaceStartLine - 1;
              }
            }
            const endLineLength = cmEditor.getLine(tbl.endLine) ? cmEditor.getLine(tbl.endLine).length : 0;

            cmEditor.replaceRange(
              newTableCode,
              { line: replaceStartLine, ch: 0 },
              { line: tbl.endLine, ch: endLineLength }
            );

            activeTableFoldMarks.delete(blockKey);
            setTimeout(() => {
              updateTableBadges();
            }, 50);
          });
        }

        pill.querySelector('.btn-unfold-table').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          manuallyUnfoldedTables.add(tbl.startLine);
          updateTableBadges();
        });

        pill.querySelector('.btn-edit-table').addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          openTableVisualEditor(tbl);
        });

        const mark = cmEditor.markText(
          { line: tbl.startLine, ch: 0 },
          { line: tbl.endLine, ch: endLineContent.length },
          { collapsed: true, replacedWith: pill }
        );
        activeTableFoldMarks.set(blockKey, mark);
      }
    }
  });
}

/**
 * Parses a table block into structured grid data
 */
function parseTableBlock(tbl) {
  const text = getEditorValue();
  const allLines = text.split(/\r?\n/);
  const lines = allLines.slice(tbl.startLine, tbl.endLine + 1);

  let title = '';

  if (tbl.format === 'asciidoc') {
    let checkLine = tbl.startLine;
    if (checkLine > 0) {
      const prev = allLines[checkLine - 1].trim();
      if (prev.startsWith('[') && prev.endsWith(']')) {
        checkLine = checkLine - 1;
      }
    }
    if (checkLine > 0) {
      const prevTitle = allLines[checkLine - 1].trim();
      if (prevTitle.startsWith('.') && !prevTitle.startsWith('...')) {
        title = prevTitle.substring(1).trim();
      }
    }
  } else {
    if (tbl.startLine > 0) {
      const prev = allLines[tbl.startLine - 1].trim();
      const matchTitle = prev.match(/^#{1,4}\s+(.*)$/);
      if (matchTitle) {
        title = matchTitle[1].trim();
      }
    }
  }

  if (!title) title = tbl.title || '';

  let hasHeader = tbl.hasHeader;
  let alignments = [];
  let colWidths = [];
  let asciidocStyles = [];
  let rows = [];
  let width = '';
  let numCols = 0;

  if (tbl.format === 'asciidoc') {
    let insideDelimiter = false;
    let cellSequence = [];
    let currentCellText = "";

    for (let i = 0; i < lines.length; i++) {
      let trimmed = lines[i].trim();
      if (trimmed.startsWith('.') && !insideDelimiter) {
        title = trimmed.substring(1).trim();
        continue;
      }
      if (trimmed.startsWith('[') && trimmed.endsWith(']') && !insideDelimiter) {
        const attrs = parseAsciiDocTableAttributes(trimmed);
        if (attrs.cols) {
          const specifiers = attrs.cols.split(',').map(c => c.trim());
          colWidths = specifiers.map(spec => {
            const weightMatch = spec.match(/\d+(\.\d+)?/);
            return weightMatch ? weightMatch[0] : '1';
          });
          asciidocStyles = specifiers.map(spec => {
            return /[aA]/.test(spec);
          });
        }
        if (attrs.width) {
          width = attrs.width;
        }
        hasHeader = attrs.hasHeader;
        continue;
      }
      if (trimmed.startsWith('|===')) {
        insideDelimiter = !insideDelimiter;
        continue;
      }
      if (insideDelimiter) {
        if (trimmed === "") {
          const lastIdx = cellSequence.length - 1;
          const colLimit = numCols || 2;
          const colIdx = lastIdx >= 0 ? (lastIdx % colLimit) : 0;
          const isLastCellAsciidoc = lastIdx >= 0 && asciidocStyles[colIdx];

          let nextLineStartsWithPipe = false;
          for (let nextIdx = i + 1; nextIdx < lines.length; nextIdx++) {
            const nextTrimmed = lines[nextIdx].trim();
            if (nextTrimmed === "") continue;
            if (nextTrimmed.startsWith('|') || /^a\|/i.test(nextTrimmed)) {
              nextLineStartsWithPipe = true;
            }
            break;
          }

          if (isLastCellAsciidoc && !nextLineStartsWithPipe) {
            cellSequence[lastIdx] = cellSequence[lastIdx] + "\n";
          } else {
            if (currentCellText !== "") {
              cellSequence.push(currentCellText.trim());
              currentCellText = "";
            }
          }
          continue;
        }

        if (trimmed.startsWith('|') || /^a\|/i.test(trimmed)) {
          if (currentCellText !== "") {
            cellSequence.push(currentCellText.trim());
            currentCellText = "";
          }

          const cellsOnLine = splitTableCells(trimmed);
          
          if (numCols === 0 && cellsOnLine.length > 0) {
            numCols = cellsOnLine.length;
            if (asciidocStyles.length === 0) {
              asciidocStyles = Array(numCols).fill(true);
            }
          }
          const colLimit = numCols || 2;

          for (let i = 0; i < cellsOnLine.length; i++) {
            let cell = cellsOnLine[i].replace(/\\\|/g, '|');
            const colIdx = cellSequence.length % colLimit;
            const isAsciidocCol = asciidocStyles[colIdx];

            if (isAsciidocCol) {
              if (cell.endsWith(' +')) {
                cell = cell.slice(0, -2).trim();
              } else if (cell.endsWith('+') && cell.length > 1) {
                cell = cell.slice(0, -1).trim();
              }
              cellSequence.push(cell);
            } else {
              if (cell.endsWith(' +')) {
                currentCellText = cell.slice(0, -2).trim();
              } else if (cell.endsWith('+') && cell.length > 1) {
                currentCellText = cell.slice(0, -1).trim();
              } else {
                cellSequence.push(cell);
              }
            }
          }
        } else {
          let lineText = trimmed.replace(/\\\|/g, '|');
          const lastIdx = cellSequence.length - 1;
          const colLimit = numCols || 2;
          const colIdx = lastIdx >= 0 ? (lastIdx % colLimit) : 0;
          const isLastCellAsciidoc = lastIdx >= 0 && asciidocStyles[colIdx];

          if (isLastCellAsciidoc) {
            if (lineText.endsWith(' +')) {
              lineText = lineText.slice(0, -2).trim();
            } else if (lineText.endsWith('+') && lineText.length > 1) {
              lineText = lineText.slice(0, -1).trim();
            }
            cellSequence[lastIdx] = cellSequence[lastIdx] + "\n" + lineText;
          } else {
            if (lineText.endsWith(' +')) {
              lineText = lineText.slice(0, -2).trim();
            } else if (lineText.endsWith('+') && lineText.length > 1) {
              lineText = lineText.slice(0, -1).trim();
            }

            if (currentCellText !== "") {
              currentCellText += "\n" + lineText;
            } else {
              currentCellText = lineText;
            }
          }
        }
      }
    }

    if (currentCellText !== "") {
      cellSequence.push(currentCellText.trim());
    }

    if (numCols === 0) {
      numCols = colWidths.length;
    }
    if (numCols === 0 && cellSequence.length > 0) {
      const firstLine = lines.find(line => line.trim().startsWith('|') && !line.trim().startsWith('|==='));
      if (firstLine) {
        numCols = splitTableCells(firstLine.trim()).length;
      }
    }
    if (numCols === 0) numCols = 2;

    if (cellSequence.length > 0) {
      let currentRow = [];
      for (let cell of cellSequence) {
        currentRow.push(cell);
        if (currentRow.length === numCols) {
          rows.push(currentRow);
          currentRow = [];
        }
      }
      if (currentRow.length > 0) {
        while (currentRow.length < numCols) {
          currentRow.push('');
        }
        rows.push(currentRow);
      }
    }

    const maxCols = Math.max(1, ...rows.map(r => r.length), colWidths.length);
    rows = rows.map(r => {
      while (r.length < maxCols) r.push('');
      return r;
    });
    if (rows.length === 0) rows = [['Header 1', 'Header 2'], ['Data 1', 'Data 2']];
    alignments = Array(rows[0].length).fill('left');
    if (colWidths.length === 0) colWidths = Array(rows[0].length).fill('1');

    if (asciidocStyles.length === 0) {
      asciidocStyles = Array(rows[0].length).fill(true);
    }
    while (asciidocStyles.length < rows[0].length) {
      asciidocStyles.push(true);
    }

    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < rows[r].length; c++) {
        let cellVal = rows[r][c] || '';
        if (/^a\|/i.test(cellVal)) {
          asciidocStyles[c] = true;
          rows[r][c] = cellVal.substring(2).trim();
        }
      }
    }
  } else {
    for (let l of lines) {
      let trimmed = l.trim();
      if (trimmed.startsWith('#')) {
        title = trimmed.replace(/^#{1,4}\s+/, '').trim();
        continue;
      }
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (trimmed.match(/^\|[\s\-:]+(\|[\s\-:]+)+\|$/)) {
          const sepCells = trimmed.split('|').slice(1, -1).map(c => c.trim());
          alignments = sepCells.map(c => {
            const left = c.startsWith(':');
            const right = c.endsWith(':');
            if (left && right) return 'center';
            if (right) return 'right';
            return 'left';
          });
          hasHeader = true;
          continue;
        }
        const cells = splitTableCells(trimmed);
        rows.push(cells);
      }
    }

    const maxCols = Math.max(1, ...rows.map(r => r.length));
    rows = rows.map(r => {
      while (r.length < maxCols) r.push('');
      return r;
    });
    if (alignments.length < maxCols) {
      alignments = Array(maxCols).fill('left');
    }
    colWidths = Array(maxCols).fill('1');
  }

  return {
    ...tbl,
    title,
    hasHeader,
    alignments,
    colWidths,
    asciidocStyles,
    rows,
    width: width || tbl.width || ''
  };
}

function toggleTableEditorExpandWidth(checked) {
  tableEditorExpandedWidth = checked;
  const card = document.getElementById('tableEditorModalCard');
  if (!card) return;
  if (checked) {
    card.classList.replace('lg:max-w-7xl', 'lg:max-w-[98vw]');
  } else {
    card.classList.replace('lg:max-w-[98vw]', 'lg:max-w-7xl');
  }
  try {
    localStorage.setItem('table_editor_expanded_width', checked ? 'true' : 'false');
  } catch(e) {}
}

function toggleTableEditorXLCells(checked) {
  tableEditorXLCells = checked;
  try {
    localStorage.setItem('table_editor_xl_cells', checked ? 'true' : 'false');
  } catch(e) {}
  renderTableEditorGrid();
}

/**
 * Opens visual spreadsheet modal for the given table block
 */
function openTableVisualEditor(tbl) {
  currentEditingTable = parseTableBlock(tbl);
  if (!currentEditingTable.asciidocStyles) {
    currentEditingTable.asciidocStyles = Array(currentEditingTable.rows[0].length).fill(true);
  }

  document.getElementById('editTableTitle').value = currentEditingTable.title || '';
  document.getElementById('editTableHasHeader').checked = currentEditingTable.hasHeader;
  document.getElementById('tableEditorFormatBadge').innerText = currentEditingTable.format;

  const editTableWidthInput = document.getElementById('editTableWidth');
  if (editTableWidthInput) {
    editTableWidthInput.value = currentEditingTable.width ? (parseInt(currentEditingTable.width, 10) || '') : '';
  }
  const editTableWidthContainer = document.getElementById('editTableWidthContainer');
  if (editTableWidthContainer) {
    if (currentEditingTable.format === 'asciidoc') {
      editTableWidthContainer.classList.remove('hidden');
    } else {
      editTableWidthContainer.classList.add('hidden');
    }
  }

  const expandCheck = document.getElementById('toggleTableEditorExpandWidth');
  if (expandCheck) expandCheck.checked = tableEditorExpandedWidth;
  const xlCheck = document.getElementById('toggleTableEditorXLCells');
  if (xlCheck) xlCheck.checked = tableEditorXLCells;

  tableEditorUndoStack = [];
  tableEditorRedoStack = [];
  pushTableEditorState();

  renderTableEditorGrid();
  openModal('tableEditorModal');
}

/**
 * Renders the interactive grid inside tableEditorModal
 */
function renderTableEditorGrid() {
  const container = document.getElementById('tableEditorGridWrapper');
  const tableData = currentEditingTable;
  if (!container || !tableData) return;

  const numCols = tableData.rows[0] ? tableData.rows[0].length : 1;
  const numRows = tableData.rows.length;
  const isAdoc = (tableData.format === 'asciidoc');

  const dimLabel = document.getElementById('tableEditorDimensionsLabel');
  if (dimLabel) {
    dimLabel.innerText = `${numCols} column${numCols > 1 ? 's' : ''} × ${numRows} row${numRows > 1 ? 's' : ''}`;
  }

  let html = `<table class="w-full border-collapse bg-white dark:bg-slate-800 shadow-sm">`;

  // Top Action Bar for Columns
  html += `<thead class="bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-30 shadow-sm">`;
  html += `<tr>`;
  html += `<th class="w-12 p-2 text-center text-slate-400 text-[10px] font-mono bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700">#</th>`;

  const totalWeight = tableData.colWidths.reduce((sum, w) => sum + (parseFloat(w) || 1), 0);

  for (let c = 0; c < numCols; c++) {
    const widthVal = tableData.colWidths[c] || '1';
    const pct = totalWeight > 0 ? (((parseFloat(widthVal) || 1) / totalWeight) * 100) : (100 / numCols);

    html += `<th style="width: ${pct}%; min-width: 140px;" class="p-2 border-l border-slate-200 dark:border-slate-700 text-left relative bg-slate-50 dark:bg-slate-850 border-b border-slate-200 dark:border-slate-700">
      <div class="flex items-center justify-between gap-1 mb-1">
        <span class="text-[10px] font-mono text-slate-400 uppercase font-semibold">Col ${c + 1}</span>
        <div class="flex items-center gap-0.5 bg-slate-200 dark:bg-slate-700 p-0.5 rounded">
          <button onclick="tableEditorMoveCol(${c}, 'left')" title="Move column left" ${c === 0 ? 'disabled class="opacity-30 cursor-not-allowed w-5 h-5 rounded flex items-center justify-center text-[10px]"' : 'class="w-5 h-5 rounded flex items-center justify-center text-[10px] text-slate-500 hover:bg-white dark:hover:bg-slate-600 transition"'} >
            <i class="fa-solid fa-arrow-left"></i>
          </button>
          <button onclick="tableEditorMoveCol(${c}, 'right')" title="Move column right" ${c === numCols - 1 ? 'disabled class="opacity-30 cursor-not-allowed w-5 h-5 rounded flex items-center justify-center text-[10px]"' : 'class="w-5 h-5 rounded flex items-center justify-center text-[10px] text-slate-500 hover:bg-white dark:hover:bg-slate-600 transition"'} >
            <i class="fa-solid fa-arrow-right"></i>
          </button>
        </div>
        ${numCols > 1 ? `
          <button onclick="tableEditorDeleteCol(${c})" title="Delete column" class="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/50 transition text-[11px]">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        ` : ''}
      </div>
      <div class="flex items-center gap-1 text-[10px] text-slate-400">
        <span>Weight:</span>
        <input type="text" value="${widthVal}" onchange="setColWidth(${c}, this.value)" class="w-10 px-1 py-0.5 rounded bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-center font-mono focus:ring-1 focus:ring-blue-500 outline-none">
        ${isAdoc ? `
          <button onclick="toggleColAsciidocStyle(${c})" title="Treat column content as full AsciiDoc" class="ml-auto px-1.5 py-0.5 rounded text-[9px] font-bold transition flex items-center gap-0.5 shadow-sm cursor-pointer select-none ${tableData.asciidocStyles && tableData.asciidocStyles[c] ? 'bg-indigo-600 text-white border border-indigo-700 hover:bg-indigo-800' : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-300 border border-slate-300 dark:border-slate-600'}" >
            <i class="fa-solid fa-code"></i>
            <span>Format (a)</span>
          </button>
        ` : ''}
      </div>
      <div class="col-resize-handle" onmousedown="initColResize(event, ${c})"></div>
    </th>`;
  }
  html += `</tr>`;

  if (tableData.hasHeader && numRows > 0) {
    const r = 0;
    const rowBg = 'bg-blue-100 dark:bg-blue-950 font-semibold';

    html += `<tr class="${rowBg} border-b border-slate-200 dark:border-slate-700">`;
    html += `<td class="p-2 text-center text-slate-400 text-[10px] font-mono select-none">
      <div class="flex items-center justify-center gap-1.5">
        <span class="font-bold text-slate-500">${r + 1}</span>
      </div>
    </td>`;

    for (let c = 0; c < numCols; c++) {
      const val = tableData.rows[r][c] || '';
      const hasNewline = val.includes('\n');
      const isAsciidocCol = (tableData.asciidocStyles && tableData.asciidocStyles[c]);
      const useTextarea = tableEditorXLCells || hasNewline || isAsciidocCol;

      html += `<td class="p-1 border-l border-slate-200 dark:border-slate-700">`;
      if (useTextarea) {
        html += `<textarea 
          data-row="${r}" data-col="${c}"
          onfocus="onCellInputFocus(this)"
          onblur="onCellInputBlur(this)"
          oninput="onCellInputChange(${r}, ${c}, this.value)"
          placeholder="Header ${c + 1}"
          class="w-full h-16 px-2 py-1 rounded bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 outline-none text-slate-800 dark:text-slate-100 text-left text-xs resize-y overflow-y-auto font-sans leading-relaxed">${val.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`;
      } else {
        html += `<input type="text" value="${val.replace(/"/g, '&quot;')}" 
          data-row="${r}" data-col="${c}"
          onfocus="onCellInputFocus(this)"
          onblur="onCellInputBlur(this)"
          oninput="onCellInputChange(${r}, ${c}, this.value)"
          placeholder="Header ${c + 1}"
          class="w-full px-2 py-1.5 rounded bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 outline-none text-slate-800 dark:text-slate-100 text-left text-xs">`;
      }
      html += `</td>`;
    }
    html += `</tr>`;
  }

  html += `</thead>`;

  // Table Data Rows
  html += `<tbody>`;
  const startRowIdx = tableData.hasHeader ? 1 : 0;
  
  for (let r = startRowIdx; r < numRows; r++) {
    const rowBg = (r % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-slate-50/50 dark:bg-slate-800/50');

    html += `<tr class="${rowBg} border-b border-slate-200 dark:border-slate-700"
      ondragstart="onRowDragStart(event, ${r})"
      ondragover="onRowDragOver(event, ${r})"
      ondragleave="onRowDragLeave(event, ${r})"
      ondrop="onRowDrop(event, ${r})"
      ondragend="onRowDragEnd(event, ${r})">`;
    
    html += `<td class="p-2 text-center text-slate-400 text-[10px] font-mono select-none">
      <div class="flex items-center justify-center gap-1.5">
        <span class="font-bold text-slate-500">${r + 1}</span>
        
        <div class="flex items-center gap-0.5">
          <button onclick="tableEditorInsertRow(${r}, 'above')" title="Insert row above" class="w-4 h-4 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center justify-center text-[9px] text-emerald-600 dark:text-emerald-400 transition cursor-pointer">
            <i class="fa-solid fa-arrow-up"></i>
          </button>
          <button onclick="tableEditorInsertRow(${r}, 'below')" title="Insert row below" class="w-4 h-4 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center justify-center text-[9px] text-emerald-600 dark:text-emerald-400 transition cursor-pointer">
            <i class="fa-solid fa-arrow-down"></i>
          </button>
          <button onclick="tableEditorDuplicateRow(${r})" title="Duplicate row" class="w-4 h-4 hover:bg-slate-200 dark:hover:bg-slate-700 rounded flex items-center justify-center text-[9px] text-indigo-600 dark:text-indigo-400 transition cursor-pointer">
            <i class="fa-solid fa-copy"></i>
          </button>
        </div>

        <div class="row-drag-handle cursor-grab active:cursor-grabbing text-slate-400 hover:text-indigo-600 transition px-1 py-0.5 rounded flex items-center justify-center" title="Drag to reorder row" onmousedown="enableRowDrag(event, ${r})" onmouseup="disableRowDrag(event, ${r})" onmouseleave="disableRowDrag(event, ${r})">
          <i class="fa-solid fa-grip-vertical text-[11px]"></i>
        </div>

        <button onclick="tableEditorDeleteRow(${r})" title="Delete row" class="text-slate-400 hover:text-red-500 transition ml-0.5 cursor-pointer">
          <i class="fa-regular fa-trash-can text-[11px]"></i>
        </button>
      </div>
    </td>`;

    for (let c = 0; c < numCols; c++) {
      const val = tableData.rows[r][c] || '';
      const hasNewline = val.includes('\n');
      const isAsciidocCol = (tableData.asciidocStyles && tableData.asciidocStyles[c]);
      const useTextarea = tableEditorXLCells || hasNewline || isAsciidocCol;

      html += `<td class="p-1 border-l border-slate-200 dark:border-slate-700">`;
      if (useTextarea) {
        html += `<textarea 
          data-row="${r}" data-col="${c}"
          onfocus="onCellInputFocus(this)"
          onblur="onCellInputBlur(this)"
          oninput="onCellInputChange(${r}, ${c}, this.value)"
          placeholder="Data..."
          class="w-full h-16 px-2 py-1 rounded bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 outline-none text-slate-800 dark:text-slate-100 text-left text-xs resize-y overflow-y-auto font-sans leading-relaxed">${val.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>`;
      } else {
        html += `<input type="text" value="${val.replace(/"/g, '&quot;')}" 
          data-row="${r}" data-col="${c}"
          onfocus="onCellInputFocus(this)"
          onblur="onCellInputBlur(this)"
          oninput="onCellInputChange(${r}, ${c}, this.value)"
          placeholder="Data..."
          class="w-full px-2 py-1.5 rounded bg-transparent focus:bg-white dark:focus:bg-slate-700 focus:ring-2 focus:ring-blue-500 border border-transparent hover:border-slate-300 dark:hover:border-slate-600 outline-none text-slate-800 dark:text-slate-100 text-left text-xs">`;
      }
      html += `</td>`;
    }

    html += `</tr>`;
  }
  html += `</tbody></table>`;

  container.innerHTML = html;
  updateTableEditorPreview();
}

function initColResize(e, colIdx) {
  e.preventDefault();
  e.stopPropagation();

  isResizingCol = true;
  resizeTargetColIdx = colIdx;
  resizeStartX = e.clientX;

  const ths = document.querySelectorAll('#tableEditorGridWrapper thead th');
  resizeStartWidths = Array.from(ths).slice(1).map(th => th.getBoundingClientRect().width);

  document.addEventListener('mousemove', doColResize, false);
  document.addEventListener('mouseup', stopColResize, false);

  e.currentTarget.classList.add('active');
}

function doColResize(e) {
  if (!isResizingCol || resizeTargetColIdx === -1) return;
  
  const deltaX = e.clientX - resizeStartX;
  const newWidth = Math.max(80, resizeStartWidths[resizeTargetColIdx] + deltaX);

  const ths = document.querySelectorAll('#tableEditorGridWrapper thead th');
  const targetTh = ths[resizeTargetColIdx + 1];
  if (targetTh) {
    targetTh.style.width = `${newWidth}px`;
    targetTh.style.minWidth = `${newWidth}px`;
  }
}

function stopColResize(e) {
  if (!isResizingCol) return;

  document.removeEventListener('mousemove', doColResize, false);
  document.removeEventListener('mouseup', stopColResize, false);

  const activeHandle = document.querySelector('.col-resize-handle.active');
  if (activeHandle) activeHandle.classList.remove('active');

  isResizingCol = false;

  const ths = document.querySelectorAll('#tableEditorGridWrapper thead th');
  const finalWidths = Array.from(ths).slice(1).map(th => th.getBoundingClientRect().width);

  const minW = Math.min(...finalWidths);
  if (minW <= 0) return;

  const rawWeights = finalWidths.map(w => w / minW);

  const hasHalf = rawWeights.some(rw => {
    const decimal = rw - Math.floor(rw);
    return decimal > 0.35 && decimal < 0.65;
  });

  const multiplier = hasHalf ? 2 : 1;
  const integerWeights = rawWeights.map(rw => Math.max(1, Math.round(rw * multiplier)));

  currentEditingTable.colWidths = integerWeights.map(String);

  pushTableEditorState();
  renderTableEditorGrid();
}

function onCellInputFocus(inputEl) {
  focusedCellInput = inputEl;
  cellValueBeforeFocus = inputEl.value;
}

function onCellInputBlur(inputEl) {
  if (inputEl.value !== cellValueBeforeFocus) {
    pushTableEditorState();
  }
}

function onCellInputChange(r, c, val) {
  if (currentEditingTable && currentEditingTable.rows[r]) {
    currentEditingTable.rows[r][c] = val;
    updateTableEditorPreview();
  }
}

function setColWidth(colIdx, widthVal) {
  if (currentEditingTable) {
    currentEditingTable.colWidths[colIdx] = widthVal.trim() || '1';
    pushTableEditorState();
    renderTableEditorGrid();
    updateTableEditorPreview();
  }
}

function toggleColAsciidocStyle(cIdx) {
  if (currentEditingTable) {
    if (!currentEditingTable.asciidocStyles) {
      currentEditingTable.asciidocStyles = Array(currentEditingTable.rows[0].length).fill(true);
    }
    currentEditingTable.asciidocStyles[cIdx] = !currentEditingTable.asciidocStyles[cIdx];
    pushTableEditorState();
    renderTableEditorGrid();
    updateTableEditorPreview();
  }
}

function tableEditorAddCol() {
  if (!currentEditingTable) return;
  currentEditingTable.rows.forEach(r => r.push(''));
  currentEditingTable.alignments.push('left');
  currentEditingTable.colWidths.push('1');
  if (!currentEditingTable.asciidocStyles) {
    currentEditingTable.asciidocStyles = Array(currentEditingTable.rows[0].length - 1).fill(true);
  }
  currentEditingTable.asciidocStyles.push(true);
  pushTableEditorState();
  renderTableEditorGrid();
}

function tableEditorDeleteCol(cIdx) {
  if (!currentEditingTable || currentEditingTable.rows[0].length <= 1) return;
  currentEditingTable.rows.forEach(r => r.splice(cIdx, 1));
  currentEditingTable.alignments.splice(cIdx, 1);
  currentEditingTable.colWidths.splice(cIdx, 1);
  if (currentEditingTable.asciidocStyles) {
    currentEditingTable.asciidocStyles.splice(cIdx, 1);
  }
  pushTableEditorState();
  renderTableEditorGrid();
}

function tableEditorAddRow() {
  if (!currentEditingTable) return;
  const numCols = currentEditingTable.rows[0] ? currentEditingTable.rows[0].length : 2;
  currentEditingTable.rows.push(Array(numCols).fill(''));
  pushTableEditorState();
  renderTableEditorGrid();
}

function tableEditorDeleteRow(rIdx) {
  if (!currentEditingTable || currentEditingTable.rows.length <= 1) return;
  currentEditingTable.rows.splice(rIdx, 1);
  pushTableEditorState();
  renderTableEditorGrid();
}

function tableEditorInsertRow(rIdx, direction) {
  if (!currentEditingTable) return;
  const numCols = currentEditingTable.rows[0] ? currentEditingTable.rows[0].length : 2;
  const targetIdx = (direction === 'above') ? rIdx : rIdx + 1;
  
  currentEditingTable.rows.splice(targetIdx, 0, Array(numCols).fill(''));
  pushTableEditorState();
  renderTableEditorGrid();
}

function tableEditorDuplicateRow(rIdx) {
  if (!currentEditingTable) return;
  const copiedRow = [...currentEditingTable.rows[rIdx]];
  
  currentEditingTable.rows.splice(rIdx + 1, 0, copiedRow);
  pushTableEditorState();
  renderTableEditorGrid();
}

function formatActiveCell(type) {
  if (!focusedCellInput) {
    showToast("Please select a cell to format first", false);
    return;
  }
  const val = focusedCellInput.value;
  const r = parseInt(focusedCellInput.dataset.row);
  const c = parseInt(focusedCellInput.dataset.col);
  const isAdoc = (currentEditingTable.format === 'asciidoc');

  let newVal = val;
  switch (type) {
    case 'bold':
      newVal = isAdoc ? `*${val}*` : `**${val}**`;
      break;
    case 'italic':
      newVal = isAdoc ? `_${val}_` : `*${val}*`;
      break;
    case 'code':
      newVal = `\`${val}\``;
      break;
    case 'badge':
      newVal = `${val} [OK]`;
      break;
  }

  focusedCellInput.value = newVal;
  onCellInputChange(r, c, newVal);
  pushTableEditorState();
  focusedCellInput.focus();
}

/* CSV Import / Export Moteurs for Visual Table Spreadsheet */
function arrayToCSV(rows) {
  return rows.map(row => 
    row.map(cell => {
      const clean = (cell || '').replace(/"/g, '""');
      if (clean.includes(',') || clean.includes('\n') || clean.includes('"')) {
        return `"${clean}"`;
      }
      return clean;
    }).join(',')
  ).join('\n');
}

async function exportTableCSV() {
  if (!currentEditingTable) return;
  
  try {
    const csvContent = arrayToCSV(currentEditingTable.rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const suggestedName = `${currentEditingTable.title || 'table'}.csv`;

    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: [{
            description: 'CSV File (Comma Separated Values)',
            accept: { 'text/csv': ['.csv'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        showToast("CSV file exported successfully!");
      } catch (err) {
        if (err.name !== 'AbortError') throw err;
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("CSV downloaded");
    }
  } catch (e) {
    console.error("CSV Export error:", e);
    showToast("CSV export failed", false);
  }
}

function parseCSVLine(line) {
  const cells = [];
  let insideQuote = false;
  let currentCell = '';
  
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      insideQuote = !insideQuote;
    } else if (ch === ',' && !insideQuote) {
      cells.push(currentCell.replace(/""/g, '"'));
      currentCell = '';
    } else {
      currentCell += ch;
    }
  }
  cells.push(currentCell.replace(/""/g, '"'));
  return cells;
}

async function importTableCSV(event) {
  if (!currentEditingTable) return;
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const rawLines = text.split(/\r?\n/);
      const rows = [];
      
      for (const rawLine of rawLines) {
        if (rawLine.trim().length === 0) continue;
        const cells = parseCSVLine(rawLine);
        rows.push(cells);
      }

      if (rows.length === 0) {
        throw new Error("The CSV file is empty");
      }

      const numCols = Math.max(...rows.map(r => r.length));
      const normalizedRows = rows.map(r => {
        while (r.length < numCols) {
          r.push('');
        }
        return r;
      });

      pushTableEditorState();

      currentEditingTable.rows = normalizedRows;

      while (currentEditingTable.colWidths.length < numCols) {
        currentEditingTable.colWidths.push('1');
      }
      while (currentEditingTable.alignments.length < numCols) {
        currentEditingTable.alignments.push('left');
      }
      if (!currentEditingTable.asciidocStyles) {
        currentEditingTable.asciidocStyles = [];
      }
      while (currentEditingTable.asciidocStyles.length < numCols) {
        currentEditingTable.asciidocStyles.push(false);
      }

      renderTableEditorGrid();
      updateTableEditorPreview();
      showToast("CSV file imported successfully!");
    } catch(err) {
      console.error("CSV Import error:", err);
      showToast("CSV import failed: " + err.message, false);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function pushTableEditorState() {
  if (!currentEditingTable) return;
  const stateCopy = JSON.parse(JSON.stringify(currentEditingTable));
  
  tableEditorUndoStack.push(stateCopy);
  if (tableEditorUndoStack.length > maxHistoryDepth) {
    tableEditorUndoStack.shift();
  }
  
  tableEditorRedoStack = [];
  updateHistoryButtons();
}

function tableEditorUndo() {
  if (tableEditorUndoStack.length <= 1) return;
  
  const currentState = tableEditorUndoStack.pop();
  tableEditorRedoStack.push(currentState);
  
  currentEditingTable = JSON.parse(JSON.stringify(tableEditorUndoStack[tableEditorUndoStack.length - 1]));
  
  const titleInput = document.getElementById('editTableTitle');
  const headerInput = document.getElementById('editTableHasHeader');
  if (titleInput) titleInput.value = currentEditingTable.title || '';
  if (headerInput) headerInput.checked = currentEditingTable.hasHeader;

  renderTableEditorGrid();
  updateHistoryButtons();
}

function tableEditorRedo() {
  if (tableEditorRedoStack.length === 0) return;
  
  const restoredState = tableEditorRedoStack.pop();
  tableEditorUndoStack.push(restoredState);
  
  currentEditingTable = JSON.parse(JSON.stringify(restoredState));
  
  const titleInput = document.getElementById('editTableTitle');
  const headerInput = document.getElementById('editTableHasHeader');
  if (titleInput) titleInput.value = currentEditingTable.title || '';
  if (headerInput) headerInput.checked = currentEditingTable.hasHeader;

  renderTableEditorGrid();
  updateHistoryButtons();
}

function updateHistoryButtons() {
  const btnUndo = document.getElementById('btnTableEditorUndo');
  const btnRedo = document.getElementById('btnTableEditorRedo');
  if (btnUndo) {
    btnUndo.disabled = (tableEditorUndoStack.length <= 1);
    if (btnUndo.disabled) {
      btnUndo.classList.add('opacity-40', 'cursor-not-allowed');
    } else {
      btnUndo.classList.remove('opacity-40', 'cursor-not-allowed');
    }
  }
  if (btnRedo) {
    btnRedo.disabled = (tableEditorRedoStack.length === 0);
    if (btnRedo.disabled) {
      btnRedo.classList.add('opacity-40', 'cursor-not-allowed');
    } else {
      btnRedo.classList.remove('opacity-40', 'cursor-not-allowed');
    }
  }
}

function enableRowDrag(e, rIdx) {
  const tr = e.target.closest('tr');
  if (tr) tr.setAttribute('draggable', 'true');
}

function disableRowDrag(e, rIdx) {
  const tr = e.target.closest('tr');
  if (tr) tr.setAttribute('draggable', 'false');
}

function onRowDragStart(e, rIdx) {
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', rIdx.toString());
  e.currentTarget.classList.add('opacity-40', 'bg-indigo-50/50', 'dark:bg-indigo-950/20');
}

function onRowDragOver(e, rIdx) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  const tr = e.currentTarget;
  tr.classList.add('border-t-2', 'border-t-indigo-500', 'dark:border-t-indigo-400');
}

function onRowDragLeave(e, rIdx) {
  const tr = e.currentTarget;
  tr.classList.remove('border-t-2', 'border-t-indigo-500', 'dark:border-t-indigo-400');
}

function onRowDragEnd(e, rIdx) {
  const tr = e.currentTarget;
  tr.setAttribute('draggable', 'false');
  tr.classList.remove('opacity-40', 'bg-indigo-50/50', 'dark:bg-indigo-950/20', 'border-t-2', 'border-t-indigo-500', 'dark:border-t-indigo-400');
}

function onRowDrop(e, toIdx) {
  e.preventDefault();
  const tr = e.currentTarget;
  tr.classList.remove('border-t-2', 'border-t-indigo-500', 'dark:border-t-indigo-400');
  
  const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
  if (isNaN(fromIdx) || fromIdx === toIdx) return;

  tableEditorMoveRowToIndex(fromIdx, toIdx);
}

function tableEditorMoveRowToIndex(fromIdx, toIdx) {
  if (!currentEditingTable) return;
  const rows = currentEditingTable.rows;
  const hasHeader = currentEditingTable.hasHeader;
  
  const minIdx = hasHeader ? 1 : 0;
  if (fromIdx < minIdx || fromIdx >= rows.length || toIdx < minIdx || toIdx >= rows.length) return;
  if (fromIdx === toIdx) return;

  const [movedRow] = rows.splice(fromIdx, 1);
  rows.splice(toIdx, 0, movedRow);

  pushTableEditorState();
  renderTableEditorGrid();
  updateTableEditorPreview();
}

function tableEditorMoveCol(cIdx, direction) {
  if (!currentEditingTable) return;
  const numCols = currentEditingTable.rows[0].length;
  
  let moved = false;
  if (direction === 'left') {
    if (cIdx <= 0 || cIdx >= numCols) return;
    currentEditingTable.rows.forEach(r => {
      const temp = r[cIdx];
      r[cIdx] = r[cIdx - 1];
      r[cIdx - 1] = temp;
    });
    const tempWidth = currentEditingTable.colWidths[cIdx];
    currentEditingTable.colWidths[cIdx] = currentEditingTable.colWidths[cIdx - 1];
    currentEditingTable.colWidths[cIdx - 1] = tempWidth;
    if (currentEditingTable.asciidocStyles) {
      const tempStyle = currentEditingTable.asciidocStyles[cIdx];
      currentEditingTable.asciidocStyles[cIdx] = currentEditingTable.asciidocStyles[cIdx - 1];
      currentEditingTable.asciidocStyles[cIdx - 1] = tempStyle;
    }
    moved = true;
  } else if (direction === 'right') {
    if (cIdx < 0 || cIdx >= numCols - 1) return;
    currentEditingTable.rows.forEach(r => {
      const temp = r[cIdx];
      r[cIdx] = r[cIdx + 1];
      r[cIdx + 1] = temp;
    });
    const tempWidth = currentEditingTable.colWidths[cIdx];
    currentEditingTable.colWidths[cIdx] = currentEditingTable.colWidths[cIdx + 1];
    currentEditingTable.colWidths[cIdx + 1] = tempWidth;
    if (currentEditingTable.asciidocStyles) {
      const tempStyle = currentEditingTable.asciidocStyles[cIdx];
      currentEditingTable.asciidocStyles[cIdx] = currentEditingTable.asciidocStyles[cIdx + 1];
      currentEditingTable.asciidocStyles[cIdx + 1] = tempStyle;
    }
    moved = true;
  }
  
  if (moved) {
    pushTableEditorState();
    renderTableEditorGrid();
  }
}

function onToggleHeaderRow(checked) {
  if (currentEditingTable) {
    currentEditingTable.hasHeader = checked;
    pushTableEditorState();
    renderTableEditorGrid();
    updateTableEditorPreview();
  }
}

function onEditTableTitleChange(val) {
  if (currentEditingTable) {
    currentEditingTable.title = val;
    updateTableEditorPreview();
  }
}

function onEditTableWidthChange(val) {
  if (currentEditingTable) {
    const num = parseInt(val, 10);
    currentEditingTable.width = (num && num > 0) ? num + '%' : '';
    updateTableEditorPreview();
  }
}

function toggleTablePreview(checked) {
  showTableEditorPreview = checked;
  const previewWrapper = document.getElementById('tableEditorPreviewWrapper');
  if (previewWrapper) {
    if (checked) {
      previewWrapper.classList.remove('hidden');
      updateTableEditorPreview();
    } else {
      previewWrapper.classList.add('hidden');
    }
  }
}

function updateTableEditorPreview() {
  if (!showTableEditorPreview || !currentEditingTable) return;
  const previewContent = document.getElementById('tableEditorPreviewContent');
  if (!previewContent) return;

  try {
    const tableMarkup = serializeTableToString(currentEditingTable);
    let renderedHtml = '';

    if (currentEditingTable.format === 'asciidoc') {
      if (!asciidoctorEngine && typeof Asciidoctor !== 'undefined') {
        asciidoctorEngine = Asciidoctor();
      }
      if (asciidoctorEngine) {
        renderedHtml = asciidoctorEngine.convert(tableMarkup, {
          safe: 'safe',
          attributes: { showtitle: true, icons: 'font' }
        });
      } else {
        renderedHtml = '<p class="text-slate-400 italic">Asciidoctor not loaded</p>';
      }
    } else {
      if (typeof marked !== 'undefined') {
        renderedHtml = marked.parse(tableMarkup);
      } else {
        renderedHtml = `<pre class="text-xs">${tableMarkup}</pre>`;
      }
    }

    const preparedHtml = renderedHtml.replace(/src=["']((?!https?:\/\/|data:)[^"']+)["']/gi, 'src="" data-pending-src="$1"');

    if (typeof DOMPurify !== 'undefined') {
      previewContent.innerHTML = DOMPurify.sanitize(preparedHtml);
    } else {
      previewContent.innerHTML = preparedHtml;
    }

    resolveVirtualImagePaths(previewContent);
  } catch (err) {
    previewContent.innerHTML = `<p class="text-red-500 font-mono text-xs">Preview error: ${err.message || err}</p>`;
  }
}

/**
 * Serializes edited table back into AsciiDoc or Markdown string
 */
function serializeTableToString(tableData) {
  const title = document.getElementById('editTableTitle').value.trim();
  const hasHeader = document.getElementById('editTableHasHeader').checked;
  const alignPipesInput = document.getElementById('editTableAlignPipes');
  const alignPipes = alignPipesInput ? alignPipesInput.checked : true;
  const isAdoc = (tableData.format === 'asciidoc');
  const numCols = tableData.rows[0].length;
  let out = "";

  const colMaxLengths = Array(numCols).fill(0);
  if (alignPipes) {
    for (let c = 0; c < numCols; c++) {
      let maxLen = 0;
      for (let r = 0; r < tableData.rows.length; r++) {
        let cellVal = tableData.rows[r][c] || '';
        if (isAdoc) {
          cellVal = cellVal.replace(/\|/g, '\\|');
        }
        if (cellVal.length > maxLen) {
          maxLen = cellVal.length;
        }
      }
      colMaxLengths[c] = Math.max(3, maxLen);
    }
  }

  if (isAdoc) {
    if (title) out += `.${title}\n`;
    const colsAttr = tableData.colWidths.slice(0, numCols).map((w, idx) => {
      const hasAsciidocStyle = (tableData.asciidocStyles && tableData.asciidocStyles[idx]);
      return hasAsciidocStyle ? `${w}a` : w;
    }).join(',');
    const optsAttr = hasHeader ? ', options="header"' : '';
    const widthVal = tableData.width ? tableData.width.trim() : '';
    const widthPart = widthVal ? `width=${widthVal},` : '';
    out += `[${widthPart}cols="${colsAttr}"${optsAttr}]\n`;
    out += `|===\n`;

    let tableHasMultilineCells = false;
    for (let r = 0; r < tableData.rows.length; r++) {
      for (let c = 0; c < numCols; c++) {
        if ((tableData.rows[r][c] || '').includes('\n')) {
          tableHasMultilineCells = true;
          break;
        }
      }
      if (tableHasMultilineCells) break;
    }

    if (tableHasMultilineCells) {
      for (let r = 0; r < tableData.rows.length; r++) {
        const isHeaderRow = (r === 0 && hasHeader);
        
        if (isHeaderRow) {
          let headerRowStr = "";
          for (let c = 0; c < numCols; c++) {
            let cellVal = tableData.rows[r][c] || '';
            cellVal = cellVal.replace(/\|/g, '\\|');
            cellVal = cellVal.replace(/\r?\n/g, " ");
            headerRowStr += `| ${cellVal} `;
          }
          out += `${headerRowStr.trim()}\n`;
          out += "\n";
        } else {
          for (let c = 0; c < numCols; c++) {
            let cellVal = tableData.rows[r][c] || '';
            cellVal = cellVal.replace(/\|/g, '\\|');
            
            const isAsciidocCol = (tableData.asciidocStyles && tableData.asciidocStyles[c]);
            if (isAsciidocCol) {
              cellVal = cellVal.replace(/\r?\n/g, "\n");
            } else {
              cellVal = cellVal.replace(/\r?\n/g, " +\n");
            }
            
            out += `| ${cellVal}\n`;
          }
          out += "\n";
        }
      }
    } else {
      for (let r = 0; r < tableData.rows.length; r++) {
        let rowStr = "";
        for (let c = 0; c < numCols; c++) {
          let cellVal = tableData.rows[r][c] || '';
          cellVal = cellVal.replace(/\|/g, '\\|');
          const cellStr = alignPipes ? cellVal.padEnd(colMaxLengths[c]) : cellVal;
          rowStr += `| ${cellStr} `;
        }
        out += `${rowStr.trim()}\n`;
        if (r === 0 && hasHeader) out += "\n";
      }
    }

    out += `|===\n`;
  } else {
    // Markdown
    if (title) out += `### ${title}\n\n`;

    let headerRow = "|";
    let sepRow = "|";
    for (let c = 0; c < numCols; c++) {
      const cellVal = tableData.rows[0][c] || '';
      const cellStr = alignPipes ? cellVal.padEnd(colMaxLengths[c]) : cellVal;
      headerRow += ` ${cellStr} |`;
      
      const align = tableData.alignments[c] || 'left';
      const dashLen = alignPipes ? colMaxLengths[c] : 3;
      let dashes = '-'.repeat(dashLen);
      if (align === 'center') {
        dashes = `:${'-'.repeat(dashLen - 2)}:`;
      } else if (align === 'right') {
        dashes = `${'-'.repeat(dashLen - 1)}:`;
      } else if (align === 'left') {
        dashes = `:${'-'.repeat(dashLen - 1)}`;
      }
      sepRow += ` ${dashes} |`;
    }
    out += headerRow + "\n" + sepRow + "\n";

    for (let r = 1; r < tableData.rows.length; r++) {
      let rowStr = "|";
      for (let c = 0; c < numCols; c++) {
        const cellVal = tableData.rows[r][c] || '';
        const cellStr = alignPipes ? cellVal.padEnd(colMaxLengths[c]) : cellVal;
        rowStr += ` ${cellStr} |`;
      }
      out += rowStr + "\n";
    }
  }

  return out;
}

function toggleAdvancedControls(checked) {
  const panel = document.getElementById('advancedTableControls');
  if (panel) {
    if (checked) {
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }
  }
}

/**
 * Saves changes and replaces lines in CodeMirror editor
 */
function saveTableEditorChanges() {
  if (!currentEditingTable || !cmEditor) return;

  let newTableCode = serializeTableToString(currentEditingTable);
  if (newTableCode.endsWith('\n')) {
    newTableCode = newTableCode.slice(0, -1);
  }
  
  let startLine = currentEditingTable.startLine;
  const endLine = currentEditingTable.endLine;

  if (currentEditingTable.format === 'asciidoc') {
    let checkLine = startLine;
    if (checkLine > 0) {
      const prev = cmEditor.getLine(checkLine - 1).trim();
      if (prev.startsWith('[') && prev.endsWith(']')) {
        checkLine = checkLine - 1;
      }
    }
    if (checkLine > 0) {
      const prevTitle = cmEditor.getLine(checkLine - 1).trim();
      if (prevTitle.startsWith('.') && !prevTitle.startsWith('...')) {
        startLine = checkLine - 1;
      }
    }
  } else {
    if (startLine > 0) {
      const prev = cmEditor.getLine(startLine - 1).trim();
      if (prev.match(/^#{1,4}\s+(.*)$/)) {
        startLine = startLine - 1;
      }
    }
  }

  const endLineLength = cmEditor.getLine(endLine) ? cmEditor.getLine(endLine).length : 0;

  cmEditor.replaceRange(
    newTableCode,
    { line: startLine, ch: 0 },
    { line: endLine, ch: endLineLength }
  );

  closeModal('tableEditorModal');
  renderDocument();
  setTimeout(() => {
    updateTableBadges();
    updatePlantUmlStatus();
  }, 60);
  queueSaveToIndexedDB();

  showToast("Table updated successfully!");
}

function processTableFloatingButtons() {
  if (!output) return;

  const tablesInDom = [];
  const adocTableDivs = output.querySelectorAll('div.tableblock');
  if (adocTableDivs.length > 0) {
    adocTableDivs.forEach(tb => tablesInDom.push(tb));
  } else {
    const mdTables = output.querySelectorAll('table');
    mdTables.forEach(t => tablesInDom.push(t));
  }

  const parsedTables = findTableBlocks();

  for (let i = 0; i < tablesInDom.length; i++) {
    const domTable = tablesInDom[i];
    const parsedTbl = parsedTables[i];
    if (!parsedTbl) continue;

    if (domTable.dataset.editButtonAdded) continue;
    domTable.dataset.editButtonAdded = "true";

    const btnContainer = document.createElement('div');
    btnContainer.className = 'flex items-center gap-2 mt-2 mb-2 select-none';
    btnContainer.innerHTML = `
      <button class="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-sans text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm" title="Edit Table in Visual Spreadsheet Editor">
        <i class="fa-solid fa-table-cells"></i>
        <span>Edit Table</span>
      </button>
    `;

    btnContainer.querySelector('button').onclick = (e) => {
      e.preventDefault();
      openTableVisualEditor(parsedTbl);
    };

    const tableElement = domTable.querySelector('table') || domTable;
    tableElement.parentNode.insertBefore(btnContainer, tableElement);
  }
}
