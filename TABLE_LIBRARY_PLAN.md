# 📊 Plan de Développement : Bibliothèque de Tables & Intégration `x-spreadsheet`

## 🎯 Objectifs du Projet

1. **Bibliothèque de Tables Dédiée :** Gérer des tables de données liées à un document de manière indépendante, avec persistance dans IndexedDB.
2. **Double Moteur d'Édition :**
   * *Moteur 1 (Existant) :* Éditeur visuel DocCraft avec options avancées de mise en forme (largeur de colonnes, alignement, styles Markdown/AsciiDoc).
   * *Moteur 2 (Nouveau) :* Tableur immersif de type Excel/Google Sheets basé sur la bibliothèque open source MIT **`x-spreadsheet`** (focalisé sur la saisie pure, la navigation clavier fluide et le copier-coller de plages).
3. **Détection & Synchronisation Hybride :**
   * Scanner le document actif (`.adoc` ou `.md`) pour importer les tables existantes dans la bibliothèque.
   * Réinsérer ou mettre à jour la syntaxe dans le document actif après modification dans la bibliothèque.
   * Préserver la liberté de retouche manuelle du texte (le parseur identifiera tout tableau modifié ou nouveau lors d'un scan manuel).
4. **100% Offline & Zero-Build :** Respect strict des prérequis de DocCraft Studio (zéro runtime serveur, intégration vendor locale et compatibilité `build.js`).

---

## 🏛️ Architecture & Modèle de Données

### 1. Structure de Stockage IndexedDB (`DocCraftDB_v3`)
Ajout d'un nouvel ObjectStore dédié `tables` (ou sous-champ structuré lié aux documents) :

```typescript
interface DocumentTable {
  id: string;               // UUID ou identifiant unique (ex: "tbl_1696234567_abc")
  docId: string;            // ID du document parent auquel la table est rattachée
  name: string;             // Titre ou étiquette de la table (ex: "Spécifications API")
  data: string[][];         // Matrice bidimensionnelle de cellules (données brutes normalisées)
  formatOptions?: {         // Métadonnées de rendu et colonnes
    hasHeader: boolean;
    colAlignments?: string[]; // 'left' | 'center' | 'right'
    colWidths?: number[];
  };
  spreadsheetData?: any;    // Snapshot natif JSON x-spreadsheet (styles légers, formules basiques si applicables)
  sourceHash?: string;      // Empreinte/hash du bloc texte si la table a été importée du doc
  isInDocument: boolean;    // Indicateur : la table est-elle actuellement insérée dans le texte ?
  createdAt: number;
  updatedAt: number;
}
```

---

## 📅 Phases de Réalisation

### Phase 1 : Intégration Vendor de `x-spreadsheet` (Licence MIT)
* [x] Télécharger les bundles minifiés autonomes de `x-spreadsheet` :
  * `vendor/x-spreadsheet/xspreadsheet.min.js`
  * `vendor/x-spreadsheet/xspreadsheet.min.css`
* [x] Déclarer les fichiers dans `index.html` et vérifier l'absence d'erreurs en mode déconnecté.
* [x] Valider l'intégration dans `build.js` pour garantir l'inlining lors de la génération de `dist/index_standalone.html`.

### Phase 2 : Persistance & CRUD IndexedDB (`js/db.js`)
* [x] Ajouter/mettre à niveau l'ObjectStore `tables` dans `js/db.js` avec index sur `docId`.
* [x] Implémenter les méthodes CRUD :
  * `db.getTablesByDoc(docId)` : Liste toutes les tables rattachées au document actif.
  * `db.saveTable(tableData)` : Enregistre ou met à jour une table.
  * `db.deleteTable(tableId)` : Supprime une table de la bibliothèque.
* [x] Mettre à jour les routines de sauvegarde/restauration ZIP (`workspace.js`) pour inclure les tables rattachées.

### Phase 3 : Parseur & Détecteur de Tables (`js/table-library.js` & `js/table-editor.js`)
* [x] Réutiliser et enrichir les regex existantes pour extraire l'ensemble des tables d'un texte :
  * Tables Markdown : blocs `| ... |` délimités par une ligne de séparation `| --- |`.
  * Tables AsciiDoc : blocs `|===` délimités.
* [x] Associer chaque table détectée à son intervalle de lignes dans CodeMirror (`{ from: { line, ch }, to: { line, ch } }`).
* [x] Fonction de "Scan manuel" :
  * Parcourt le texte du document actif.
  * Compare avec les tables déjà présentes dans l'IndexedDB (via nom ou empreinte textuelle).
  * Génère la liste des tables à importer (nouvelles tables ou versions modifiées manuellement).

### Phase 4 : Interface Utilisateur — Modal "Bibliothèque de Tables"
* [x] Ajouter un bouton d'accès dans la barre d'outils de l'éditeur (icône tableau / classeur).
* [x] Concevoir le modal `modal-table-library` :
  * **En-tête & Actions globales :**
    * Bouton *🔍 Scanner le document* (détecte les tables du texte non encore dans la bibliothèque).
    * Bouton *➕ Nouvelle table vierge*.
    * Bouton *📥 Importer CSV*.
  * **Liste / Galerie des tables du document :**
    * Carte pour chaque table : Titre, dimensions (colonnes × lignes), badge d'état (`Insérée dans le texte` ou `Attachée uniquement`).
    * Actions par table :
      * 📊 **Ouvrir dans le Tableur** (mode `x-spreadsheet`).
      * 🛠️ **Ouvrir dans l'Éditeur Avancé** (moteur existant DocCraft).
      * 📋 **Insérer au curseur** (génère la syntaxe adoc ou md selon le format actif).
      * 🔄 **Mettre à jour dans le document** (si déjà présente, remplace le bloc correspondant).
      * 📤 **Exporter en CSV**.
      * 🗑️ **Supprimer**.

### Phase 5 : Intégration du Moteur Tableur (`x-spreadsheet`)
* [x] Créer le sous-modal d'édition plein écran / centré pour le tableur `x-spreadsheet`.
* [x] Pont bidirectionnel de données :
  * Convertisseur `Matrice 2D (string[][])` ➔ `Format objet x-spreadsheet`.
  * Convertisseur inverse `Format objet x-spreadsheet` ➔ `Matrice 2D (string[][])`.
* [x] Barre d'actions du tableur :
  * Bouton *Enregistrer dans la bibliothèque*.
  * Bouton *Enregistrer & Remplacer dans le document*.
  * Bouton *Fermer / Annuler*.

### Phase 6 : Intégration avec l'Éditeur Existant (`table-editor.js`)
* [x] Permettre à l'éditeur existant d'être alimenté depuis la bibliothèque de tables (passation des données matrice et format).
* [x] Lors de la validation dans l'éditeur existant, offrir l'option de sauvegarder à la fois dans la bibliothèque et dans le document ouvert.

### Phase 7 : Tests, Vérifications & Documentation
* [x] Tests de non-régression sur les deux formats de document :
  * Document AsciiDoc (`.adoc`) avec blocs `|===`.
  * Document Markdown (`.md`) avec blocs pipes `|`.
* [x] Test des cas limites :
  * Cellules contenant des retours à la ligne ou des caractères spéciaux (`|`, `,`, guillemets).
  * Tableaux vides ou très volumineux (100+ lignes).
  * Changement de document actif (filtrage strict par `docId`).
* [x] Validation de l'inlining standalone avec `node build.js`.

---

## 💡 Flux Utilisateur Types

```text
[Document Actif (.md / .adoc)]
          │
          ├── (1) Clic sur "Bibliothèque de Tables"
          ▼
[Modal Bibliothèque de Tables]
   ├── Action A : "Scanner le document" ──> Détecte les tables existantes ──> Importe dans la biblio
   ├── Action B : "Créer table" / "Import CSV" ──> Table stockée en IndexedDB (non insérée)
   └── Pour chaque table :
          ├── Option 1 : "Éditer dans Tableur (x-spreadsheet)" ──> Interface Excel ──> Sauvegarder
          ├── Option 2 : "Éditer dans DocCraft Editor" ──> Options de style ──> Sauvegarder
          └── Option 3 : "Insérer au curseur" / "Mettre à jour dans le texte"
```

---

## 📦 Proposition de Message de Commit (Git)

> *Remarque : Aucune opération Git (`git commit`, `git push`) n'a été exécutée. Ce texte est préparé pour votre usage ultérieur.*

### Titre (Conventional Commits)
```text
feat: add table library with x-spreadsheet editor, multi-row resize and auto-fit
```

### Corps détaillé du message
```text
feat: add table library with x-spreadsheet editor, multi-row resize and auto-fit

- 100% Offline Vendor Integration of x-spreadsheet (MIT):
  - Vendored under vendor/x-spreadsheet/ (CSS, JS, vector icons)
  - Patched with multi-row / multi-column drag resizing (Excel behavior)
  - Patched with resizer boundary double-click listener for instant auto-fit
  - Zero external runtime or CDN dependency; fully compatible with build.js
- IndexedDB Storage Engine Upgrade (DocCraftDB_v3 v4):
  - Introduce new 'tables' ObjectStore with 'docId' secondary index
  - Add asynchronous CRUD methods: dbGetTablesByDoc, dbGetTable, dbSaveTable, dbDeleteTable
  - Implement automatic cascading deletions when parent document is deleted
  - Full persistence support in workspace ZIP & JSON backups and restorations
- Interactive Table Library Modal (tableLibraryModal):
  - Accessible via editor toolbar button (fa-table-cells) and Command Palette (Cmd+K)
  - 'Scan Document' button detects AsciiDoc (|===) and Markdown (|) tables and syncs them
  - Responsive visual cards with table title, dimensions, status badges, and preview grid
  - Independent attached tables support, CSV export, and multiline CSV import engine
  - One-click cursor insertion in active document format (AsciiDoc or Markdown)
- Immersive Excel-style Spreadsheet Editor (spreadsheetModal):
  - Powered by x-spreadsheet with full keyboard navigation and formula engine
  - Multi-row & multi-column drag resizing (resizes all selected rows/cols simultaneously)
  - Dynamic Auto-Fit: computes visual text wrapping and line breaks to adjust row height
  - Quick Dimension Toolbar: presets for Row Height (Auto, 22px, 28px, 38px, custom) and Column Width (Auto, 80px, 120px, 180px, custom)
  - Double-click on row/column separator boundaries to auto-adjust dimensions
  - Direct copy-paste compatibility with external spreadsheet apps (Excel, Calc)
  - Dual save workflow: 'Save in Library' or 'Save & Replace in Doc'
- Contextual Editor Choice (CodeMirror & Preview):
  - Clicking 'Edit' in folded/unfolded code pills or preview opens a dedicated choice modal (Spreadsheet vs Formatter)
  - Preview tables feature direct inline launchers for 1-click access to Spreadsheet or Format mode
  - On-the-fly table extraction: document tables open instantly into x-spreadsheet with auto-registration in IndexedDB
- Seamless Bridge with DocCraft Visual Table Formatter:
  - Universal serialization with fallback values for headless operation
  - Two-way synchronization between text buffer, library store, and visual editors
```

### Commandes Git recommandées pour appliquer ce commit
```bash
git add build.js css/styles.css index.html index_standalone.html dist/index_standalone.html js/app.js js/db.js js/project-assets.js js/quick-switcher.js js/table-editor.js js/table-library.js js/workspace.js vendor/x-spreadsheet/ TABLE_LIBRARY_PLAN.md
git commit -F - << 'EOF'
feat: add table library with x-spreadsheet editor, multi-row resize and auto-fit

- 100% Offline Vendor Integration of x-spreadsheet (MIT):
  - Vendored under vendor/x-spreadsheet/ (CSS, JS, vector icons)
  - Patched with multi-row / multi-column drag resizing (Excel behavior)
  - Patched with resizer boundary double-click listener for instant auto-fit
  - Zero external runtime or CDN dependency; fully compatible with build.js
- IndexedDB Storage Engine Upgrade (DocCraftDB_v3 v4):
  - Introduce new 'tables' ObjectStore with 'docId' secondary index
  - Add asynchronous CRUD methods: dbGetTablesByDoc, dbGetTable, dbSaveTable, dbDeleteTable
  - Implement automatic cascading deletions when parent document is deleted
  - Full persistence support in workspace ZIP & JSON backups and restorations
- Interactive Table Library Modal (tableLibraryModal):
  - Accessible via editor toolbar button (fa-table-cells) and Command Palette (Cmd+K)
  - 'Scan Document' button detects AsciiDoc (|===) and Markdown (|) tables and syncs them
  - Responsive visual cards with table title, dimensions, status badges, and preview grid
  - Independent attached tables support, CSV export, and multiline CSV import engine
  - One-click cursor insertion in active document format (AsciiDoc or Markdown)
- Immersive Excel-style Spreadsheet Editor (spreadsheetModal):
  - Powered by x-spreadsheet with full keyboard navigation and formula engine
  - Multi-row & multi-column drag resizing (resizes all selected rows/cols simultaneously)
  - Dynamic Auto-Fit: computes visual text wrapping and line breaks to adjust row height
  - Quick Dimension Toolbar: presets for Row Height (Auto, 22px, 28px, 38px, custom) and Column Width (Auto, 80px, 120px, 180px, custom)
  - Double-click on row/column separator boundaries to auto-adjust dimensions
  - Direct copy-paste compatibility with external spreadsheet apps (Excel, Calc)
  - Dual save workflow: 'Save in Library' or 'Save & Replace in Doc'
- Contextual Editor Choice (CodeMirror & Preview):
  - Clicking 'Edit' in folded/unfolded code pills or preview opens a dedicated choice modal (Spreadsheet vs Formatter)
  - Preview tables feature direct inline launchers for 1-click access to Spreadsheet or Format mode
  - On-the-fly table extraction: document tables open instantly into x-spreadsheet with auto-registration in IndexedDB
- Seamless Bridge with DocCraft Visual Table Formatter:
  - Universal serialization with fallback values for headless operation
  - Two-way synchronization between text buffer, library store, and visual editors
EOF
```
