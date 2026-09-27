# Personal Note Manager - Development Plan & Backlog
> **Project:** DocCraft Studio / AsciiMarkdownEditor  
> **Status:** ✅ All 6 Phases Completed (Production Ready PKM System)  
> **Last Updated:** September 25, 2026

---

## 📌 Implementation Roadmap & Tracking

- [x] **Phase 0: Backup, Modular Architecture & 100% Offline Local-First Assets**
  - [x] Create safe snapshot of initial codebase (`index_Save_do_not_edit_v3.html`)
  - [x] Verify existing capabilities (Confirmed: Clipboard image paste `Cmd+V` is already fully functional!)
  - [x] Split monolithic `index.html` (8,460+ lines) into clean, maintainable modules:
    - `css/styles.css`: Custom CSS, dark mode rules, typography, layout
    - `js/state.js`: Global variables, DOM element placeholders, theme & zoom state
    - `js/db.js`: IndexedDB engine (`DocCraftDB_v3`), documents, folders, attachments, config
    - `js/converters.js`: Markdown <-> AsciiDoc bidirectional converters
    - `js/diagrams.js`: Kroki & PlantUML engine, SVG caching, visual editor
    - `js/table-editor.js`: Visual spreadsheet table editor, CSV import/export
    - `js/workspace.js`: File & folder tree, drag & drop, selection, backups
    - `js/ui.js`: Modals, toolbars, settings, toast notifications
    - `js/editor.js`: CodeMirror setup, syntax modes, folding, scroll sync, clipboard pasting, find & replace
    - `js/app.js`: Application bootstrapper, DOMContentLoaded initialization, global window assignments
    - `build.js`: Standalone single-file compiler (`node build.js` generates `dist/index_standalone.html`)
  - [x] Download all external dependencies locally into `vendor/` for 100% offline usage:
    - `vendor/tailwind/`: Tailwind CSS engine
    - `vendor/fontawesome/`: FontAwesome 6 CSS & local WOFF2 webfonts (solid, regular, brands)
    - `vendor/codemirror/`: CodeMirror 5 core, fold & search addons, native AsciiDoc & Markdown modes
    - `vendor/marked/`: Marked.js Markdown parser
    - `vendor/asciidoctor/`: Asciidoctor.js browser engine
    - `vendor/dompurify/`: DOMPurify sanitization
    - `vendor/fonts/`: Local Inter & Fira Code WOFF2 fonts and `fonts.css`
  - [x] Validate 100% feature parity and 100% offline asset availability (24/24 assets verified)

- [x] **Phase 1: Quick Switcher & Global Full-Text Search (`Cmd+K`)**
  - [x] Global command palette modal triggered by `Cmd+K` / `Ctrl+K` and `Cmd+P` / `Ctrl+P` (plus dedicated search button in header)
  - [x] Full-text search across all IndexedDB documents (titles & markdown/asciidoc content) with relevance scoring and highlight snippets
  - [x] Full keyboard navigation (Arrow up/down, Enter to jump/open, Esc to close) with auto-scroll into view
  - [x] Quick actions inside palette (Create new note, Switch syntax mode, Convert document, Toggle theme, Export HTML, Download, Settings, Clear)
  - [x] On-the-fly note creation: typing a new note name and pressing Enter instantly creates and opens the note
  - [x] **3-Way View Layout Toggle:** Segmented switcher in top navbar allowing instant switching between:
    - `Split` (Code + Live Preview) — `Cmd+Alt+1`
    - `Code Only` (100% full-width editor) — `Cmd+Alt+2`
    - `Preview Only` (100% full-width reading mode) — `Cmd+Alt+3`
    - Saved automatically in `localStorage` with smooth CodeMirror refresh

- [x] **Phase 2: WikiLinks (`[[Note Title]]`), Backlinks & Interactive Navigation**
  - [x] Autocomplete dropdown inside CodeMirror when typing `[[` with keyboard selection and instant note creation
  - [x] Interactive clickable WikiLinks in Preview pane: automatically turns `[[Note]]` and `[[Note|Alias]]` into navigation links with auto-create prompt if missing
  - [x] Editor navigation: `Cmd+Click` (and `Ctrl+Click`) on any `[[Note Title]]` directly inside CodeMirror jumps to the note
  - [x] Dedicated Backlinks & Mentions collapsible drawer with live count badge:
    - *Linked References*: lists all documents explicitly linking to the active note with surrounding context snippets
    - *Unlinked Mentions*: detects plain text mentions of the note's title and provides a 1-click "Link 🔗" button to transform them into `[[WikiLinks]]`
  - [x] **Workspace UX & Tree Overhaul:**
    - Modal-based creation: 3 buttons (`+ .adoc`, `+ .md`, `+ Folder`) opening a clean modal for title and hierarchical folder placement
    - Infinite folder depth: Removed 2-level cap; folders now support arbitrary recursive nesting
    - Drag & drop for folders: Folders can now be dragged into other folders or to Root, with circular ancestor loop detection

- [x] **Phase 3: Tag System (`#tag`), Frontmatter & Pinned Notes**
  - [x] Real-time hashtag indexing (`#tag` and `#tag/subtag`) across all workspace notes
  - [x] Sidebar "Tags" section with dynamic count badges for one-click tag filtering
  - [x] Interactive tag pills in Preview pane: clicking any `#tag` filters notes by that tag
  - [x] Starred / Pinned notes section: star icon on note rows, pinned notes fixed at top of workspace tree
  - [x] Frontmatter / Metadata inspector: parses YAML frontmatter and AsciiDoc attributes into a styled metadata card
  - [x] Soft delete / Trash bin: deleted notes safely moved to Trash with full restore and purge capabilities

- [x] **Phase 4: Daily Routine & Productivity (Daily Notes & To-Do Hub)**
  - [x] Daily Notes shortcut (`Alt+D` and header button) auto-jumping to or creating `Daily/YYYY-MM-DD` with structured journal log template
  - [x] Note Template Manager: Insert templates on-the-fly (Meeting Minutes, Project Brief, Book/Reading Note, Weekly Review)
  - [x] Global Task Hub modal: Aggregates all pending & completed `- [ ]` and `* [ ]` checkboxes across all workspace notes with live filter tabs and search
  - [x] Bidirectional live task toggling: Checking off tasks in the Hub automatically updates the source document in IndexedDB and in CodeMirror if open
  - [x] Direct navigation from Task Hub: Clicking any task jumps to the exact line in the note

- [x] **Phase 5: Interactive Knowledge Graph View**
  - [x] Interactive 100% offline Canvas force-directed graph view (`js/graph.js`) with zero external CDN dependencies
  - [x] Dynamic node sizing based on inDegree link hubs; edge connections representing `[[WikiLinks]]`
  - [x] Global Graph vs Local Graph toggle (centered on active note and its 1-hop connected neighbors)
  - [x] Interactive physics: drag-and-drop nodes, wheel zoom & pan, hover tooltips, and click-to-open note navigation
  - [x] Live filter by tags and folders with real-time graph re-clustering
  - [x] Accessible via top navbar button, Quick Switcher (`Cmd+K`), and universal keyboard shortcut `Cmd+G` / `Ctrl+G`

- [x] **Phase 6: Advanced Portability & Zen Mode**
  - [x] Full Workspace ZIP Archive Export & Import (`.zip` / `.json`) preserving full recursive folder hierarchy, note documents, and pictures
  - [x] Frictionless in-memory ZIP restore using JSZip without browser security restrictions
  - [x] Zen / Focus Writing Mode: Fullscreen distraction-free editor with centered writing column, hidden toolbars, and typewriter scrolling (`F11` / `Cmd+Shift+F`)
  - [x] Smooth exit via floating badge or `Escape` key returning to previous layout

---

## 📝 Change Log & Session Notes
- **2026-09-25:**
  - Verified clipboard image pasting: Confirmed already present in `index.html` (handled via `cmEditor.on('paste')` and `window.addEventListener('paste')`).
  - Created safety backup `index_Save_do_not_edit_v3.html`.
  - Initialized `DevPlan.md` to track architectural modularization and feature rollout.
  - Phase 0: Monolith refactored into 9 clean ES modules, CSS stylesheet and single-file bundler `build.js`.
  - 100% Offline: Downloaded all CDN libraries locally into `vendor/` (Tailwind, FontAwesome 6 + WOFF2 webfonts, CodeMirror 5 + native AsciiDoc mode, Marked, Asciidoctor, DOMPurify, local fonts).
  - Phase 1: Quick Switcher & Command Palette (`Cmd+K` / `Ctrl+K`), full-text search with highlight snippets and keyboard navigation.
  - 3-Way View Layout Switcher (Split / Code / Preview) with `Cmd+Alt+1/2/3` shortcuts and localStorage persistence.
  - Resolved WikiLinks in AsciiDoc: Preprocessed `[[...]]` with passthrough tokens `pass:[<span class="wikilink-node">]` to prevent Asciidoctor from swallowing them as empty anchor tags.
  - Fixed `file://` protocol security origin warning in `exportApplicationBackup()`.
  - Cleaned up obsolete symbol exports (`setNewDocType`) in `app.js` and verified 100% of 130 exported window bindings.
  - Revamped "Backup App": Added JSZip offline engine and dedicated modal (`#appBackupModal`) with choice between Application Only (full project ZIP) and Application + Data (project ZIP plus `workspace-data/` folder with JSON database, note files and pictures).
  - Frictionless ZIP Download: Integrated embedded project asset catalog (`js/project-assets.js`) enabling 100% in-memory ZIP creation and instant direct download to the Downloads folder without file:// security restrictions or directory selection dialogs.
  - Automatic Note Headers: Pre-filled standard YAML frontmatter for Markdown notes and AsciiDoc attributes (`:toc: left`, `:toc-title: Table of content`, `:toclevels: 4`, `:tags:`, `:status:`, `:author:`) for all newly created documents.
  - Custom Template Creator, Editor & Universal Cloner: Built-in templates are protected and read-only. Added universal cloning (`Clone 📋`) on any template to generate customized copies (`{{title}}`, `{{date}}`, `{{time}}`, `{{author}}`), custom template editor and deletion.
  - Interactive AsciiDoc & Markdown Checklists: Real-time DOM transformation of `* [ ]` / `* [x]` (AsciiDoc) and `- [ ]` / `- [x]` (Markdown) into interactive checkboxes with live bidirectional synchronization between preview clicks and CodeMirror source code.
  - AsciiDoc Checklist Preprocessor: Auto-injects `[%interactive]` directive above AsciiDoc checklists during compilation, enabling native checkbox outputs with custom CSS to replace bullet discs with interactive checkboxes.
  - Deterministic Preview Checklist Sync: Sequential task index mapping directly updates the exact CodeMirror source line (`* [ ]` ⇄ `* [x]`) upon clicking any checkbox in the preview.
  - Creation Modal Template Picker: Added template dropdown selector to the New Note modal (`#createItemModal`) allowing instant initialization with Meeting, Project, Reading, Weekly Review, or custom templates.
  - Resolved Template Instantiation: Exported `getNoteTemplateContent` to global scope, ensuring template selection properly overrides default headers when creating new documents.
  - Fixed CodeMirror Checklist Sync: Replaced nonexistent `cmEditor.setLine` with CodeMirror's standard `cmEditor.replaceRange`, enabling live bidirectional updating of checkboxes between preview and source code without errors.
  - Enhanced Dark Mode Syntax Highlighting & Styles: Restyled low-contrast blue tokens with radiant light blue (`#93c5fd`), cyan, purple, and emerald. Added 3 dark mode background flavors in Settings Modal (`Midnight Slate`, `Pure OLED Black`, `Obsidian Charcoal`) with instant live preview and persistence.
  - Fixed Sidebar Tag Pills in Dark Mode: Corrected invalid Tailwind class `slate-750` to `dark:bg-slate-800` with radiant `dark:text-indigo-300`, completely eliminating the unreadable white background on gray text.
  - Comprehensive Theme Flavors (3 Dark + 3 Light): Extended theme customization beyond code editor to unify preview pane, sidebar, and headers. In Settings Modal, users can choose between 3 Dark styles (`Midnight Slate`, `Pure OLED Black`, `Obsidian Charcoal`) or 3 Light styles (`Clean Paper`, `Warm Sepia` with luminous ivory paper sheet `#faf6ed` spanning all code gutters and preview, `Nordic Frost` cool glacier) with zero white leakage.
  - Fixed Markdown Table Trailing Empty Column Bug: Resolved parser issue in `splitTableCells` where lines ending with `|` produced an extraneous empty cell at the end of each row, preventing redundant columns from multiplying on every save/re-open.
