<div align="center">

# 📖 DocCraft Studio

**A vibe-coded, 100% offline, local-first personal knowledge management (PKM) and documentation studio for AsciiDoc and Markdown.**

[![Status](https://img.shields.io/badge/status-active-success.svg)](#)
[![Vibe Coded](https://img.shields.io/badge/vibe--coded-100%25-ff69b4.svg)](#-vibe-coding-philosophy)
[![Offline First](https://img.shields.io/badge/architecture-local--first-blue.svg)](#-key-features)
[![Formats](https://img.shields.io/badge/formats-AsciiDoc%20%7C%20Markdown-orange.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[Features](#-key-features) • [Quick Start](#-quick-start) • [Shortcuts](#-essential-shortcuts) • [Architecture](#-architecture) • [User Guide](UserGuide.md)

---

</div>

## 💡 Overview

**DocCraft Studio** is a privacy-first, local-first Personal Knowledge Management (**PKM**) tool and technical writing studio. Built to unite the expressive power of **AsciiDoc (`.adoc`)** and the ubiquity of **Markdown (`.md`)**, it offers a distraction-free environment that runs entirely in your browser with zero remote dependencies, zero tracking, and instant responsiveness.

DocCraft Studio was built and refined through **vibe coding**—a collaborative human-AI software engineering journey focused on flow, craftsmanship, and developer happiness.

---

## ✨ Key Features

### 📄 AsciiDoc & Markdown Side-by-Side
* Seamlessly create, edit, and organize both `.adoc` and `.md` notes in the same workspace.
* Real-time dual-pane live preview with synchronized split, editor-only, or preview-only modes.
* Full support for AsciiDoc attributes, tables, callouts, and Markdown frontmatter.

### 🌐 Bi-directional WikiLinks & Knowledge Graph
* **Obsidian-style `[[WikiLinks]]`**: Instant auto-completion popup as soon as you type `[[`. Supports aliases (`[[Target Note|Custom Label]]`).
* **Backlinks Drawer**: Discover incoming linked references and automatically convert unlinked mentions with a single click.
* **Interactive 60 FPS Knowledge Graph (`Cmd+G`)**: Canvas-based gravitational physics simulation with node clustering, degree-based node sizing, tag/folder filtering, and local sub-graph views.

### 🔒 100% Offline & Local-First
* **Zero cloud, zero telemetry**: All notes, folders, and assets live safely in your browser's IndexedDB storage.
* Works completely without an Internet connection (all vendor assets, fonts, and scripts are locally bundled).
* **One-Click Backups**: Export your entire vault as a clean `.zip` archive containing raw `.adoc`/`.md` files or a structured JSON snapshot.

### ✅ Two-Way Interactive Task Hub
* Interactive checklist items (`- [ ]` in Markdown, `* [ ]` in AsciiDoc).
* **Live bi-directional sync**: Clicking a checkbox in the preview pane updates the raw source document in the editor in real time!
* **Global Task Hub**: Centralized dashboard aggregating pending and completed tasks across all workspace notes.

### 🧘 Zen Mode (Distraction-Free Writing)
* Fullscreen writing sanctuary (`F11` or `Cmd+Shift+F`) hiding all chrome, menus, and sidebars.
* Built-in **typewriter scrolling** keeping your active cursor line centered on screen.

### 📊 Diagrams & Visual Table Editor
* **PlantUML / Kroki**: Live diagram generation from fenced blocks using a local Kroki engine (`http://localhost:8000`).
* **Visual Spreadsheet Table Editor**: Create and format tabular data visually and insert markdown/AsciiDoc tables in one click.

### 🎨 Carefully Crafted Themes
* **Dark Variants**: *Midnight Slate* (default deep blue-slate), *Pure Black (OLED)* (high contrast zero-battery-drain `#000000`), and *Obsidian Charcoal*.
* **Light Variants**: *Clean Paper* (crisp white), *Warm Sepia* (Kindle-style ivory paper `#faf6ed` with reduced eye strain), and *Nordic Frost*.

---

## 🚀 Quick Start

DocCraft Studio requires **no backend server** and **no complex toolchain**.

### Method 1: Instant Browser Launch
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/DocCraft.git
   cd DocCraft
   ```
2. Open `index.html` directly in your favorite modern browser (Chrome, Firefox, Safari, Edge):
   ```bash
   # On macOS
   open index.html

   # On Linux
   xdg-open index.html

   # Or serve via any local static server
   npx serve .
   # or
   python3 -m http.server 8080
   ```

### Method 2: Single-File Standalone Bundle
You can build a self-contained, standalone single-file distribution where HTML, CSS, and all JavaScript modules are bundled together:

```bash
node build.js
```
The resulting file is saved to `dist/index_standalone.html`. You can carry it on a USB drive or store it anywhere—it runs 100% standalone!

### Optional: Local Kroki Diagram Engine
To render PlantUML and diagram blocks locally without internet access:
```bash
docker run -d -p 8000:8000 yuzutech/kroki
```

---

## ⌨️ Essential Shortcuts

| Shortcut (macOS) | Shortcut (Win / Linux) | Action |
| :--- | :--- | :--- |
| **`Cmd + K`** / **`Cmd + P`** | **`Ctrl + K`** / **`Ctrl + P`** | **Quick Switcher & Command Palette** |
| **`Cmd + G`** | **`Ctrl + G`** | **Knowledge Graph Explorer** |
| **`Alt + D`** | **`Alt + D`** | **Daily Note** (Open or create today's journal) |
| **`F11`** / **`Cmd + Shift + F`** | **`F11`** / **`Ctrl + Shift + F`** | **Zen Mode** (Typewriter focus) |
| **`Cmd + Alt + 1`** | **`Ctrl + Alt + 1`** | **Split View** (Editor + Live Preview) |
| **`Cmd + Alt + 2`** | **`Ctrl + Alt + 2`** | **Editor-Only View** |
| **`Cmd + Alt + 3`** | **`Ctrl + Alt + 3`** | **Preview-Only View** |
| **`[[`** | **`[[`** | **Trigger WikiLink autocomplete** |
| **`Esc`** | **`Esc`** | Exit Zen Mode, close search, dismiss modal |

---

## 🏗️ Architecture

DocCraft Studio is deliberately crafted with high modularity and zero build-step overhead for daily use:

```
DocCraft/
├── index.html            # Main application UI layout
├── css/
│   └── styles.css        # Core custom stylesheets & theme palettes
├── js/
│   ├── app.js            # App bootstrap & event wiring
│   ├── state.js          # Reactive application state store
│   ├── db.js             # IndexedDB persistence layer
│   ├── editor.js         # CodeMirror 5 integration & keymaps
│   ├── converters.js     # Asciidoctor.js & Marked converters
│   ├── wikilinks.js      # Bi-directional link parser & backlinks index
│   ├── graph.js          # 60 FPS HTML5 Canvas physics engine
│   ├── productivity.js   # Task Hub, Daily notes, and templates
│   ├── quick-switcher.js # Fuzzy search modal & command palette
│   ├── table-editor.js   # Visual table grid editor
│   ├── diagrams.js       # Kroki / PlantUML integration
│   ├── ui.js             # Modals, tabs, theme switches, and notifications
│   └── workspace.js      # Tree navigation, drag-and-drop & soft delete
├── vendor/               # Bundled vendor dependencies (100% offline)
├── build.js              # Bundler compiling everything into a single HTML file
└── UserGuide.md          # Comprehensive user manual (English & French)
```

---

## 🔮 Vibe Coding Philosophy

This project was developed with a **vibe coding** mindset:
* Rapid iterative feedback loops between human intuition and generative AI.
* Focusing on direct user delight, snappy responsiveness, and clean tactile aesthetics.
* Prioritizing robust local-first privacy over unnecessary cloud infrastructure.
* Zero build friction: if it runs directly in a browser without waiting for a bundler, you're in the flow.

---

## 📖 Documentation

For in-depth tutorials on templates, frontmatter metadata, hierarchical tag systems, circular folder protections, and backup workflows, check out the complete **[User Guide (UserGuide.md)](UserGuide.md)** (available in English and French).

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
