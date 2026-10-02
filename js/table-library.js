/**
 * DocCraft Studio - Table Library & x-spreadsheet Integration
 * 100% Offline, Local-First Table Management for AsciiDoc and Markdown
 */

var activeSpreadsheetInstance = null;
var activeSpreadsheetTableId = null;

/**
 * Converts a 2D string array into x-spreadsheet data format
 */
function matrixToSpreadsheetData(name, rowsMatrix) {
  const rows = {};
  if (!rowsMatrix || rowsMatrix.length === 0) {
    rowsMatrix = [['Header 1', 'Header 2'], ['', '']];
  }

  for (let r = 0; r < rowsMatrix.length; r++) {
    const row = rowsMatrix[r] || [];
    const cells = {};
    for (let c = 0; c < row.length; c++) {
      cells[c] = { text: row[c] != null ? String(row[c]) : '' };
    }
    rows[r] = { cells };
  }

  return [{
    name: name || 'Sheet1',
    rows: rows
  }];
}

/**
 * Converts x-spreadsheet sheet data back into a clean 2D string array
 */
function spreadsheetDataToMatrix(sheetData) {
  if (!sheetData || !sheetData.rows) {
    return [['Header 1', 'Header 2'], ['', '']];
  }

  const rowsObj = sheetData.rows;
  const rowKeys = Object.keys(rowsObj)
    .map(k => parseInt(k, 10))
    .filter(k => !isNaN(k) && rowsObj[k] && rowsObj[k].cells);

  if (rowKeys.length === 0) {
    return [['Header 1', 'Header 2'], ['', '']];
  }

  // Find max row and column bounds with non-empty cells
  let maxR = 0;
  let maxC = 0;

  rowKeys.forEach(r => {
    const cells = rowsObj[r].cells || {};
    Object.keys(cells).forEach(cStr => {
      const c = parseInt(cStr, 10);
      if (!isNaN(c) && cells[c] && cells[c].text !== undefined && cells[c].text !== '') {
        if (r > maxR) maxR = r;
        if (c > maxC) maxC = c;
      }
    });
  });

  // Ensure minimum dimensions (at least 1 row, 1 col)
  maxR = Math.max(0, maxR);
  maxC = Math.max(0, maxC);

  const matrix = [];
  for (let r = 0; r <= maxR; r++) {
    const rowArr = [];
    const rowCells = (rowsObj[r] && rowsObj[r].cells) ? rowsObj[r].cells : {};
    for (let c = 0; c <= maxC; c++) {
      const cell = rowCells[c];
      rowArr.push(cell && cell.text != null ? String(cell.text) : '');
    }
    matrix.push(rowArr);
  }

  return matrix;
}

/**
 * Opens the Table Library Modal for the currently active document
 */
async function openTableLibraryModal() {
  if (!currentDocumentId) {
    showToast("Please open a document first before managing tables", false);
    return;
  }

  const doc = await dbGetDocument(currentDocumentId);
  const docTitleEl = document.getElementById('tableLibraryDocTitle');
  if (docTitleEl) {
    docTitleEl.innerText = doc ? doc.name : 'Current Document';
  }

  await renderTableLibraryUI();
  openModal('tableLibraryModal');
}

/**
 * Closes the Table Library Modal
 */
function closeTableLibraryModal() {
  closeModal('tableLibraryModal');
}

/**
 * Scans the active document text to find tables and imports/updates them in the library
 */
async function scanDocumentTables() {
  if (!currentDocumentId || !cmEditor) return;

  const detectedBlocks = (typeof findTableBlocks === 'function') ? findTableBlocks() : [];
  if (detectedBlocks.length === 0) {
    showToast("No tables found in active document");
    return;
  }

  const existingTables = await dbGetTablesByDoc(currentDocumentId);
  let importedCount = 0;
  let updatedCount = 0;

  for (let i = 0; i < detectedBlocks.length; i++) {
    const block = detectedBlocks[i];
    const parsed = parseTableBlock(block);
    if (!parsed || !parsed.rows || parsed.rows.length === 0) continue;

    const blockTitle = parsed.title || `Table #${i + 1}`;
    
    // Check if a table in the library matches by title or data
    const existing = existingTables.find(t => {
      if (t.name && parsed.title && t.name.toLowerCase() === parsed.title.toLowerCase()) {
        return true;
      }
      return JSON.stringify(t.data) === JSON.stringify(parsed.rows);
    });

    if (existing) {
      existing.name = blockTitle;
      existing.data = parsed.rows;
      existing.formatOptions = {
        hasHeader: parsed.hasHeader,
        colAlignments: parsed.alignments,
        colWidths: parsed.colWidths
      };
      existing.isInDocument = true;
      existing.updatedAt = Date.now();
      await dbSaveTable(existing);
      updatedCount++;
    } else {
      const newTable = {
        id: 'tbl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        docId: currentDocumentId,
        name: blockTitle,
        data: parsed.rows,
        formatOptions: {
          hasHeader: parsed.hasHeader,
          colAlignments: parsed.alignments,
          colWidths: parsed.colWidths
        },
        isInDocument: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      await dbSaveTable(newTable);
      importedCount++;
    }
  }

  await renderTableLibraryUI();
  showToast(`Scan complete: ${importedCount} imported, ${updatedCount} synced`);
}

/**
 * Renders the table cards list in the table library modal
 */
async function renderTableLibraryUI() {
  const container = document.getElementById('tableLibraryList');
  const countBadge = document.getElementById('tableLibraryCountBadge');
  if (!container) return;

  if (!currentDocumentId) {
    container.innerHTML = `<div class="p-8 text-center text-slate-400">No document open</div>`;
    return;
  }

  const tables = await dbGetTablesByDoc(currentDocumentId);
  if (countBadge) {
    countBadge.innerText = `${tables.length} table${tables.length > 1 ? 's' : ''}`;
  }

  // Check which tables are currently present in the text
  const docBlocks = (typeof findTableBlocks === 'function') ? findTableBlocks() : [];
  const docBlockTitles = new Set();
  const docBlockSignatures = new Set();
  docBlocks.forEach(b => {
    try {
      const p = parseTableBlock(b);
      if (p.title) docBlockTitles.add(p.title.toLowerCase());
      docBlockSignatures.add(JSON.stringify(p.rows));
    } catch(e) {}
  });

  if (tables.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-10 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 flex flex-col items-center justify-center gap-3">
        <div class="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 dark:text-indigo-400 flex items-center justify-center text-2xl">
          <i class="fa-solid fa-table-cells"></i>
        </div>
        <div>
          <h4 class="text-sm font-bold text-slate-700 dark:text-slate-200">No tables in library yet</h4>
          <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">Scan your active document to import existing tables, create a new spreadsheet, or import a CSV file.</p>
        </div>
        <div class="flex items-center gap-2 mt-2">
          <button onclick="scanDocumentTables()" class="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer">
            <i class="fa-solid fa-magnifying-glass"></i>
            <span>Scan Document</span>
          </button>
          <button onclick="createNewLibraryTable()" class="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-600 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer">
            <i class="fa-solid fa-plus"></i>
            <span>New Table</span>
          </button>
        </div>
      </div>
    `;
    return;
  }

  let html = '';
  tables.forEach(table => {
    const numRows = table.data ? table.data.length : 0;
    const numCols = (table.data && table.data[0]) ? table.data[0].length : 0;
    
    const isPresentInDoc = docBlockTitles.has((table.name || '').toLowerCase()) ||
                          docBlockSignatures.has(JSON.stringify(table.data));

    // Generate miniature preview table (first 3 rows, up to 4 cols)
    let previewHtml = '';
    if (table.data && table.data.length > 0) {
      previewHtml = '<div class="overflow-x-auto border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 text-[10px]"><table class="w-full border-collapse">';
      const previewRows = table.data.slice(0, 3);
      previewRows.forEach((r, rIdx) => {
        const isHeader = (rIdx === 0 && table.formatOptions?.hasHeader !== false);
        previewHtml += `<tr class="${isHeader ? 'bg-slate-100 dark:bg-slate-800 font-bold border-b border-slate-200 dark:border-slate-700' : 'border-b border-slate-100 dark:border-slate-800'}">`;
        const previewCols = r.slice(0, 4);
        previewCols.forEach(c => {
          previewHtml += `<td class="p-1 px-1.5 truncate max-w-[90px] text-slate-600 dark:text-slate-300 border-r border-slate-100 dark:border-slate-800/50">${escapeTableHtml(String(c || ''))}</td>`;
        });
        if (r.length > 4) {
          previewHtml += `<td class="p-1 px-1.5 text-slate-400">...</td>`;
        }
        previewHtml += '</tr>';
      });
      previewHtml += '</table></div>';
    }

    const updatedDateStr = table.updatedAt ? new Date(table.updatedAt).toLocaleDateString() : '';

    html += `
      <div class="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between gap-3 group">
        <!-- Top Row: Name & Status Badge -->
        <div>
          <div class="flex items-start justify-between gap-2">
            <h4 class="font-bold text-sm text-slate-800 dark:text-slate-100 truncate flex items-center gap-1.5" title="${escapeTableHtml(table.name)}">
              <i class="fa-solid fa-table text-indigo-500 text-xs"></i>
              <span class="truncate">${escapeTableHtml(table.name)}</span>
            </h4>
            ${isPresentInDoc ? `
              <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> In Document
              </span>
            ` : `
              <span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                <i class="fa-solid fa-paperclip text-[9px]"></i> Attached Only
              </span>
            `}
          </div>

          <!-- Metadata info -->
          <div class="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-mono">
            <span><i class="fa-solid fa-border-all text-[10px] mr-1"></i>${numCols} col × ${numRows} rows</span>
            ${updatedDateStr ? `<span><i class="fa-regular fa-clock text-[10px] mr-1"></i>${updatedDateStr}</span>` : ''}
          </div>
        </div>

        <!-- Middle: Preview Grid -->
        <div class="my-1">
          ${previewHtml}
        </div>

        <!-- Bottom: Action Buttons -->
        <div class="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between gap-2">
          <!-- Editor Launchers -->
          <div class="flex items-center gap-1.5">
            <button onclick="openSpreadsheetEditor('${table.id}')" title="Edit in Immersive Spreadsheet (x-spreadsheet / Excel style)" class="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer">
              <i class="fa-solid fa-file-excel text-xs"></i>
              <span>Spreadsheet</span>
            </button>
            <button onclick="openLibraryTableInVisualEditor('${table.id}')" title="Edit in DocCraft Advanced Formatter (Column widths, AsciiDoc styling)" class="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/40 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold flex items-center gap-1 transition cursor-pointer">
              <i class="fa-solid fa-sliders text-xs"></i>
              <span>Format</span>
            </button>
          </div>

          <!-- Insertion & More Actions -->
          <div class="flex items-center gap-1">
            <button onclick="insertLibraryTableIntoEditor('${table.id}')" title="Insert table code at cursor" class="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition cursor-pointer">
              <i class="fa-solid fa-plus-circle text-indigo-600 dark:text-indigo-400"></i>
            </button>
            <button onclick="exportLibraryTableCSV('${table.id}')" title="Export as CSV file" class="w-7 h-7 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs transition cursor-pointer">
              <i class="fa-solid fa-file-csv"></i>
            </button>
            <button onclick="deleteLibraryTable('${table.id}')" title="Delete from library" class="w-7 h-7 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 text-slate-400 hover:text-red-500 flex items-center justify-center text-xs transition cursor-pointer">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

function escapeTableHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Creates a new blank table in the library
 */
async function createNewLibraryTable() {
  if (!currentDocumentId) return;

  const title = prompt("Table Name / Title:", "New Table");
  if (!title) return;

  const colsStr = prompt("Number of Columns:", "3");
  if (!colsStr) return;
  const rowsStr = prompt("Number of Rows:", "4");
  if (!rowsStr) return;

  const numCols = Math.max(1, Math.min(26, parseInt(colsStr, 10) || 3));
  const numRows = Math.max(1, Math.min(200, parseInt(rowsStr, 10) || 4));

  const data = [];
  const headerRow = [];
  for (let c = 1; c <= numCols; c++) {
    headerRow.push(`Header ${c}`);
  }
  data.push(headerRow);

  for (let r = 1; r < numRows; r++) {
    const row = [];
    for (let c = 1; c <= numCols; c++) {
      row.push('');
    }
    data.push(row);
  }

  const newTable = {
    id: 'tbl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
    docId: currentDocumentId,
    name: title.trim(),
    data: data,
    formatOptions: {
      hasHeader: true,
      colAlignments: Array(numCols).fill('left'),
      colWidths: Array(numCols).fill('1')
    },
    isInDocument: false,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  await dbSaveTable(newTable);
  await renderTableLibraryUI();
  showToast(`Created table: ${newTable.name}`);
}

/**
 * Deletes a table from the library
 */
async function deleteLibraryTable(tableId) {
  const table = await dbGetTable(tableId);
  if (!table) return;

  if (!confirm(`Delete table "${table.name}" from library?`)) {
    return;
  }

  await dbDeleteTable(tableId);
  await renderTableLibraryUI();
  showToast("Table deleted from library");
}

/**
 * Inserts a library table at the current CodeMirror cursor position
 */
async function insertLibraryTableIntoEditor(tableId) {
  if (!cmEditor) return;
  const table = await dbGetTable(tableId);
  if (!table || !table.data || table.data.length === 0) return;

  const mode = (typeof currentMode !== 'undefined' ? currentMode : 'asciidoc');
  const numCols = table.data[0].length;

  const tableData = {
    format: mode,
    title: table.name || '',
    rows: table.data,
    hasHeader: table.formatOptions?.hasHeader !== false,
    colWidths: table.formatOptions?.colWidths || Array(numCols).fill('1'),
    alignments: table.formatOptions?.colAlignments || Array(numCols).fill('left'),
    asciidocStyles: Array(numCols).fill(true)
  };

  const code = serializeTableToString(tableData);
  cmEditor.replaceSelection("\n" + code + "\n");
  cmEditor.focus();

  closeTableLibraryModal();
  renderDocument();
  setTimeout(() => {
    updateTableBadges();
    updatePlantUmlStatus();
  }, 60);
  queueSaveToIndexedDB();

  showToast(`Inserted "${table.name}" into document`);
}

/**
 * Exports a library table as a downloadable CSV file
 */
async function exportLibraryTableCSV(tableId) {
  const table = await dbGetTable(tableId);
  if (!table || !table.data || table.data.length === 0) return;

  const csvRows = table.data.map(row => {
    return row.map(val => {
      let str = String(val == null ? '' : val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }).join(',');
  });

  const csvContent = csvRows.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(table.name || 'table').replace(/\s+/g, '_')}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast(`Exported CSV: ${table.name}`);
}

/**
 * Handles CSV file import into the library
 */
async function importLibraryTableCSV(event) {
  const file = event.target.files[0];
  if (!file || !currentDocumentId) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const text = e.target.result;
      const rows = parseCSVContent(text);
      if (rows.length === 0) {
        showToast("Empty CSV file", false);
        return;
      }

      const name = file.name.replace(/\.csv$/i, '');
      const numCols = rows[0].length;

      const newTable = {
        id: 'tbl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        docId: currentDocumentId,
        name: name,
        data: rows,
        formatOptions: {
          hasHeader: true,
          colAlignments: Array(numCols).fill('left'),
          colWidths: Array(numCols).fill('1')
        },
        isInDocument: false,
        createdAt: Date.now(),
        updatedAt: Date.now()
      };

      await dbSaveTable(newTable);
      await renderTableLibraryUI();
      showToast(`Imported CSV table: ${name}`);
    } catch(err) {
      console.error("CSV import error:", err);
      showToast("Failed to parse CSV file", false);
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

/**
 * Robust CSV parser handling escaped commas, quotes, and multiline cells
 */
function parseCSVContent(text) {
  const rows = [];
  let row = [];
  let entry = "";
  let insideQuote = false;
  let i = 0;

  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      if (insideQuote && i + 1 < text.length && text[i + 1] === '"') {
        entry += '"';
        i += 2;
        continue;
      } else {
        insideQuote = !insideQuote;
        i++;
        continue;
      }
    } else if (c === ',' && !insideQuote) {
      row.push(entry.trim());
      entry = "";
      i++;
      continue;
    } else if ((c === '\r' || c === '\n') && !insideQuote) {
      if (c === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        i++;
      }
      row.push(entry.trim());
      entry = "";
      if (row.length > 0 && (row.length > 1 || row[0] !== "")) {
        rows.push(row);
      }
      row = [];
      i++;
      continue;
    } else {
      entry += c;
      i++;
    }
  }

  if (entry.length > 0 || row.length > 0) {
    row.push(entry.trim());
    if (row.length > 0 && (row.length > 1 || row[0] !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

/**
 * Opens a library table in the existing DocCraft advanced table editor
 */
async function openLibraryTableInVisualEditor(tableId) {
  const table = await dbGetTable(tableId);
  if (!table) return;

  closeTableLibraryModal();

  // Find if table corresponds to an existing block in CodeMirror
  let matchedBlock = null;
  if (typeof findTableBlocks === 'function') {
    const blocks = findTableBlocks();
    matchedBlock = blocks.find(b => {
      try {
        const p = parseTableBlock(b);
        return (p.title && p.title.toLowerCase() === table.name.toLowerCase()) ||
               JSON.stringify(p.rows) === JSON.stringify(table.data);
      } catch(e) {
        return false;
      }
    });
  }

  const tableBlockData = {
    id: table.id,
    title: table.name,
    rows: table.data,
    format: (matchedBlock ? matchedBlock.format : (typeof currentMode !== 'undefined' ? currentMode : 'asciidoc')),
    hasHeader: table.formatOptions?.hasHeader !== false,
    colWidths: table.formatOptions?.colWidths || Array(table.data[0].length).fill('1'),
    alignments: table.formatOptions?.colAlignments || Array(table.data[0].length).fill('left'),
    asciidocStyles: Array(table.data[0].length).fill(true),
    startLine: matchedBlock ? matchedBlock.startLine : undefined,
    endLine: matchedBlock ? matchedBlock.endLine : undefined
  };

  openTableVisualEditor(tableBlockData, table.id);
}

/**
 * Opens the immersive x-spreadsheet editor modal for a table
 */
async function openSpreadsheetEditor(tableId) {
  const table = await dbGetTable(tableId);
  if (!table) return;

  activeSpreadsheetTableId = tableId;

  // Set modal title
  const titleEl = document.getElementById('spreadsheetModalTitle');
  if (titleEl) {
    titleEl.innerText = table.name || 'Spreadsheet Editor';
  }

  const container = document.getElementById('xspreadsheetContainer');
  if (!container) return;
  container.innerHTML = '';

  openModal('spreadsheetModal');

  // Verify x_spreadsheet vendor library
  if (typeof window.x_spreadsheet !== 'function') {
    container.innerHTML = `<div class="p-8 text-center text-red-500">x-spreadsheet library is loading or not available</div>`;
    return;
  }

  const spreadsheetData = matrixToSpreadsheetData(table.name, table.data);

  // Initialize x_spreadsheet instance
  activeSpreadsheetInstance = window.x_spreadsheet('#xspreadsheetContainer', {
    mode: 'edit',
    showToolbar: true,
    showGrid: true,
    showContextmenu: true,
    showBottomBar: false,
    view: {
      height: () => container.clientHeight || 550,
      width: () => container.clientWidth || 900
    },
    row: {
      len: Math.max(50, (table.data ? table.data.length : 0) + 15),
      height: 25
    },
    col: {
      len: Math.max(20, ((table.data && table.data[0]) ? table.data[0].length : 0) + 10),
      width: 110,
      indexWidth: 50,
      minWidth: 60
    }
  });

  activeSpreadsheetInstance.loadData(spreadsheetData);

  // Check if table is present in document to adapt UI button
  const docBlocks = (typeof findTableBlocks === 'function') ? findTableBlocks() : [];
  const isPresentInDoc = docBlocks.some(b => {
    try {
      const p = parseTableBlock(b);
      return (p.title && p.title.toLowerCase() === (table.name || '').toLowerCase()) ||
             JSON.stringify(p.rows) === JSON.stringify(table.data);
    } catch(e) { return false; }
  });

  const btnSyncDoc = document.getElementById('btnSpreadsheetSaveAndDoc');
  if (btnSyncDoc) {
    btnSyncDoc.classList.toggle('hidden', !isPresentInDoc);
  }
}

/**
 * Saves changes from x-spreadsheet back into IndexedDB (and optionally CodeMirror document)
 */
async function saveSpreadsheetEditor(andUpdateDocument = false) {
  if (!activeSpreadsheetInstance || !activeSpreadsheetTableId) return;

  const table = await dbGetTable(activeSpreadsheetTableId);
  if (!table) return;

  const sheetsData = activeSpreadsheetInstance.getData();
  const primarySheet = (sheetsData && sheetsData.length > 0) ? sheetsData[0] : null;
  const newMatrix = spreadsheetDataToMatrix(primarySheet);

  table.data = newMatrix;
  table.updatedAt = Date.now();
  await dbSaveTable(table);

  // If requested or present, update the CodeMirror document directly
  if (andUpdateDocument && cmEditor) {
    const blocks = (typeof findTableBlocks === 'function') ? findTableBlocks() : [];
    const matchedBlock = blocks.find(b => {
      try {
        const p = parseTableBlock(b);
        return (p.title && p.title.toLowerCase() === table.name.toLowerCase());
      } catch(e) { return false; }
    });

    if (matchedBlock) {
      const tableData = {
        format: matchedBlock.format,
        title: table.name,
        rows: newMatrix,
        hasHeader: table.formatOptions?.hasHeader !== false,
        colWidths: table.formatOptions?.colWidths || Array(newMatrix[0].length).fill('1'),
        alignments: table.formatOptions?.colAlignments || Array(newMatrix[0].length).fill('left'),
        asciidocStyles: Array(newMatrix[0].length).fill(true)
      };

      let newCode = serializeTableToString(tableData);
      if (newCode.endsWith('\n')) newCode = newCode.slice(0, -1);

      let actualStartLine = matchedBlock.startLine;
      if (matchedBlock.format === 'asciidoc') {
        let checkLine = matchedBlock.startLine;
        if (checkLine > 0) {
          const prev = cmEditor.getLine(checkLine - 1) ? cmEditor.getLine(checkLine - 1).trim() : '';
          if (prev.startsWith('[') && prev.endsWith(']')) {
            checkLine = checkLine - 1;
          }
        }
        if (checkLine > 0) {
          const prevTitle = cmEditor.getLine(checkLine - 1) ? cmEditor.getLine(checkLine - 1).trim() : '';
          if (prevTitle.startsWith('.') && !prevTitle.startsWith('...')) {
            actualStartLine = checkLine - 1;
          }
        }
      } else {
        if (matchedBlock.startLine > 0) {
          const prev = cmEditor.getLine(matchedBlock.startLine - 1) ? cmEditor.getLine(matchedBlock.startLine - 1).trim() : '';
          if (prev.match(/^#{1,4}\s+(.*)$/)) {
            actualStartLine = matchedBlock.startLine - 1;
          }
        }
      }

      const endLineLength = cmEditor.getLine(matchedBlock.endLine) ? cmEditor.getLine(matchedBlock.endLine).length : 0;
      cmEditor.replaceRange(
        newCode,
        { line: actualStartLine, ch: 0 },
        { line: matchedBlock.endLine, ch: endLineLength }
      );

      renderDocument();
      setTimeout(() => {
        updateTableBadges();
        updatePlantUmlStatus();
      }, 60);
      queueSaveToIndexedDB();
    }
  }

  closeModal('spreadsheetModal');
  activeSpreadsheetInstance = null;
  activeSpreadsheetTableId = null;

  await renderTableLibraryUI();
  showToast(andUpdateDocument ? "Table saved & document updated!" : "Table saved in library!");
}

/**
 * Closes the spreadsheet editor modal without saving
 */
function closeSpreadsheetEditor() {
  closeModal('spreadsheetModal');
  activeSpreadsheetInstance = null;
  activeSpreadsheetTableId = null;
}

/**
 * Sets row height preset for selected rows or all rows
 */
function setSpreadsheetRowHeightPreset(height) {
  if (!activeSpreadsheetInstance) return;
  const h = parseInt(height, 10);
  if (isNaN(h) || h < 10) return;

  const data = activeSpreadsheetInstance.datas ? activeSpreadsheetInstance.datas[0] : null;
  if (!data || !data.rows) return;

  const range = (data.selector && data.selector.range) ? data.selector.range : null;
  const isMultiRowSelected = (range && range.sri !== range.eri);

  const startRow = isMultiRowSelected ? range.sri : 0;
  const endRow = isMultiRowSelected ? range.eri : Math.min(100, (data.rows.len || 50) - 1);

  for (let r = startRow; r <= endRow; r++) {
    data.rows.setHeight(r, h);
  }

  if (activeSpreadsheetInstance.sheet) {
    activeSpreadsheetInstance.sheet.table.render();
    if (activeSpreadsheetInstance.sheet.selector) {
      activeSpreadsheetInstance.sheet.selector.resetAreaOffset();
    }
  }

  showToast(isMultiRowSelected ? `Resized selected rows (${startRow + 1}-${endRow + 1}) to ${h}px` : `Resized all rows to ${h}px`);
}

/**
 * Prompts user for custom row height in pixels
 */
function promptSpreadsheetCustomRowHeight() {
  const input = prompt("Enter row height in pixels (15 - 150):", "30");
  if (!input) return;
  const h = parseInt(input, 10);
  if (!isNaN(h) && h >= 15 && h <= 200) {
    setSpreadsheetRowHeightPreset(h);
  }
}

/**
 * Sets column width preset for selected columns or all columns
 */
function setSpreadsheetColWidthPreset(width) {
  if (!activeSpreadsheetInstance) return;
  const w = parseInt(width, 10);
  if (isNaN(w) || w < 20) return;

  const data = activeSpreadsheetInstance.datas ? activeSpreadsheetInstance.datas[0] : null;
  if (!data || !data.cols) return;

  const range = (data.selector && data.selector.range) ? data.selector.range : null;
  const isMultiColSelected = (range && range.sci !== range.eci);

  const startCol = isMultiColSelected ? range.sci : 0;
  const endCol = isMultiColSelected ? range.eci : Math.min(26, (data.cols.len || 20) - 1);

  for (let c = startCol; c <= endCol; c++) {
    data.cols.setWidth(c, w);
  }

  if (activeSpreadsheetInstance.sheet) {
    activeSpreadsheetInstance.sheet.table.render();
    if (activeSpreadsheetInstance.sheet.selector) {
      activeSpreadsheetInstance.sheet.selector.resetAreaOffset();
    }
  }

  showToast(isMultiColSelected ? `Resized selected columns to ${w}px` : `Resized all columns to ${w}px`);
}

/**
 * Prompts user for custom column width in pixels
 */
function promptSpreadsheetCustomColWidth() {
  const input = prompt("Enter column width in pixels (30 - 300):", "120");
  if (!input) return;
  const w = parseInt(input, 10);
  if (!isNaN(w) && w >= 30 && w <= 500) {
    setSpreadsheetColWidthPreset(w);
  }
}

/**
 * Auto-adjusts row height to fit cell text content (multiline text & text wrapping)
 */
function autoFitSpreadsheetRowHeight(targetRowIndex = null) {
  if (!activeSpreadsheetInstance) return;
  const data = activeSpreadsheetInstance.datas ? activeSpreadsheetInstance.datas[0] : null;
  if (!data || !data.rows) return;

  const range = (data.selector && data.selector.range) ? data.selector.range : null;
  let startRow = 0;
  let endRow = 0;

  if (targetRowIndex !== null && targetRowIndex !== undefined) {
    if (range && range.sri !== range.eri && targetRowIndex >= range.sri && targetRowIndex <= range.eri) {
      startRow = range.sri;
      endRow = range.eri;
    } else {
      startRow = targetRowIndex;
      endRow = targetRowIndex;
    }
  } else if (range && range.sri !== range.eri) {
    startRow = range.sri;
    endRow = range.eri;
  } else {
    startRow = 0;
    const rowKeys = Object.keys(data.rows._ || {})
      .map(k => parseInt(k, 10))
      .filter(k => !isNaN(k));
    endRow = rowKeys.length > 0 ? Math.max(...rowKeys) : Math.min(50, (data.rows.len || 20) - 1);
  }

  if (!autoFitSpreadsheetRowHeight.ctx) {
    const canvas = document.createElement('canvas');
    autoFitSpreadsheetRowHeight.ctx = canvas.getContext('2d');
    autoFitSpreadsheetRowHeight.ctx.font = '12px "Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }
  const ctx = autoFitSpreadsheetRowHeight.ctx;

  let adjustedCount = 0;

  for (let r = startRow; r <= endRow; r++) {
    const rowObj = data.rows.get(r);
    const cells = (rowObj && rowObj.cells) ? rowObj.cells : {};
    let maxLinesInRow = 1;

    const numCols = Math.max(10, data.cols.len || 20);
    for (let c = 0; c < numCols; c++) {
      const cell = cells[c];
      if (!cell || cell.text == null || cell.text === '') continue;

      const cellText = String(cell.text);
      const colWidth = (data.cols && typeof data.cols.getWidth === 'function')
        ? data.cols.getWidth(c)
        : 110;
      
      const padding = 16;
      const usableWidth = Math.max(30, colWidth - padding);
      const paragraphs = cellText.split('\n');
      let cellLines = 0;

      for (const p of paragraphs) {
        if (!p) {
          cellLines += 1;
          continue;
        }
        const textWidth = ctx.measureText(p).width;
        if (textWidth <= usableWidth) {
          cellLines += 1;
        } else {
          const words = p.split(' ');
          let currentLineWidth = 0;
          let pLines = 1;
          for (const w of words) {
            const wWidth = ctx.measureText(w + ' ').width;
            if (currentLineWidth + wWidth > usableWidth && currentLineWidth > 0) {
              pLines++;
              currentLineWidth = wWidth;
            } else {
              currentLineWidth += wWidth;
            }
          }
          cellLines += Math.max(1, pLines);
        }
      }

      if (cellLines > maxLinesInRow) {
        maxLinesInRow = cellLines;
      }
    }

    const computedHeight = Math.max(26, Math.min(300, (maxLinesInRow * 19) + 8));
    data.rows.setHeight(r, computedHeight);
    adjustedCount++;
  }

  if (activeSpreadsheetInstance.sheet) {
    activeSpreadsheetInstance.sheet.table.render();
    if (activeSpreadsheetInstance.sheet.selector) {
      activeSpreadsheetInstance.sheet.selector.resetAreaOffset();
    }
  }

  showToast(`Auto-adjusted ${adjustedCount} row${adjustedCount > 1 ? 's' : ''} to content`);
}

/**
 * Auto-adjusts column width to fit content
 */
function autoFitSpreadsheetColWidth(targetColIndex = null) {
  if (!activeSpreadsheetInstance) return;
  const data = activeSpreadsheetInstance.datas ? activeSpreadsheetInstance.datas[0] : null;
  if (!data || !data.cols) return;

  const range = (data.selector && data.selector.range) ? data.selector.range : null;
  let startCol = 0;
  let endCol = 0;

  if (targetColIndex !== null && targetColIndex !== undefined) {
    if (range && range.sci !== range.eci && targetColIndex >= range.sci && targetColIndex <= range.eci) {
      startCol = range.sci;
      endCol = range.eci;
    } else {
      startCol = targetColIndex;
      endCol = targetColIndex;
    }
  } else if (range && range.sci !== range.eci) {
    startCol = range.sci;
    endCol = range.eci;
  } else {
    startCol = 0;
    endCol = Math.min(26, (data.cols.len || 20) - 1);
  }

  if (!autoFitSpreadsheetColWidth.ctx) {
    const canvas = document.createElement('canvas');
    autoFitSpreadsheetColWidth.ctx = canvas.getContext('2d');
    autoFitSpreadsheetColWidth.ctx.font = '12px "Source Sans Pro", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  }
  const ctx = autoFitSpreadsheetColWidth.ctx;

  const numRows = Math.min(100, data.rows.len || 50);
  let adjustedCount = 0;

  for (let c = startCol; c <= endCol; c++) {
    let maxCellWidth = 40;
    for (let r = 0; r < numRows; r++) {
      const rowObj = data.rows.get(r);
      if (!rowObj || !rowObj.cells || !rowObj.cells[c]) continue;
      const text = rowObj.cells[c].text;
      if (text == null) continue;
      const lines = String(text).split('\n');
      for (const line of lines) {
        const w = ctx.measureText(line).width;
        if (w > maxCellWidth) maxCellWidth = w;
      }
    }
    const computedWidth = Math.max(60, Math.min(400, Math.ceil(maxCellWidth + 24)));
    data.cols.setWidth(c, computedWidth);
    adjustedCount++;
  }

  if (activeSpreadsheetInstance.sheet) {
    activeSpreadsheetInstance.sheet.table.render();
    if (activeSpreadsheetInstance.sheet.selector) {
      activeSpreadsheetInstance.sheet.selector.resetAreaOffset();
    }
  }

  showToast(`Auto-adjusted ${adjustedCount} column${adjustedCount > 1 ? 's' : ''} to content`);
}

window.autoFitSpreadsheetRowHeight = autoFitSpreadsheetRowHeight;
window.autoFitSpreadsheetColWidth = autoFitSpreadsheetColWidth;

var currentPendingChoiceTable = null;

/**
 * Directly opens any document table block in x-spreadsheet
 */
async function openTableInSpreadsheet(tbl) {
  if (!currentDocumentId) {
    showToast("Please open a document first", false);
    return;
  }
  const parsed = (tbl && tbl.rows) ? tbl : parseTableBlock(tbl);
  if (!parsed || !parsed.rows || parsed.rows.length === 0) return;

  const existingTables = await dbGetTablesByDoc(currentDocumentId);
  let matched = existingTables.find(t => {
    if (t.name && parsed.title && t.name.toLowerCase() === parsed.title.toLowerCase()) return true;
    return JSON.stringify(t.data) === JSON.stringify(parsed.rows);
  });

  if (!matched) {
    matched = {
      id: 'tbl-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
      docId: currentDocumentId,
      name: parsed.title || 'Table (Line ' + ((parsed.startLine || 0) + 1) + ')',
      data: parsed.rows,
      formatOptions: {
        hasHeader: parsed.hasHeader !== false,
        colAlignments: parsed.alignments,
        colWidths: parsed.colWidths
      },
      isInDocument: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    await dbSaveTable(matched);
  } else {
    matched.data = parsed.rows;
    matched.formatOptions = {
      hasHeader: parsed.hasHeader !== false,
      colAlignments: parsed.alignments,
      colWidths: parsed.colWidths
    };
    matched.isInDocument = true;
    matched.updatedAt = Date.now();
    await dbSaveTable(matched);
  }

  await openSpreadsheetEditor(matched.id);
}

/**
 * Shows the editor choice modal for a table
 */
function showTableEditorChoice(tbl) {
  currentPendingChoiceTable = tbl;
  const subtitleEl = document.getElementById('tableChoiceModalSubtitle');
  if (subtitleEl) {
    const title = tbl.title || (tbl.rows ? 'Table' : '');
    subtitleEl.innerText = title ? `Editing "${title}"` : 'Choose your preferred editing experience';
  }
  openModal('tableChoiceModal');
}

/**
 * Handles the user's choice from tableChoiceModal
 */
function chooseTableEditor(choice) {
  closeModal('tableChoiceModal');
  const tbl = currentPendingChoiceTable;
  currentPendingChoiceTable = null;
  if (!tbl) return;

  if (choice === 'spreadsheet') {
    openTableInSpreadsheet(tbl);
  } else {
    openTableVisualEditor(tbl);
  }
}
