<a id="english-version"></a>
# 📖 DocCraft Studio — User Guide (v1.0)

> **Language / Langue :** [English (US)](#english-version) | [Français](#version-française)

**DocCraft Studio** is a 100% offline (*Local-First*) personal knowledge management (**PKM**) and writing environment, engineered for seamless and unified workflows with both **AsciiDoc (`.adoc`)** and **Markdown (`.md`)**.

---

## 📑 Table of Contents
1. [Interface Overview](#1-interface-overview)
2. [Essential Keyboard Shortcuts](#2-essential-keyboard-shortcuts)
3. [Top Navigation Bar Tools & Buttons](#3-top-navigation-bar-tools--buttons)
4. [Note Management & File Tree (Left Sidebar)](#4-note-management--file-tree-left-sidebar)
5. [Writing, WikiLinks & Knowledge Network](#5-writing-wikilinks--knowledge-network)
6. [Tags & Metadata](#6-tags--metadata)
7. [Note Templates](#7-note-templates)
8. [Global Task Hub & Checkboxes](#8-global-task-hub--checkboxes)
9. [Interactive Knowledge Graph](#9-interactive-knowledge-graph)
10. [Zen Mode (Focus Writing)](#10-zen-mode-focus-writing)
11. [PlantUML Diagrams & Visual Tables](#11-plantuml-diagrams--visual-tables)
12. [Visual Themes (Light & Dark)](#12-visual-themes-light--dark)
13. [Backups, Export & 100% Offline Security](#13-backups-export--100-offline-security)

---

## 1. Interface Overview

The application is organized around 3 primary zones:

* **Top Navigation Bar (Navbar):** Quick search, productivity tools (Daily, Tasks, Graph, Zen), layout switcher, and settings.
* **Left Sidebar (Explorer):** Folder and note tree hierarchy (recursive drag-and-drop), tags explorer, pinned notes, recent history, and trash bin.
* **Central Workspace:** Split according to your preferences between the source code editor (CodeMirror) and the real-time rendered preview pane.

---

## 2. Essential Keyboard Shortcuts

| Shortcut (Mac) | Shortcut (Windows / Linux) | Action |
| :--- | :--- | :--- |
| **`Cmd + K`** or **`Cmd + P`** | **`Ctrl + K`** or **`Ctrl + P`** | **Quick Switcher & Command Palette** (Instant global search) |
| **`Cmd + G`** | **`Ctrl + G`** | **Open / Close Knowledge Graph** |
| **`Alt + D`** | **`Alt + D`** | **Daily Note**: Open or create today's daily journal |
| **`F11`** or **`Cmd + Shift + F`**| **`F11`** or **`Ctrl + Shift + F`** | **Zen Mode** (Distraction-free fullscreen with typewriter scrolling) |
| **`Esc`** | **`Esc`** | Exit Zen Mode, close modals, or dismiss search |
| **`Cmd + Alt + 1`** | **`Ctrl + Alt + 1`** | **Split View** (Code editor + Live preview) |
| **`Cmd + Alt + 2`** | **`Ctrl + Alt + 2`** | **Code-Only View** (Full-width editor) |
| **`Cmd + Alt + 3`** | **`Ctrl + Alt + 3`** | **Preview-Only View** (Reading and proofreading) |
| **`Cmd + S`** | **`Ctrl + S`** | Force save (autosave is also continuously active) |
| **`Cmd + F`** | **`Ctrl + F`** | Find and replace in code editor |
| **`Cmd + Z`** / **`Cmd + Shift + Z`** | **`Ctrl + Z`** / **`Ctrl + Y`** | Undo / Redo in editor |
| **`Cmd + B`** | **`Ctrl + B`** | Bold selected text |
| **`Cmd + I`** | **`Ctrl + I`** | Italicize selected text |
| **`[[`** | **`[[`** | **Trigger WikiLink autocompletion** to link another note |

---

## 3. Top Navigation Bar Tools & Buttons

From left to right across the navigation bar:

* **Logo & Title:** Displays the application name and status indicator.
* 🔍 **Search... (`Cmd+K`):** Opens the command palette and full-text search.
* 📅 **Daily (`Alt+D`):** Instantly creates or opens today's daily note in a `Daily/` folder.
* ✅ **Tasks:** Opens the **Global Task Hub** with a badge indicating the number of pending tasks.
* 🌌 **Graph (`Cmd+G`):** Opens the **Interactive Knowledge Graph**.
* 🧘 **Zen (`F11`):** Activates distraction-free focus writing mode.
* ⚙️ **Kroki / Status:** Connection indicator for the local Kroki diagram engine (port 8000 by default).
* 🔄 **View Switcher:**
  * **Split:** Side-by-side view (code + preview).
  * **Code:** Code editor only.
  * **Preview:** Rendered document only.
* 🌓 **Sun / Moon:** Instant toggle between **Light Mode** and **Dark Mode**.
* ⚙️ **Gear Icon (Settings):** Select theme variants (OLED, Sepia, etc.), syntax highlighting, and print zoom scale.

---

## 4. Note Management & File Tree (Left Sidebar)

### Document Creation & Import:
* **`+ .adoc` Button:** Creates an AsciiDoc note with automatic document headers (`:toc: left`, tags, status).
* **`+ .md` Button:** Creates a Markdown note with YAML frontmatter.
* **`+ Folder` Button:** Creates a folder.
* **`Import` Button & Drag-and-Drop:** Imports one or more `.adoc`, `.md`, or `.txt` files from your computer (or drag and drop your files directly from your desktop onto the left sidebar).
* **Template Dropdown:** When creating a note, choose to initialize it with a structured template (*Meeting*, *Project*, *Book Note*, *Weekly Review*, etc.) or start with a blank page.

### Drag-and-Drop Organization:
* **Collapsible Sections (Tags & Recently Opened):** Click on the **Tags** or **Recently Opened** headers in the left sidebar to collapse or expand them, freeing up vertical space for your folder tree. Your preferences are saved automatically.
* Drag a note into a folder to organize it.
* Drag a folder into another folder to create an infinite hierarchy (with built-in circular reference protection).
* Drag an item onto the **Workspace Root** row at the very top to move it back to the root level.

### Note Quick Actions:
* Hover over any note to reveal quick action buttons:
  * 📌 **Pin:** Places the note at the very top in the **Pinned Notes** section.
  * ✏️ **Rename:** Edits the document name.
  * 🗑️ **Delete:** Moves the note to the **Trash Bin** (*Soft Delete*).

### The Trash Bin:
* Located at the bottom of the left sidebar.
* Allows you to **Restore** accidentally deleted notes or **Empty the Trash** permanently.

---

## 5. Writing, WikiLinks & Knowledge Network

### Links Between Notes (`[[WikiLinks]]`):
Connect your ideas just like in Obsidian or Wikipedia:
* Simply type **`[[`** in your text: an autocompletion menu appears with the list of all your existing notes.
* Select the note with the arrow keys or type the first few letters, then press `Enter`.
* Custom alias format supported: `[[NoteName|Display text]]`.
* In the preview pane, clicking a link immediately opens the linked note. If the note does not exist yet, clicking prompts you to create it automatically!

### Backlinks & Mentions Drawer:
* At the bottom of the preview pane, click the **Backlinks** bar.
* **Linked References:** Lists all notes in the workspace that explicitly point to the active note.
* **Unlinked Mentions:** Detects notes that mention the title of your active note in their text without having created a `[[...]]` link yet, with a 1-click button to convert the mention into a link!

---

## 6. Tags & Metadata

### 3 Ways to Add Tags:
1. **In-text (*Inline Hashtags*):** Simply write `#project`, `#meeting/client`, `#urgent`. Hierarchical nested sub-tags with slashes are supported.
2. **In Markdown Frontmatter:**
   ```markdown
   ---
   title: My Note
   tags: [work, sprint]
   status: in-progress
   ---
   ```
3. **In AsciiDoc Attributes:**
   ```asciidoc
   = My Note
   :tags: work, sprint
   :status: in-progress
   ```

### Tag Filtering:
* In the left sidebar, the **Tags** section lists all used tags with the number of associated notes.
* Click on a tag to instantly filter the file tree and display only the relevant notes.

---

## 7. Note Templates

Accessible via the **Template** button on the toolbar or when creating a document:
* **Built-in Core Templates:**
  * 📋 *Meeting Minutes* (Meeting minutes with agenda, participants, and to-do list)
  * 🚀 *Project Brief* (Objectives, integrated PlantUML architecture, milestones)
  * 📖 *Book Note* (Reading notes with quotes and concepts)
  * 🏆 *Weekly Review* (Weekly review and priorities)
* **Protection & Cloning:** Core templates are protected. You can click **`Clone 📋`** on any template to create your own customized duplicate.
* **Dynamic Automatic Variables:** You can insert `{{title}}`, `{{date}}`, `{{time}}`, and `{{author}}` tags into your templates, which will be replaced automatically at insertion time!

---

## 8. Global Task Hub & Checkboxes

### Writing Tasks:
* **In AsciiDoc:** `* [ ] Task to do` or `* [x] Completed task`
* **In Markdown:** `- [ ] Task to do` or `- [x] Completed task`

### Bidirectional Interactivity:
* **In the Live Preview:** Click directly on the checkbox! It checks/unchecks on screen AND **updates the source code in real time in the CodeMirror editor**.
* **In the Global Hub (`Tasks` Button):**
  * Gathers all to-dos scattered across all your notes.
  * `Pending`, `Completed`, and `All` tabs.
  * Checking a task in the Hub checks it directly in its source note.
  * Clicking on the text of a task opens the note and positions the cursor directly on the right line.

---

## 9. Interactive Knowledge Graph

Accessible via **`Cmd + G`** or the **Graph** button:
* **60 FPS Canvas Physics Simulation:** Each note is a celestial body, each WikiLink is gravity.
* **Battery Saver:** The physics calculation stops automatically as soon as the network stabilizes.
* **Proportional Sizing:** Hub notes with the most inbound links appear larger.
* **Global vs. Local View:**
  * *Global:* Visualize your entire universe of notes.
  * *Local:* Isolate only the active note and its direct 1st-degree connections.
* **Filters:** Ability to filter the graph by tag or by folder.
* **Navigation:** Double-click any node to open the note directly (a single click or drag allows you to interact with the physics without leaving the graph).

---

## 10. Zen Mode (Focus Writing)

Accessible via **`F11`** ou **`Cmd + Shift + F`**:
* Conceals the entire interface (sidebar, top navbar, preview pane, footers).
* Leaves a spacious and elegant central text column.
* **Typewriter Scrolling:** The line you are writing stays automatically centered in the middle of your screen, avoiding the need to look at the bottom of the page.
* Press **`Esc`** or click the badge in the upper right corner to instantly return to your usual workspace.

---

## 11. PlantUML Diagrams & Visual Tables

### PlantUML Diagrams:
* Write a `[plantuml]` block in AsciiDoc or a ` ```plantuml ` block in Markdown.
* **Local Container (Default & Recommended):** If a local Kroki container is running (`http://localhost:8000`), the diagram compiles into high-resolution SVG in real time completely offline and with zero data leakage (`docker run -d -p 8000:8000 yuzutech/kroki`).
* **Public Server Option (`https://kroki.io`):** Available in Settings (⚙️). Activating it requires acknowledging a **Security & Privacy Warning Modal** regarding sensitive architecture or credential exposure. To protect your data, this option is **strictly session-only and non-persistent** (automatically resets to Local Container on reload).
* In the absence of a server, an interactive badge lets you edit or collapse the source code.

### Visual Table Editor:
* Click the **Table** icon on the toolbar to open the visual spreadsheet editor.
* Add/delete rows and columns, reorder, and insert the formatted table into your note in 1 click.

---

## 12. Visual Themes (Light & Dark)

Access variants in **Settings (⚙️)**:

### Dark Variants:
1. **Midnight Slate** *(default)*: Deep and subdued slate midnight blue (`#0f172a`).
2. **Pure Black (OLED)**: **Absolute black (`#000000`)** without glare, surgical contrast, and battery savings on OLED / MacBook screens.
3. **Obsidian Charcoal**: Neutral and elegant graphite black (`#0d0f14`).
*All dark themes feature luminous syntax highlighting (soft sky blue headings `#93c5fd`, farewell to illegible dark navy).*

### Light Variants:
1. **Clean Paper** *(default)*: Modern, immaculate, and high-contrast white (`#ffffff`).
2. **Warm Sepia**: **Soft ivory paper (`#faf6ed`) on a warm parchment frame (`#eee5d5`)**, inspired by Kindle and physical book pages. Zero white glare.
3. **Nordic Frost**: Subtle and soothing glacier polar white (`#f7faff`).

---

## 13. Backups, Export & 100% Offline Security

### Complete ZIP Backup (Zero Browser Restrictions):
1. Click **Backup App** in the left sidebar.
2. Choose:
   * **Application Only:** Downloads the complete project source archive.
   * **Application + Workspace Data (Recommended):** Generates a `.zip` file containing the entire application **plus** a `workspace-data/` folder with your JSON database, all your notes in readable format (`.adoc`/`.md`), and your images.
3. The file is generated in memory and **downloads directly to your Downloads folder**, without any annoying security dialogs.

### Universal Restore:
* Click **Restore (.zip / .json)** in the sidebar to instantly restore an entire notebook from a `.json` file or `.zip` archive.

---

*DocCraft Studio — Built to last, designed for focus.*

---

<a id="version-française"></a>
# 📖 DocCraft Studio — Guide de l'Utilisateur (User Guide)

> **Language / Langue :** [English (US)](#english-version) | [Français](#version-française)

**DocCraft Studio** est un environnement d'écriture et de gestion des connaissances personnelles (**PKM — Personal Knowledge Management**) 100 % hors-ligne (*Local-First*), conçu pour travailler de façon fluide et conjointe avec **AsciiDoc (`.adoc`)** et **Markdown (`.md`)**.

---

## 📑 Sommaire
1. [Vue d'ensemble de l'interface](#1-vue-densemble-de-linterface)
2. [Raccourcis Clavier Essentiels](#2-raccourcis-clavier-essentiels)
3. [Boutons et Outils de la Barre Supérieure](#3-boutons-et-outils-de-la-barre-supérieure)
4. [Gestion des Notes & Arborescence (Panneau de Gauche)](#4-gestion-des-notes--arborescence-panneau-de-gauche)
5. [Écriture, WikiLinks & Réseau de Connaissances](#5-écriture-wikilinks--réseau-de-connaissances)
6. [Tags & Métadonnées](#6-tags--métadonnées)
7. [Modèles de Notes (Templates)](#7-modèles-de-notes-templates)
8. [Hub Global des Tâches & Cases à Cocher](#8-hub-global-des-tâches--cases-à-cocher)
9. [Graphe de Connaissances Interactif (Knowledge Graph)](#9-graphe-de-connaissances-interactif-knowledge-graph)
10. [Mode Zen (Focus Writing)](#10-mode-zen-focus-writing)
11. [Diagrammes PlantUML & Tableaux Visuels](#11-diagrammes-plantuml--tableaux-visuels)
12. [Thèmes Visuels (Clairs & Sombres)](#12-thèmes-visuels-clairs--sombres)
13. [Sauvegardes, Export & Sécurité 100% Hors-Ligne](#13-sauvegardes-export--sécurité-100-hors-ligne)

---

## 1. Vue d'ensemble de l'interface

L'application s'articule autour de 3 zones principales :

* **La Barre Supérieure (Navbar) :** Recherche rapide, accès aux outils de productivité (Daily, Tâches, Graphe, Zen), sélecteur de disposition et paramètres.
* **Le Panneau Latéral Gauche (Explorateur) :** Arborescence des dossiers et notes (glisser-déposer récursif), explorateur de tags, notes épinglées, historique récent et corbeille.
* **L'Espace Central de Travail :** Divisé selon tes préférences entre l'éditeur de code source (CodeMirror) et le volet de prévisualisation rendu en temps réel.

---

## 2. Raccourcis Clavier Essentiels

| Raccourci (Mac) | Raccourci (Windows / Linux) | Action |
| :--- | :--- | :--- |
| **`Cmd + K`** ou **`Cmd + P`** | **`Ctrl + K`** ou **`Ctrl + P`** | **Quick Switcher & Palette de Commandes** (Recherche globale instantanée) |
| **`Cmd + G`** | **`Ctrl + G`** | **Ouvrir / Fermer le Graphe de Connaissances** |
| **`Alt + D`** | **`Alt + D`** | **Note du Jour (Daily Note)** : Ouvre ou crée le journal du jour |
| **`F11`** ou **`Cmd + Shift + F`**| **`F11`** ou **`Ctrl + Shift + F`** | **Mode Zen** (Plein écran sans distraction avec défilement machine à écrire) |
| **`Échap` (Esc)** | **`Échap` (Esc)** | Sortir du Mode Zen, fermer les modales ou la recherche |
| **`Cmd + Alt + 1`** | **`Ctrl + Alt + 1`** | **Vue Partagée** (Éditeur de code + Prévisualisation) |
| **`Cmd + Alt + 2`** | **`Ctrl + Alt + 2`** | **Vue Code Seul** (Éditeur plein format) |
| **`Cmd + Alt + 3`** | **`Ctrl + Alt + 3`** | **Vue Prévisualisation Seule** (Lecture et relecture) |
| **`Cmd + S`** | **`Ctrl + S`** | Sauvegarde forcée (l'enregistrement est par ailleurs automatique) |
| **`Cmd + F`** | **`Ctrl + F`** | Rechercher et remplacer dans l'éditeur de code |
| **`Cmd + Z`** / **`Cmd + Shift + Z`** | **`Ctrl + Z`** / **`Ctrl + Y`** | Annuler / Rétablir dans l'éditeur |
| **`Cmd + B`** | **`Ctrl + B`** | Mettre en **gras** la sélection |
| **`Cmd + I`** | **`Ctrl + I`** | Mettre en *italique* la sélection |
| **`[[`** | **`[[`** | **Déclencher l'autocomplétion WikiLink** vers une autre note |

---

## 3. Boutons et Outils de la Barre Supérieure

De gauche à droite dans la barre de navigation :

* **Logo & Titre :** Affiche le nom de l'application et l'icône de statut.
* 🔍 **Search... (`Cmd+K`) :** Ouvre la palette de commande et la recherche plein-texte.
* 📅 **Daily (`Alt+D`) :** Crée ou ouvre immédiatement la note quotidienne du jour dans un dossier `Daily/`.
* ✅ **Tasks :** Ouvre le **Hub Global des Tâches** avec le badge indiquant le nombre de tâches en attente.
* 🌌 **Graph (`Cmd+G`) :** Affiche le **Graphe interactif de connaissances**.
* 🧘 **Zen (`F11`) :** Active le mode d'écriture sans distraction.
* ⚙️ **Kroki / Statut :** Indicateur de connexion au moteur de diagrammes local Kroki (port 8000 par défaut).
* 🔄 **Bascule de Vue :**
  * **Split :** Affichage côte à côte (code + aperçu).
  * **Code :** Éditeur uniquement.
  * **Preview :** Rendu final uniquement.
* 🌓 **Soleil / Lune :** Bascule instantanée entre le **Mode Clair** et le **Mode Sombre**.
* ⚙️ **Roue Crantée (Paramètres) :** Choix des variantes de thèmes (OLED, Sepia, etc.), coloration syntaxique et zoom d'impression.

---

## 4. Gestion des Notes & Arborescence (Panneau de Gauche)

### Création & Importation de documents :
* **Bouton `+ .adoc` :** Crée une note AsciiDoc avec en-têtes automatiques (`:toc: left`, tags, statut).
* **Bouton `+ .md` :** Crée une note Markdown avec frontmatter YAML.
* **Bouton `+ Folder` :** Crée un dossier.
* **Bouton `Import` & Glisser-Déposer :** Importe un ou plusieurs fichiers `.adoc`, `.md` ou `.txt` depuis ton PC (ou glisse-dépose tes fichiers directement depuis ton bureau sur la barre latérale gauche).
* **Menu déroulant Template :** Lors de la création, tu peux choisir d'initialiser ta note avec un modèle structuré (*Meeting*, *Projet*, *Lecture*, *Revue*, etc.) ou une page vierge.

### Organisation par Glisser-Déposer (*Drag & Drop*) :
* **Sections rétractables (Tags & Récemment ouverts) :** Clique sur l'en-tête **Tags** ou **Recently Opened** dans le panneau gauche pour les replier ou les déplier à volonté afin d'optimiser l'espace vertical pour ton arborescence. Tes préférences sont conservées d'une session à l'autre.
* Glisse une note vers un dossier pour l'y ranger.
* Glisse un dossier dans un autre dossier pour créer une hiérarchie infinie (avec protection anti-boucle circulaire intégrée).
* Glisse un élément sur la ligne **Workspace Root** tout en haut pour le replacer à la racine.

### Actions sur une note :
* Survole une note pour faire apparaître ses boutons rapides :
  * 📌 **Épingler :** Place la note tout en haut dans la section **Pinned Notes**.
  * ✏️ **Renommer :** Modifie le nom du fichier.
  * 🗑️ **Supprimer :** Déplace la note dans la **Corbeille** (*Soft Delete*).

### La Corbeille (*Trash Bin*) :
* Située au bas de la barre latérale.
* Permet de **Restaurer** une note par erreur ou de **Vider la corbeille** définitivement.

---

## 5. Écriture, WikiLinks & Réseau de Connaissances

### Liens entre notes (`[[WikiLinks]]`) :
Connecte tes idées comme dans Obsidian ou Wikipédia :
* Tape simplement **`[[`** dans ton texte : un menu d'autocomplétion apparaît avec la liste de toutes tes notes existantes.
* Sélectionne la note avec les flèches ou tape les premières lettres, puis appuie sur `Entrée`.
* Format avec alias personnalisé pris en charge : `[[NomNote|Texte affiché]]`.
* Dans la prévisualisation, cliquer sur un lien ouvre immédiatement la note liée. Si la note n'existe pas encore, un clic te propose de la créer automatiquement !

### Tiroir des Backlinks & Mentions :
* En bas du volet de prévisualisation, clique sur la barre **Backlinks**.
* **Linked References :** Liste toutes les notes du carnet qui pointent explicitement vers la note active.
* **Unlinked Mentions :** Détecte les notes qui citent le titre de ta note active dans leur texte sans avoir encore créé de lien `[[...]]`, avec un bouton pour convertir la mention en lien en 1 clic !

---

## 6. Tags & Métadonnées

### 3 Façons de poser des tags :
1. **Dans le texte (*Inline Hashtags*) :** Écris simplement `#projet`, `#reunion/client`, `#urgent`. Les sous-tags hiérarchiques avec slash sont pris en charge.
2. **En Frontmatter Markdown :**
   ```markdown
   ---
   title: Ma Note
   tags: [travail, sprint]
   status: en-cours
   ---
   ```
3. **En Attributs AsciiDoc :**
   ```asciidoc
   = Ma Note
   :tags: travail, sprint
   :status: en-cours
   ```

### Filtrage par tag :
* Dans la barre de gauche, la section **Tags** liste tous les tags utilisés avec le nombre de notes associées.
* Clique sur un tag pour filtrer instantanément l'arborescence et n'afficher que les notes concernées.

---

## 7. Modèles de Notes (Templates)

Accessible via le bouton **Template** de la barre d'outils ou lors de la création d'un document :
* **Modèles intégrés de base :**
  * 📋 *Meeting Minutes* (Compte-rendu avec ordre du jour, participants et to-do list)
  * 🚀 *Project Brief* (Objectifs, architecture PlantUML intégrée, jalons)
  * 📖 *Book Note* (Fiche de lecture avec citations et concepts)
  * 🏆 *Weekly Review* (Bilan de la semaine et priorités)
* **Protection & Clonage :** Les modèles de base sont protégés. Tu peux cliquer sur **`Clone 📋`** sur n'importe quel modèle pour créer ta propre variante personnalisée.
* **Variables dynamiques automatiques :** Tu peux insérer dans tes modèles les balises `{{title}}`, `{{date}}`, `{{time}}`, et `{{author}}` qui se remplaceront automatiquement au moment de l'insertion !

---

## 8. Hub Global des Tâches & Cases à Cocher

### Écrire des tâches :
* **En AsciiDoc :** `* [ ] Tâche à faire` ou `* [x] Tâche terminée`
* **En Markdown :** `- [ ] Tâche à faire` ou `- [x] Tâche terminée`

### Interactivité bidirectionnelle :
* **Dans la prévisualisation :** Clique directement sur la case à cocher ! Elle se coche/décoche à l'écran ET **met à jour en direct le code source dans l'éditeur CodeMirror**.
* **Dans le Hub Global (Bouton `Tasks`) :**
  * Regroupe l'ensemble des to-dos disséminées dans toutes tes notes.
  * Onglets `Pending`, `Completed`, et `All`.
  * Cocher une tâche dans le Hub la coche directement dans sa note source.
  * Cliquer sur le texte d'une tâche ouvre la note et positionne le curseur directement sur la bonne ligne.

---

## 9. Graphe de Connaissances Interactif (Knowledge Graph)

Accessible via **`Cmd + G`** ou le bouton **Graph** :
* **Simulation physique Canvas 60 FPS :** Chaque note est un astre, chaque WikiLink est une gravité.
* **Économie de batterie :** Le calcul physique s'arrête automatiquement dès que le réseau s'est stabilisé.
* **Taille proportionnelle :** Les notes carrefours ayant le plus de liens entrants apparaissent plus grandes.
* **Vue Globale vs Locale :**
  * *Global :* Visualise l'ensemble de ton univers de notes.
  * *Local :* Isole uniquement la note active et ses connexions directes de 1er degré.
* **Filtres :** Possibilité de filtrer le graphe par tag ou par dossier.
* **Navigation :** Double-clique sur n'importe quel nœud pour ouvrir directement la note (un simple clic ou glisser permet de jouer avec la physique sans quitter le graphe).

---

## 10. Mode Zen (Focus Writing)

Accessible via **`F11`** ou **`Cmd + Shift + F`** :
* Masque l'ensemble de l'interface (barre latérale, barre supérieure, prévisualisation, pieds de page).
* Laisse une colonne de texte centrale spacieuse et élégante.
* **Défilement Machine à Écrire (*Typewriter Scrolling*) :** La ligne que tu écris reste automatiquement centrée au milieu de ton écran, évitant d'avoir à regarder en bas de la page.
* Appuie sur **`Échap`** ou clique sur le badge en haut à droite pour revenir instantanément à ton espace de travail habituel.

---

## 11. Diagrammes PlantUML & Tableaux Visuels

### Diagrammes PlantUML :
* Écris un bloc `[plantuml]` en AsciiDoc ou ` ```plantuml ` en Markdown.
* **Conteneur Local (Recommandé & par défaut) :** Si un conteneur local Kroki tourne (`http://localhost:8000`), le diagramme est converti en SVG haute résolution en temps réel, 100% hors-ligne et en toute confidentialité (`docker run -d -p 8000:8000 yuzutech/kroki`).
* **Option Serveur Public (`https://kroki.io`) :** Disponible dans les Paramètres (⚙️). Son activation requiert la validation d'un **modal d'avertissement de sécurité** sur l'exposition de données sensibles sur Internet. Pour votre sécurité, ce choix est **strictement temporaire (non-persistant)** et repasse automatiquement sur le conteneur local au moindre rechargement de page.
* En l'absence de serveur, un badge interactif te permet d'éditer ou de replier le code source.

### Éditeur Visuel de Tableaux :
* Clique sur l'icône **Table** dans la barre d'outils pour ouvrir l'éditeur visuel sous forme de tableur.
* Ajoute/supprime des lignes et colonnes, réordonne et insère le tableau formaté dans ta note en 1 clic.

---

## 12. Thèmes Visuels (Clairs & Sombres)

Accède aux variantes dans les **Paramètres (⚙️)** :

### Variantes Sombres :
1. **Midnight Slate** *(défaut)* : Ardoise bleu nuit profond et feutré (`#0f172a`).
2. **Pure Black (OLED)** : **Noir absolu (`#000000`)** sans reflets, contraste chirurgical et économie de batterie sur écrans OLED / MacBook.
3. **Obsidian Charcoal** : Noir graphite neutre et élégant (`#0d0f14`).
*Tous les thèmes sombres disposent d'une coloration syntaxique lumineuse (titres en bleu ciel doux `#93c5fd`, adieu le bleu marine illisible).*

### Variantes Claires :
1. **Clean Paper** *(défaut)* : Blanc moderne immaculé et contrasté (`#ffffff`).
2. **Warm Sepia** : **Papier ivoire doux (`#faf6ed`) sur cadre parchemin chaleureux (`#eee5d5`)**, inspiration Kindle et papier de livre physique. Zéro éblouissement blanc.
3. **Nordic Frost** : Blanc polaire glacier subtil et reposant (`#f7faff`).

---

## 13. Sauvegardes, Export & Sécurité 100% Hors-Ligne

### Sauvegarde complète en ZIP (Zéro restriction navigateur) :
1. Clique sur **Backup App** dans la barre latérale gauche.
2. Choisis :
   * **Application Only :** Télécharge l'archive complète des sources du projet.
   * **Application + Workspace Data (Recommandé) :** Génère un fichier `.zip` contenant l'application entière **plus** un dossier `workspace-data/` avec ta base JSON, toutes tes notes au format lisible (`.adoc`/`.md`) et tes images.
3. Le fichier est généré en mémoire et **se télécharge directement dans ton dossier Téléchargements**, sans aucune boîte de dialogue de sécurité pénible.

### Restauration universelle :
* Clique sur **Restore (.zip / .json)** dans la barre latérale pour restaurer instantanément un carnet complet à partir d'un fichier `.json` ou d'une archive `.zip`.

---

*DocCraft Studio — Écrit pour durer, pensé pour la concentration.*
