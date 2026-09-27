# GEMINI.md — DocCraft Studio Project Instructions

Welcome to **DocCraft Studio**. This document serves as the foundational architectural and procedural mandate for AI agents and developers working in this repository.

---

## 🏛️ Project Vision & Architecture

**DocCraft Studio** is a 100% offline, local-first personal knowledge management (PKM) tool and technical writing studio supporting both **AsciiDoc (`.adoc`)** and **Markdown (`.md`)**.

### Key Tenets:
1. **100% Offline & Local-First:** All documents, folders, tags, and attachments are persisted in the browser's IndexedDB (`DocCraftDB_v3`). Never introduce external API calls, tracking, telemetry, or runtime CDN dependencies.
2. **Zero-Build Runtime:** The application must remain immediately executable by opening `index.html` in any modern browser.
3. **Single-File Bundling:** Any changes affecting CSS or JS modules in `js/` must remain compatible with `node build.js`, which compiles the app into `dist/index_standalone.html`.
4. **Dual Format Parity:** Any text processing, task tracking, linking, or metadata feature must maintain parity for both **AsciiDoc** and **Markdown**.

### Modular Codebase Organization:
* `index.html`: Main UI shell and layout.
* `css/styles.css`: Core typography, layout, animations, and theme styles.
* `js/state.js`: Global state management and DOM element references.
* `js/db.js`: IndexedDB schema, documents, folders, and attachment transactions.
* `js/editor.js`: CodeMirror 5 configuration, key bindings, image paste handlers, and scroll sync.
* `js/converters.js`: Asciidoctor.js and Marked integration and bidirectional format converters.
* `js/wikilinks.js`: Bidirectional `[[WikiLinks]]` parsing, autocomplete, and backlinks index.
* `js/graph.js`: HTML5 Canvas 60 FPS gravitational physics knowledge graph.
* `js/productivity.js`: Global Task Hub, Daily Notes, and note templates.
* `js/table-editor.js`: Visual spreadsheet table editor and CSV import/export.
* `js/diagrams.js`: Kroki & PlantUML engine, SVG caching, and interactive controls.
* `js/workspace.js`: File tree explorer, recursive drag-and-drop, search, and backup/restore.
* `js/ui.js`: Modals, tabs, theme switches, and notifications.
* `js/app.js`: Application bootstrap and event listener registrations.
* `vendor/`: Bundled vendor libraries (CodeMirror, Asciidoctor, Marked, Tailwind, FontAwesome, JSZip, DOMPurify).

---

## 📋 Mandatory Post-Validation Workflow

Whenever a change or improvement has been integrated **AND** fully tested/verified:

### 1. Significance Evaluation (Prior to Prompting)
Before asking the user, the agent **must evaluate the scope and impact** of the change:
* **Substantive Changes (Warrants a prompt & dedicated commit):**
  * Adding a genuine new feature, tool, or modal.
  * Adding a full new color theme or visual style variant.
  * Fixing a major or user-impacting bug.
  * Meaningful refactoring or data persistence changes.
* **Micro Tweaks & Minor Polish (Do NOT prompt immediately):**
  * Adjusting a button shade, tiny CSS margin, minor typo, or trivial comment.
  * These fall under "general improvements" and should remain uncommitted in the working tree to be batched with the next meaningful commit or release.

### 2. Post-Validation User Prompts
When a change qualifies as **substantive**, the agent **MUST ALWAYS** ask the user:

1. 📖 **Documentation Update:**
   > *"Would you like to document this new feature / update in `UserGuide.md` and/or `README.md`?"*

2. 🚀 **Git Commit & Push:**
   > *"Would you like to stage, commit, and push these changes to Git?"*

*(When Git commit/push is requested, always propose a clear, concise commit message following Conventional Commits, e.g., `feat: ...`, `fix: ...`, `docs: ...`).*

---

## 🛠️ Development & Coding Standards

* **Defensive Coding:** Verify DOM elements exist before attaching listeners or mutating innerHTML.
* **Preserve Offline Assets:** When adding third-party scripts or fonts, place them in `vendor/` and bundle them locally.
* **No Breaking Format Changes:** Ensure existing user notes stored in IndexedDB remain backwards-compatible.
* **Git Operations:**
  * Only stage files modified for the specific task (`git add <file>`).
  * If executing in an environment that overrides `core.sshCommand`, ensure `git -c core.sshCommand=ssh` is used for remote operations (`git push`, `git fetch`).
