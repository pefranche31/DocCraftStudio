/**
 * DocCraft Studio - User Interface, Modals & Settings Management
 */

function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function showToast(message, isSuccess = true) {
  const toast = document.getElementById('toast');
  const toastMsg = document.getElementById('toastMsg');
  const toastIcon = document.getElementById('toastIcon');
  if (!toast || !toastMsg) return;

  toastMsg.innerText = message;
  if (isSuccess) {
    toastIcon.className = "fa-solid fa-circle-check text-emerald-400";
  } else {
    toastIcon.className = "fa-solid fa-circle-exclamation text-amber-400";
  }

  toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
  toast.classList.add('translate-y-0', 'opacity-100');

  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('translate-y-0', 'opacity-100');
    toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
  }, 2800);
}

var activeDarkThemeVariant = localStorage.getItem('dark_theme_variant') || 'slate';
var activeLightThemeVariant = localStorage.getItem('light_theme_variant') || 'paper';

function setDarkThemeVariant(variant) {
  activeDarkThemeVariant = variant;
  try {
    localStorage.setItem('dark_theme_variant', variant);
  } catch(e) {}
  applyThemeVariants();
  syncThemeVariantRadios();
  const label = variant === 'oled' ? 'Pure Black (OLED)' : (variant === 'obsidian' ? 'Obsidian Charcoal' : 'Midnight Slate');
  showToast(`Dark theme set to ${label}`);
}

function setLightThemeVariant(variant) {
  activeLightThemeVariant = variant;
  try {
    localStorage.setItem('light_theme_variant', variant);
  } catch(e) {}
  applyThemeVariants();
  syncThemeVariantRadios();
  const label = variant === 'sepia' ? 'Warm Sepia (Book Paper)' : (variant === 'nordic' ? 'Nordic Frost' : 'Clean Paper');
  showToast(`Light theme set to ${label}`);
}

function applyThemeVariants() {
  document.documentElement.setAttribute('data-dark-theme', activeDarkThemeVariant);
  document.documentElement.setAttribute('data-light-theme', activeLightThemeVariant);
}

function syncThemeVariantRadios() {
  const isDark = document.documentElement.classList.contains('dark');
  const darkGroup = document.getElementById('darkThemeVariantsGroup');
  const lightGroup = document.getElementById('lightThemeVariantsGroup');
  const sectionTitle = document.getElementById('themeVariantsSectionTitle');
  const sectionDesc = document.getElementById('themeVariantsSectionDesc');

  if (isDark) {
    if (darkGroup) darkGroup.classList.remove('hidden');
    if (lightGroup) lightGroup.classList.add('hidden');
    if (sectionTitle) sectionTitle.innerText = "Dark Mode Style";
    if (sectionDesc) sectionDesc.innerText = "Choose your preferred dark background flavor when Dark Mode is active.";
  } else {
    if (darkGroup) darkGroup.classList.add('hidden');
    if (lightGroup) lightGroup.classList.remove('hidden');
    if (sectionTitle) sectionTitle.innerText = "Light Mode Style";
    if (sectionDesc) sectionDesc.innerText = "Choose your preferred light background flavor when Light Mode is active.";
  }

  // Sync dark radios
  document.querySelectorAll('input[name="darkThemeVariant"]').forEach(r => {
    r.checked = (r.value === activeDarkThemeVariant);
    const card = r.closest('label');
    if (card) {
      if (r.checked) card.classList.add('ring-2', 'ring-indigo-500', 'border-indigo-500');
      else card.classList.remove('ring-2', 'ring-indigo-500', 'border-indigo-500');
    }
  });

  // Sync light radios
  document.querySelectorAll('input[name="lightThemeVariant"]').forEach(r => {
    r.checked = (r.value === activeLightThemeVariant);
    const card = r.closest('label');
    if (card) {
      if (r.checked) card.classList.add('ring-2', 'ring-indigo-500', 'border-indigo-500');
      else card.classList.remove('ring-2', 'ring-indigo-500', 'border-indigo-500');
    }
  });
}

function toggleDarkMode() {
  const html = document.documentElement;
  const isDark = html.classList.toggle('dark');
  try {
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  } catch(e) {}
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = isDark ? "fa-solid fa-sun" : "fa-solid fa-moon";
  }
  applyThemeVariants();
  syncSettingsThemeToggle();
  syncThemeVariantRadios();
}

function syncSettingsThemeToggle() {
  const isDark = document.documentElement.classList.contains('dark');
  const settingsIcon = document.getElementById('settingsThemeIcon');
  const settingsText = document.getElementById('settingsThemeText');
  if (settingsIcon && settingsText) {
    settingsIcon.className = isDark ? "fa-solid fa-sun text-amber-500" : "fa-solid fa-moon text-slate-500";
    settingsText.innerText = isDark ? "Light Mode" : "Dark Mode";
  }
}

function printDocument() {
  window.print();
}

function adjustZoom(val) {
  document.documentElement.style.fontSize = `${val}%`;
  const dropdown = document.getElementById('zoomDropdown');
  if (dropdown) dropdown.value = val;
  try { localStorage.setItem('ui_zoom', val); } catch(e) {}
}

function togglePreviewSyncMode() {
  if (previewSyncMode === 'live') {
    previewSyncMode = '10s';
  } else if (previewSyncMode === '10s') {
    previewSyncMode = 'paused';
  } else {
    previewSyncMode = 'live';
  }
  updatePreviewSyncModeUI();
}

function updatePreviewSyncModeUI() {
  const btn = document.getElementById('btnSyncMode');
  if (!btn) return;
  
  let html = '';
  if (previewSyncMode === 'live') {
    html = `<i class="fa-solid fa-bolt text-amber-500 animate-pulse mr-1"></i> <span class="hidden sm:inline">Live Sync</span>`;
    btn.className = "px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-[10px] font-bold transition flex items-center gap-1 shrink-0 select-none shadow-sm cursor-pointer text-slate-700 dark:text-slate-200";
    renderDocument();
    updatePlantUmlStatus();
    updateTableBadges();
    updatePictureBadges();
  } else if (previewSyncMode === '10s') {
    html = `<i class="fa-solid fa-clock text-sky-500 mr-1"></i> <span class="hidden sm:inline">10s Sync</span>`;
    btn.className = "px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded text-[10px] font-bold transition flex items-center gap-1 shrink-0 select-none shadow-sm cursor-pointer text-slate-700 dark:text-slate-200";
  } else {
    html = `<i class="fa-solid fa-circle-pause text-rose-500 mr-1"></i> <span class="hidden sm:inline">Sync Paused</span>`;
    btn.className = "px-2 py-1 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-900/40 rounded text-[10px] font-bold border border-rose-200 dark:border-rose-850 transition flex items-center gap-1 text-rose-600 dark:text-rose-400 shrink-0 select-none shadow-sm cursor-pointer";
  }
  btn.innerHTML = html;
  try {
    localStorage.setItem('preview_sync_mode', previewSyncMode);
  } catch (e) {}
}

function toggleDesktopSidebar() {
  const sidebar = document.getElementById('workspaceSidebar');
  const handle = document.getElementById('sidebarResizeHandle');
  const btn = document.getElementById('btnToggleDesktopSidebar');
  if (!sidebar || !handle) return;

  desktopSidebarVisible = !desktopSidebarVisible;
  
  if (desktopSidebarVisible) {
    sidebar.classList.remove('hidden');
    handle.classList.remove('hidden');
    if (btn) {
      btn.classList.add('bg-indigo-50', 'text-indigo-600', 'dark:bg-indigo-950/40', 'dark:text-indigo-400');
      btn.classList.remove('bg-slate-100', 'text-slate-600', 'dark:bg-slate-700', 'dark:text-slate-300');
    }
  } else {
    sidebar.classList.add('hidden');
    handle.classList.add('hidden');
    if (btn) {
      btn.classList.remove('bg-indigo-50', 'text-indigo-600', 'dark:bg-indigo-950/40', 'dark:text-indigo-400');
      btn.classList.add('bg-slate-100', 'text-slate-600', 'dark:bg-slate-700', 'dark:text-slate-300');
    }
  }
  try {
    localStorage.setItem('sidebar_visible', desktopSidebarVisible ? 'true' : 'false');
  } catch (e) {}
}

function setViewLayout(mode) {
  currentViewLayout = mode;
  try {
    localStorage.setItem('view_layout', mode);
  } catch(e) {}

  const editorCol = document.getElementById('mainEditorCol');
  const splitter = document.getElementById('mainPanelsSplitterHandle');
  const previewCol = document.getElementById('mainPreviewCol');
  
  const btnBoth = document.getElementById('btnViewLayoutBoth');
  const btnCode = document.getElementById('btnViewLayoutCode');
  const btnPreview = document.getElementById('btnViewLayoutPreview');

  const activeBtnClass = "px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs";
  const inactiveBtnClass = "px-2 py-1 rounded-md text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200";

  if (btnBoth) btnBoth.className = (mode === 'both') ? activeBtnClass : inactiveBtnClass;
  if (btnCode) btnCode.className = (mode === 'code') ? activeBtnClass : inactiveBtnClass;
  if (btnPreview) btnPreview.className = (mode === 'preview') ? activeBtnClass : inactiveBtnClass;

  if (mode === 'both') {
    if (editorCol) {
      editorCol.classList.remove('hidden');
      const savedSplit = localStorage.getItem('main_panels_split');
      editorCol.style.width = savedSplit ? `${savedSplit}px` : '50%';
    }
    if (splitter) splitter.classList.remove('hidden');
    if (previewCol) previewCol.classList.remove('hidden');
    if (cmEditor) {
      setTimeout(() => cmEditor.refresh(), 20);
    }
  } else if (mode === 'code') {
    if (editorCol) {
      editorCol.classList.remove('hidden');
      editorCol.style.width = '100%';
    }
    if (splitter) splitter.classList.add('hidden');
    if (previewCol) previewCol.classList.add('hidden');
    if (cmEditor) {
      setTimeout(() => {
        cmEditor.refresh();
        cmEditor.focus();
      }, 20);
    }
  } else if (mode === 'preview') {
    if (editorCol) editorCol.classList.add('hidden');
    if (splitter) splitter.classList.add('hidden');
    if (previewCol) {
      previewCol.classList.remove('hidden');
    }
    renderDocument();
  }
}

/* Modals Management */
function openImageModal() {
  document.getElementById('imgUrl').value = 'https://picsum.photos/800/400';
  document.getElementById('imgAlt').value = 'Illustration';
  document.getElementById('imgWidth').value = '100';
  document.getElementById('imgTitle').value = '';
  selectedAttachmentFilename = null;
  openModal('imageModal');
  setImageModalTab('web');
}

function submitImage() {
  let url = '';
  if (activeImageTab === 'web') {
    url = document.getElementById('imgUrl').value.trim() || 'https://picsum.photos/800/400';
  } else {
    if (!selectedAttachmentFilename) {
      showToast("Please select an attached picture from the gallery first", false);
      return;
    }
    url = `attachments/${selectedAttachmentFilename}`;
  }

  const alt = document.getElementById('imgAlt').value.trim() || 'Illustration';
  const rawWidth = document.getElementById('imgWidth').value.trim();
  const width = (rawWidth && !rawWidth.endsWith('%')) ? rawWidth + '%' : rawWidth;
  const title = document.getElementById('imgTitle').value.trim();

  let newImgCode = '';
  if (currentMode === 'asciidoc') {
    const widthAttr = width ? `,width=${width}` : '';
    newImgCode = `image::${url}[${alt}${widthAttr}]`;
  } else {
    newImgCode = `![${alt}](${url})`;
  }

  if (imageReplaceTargetLine !== null) {
    replaceImageAndTitleAtLine(imageReplaceTargetLine, newImgCode, title);
    imageReplaceTargetLine = null;
    closeModal('imageModal');
    showToast("Picture attributes updated successfully");
    renderDocument();
    return;
  }

  let finalImgCode = '';
  if (currentMode === 'asciidoc') {
    const widthAttr = width ? `,width=${width}` : '';
    const titleLine = title ? `.${title}\n` : '';
    finalImgCode = `${titleLine}image::${url}[${alt}${widthAttr}]`;
  } else {
    const imgTag = `![${alt}](${url})`;
    const caption = title ? `\n*${title}*` : '';
    finalImgCode = `${imgTag}${caption}`;
  }

  insertAtCursor(`\n${finalImgCode}\n`);
  closeModal('imageModal');
  showToast("Image inserted successfully");
}

function openLinkModal() {
  document.getElementById('linkText').value = 'Visit site';
  document.getElementById('linkUrl').value = 'https://';
  openModal('linkModal');
}

function submitLink() {
  const text = document.getElementById('linkText').value.trim() || 'Link';
  const url = document.getElementById('linkUrl').value.trim() || 'https://';

  if (currentMode === 'asciidoc') {
    insertAtCursor(`${url}[${text}]`);
  } else {
    insertAtCursor(`[${text}](${url})`);
  }
  closeModal('linkModal');
  showToast("Link inserted");
}

function openTableModal() {
  openModal('tableModal');
}

function submitTable() {
  const cols = parseInt(document.getElementById('tblCols').value) || 3;
  const rows = parseInt(document.getElementById('tblRows').value) || 3;
  const title = document.getElementById('tblTitle').value.trim();

  let outputText = "\n";

  if (currentMode === 'asciidoc') {
    if (title) outputText += `.${title}\n`;
    outputText += '[cols="' + Array(cols).fill('1a').join(',') + '", options="header"]\n';
    outputText += "|===\n";
    
    for (let c = 1; c <= cols; c++) {
      outputText += `| Header ${c} `;
    }
    outputText += "\n\n";

    for (let r = 1; r <= rows; r++) {
      for (let c = 1; c <= cols; c++) {
        outputText += `| Row ${r}, Col ${c} `;
      }
      outputText += "\n";
    }
    outputText += "|===\n";
  } else {
    if (title) outputText += `### ${title}\n\n`;
    
    let headerRow = "|";
    let sepRow = "|";
    for (let c = 1; c <= cols; c++) {
      headerRow += ` Column ${c} |`;
      sepRow += " :--- |";
    }
    outputText += headerRow + "\n" + sepRow + "\n";

    for (let r = 1; r <= rows; r++) {
      let rowStr = "|";
      for (let c = 1; c <= cols; c++) {
        rowStr += ` Data ${r}-${c} |`;
      }
      outputText += rowStr + "\n";
    }
    outputText += "\n";
  }

  insertAtCursor(outputText);
  closeModal('tableModal');
  showToast("Table generated");
}

function openAdmonitionModal() {
  document.getElementById('admonitionType').value = 'NOTE';
  document.getElementById('admonitionText').value = '';
  openModal('admonitionModal');
}

function submitAdmonition() {
  const type = document.getElementById('admonitionType').value || 'NOTE';
  const text = document.getElementById('admonitionText').value.trim() || 'Important remark.';
  if (currentMode === 'asciidoc') {
    insertAtCursor(`\n[${type}]\n====\n${text}\n====\n`);
  } else {
    const emojis = { NOTE: 'ℹ️ NOTE', TIP: '💡 TIP', IMPORTANT: '📌 IMPORTANT', WARNING: '⚠️ WARNING', CAUTION: '🛑 CAUTION' };
    insertAtCursor(`\n> **${emojis[type] || type}**:\n> ${text}\n\n`);
  }
  closeModal('admonitionModal');
  showToast("Admonition block inserted");
}

/* Settings Modal Handlers */
function openSettingsModal() {
  const urlInput = document.getElementById('krokiServerUrl');
  if (urlInput) urlInput.value = krokiBaseUrl;
  const forceLightCb = document.getElementById('forcePreviewLightMode');
  if (forceLightCb) forceLightCb.checked = forcePreviewLight;

  const numColorInput = document.getElementById('customColorNumbers');
  if (numColorInput) numColorInput.value = customColorNumbersValue;
  const specialsColorInput = document.getElementById('customColorSpecials');
  if (specialsColorInput) specialsColorInput.value = customColorSpecialsValue;

  syncSettingsThemeToggle();
  openModal('settingsModal');
}

function changeSettingPrintZoom(val) {
  document.documentElement.style.setProperty('--print-zoom', `${val}%`);
  try {
    localStorage.setItem('setting_print_zoom', val);
  } catch(e) {}
  showToast(`Print zoom set to ${val}%`);
}

function toggleForcePreviewLightMode(checked) {
  forcePreviewLight = checked;
  try {
    localStorage.setItem('force_preview_light', checked ? 'true' : 'false');
  } catch(e) {}
  applyForcePreviewLightMode();
  renderDocument();
  showToast(`Force light preview ${checked ? 'enabled' : 'disabled'}`);
}

function applyForcePreviewLightMode() {
  const html = document.documentElement;
  if (forcePreviewLight) {
    html.classList.add('preview-light-active');
  } else {
    html.classList.remove('preview-light-active');
  }
}

function updateCustomNumbersColor(color) {
  customColorNumbersValue = color;
  try {
    localStorage.setItem('custom_color_numbers', color);
  } catch(e) {}
  applyCustomColors();
}

function updateCustomSpecialsColor(color) {
  customColorSpecialsValue = color;
  try {
    localStorage.setItem('custom_color_specials', color);
  } catch(e) {}
  applyCustomColors();
}

function applyCustomColors() {
  document.documentElement.style.setProperty('--custom-color-numbers', customColorNumbersValue);
  document.documentElement.style.setProperty('--custom-color-specials', customColorSpecialsValue);
}

/* Zen / Focus Writing Mode */
var isZenModeActive = false;
var previousViewLayoutBeforeZen = 'both';

function toggleZenMode(forceState) {
  if (typeof forceState === 'boolean') {
    isZenModeActive = forceState;
  } else {
    isZenModeActive = !isZenModeActive;
  }

  const body = document.body;
  const exitBtn = document.getElementById('zenModeExitBtn');

  if (isZenModeActive) {
    previousViewLayoutBeforeZen = currentViewLayout;
    setViewLayout('code');

    body.classList.add('zen-mode');
    if (exitBtn) exitBtn.classList.remove('hidden');

    if (!document.fullscreenElement && typeof document.documentElement.requestFullscreen === 'function') {
      document.documentElement.requestFullscreen().catch(() => {});
    }

    showToast("Zen Mode active (Esc to exit)");
  } else {
    body.classList.remove('zen-mode');
    if (exitBtn) exitBtn.classList.add('hidden');

    if (document.fullscreenElement && typeof document.exitFullscreen === 'function') {
      document.exitFullscreen().catch(() => {});
    }

    setViewLayout(previousViewLayoutBeforeZen);
    showToast("Exited Zen Mode");
  }

  if (cmEditor) {
    setTimeout(() => {
      cmEditor.refresh();
      cmEditor.focus();
    }, 80);
  }
}
