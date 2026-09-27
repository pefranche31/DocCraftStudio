/**
 * DocCraft Studio - Global Application State
 */

// State variables
var currentMode = 'asciidoc'; // 'asciidoc' | 'markdown'
var asciidoctorEngine = null;
var renderDebounceTimer = null;
var previewSyncMode = 'live'; // 'live' | '10s' | 'paused'
var desktopSidebarVisible = true;
var currentViewLayout = 'both'; // 'both' | 'code' | 'preview'
var tableEditorExpandedWidth = false;
var tableEditorXLCells = false;
var cmEditor = null; // CodeMirror instance
var pumlEditor = null; // CodeMirror instance for PlantUML modal editor
var activeFoldMarks = new Map(); // key -> CodeMirror TextMarker
var activePictureFoldMarks = new Map(); // key -> CodeMirror TextMarker (folded images)
var imageReplaceTargetLine = null; // Line index currently being replaced/edited
var activePictureUnfoldWidgets = []; // List of bookmarks for unfolded image "Fold" pills
var manuallyUnfoldedPictures = new Set(); // Set of line numbers manually unfolded by the user
var activeUnfoldWidgets = []; // List of bookmarks for unfolded "Unfold" pills
var activeTableWidgets = []; // List of bookmarks for table "Edit ✎" pills
var activeTableFoldMarks = new Map(); // key -> CodeMirror TextMarker (folded tables)
var activeTableUnfoldWidgets = []; // List of bookmarks for unfolded table "Fold" pills
var manuallyUnfoldedTables = new Set(); // Set of line numbers manually unfolded by the user

// Active Table Editing state
var currentEditingTable = null; // stores table block data & coordinates
var currentEditingPumlBlock = null; // stores PlantUML block coordinates being edited
var focusedCellInput = null; // currently focused input in modal
var tableEditorUndoStack = []; // Custom table editor undo states
var tableEditorRedoStack = []; // Custom table editor redo states
var maxHistoryDepth = 50; // History stack limit

// Column resizing state variables
var isResizingCol = false;
var resizeTargetColIdx = -1;
var resizeStartX = 0;
var resizeStartWidths = [];

// Scroll synchronization lock
var isSyncScrolling = false;

// PlantUML modal zoom and pan variables
var pumlZoomScale = 1.0;
var pumlPanX = 0;
var pumlPanY = 0;
var isPanningPuml = false;
var panStartX = 0;
var panStartY = 0;

// Kroki state
var krokiBaseUrl = 'http://localhost:8000';
var forcePreviewLight = false;
var diagramSvgCache = new Map(); // Caches SVG responses by diagram text

// Custom Code Coloring state
var customColorNumbersValue = '#d97706';
var customColorSpecialsValue = '#059669';

// Local Persistence State (IndexedDB)
var currentDocumentId = null;
var dbSaveDebounceTimer = null;
var isInitialLoading = true;
var expandedFolders = new Set(); // Stores expanded folder IDs
var selectedWorkspaceNode = { type: 'root', id: null }; // Current selected node in tree
var newDocFormat = 'asciidoc'; // Format of the document to be created

// Image Modal tab state
var activeImageTab = 'web';
var selectedAttachmentFilename = null;

try {
  const savedKroki = localStorage.getItem('kroki_url');
  if (savedKroki) krokiBaseUrl = savedKroki.replace(/\/+$/, '');
} catch(e) {}

try {
  forcePreviewLight = localStorage.getItem('force_preview_light') === 'true';
} catch(e) {}

try {
  const savedNumColor = localStorage.getItem('custom_color_numbers');
  if (savedNumColor) customColorNumbersValue = savedNumColor;
  const savedSpecColor = localStorage.getItem('custom_color_specials');
  if (savedSpecColor) customColorSpecialsValue = savedSpecColor;
} catch(e) {}

// DOM Element placeholders initialized on DOMContentLoaded
var editor = null;
var output = null;
var wordCount = null;
var charCount = null;
var renderBadge = null;
var modeBadge = null;
var editorLabel = null;
var syntaxStatusLabel = null;

var pendingConvertedContent = '';

function initStateDomElements() {
  editor = document.getElementById('rawEditor');
  output = document.getElementById('renderOutput');
  wordCount = document.getElementById('wordCount');
  charCount = document.getElementById('charCount');
  renderBadge = document.getElementById('renderTimeBadge');
  modeBadge = document.getElementById('modeBadge');
  editorLabel = document.getElementById('editorLabel');
  syntaxStatusLabel = document.getElementById('syntaxStatusLabel');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
