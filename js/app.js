/**
 * DocCraft Studio - Main Application Bootstrapper & Global Window Exports
 */

// Expose all functions required by inline HTML onclick/onchange handlers
Object.assign(window, {
  setMode,
  openConvertModal,
  closeModal,
  applyConversion,
  copyConversionResult,
  clearEditor,
  downloadFile,
  testKrokiConnection,
  saveKrokiConfig,
  copySourceToClipboard,
  toggleDarkMode,
  insertHeader,
  wrapText,
  insertList,
  insertQuote,
  openLinkModal,
  submitLink,
  openImageModal,
  submitImage,
  openTableModal,
  submitTable,
  insertCodeBlock,
  insertPlantUML,
  openAdmonitionModal,
  submitAdmonition,
  insertHorizontalRule,
  insertForcedLineBreak,
  printDocument,
  setColWidth,
  toggleColAsciidocStyle,
  tableEditorAddCol,
  tableEditorDeleteCol,
  tableEditorAddRow,
  tableEditorDeleteRow,
  tableEditorInsertRow,
  tableEditorDuplicateRow,
  formatActiveCell,
  saveTableEditorChanges,
  openTableVisualEditor,
  renderTableEditorGrid,
  initColResize,
  onCellInputFocus,
  onCellInputBlur,
  onCellInputChange,
  enableRowDrag,
  disableRowDrag,
  onRowDragStart,
  onRowDragOver,
  onRowDragLeave,
  onRowDragEnd,
  onRowDrop,
  tableEditorMoveRowToIndex,
  tableEditorMoveCol,
  onToggleHeaderRow,
  onEditTableTitleChange,
  onEditTableWidthChange,
  toggleAdvancedControls,
  toggleTablePreview,
  updateTableEditorPreview,
  editorUndo,
  editorRedo,
  syncPreviewSelectionToEditor,
  syncEditorSelectionToPreview,
  tableEditorUndo,
  tableEditorRedo,
  updatePictureBadges,
  toggleWorkspaceSidebar,
  openCreateItemModal,
  closeCreateItemModal,
  submitCreateItemModal,
  openDocumentFromWorkspace,
  renameDocumentFromWorkspace,
  deleteDocumentFromWorkspace,
  createConvertedCopy,
  setImageModalTab,
  handleImageAttachmentUpload,
  renameFolderFromWorkspace,
  deleteFolderFromWorkspace,
  toggleFolderExpand,
  selectWorkspaceNode,
  deleteAttachmentFromGallery,
  insertAttachedImage,
  handleDocDrop,
  exportActiveDocumentAndPictures,
  exportWorkspaceJSON,
  exportRenderedHTML,
  exportApplicationBackup,
  openAppBackupModal,
  closeAppBackupModal,
  startAppBackup,
  importWorkspaceJSON,
  adjustZoom,
  resetPumlModalZoom,
  savePumlEditorChanges,
  toggleCodeMirrorWordWrap,
  exportTableCSV,
  importTableCSV,
  toggleComment,
  debouncePumlEditorPreview,
  openSettingsModal,
  changeSettingPrintZoom,
  togglePreviewSyncMode,
  updatePreviewSyncModeUI,
  toggleDesktopSidebar,
  resetMainPanelsSplit,
  toggleTableEditorExpandWidth,
  toggleTableEditorXLCells,
  showSearchReplace,
  hideSearchReplace,
  onSearchQueryChange,
  searchNext,
  searchPrev,
  replaceCurrent,
  replaceAll,
  togglePreviewSearch,
  onPreviewSearchQueryChange,
  previewSearchNext,
  previewSearchPrev,
  toggleForcePreviewLightMode,
  updateCustomNumbersColor,
  updateCustomSpecialsColor,
  openQuickSwitcher,
  closeQuickSwitcher,
  toggleQuickSwitcher,
  onQuickSwitcherInput,
  handleQuickSwitcherKeydown,
  selectQuickSwitcherItem,
  navigateToWikiLink,
  toggleBacklinksDrawer,
  toggleBacklinksTab,
  linkUnlinkedMention,
  insertWikiLinkFromAutocomplete,
  setViewLayout,
  filterNotesByTag,
  clearTagFilter,
  togglePinDocument,
  toggleTrashView,
  restoreDocumentFromTrash,
  permanentlyDeleteDocument,
  emptyTrash,
  openDailyNote,
  openInsertTemplateModal,
  closeInsertTemplateModal,
  applyInsertTemplate,
  openEditTemplateModal,
  closeEditTemplateModal,
  saveEditTemplate,
  deleteTemplate,
  cloneTemplate,
  insertPlaceholderIntoTemplate,
  getAllAvailableTemplates,
  getNoteTemplateContent,
  openTasksHubModal,
  closeTasksHubModal,
  setTasksHubFilter,
  onTasksHubSearch,
  toggleTaskInSourceDocument,
  jumpToTaskInDocument,
  updateGlobalTaskCountBadge,
  processChecklistsInPreview,
  handlePreviewCheckboxToggle,
  openKnowledgeGraphModal,
  closeKnowledgeGraphModal,
  setGraphViewMode,
  onGraphTagFilterChange,
  onGraphFolderFilterChange,
  resetGraphView,
  toggleZenMode,
  importWorkspaceArchive,
  importDocumentsFromFiles,
  setDarkThemeVariant,
  setLightThemeVariant,
  applyThemeVariants,
  syncThemeVariantRadios
});

// Initialize with system preference or theme storage
window.addEventListener('DOMContentLoaded', () => {
  if (typeof applyThemeVariants === 'function') {
    applyThemeVariants();
  }
  if (typeof syncThemeVariantRadios === 'function') {
    syncThemeVariantRadios();
  }

  // Global Shortcut for Quick Switcher / Command Palette (Cmd+K / Ctrl+K and Cmd+P / Ctrl+P)
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K' || e.key === 'p' || e.key === 'P')) {
      e.preventDefault();
      toggleQuickSwitcher();
    }
  });

  // Global Shortcut for Daily Note (Alt+D)
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      openDailyNote();
    }
  });

  // Global Shortcut for Knowledge Graph (Cmd+G / Ctrl+G)
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'g' || e.key === 'G') && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      const modal = document.getElementById('knowledgeGraphModal');
      if (modal && !modal.classList.contains('hidden')) {
        closeKnowledgeGraphModal();
      } else {
        openKnowledgeGraphModal();
      }
    }
  });

  // Global Shortcut for Zen / Focus Writing Mode (F11 or Cmd+Shift+F / Ctrl+Shift+F)
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F11' || ((e.metaKey || e.ctrlKey) && e.shiftKey && (e.key === 'f' || e.key === 'F'))) {
      e.preventDefault();
      toggleZenMode();
    } else if (e.key === 'Escape' && typeof isZenModeActive !== 'undefined' && isZenModeActive) {
      toggleZenMode(false);
    }
  });

  // Global Shortcuts for View Layout Modes (Cmd+Alt+1 = Both, Cmd+Alt+2 = Code, Cmd+Alt+3 = Preview)
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.altKey) {
      if (e.key === '1' || e.code === 'Digit1') {
        e.preventDefault();
        setViewLayout('both');
        showToast("Layout: Code + Preview");
      } else if (e.key === '2' || e.code === 'Digit2') {
        e.preventDefault();
        setViewLayout('code');
        showToast("Layout: Code Only");
      } else if (e.key === '3' || e.code === 'Digit3') {
        e.preventDefault();
        setViewLayout('preview');
        showToast("Layout: Preview Only");
      }
    }
  });

  // Restore View Layout preference from localStorage
  try {
    const savedLayout = localStorage.getItem('view_layout');
    if (savedLayout && (savedLayout === 'both' || savedLayout === 'code' || savedLayout === 'preview')) {
      currentViewLayout = savedLayout;
    }
    setViewLayout(currentViewLayout);
  } catch(e) {}

  // Initialize DOM references in state
  initStateDomElements();

  try {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || 
        (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
      const icon = document.getElementById('themeIcon');
      if (icon) icon.className = "fa-solid fa-sun";
    }
  } catch (e) {}

  // Apply Custom Colors
  try {
    applyCustomColors();
  } catch(e) {}

  // Restore force preview light mode
  try {
    applyForcePreviewLightMode();
    const forceLightCb = document.getElementById('forcePreviewLightMode');
    if (forceLightCb) {
      forceLightCb.checked = forcePreviewLight;
    }
  } catch(e) {}

  // Restore saved UI zoom
  try {
    const savedZoom = localStorage.getItem('ui_zoom');
    if (savedZoom) {
      adjustZoom(savedZoom);
      const dropdown = document.getElementById('zoomDropdown');
      if (dropdown) dropdown.value = savedZoom;
    }
  } catch(e) {}

  // Restore saved default Print Zoom Scale setting from localStorage
  try {
    const savedPrintZoom = localStorage.getItem('setting_print_zoom') || '70';
    document.documentElement.style.setProperty('--print-zoom', `${savedPrintZoom}%`);
    const printZoomSelect = document.getElementById('settingPrintZoom');
    if (printZoomSelect) {
      printZoomSelect.value = savedPrintZoom;
    }
  } catch(e) {}

  // Restore saved preview sync mode preference from localStorage
  try {
    const savedSyncMode = localStorage.getItem('preview_sync_mode');
    if (savedSyncMode) {
      previewSyncMode = savedSyncMode;
    }
    updatePreviewSyncModeUI();
  } catch(e) {}

  // Restore saved desktop sidebar visibility preference from localStorage
  try {
    const savedVisible = localStorage.getItem('sidebar_visible');
    if (savedVisible === 'false') {
      desktopSidebarVisible = false;
      const sidebar = document.getElementById('workspaceSidebar');
      const handle = document.getElementById('sidebarResizeHandle');
      const btn = document.getElementById('btnToggleDesktopSidebar');
      if (sidebar) sidebar.classList.add('hidden');
      if (handle) handle.classList.add('hidden');
      if (btn) {
        btn.classList.remove('bg-indigo-50', 'text-indigo-600', 'dark:bg-indigo-950/40', 'dark:text-indigo-400');
        btn.classList.add('bg-slate-100', 'text-slate-600', 'dark:bg-slate-700', 'dark:text-slate-300');
      }
    }
  } catch (e) {}

  // Restore saved table editor preferences from localStorage
  try {
    const savedExpanded = localStorage.getItem('table_editor_expanded_width');
    if (savedExpanded === 'true') {
      tableEditorExpandedWidth = true;
      const card = document.getElementById('tableEditorModalCard');
      if (card) {
        card.classList.replace('lg:max-w-7xl', 'lg:max-w-[98vw]');
      }
    }
    
    const savedXL = localStorage.getItem('table_editor_xl_cells');
    if (savedXL === 'true') {
      tableEditorXLCells = true;
    }
  } catch(e) {}

  // Listen for Escape/Enter keys inside search panel input fields
  const sq = document.getElementById('searchQuery');
  if (sq) {
    sq.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideSearchReplace();
      if (e.key === 'Enter') {
        e.preventDefault();
        searchNext();
      }
    });
  }
  const rq = document.getElementById('replaceQuery');
  if (rq) {
    rq.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideSearchReplace();
    });
  }

  // Listen for Escape/Enter keys inside preview search panel input field
  const psq = document.getElementById('previewSearchQuery');
  if (psq) {
    psq.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') togglePreviewSearch();
      if (e.key === 'Enter') {
        e.preventDefault();
        previewSearchNext();
      }
    });
  }

  // Initialize resizable left panel sidebar
  initSidebarResizer();

  // Initialize resizable columns inside PlantUML Diagram Editor modal
  initPumlModalResizer();

  // Initialize zoom/pan listeners inside PlantUML Diagram Editor modal preview canvas
  initPumlModalInteractionListeners();

  // Initialize resizable main panels splitter (Editor / Preview)
  initMainPanelsResizer();

  // Initialize CodeMirror editor
  initCodeMirrorEditor();

  // Bind preview container scroll synchronization
  const preview = document.getElementById('previewContainer');
  if (preview) {
    preview.addEventListener('scroll', handlePreviewScroll, false);
  }

  // Bind global window paste handler for local attachment gallery
  window.addEventListener('paste', async (e) => {
    const modal = document.getElementById('imageModal');
    if (modal && !modal.classList.contains('hidden') && activeImageTab === 'local') {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.indexOf('image') === 0) {
          const file = item.getAsFile();
          const att = await processImageFileForAttachment(file);
          if (att) {
            selectedAttachmentFilename = att.filename;
            renderAttachedImagesGallery();
          }
        }
      }
    }
  });

  updateKrokiBadge();

  // Silent initial ping to local Kroki container
  testKrokiConnection();

  // Initialize local IndexedDB workspace and restore documents
  initWorkspace().then(() => {
    updateGlobalTaskCountBadge();
  });

  // Listen for keyboard shortcuts inside table visual editor modal
  document.addEventListener('keydown', (e) => {
    const modal = document.getElementById('tableEditorModal');
    if (modal && !modal.classList.contains('hidden')) {
      const isUndo = (e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey;
      const isRedo = ((e.ctrlKey || e.metaKey) && e.key === 'y') || 
                     ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') ||
                     ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z');
      
      if (isUndo) {
        e.preventDefault();
        tableEditorUndo();
      } else if (isRedo) {
        e.preventDefault();
        tableEditorRedo();
      }
    }
  });
});
