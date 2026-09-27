/**
 * DocCraft Studio - Daily Notes, Template Manager & Global Tasks Hub
 */

var activeTasksFilter = 'pending'; // 'pending' | 'completed' | 'all'
var tasksSearchQuery = '';

/* --------------------------------------------------------------------------
 * Templates Dictionary
 * -------------------------------------------------------------------------- */

const NOTE_TEMPLATES = {
  blank: {
    id: 'blank',
    name: 'Blank Note / Standard',
    desc: 'Default clean note with standard frontmatter headers'
  },
  meeting: {
    id: 'meeting',
    name: 'Meeting Minutes',
    desc: 'Date, attendees, agenda, discussion notes, and action items',
    getContent: (title, type, date) => {
      if (type === 'asciidoc') {
        return `= Meeting: ${title}
:toc: left
:toc-title: Table of content
:toclevels: 4
:tags: meeting, work
:status: active
:author: Paul

== 📅 Meeting Overview
* **Date:** ${date}
* **Attendees:** Paul, 
* **Goal / Topic:** ${title}

== 📋 Agenda
. Review past action items
. Current status update
. Open issues & decisions

== 💬 Discussion Notes
* Key points discussed:
  ** Point 1
  ** Point 2

== ✅ Action Items & Tasks
* [ ] Action item 1 (Assigned to: )
* [ ] Action item 2 (Assigned to: )
`;
      } else {
        return `---
title: "Meeting: ${title}"
date: ${date}
tags: [meeting, work]
status: active
author: Paul
---

# Meeting: ${title}

## 📅 Meeting Overview
- **Date:** ${date}
- **Attendees:** Paul, 
- **Goal / Topic:** ${title}

## 📋 Agenda
1. Review past action items
2. Current status update
3. Open issues & decisions

## 💬 Discussion Notes
- Key points discussed:
  - Point 1
  - Point 2

## ✅ Action Items & Tasks
- [ ] Action item 1 (Assigned to: )
- [ ] Action item 2 (Assigned to: )
`;
      }
    }
  },
  project: {
    id: 'project',
    name: 'Project Brief & Roadmap',
    desc: 'Goals, scope, milestones, technical design, and risks',
    getContent: (title, type, date) => {
      if (type === 'asciidoc') {
        return `= Project: ${title}
:toc: left
:toc-title: Table of content
:toclevels: 4
:tags: project, planning
:status: in-progress
:author: Paul

== 🎯 Objectives & Vision
What problem does this project solve? What is the expected outcome?

== 📐 Scope & Deliverables
* Deliverable 1
* Deliverable 2

== 🛠️ Technical Architecture
[plantuml, width=450]
----
@startuml
package "Client" {
  [Web Interface]
}
package "Storage" {
  [IndexedDB]
}
[Web Interface] --> [IndexedDB] : offline store
@enduml
----

== 🚀 Milestones & Key Tasks
* [ ] Phase 1: Planning and setup
* [ ] Phase 2: MVP Implementation
* [ ] Phase 3: Testing & Quality Assurance
* [ ] Phase 4: Production Release
`;
      } else {
        return `---
title: "Project: ${title}"
date: ${date}
tags: [project, planning]
status: in-progress
author: Paul
---

# Project: ${title}

## 🎯 Objectives & Vision
What problem does this project solve? What is the expected outcome?

## 📐 Scope & Deliverables
- Deliverable 1
- Deliverable 2

## 🛠️ Technical Architecture
\`\`\`plantuml
@startuml
package "Client" {
  [Web Interface]
}
package "Storage" {
  [IndexedDB]
}
[Web Interface] --> [IndexedDB] : offline store
@enduml
\`\`\`

## 🚀 Milestones & Key Tasks
- [ ] Phase 1: Planning and setup
- [ ] Phase 2: MVP Implementation
- [ ] Phase 3: Testing & Quality Assurance
- [ ] Phase 4: Production Release
`;
      }
    }
  },
  reading: {
    id: 'reading',
    name: 'Reading / Book Note',
    desc: 'Author, rating, summary, key takeaways, and memorable quotes',
    getContent: (title, type, date) => {
      if (type === 'asciidoc') {
        return `= Book Note: ${title}
:toc: left
:toc-title: Table of content
:toclevels: 4
:tags: reading, book, learning
:status: completed
:author: Paul

== 📖 Overview
* **Author:** 
* **Rating:** ⭐⭐⭐⭐⭐
* **Date Finished:** ${date}

== 💡 Core Idea in 3 Sentences
. Point 1
. Point 2
. Point 3

== 🔑 Key Takeaways & Concepts
* Concept 1: Description
* Concept 2: Description

== 💬 Memorable Quotes
[quote]
____
"Favorite quote from the book."
____
`;
      } else {
        return `---
title: "Book Note: ${title}"
date: ${date}
tags: [reading, book, learning]
status: completed
author: Paul
---

# Book Note: ${title}

## 📖 Overview
- **Author:** 
- **Rating:** ⭐⭐⭐⭐⭐
- **Date Finished:** ${date}

## 💡 Core Idea in 3 Sentences
1. Point 1
2. Point 2
3. Point 3

## 🔑 Key Takeaways & Concepts
- Concept 1: Description
- Concept 2: Description

## 💬 Memorable Quotes
> "Favorite quote from the book."
`;
      }
    }
  },
  weekly_review: {
    id: 'weekly_review',
    name: 'Weekly Review',
    desc: 'Wins, retrospectives, task backlog, and next week focus',
    getContent: (title, type, date) => {
      if (type === 'asciidoc') {
        return `= Weekly Review - ${date}
:toc: left
:toc-title: Table of content
:toclevels: 4
:tags: review, weekly
:status: completed
:author: Paul

== 🏆 Wins & Accomplishments
* What went well this week?
* Major progress achieved

== 🧗 Challenges & Bottlenecks
* What slowed things down?
* How can this be improved next week?

== 🎯 Next Week Top Priorities
* [ ] Priority 1
* [ ] Priority 2
* [ ] Priority 3
`;
      } else {
        return `---
title: "Weekly Review - ${date}"
date: ${date}
tags: [review, weekly]
status: completed
author: Paul
---

# Weekly Review - ${date}

## 🏆 Wins & Accomplishments
- What went well this week?
- Major progress achieved

## 🧗 Challenges & Bottlenecks
- What slowed things down?
- How can this be improved next week?

## 🎯 Next Week Top Priorities
- [ ] Priority 1
- [ ] Priority 2
- [ ] Priority 3
`;
      }
    }
  }
};

/* --------------------------------------------------------------------------
 * Daily Notes Engine (Alt+D)
 * -------------------------------------------------------------------------- */

function getTodayDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

async function openDailyNote() {
  const today = getTodayDateString();
  const docs = await dbGetDocuments();
  const folders = await dbGetFolders();

  // 1. Ensure "Daily" folder exists
  let dailyFolder = folders.find(f => f.name.toLowerCase() === 'daily');
  if (!dailyFolder) {
    const newFolderId = 'folder-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    dailyFolder = {
      id: newFolderId,
      name: 'Daily',
      parentId: null
    };
    await dbSaveFolder(dailyFolder);
  }

  // 2. Check if today's note already exists
  const existingNote = docs.find(d => {
    if (d.isTrash) return false;
    const nameNoExt = d.name.replace(/\.(adoc|md)$/i, '');
    return nameNoExt === today;
  });

  if (existingNote) {
    openDocumentFromWorkspace(existingNote.id);
    expandedFolders.add(dailyFolder.id);
    renderWorkspaceDocList();
    showToast(`Opened today's note: ${existingNote.name}`);
    return;
  }

  // 3. Create today's note using daily template
  const ext = (currentMode === 'asciidoc') ? 'adoc' : 'md';
  const fullName = `${today}.${ext}`;

  let dailyContent = '';
  if (ext === 'adoc') {
    dailyContent = `= Daily Journal - ${today}
:toc: left
:toc-title: Table of content
:toclevels: 4
:tags: daily, journal
:status: active
:author: Paul

== 🎯 Daily Objectives
* [ ] Priority task 1
* [ ] Priority task 2

== 📅 Schedule & Meetings
* 09:00 - 
* 14:00 - 

== 📝 Scratchpad & Thoughts
* 

== 💡 Reflections & Wins
* 
`;
  } else {
    dailyContent = `---
title: "Daily Journal - ${today}"
date: ${today}
tags: [daily, journal]
status: active
author: Paul
---

# Daily Journal - ${today}

## 🎯 Daily Objectives
- [ ] Priority task 1
- [ ] Priority task 2

## 📅 Schedule & Meetings
- 09:00 - 
- 14:00 - 

## 📝 Scratchpad & Thoughts
- 

## 💡 Reflections & Wins
- 
`;
  }

  const newDoc = await createNewDocument(fullName, dailyContent);
  if (newDoc) {
    newDoc.folderId = dailyFolder.id;
    await dbSaveDocument(newDoc);

    expandedFolders.add(dailyFolder.id);
    renderWorkspaceDocList();
    openDocumentFromWorkspace(newDoc.id);
    showToast(`Created Daily Note: ${newDoc.name}`);
  }
}

/* --------------------------------------------------------------------------
 * Template Insert & Custom Template Editor Engine
 * -------------------------------------------------------------------------- */

var currentlyEditingTemplateId = null;

function getUserCustomTemplates() {
  try {
    return JSON.parse(localStorage.getItem('custom_note_templates') || '{}');
  } catch(e) {
    return {};
  }
}

function saveUserCustomTemplates(templatesMap) {
  try {
    localStorage.setItem('custom_note_templates', JSON.stringify(templatesMap));
  } catch(e) {}
}

function getAllAvailableTemplates() {
  const userTemplates = getUserCustomTemplates();
  const merged = {};

  // 1. Add built-in templates (strictly read-only base templates)
  for (const [key, tpl] of Object.entries(NOTE_TEMPLATES)) {
    if (key === 'blank') continue;
    merged[key] = { ...tpl, isBuiltin: true, isCustom: false };
  }

  // 2. Add custom user-created / cloned templates
  for (const [key, tpl] of Object.entries(userTemplates)) {
    merged[key] = { ...tpl, isBuiltin: false, isCustom: true };
  }

  return merged;
}

function getNoteTemplateContent(templateKey, noteTitle, type) {
  if (templateKey === 'blank') return "";
  if (templateKey === 'default') return null;

  const allTpls = getAllAvailableTemplates();
  const tpl = allTpls[templateKey];
  if (!tpl) return null;

  const today = getTodayDateString();
  const d = new Date();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  if (tpl.rawContent) {
    return tpl.rawContent
      .replace(/\{\{title\}\}/g, noteTitle)
      .replace(/\{\{date\}\}/g, today)
      .replace(/\{\{time\}\}/g, time)
      .replace(/\{\{author\}\}/g, 'Paul');
  }

  if (typeof tpl.getContent === 'function') {
    return tpl.getContent(noteTitle, type, today);
  }

  return null;
}

function openInsertTemplateModal() {
  const modal = document.getElementById('insertTemplateModal');
  const container = document.getElementById('templateChoicesList');
  if (!modal || !container) return;

  const allTpls = getAllAvailableTemplates();
  let html = '';

  for (const [key, tpl] of Object.entries(allTpls)) {
    const isBuiltin = !!tpl.isBuiltin;
    const formatBadge = tpl.format === 'asciidoc' ? 'AsciiDoc' : (tpl.format === 'markdown' ? 'Markdown' : 'Auto');

    html += `
      <div class="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-900/30 hover:border-indigo-300 dark:hover:border-indigo-600 transition flex items-center justify-between gap-3 group">
        <div onclick="applyInsertTemplate('${key}')" class="min-w-0 flex-1 cursor-pointer">
          <div class="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 flex items-center gap-2">
            <i class="fa-solid fa-stamp text-indigo-500"></i>
            <span>${escapeHtml(tpl.name)}</span>
            <span class="text-[9px] font-mono font-normal px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">${formatBadge}</span>
            ${isBuiltin ? '<span class="text-[9px] font-medium px-1.5 py-0.2 rounded bg-slate-200/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300">Built-in</span>' : '<span class="text-[9px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">Custom</span>'}
          </div>
          <p class="text-[11px] text-slate-500 dark:text-slate-400 mt-1">${escapeHtml(tpl.desc || '')}</p>
        </div>
        <div class="flex items-center gap-1.5 shrink-0">
          <button onclick="applyInsertTemplate('${key}')" title="Insert into note" class="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold transition shadow-xs cursor-pointer">
            Insert ↵
          </button>
          <button onclick="cloneTemplate('${key}', event)" title="Clone as new custom template" class="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer">
            <i class="fa-regular fa-copy text-[10px]"></i>
            <span>Clone</span>
          </button>
          ${!isBuiltin ? `
            <button onclick="openEditTemplateModal('${key}')" title="Edit custom template" class="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer">
              <i class="fa-solid fa-pen text-xs"></i>
            </button>
            <button onclick="deleteTemplate('${key}', event)" title="Delete custom template" class="p-1.5 text-slate-400 hover:text-rose-500 transition cursor-pointer">
              <i class="fa-regular fa-trash-can text-xs"></i>
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  modal.classList.remove('hidden');
}

function closeInsertTemplateModal() {
  const modal = document.getElementById('insertTemplateModal');
  if (modal) modal.classList.add('hidden');
}

function cloneTemplate(templateKey, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const allTpls = getAllAvailableTemplates();
  const tpl = allTpls[templateKey];
  if (!tpl) return;

  const today = getTodayDateString();
  let content = '';
  if (tpl.rawContent) {
    content = tpl.rawContent;
  } else if (typeof tpl.getContent === 'function') {
    content = tpl.getContent('{{title}}', (currentMode === 'asciidoc' ? 'asciidoc' : 'markdown'), '{{date}}');
  }

  openEditTemplateModal(null, {
    name: `${tpl.name} (Copy)`,
    desc: tpl.desc || '',
    format: tpl.format || 'auto',
    content: content
  });
  
  showToast(`Cloned "${tpl.name}" as new template`);
}

function openEditTemplateModal(templateKey = null, initialData = null) {
  // If attempting to edit a built-in template, redirect to clone!
  if (templateKey && NOTE_TEMPLATES[templateKey]) {
    cloneTemplate(templateKey);
    return;
  }

  currentlyEditingTemplateId = templateKey;

  const modal = document.getElementById('editTemplateModal');
  const titleEl = document.getElementById('editTemplateModalTitle');
  const nameInput = document.getElementById('editTemplateName');
  const descInput = document.getElementById('editTemplateDesc');
  const formatSelect = document.getElementById('editTemplateFormat');
  const contentArea = document.getElementById('editTemplateContent');
  if (!modal || !nameInput || !contentArea) return;

  if (initialData) {
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-copy text-indigo-500 mr-2"></i>Clone Template`;
    nameInput.value = initialData.name || '';
    descInput.value = initialData.desc || '';
    formatSelect.value = initialData.format || 'auto';
    contentArea.value = initialData.content || '';
  } else if (templateKey) {
    const allTpls = getAllAvailableTemplates();
    const tpl = allTpls[templateKey];
    if (tpl) {
      if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-pen-to-square text-indigo-500 mr-2"></i>Edit Custom Template`;
      nameInput.value = tpl.name || '';
      descInput.value = tpl.desc || '';
      formatSelect.value = tpl.format || 'auto';
      contentArea.value = tpl.rawContent || '';
    }
  } else {
    if (titleEl) titleEl.innerHTML = `<i class="fa-solid fa-stamp text-indigo-500 mr-2"></i>Create New Template`;
    nameInput.value = '';
    descInput.value = '';
    formatSelect.value = (currentMode === 'asciidoc') ? 'asciidoc' : 'markdown';
    contentArea.value = (currentMode === 'asciidoc') 
      ? `= {{title}}\n:toc: left\n:tags: tag1, tag2\n:status: active\n:author: {{author}}\n\n== Section 1\n* [ ] Task 1\n`
      : `---\ntitle: "{{title}}"\ndate: {{date}}\ntags: [tag1, tag2]\nstatus: active\nauthor: {{author}}\n---\n\n# {{title}}\n\n## Section 1\n- [ ] Task 1\n`;
  }

  modal.classList.remove('hidden');
  setTimeout(() => {
    nameInput.focus();
  }, 50);
}

function closeEditTemplateModal() {
  const modal = document.getElementById('editTemplateModal');
  if (modal) modal.classList.add('hidden');
  currentlyEditingTemplateId = null;
}

function insertPlaceholderIntoTemplate(placeholder) {
  const textarea = document.getElementById('editTemplateContent');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  textarea.value = text.substring(0, start) + placeholder + text.substring(end);
  textarea.selectionStart = textarea.selectionEnd = start + placeholder.length;
  textarea.focus();
}

function saveEditTemplate() {
  const nameInput = document.getElementById('editTemplateName');
  const descInput = document.getElementById('editTemplateDesc');
  const formatSelect = document.getElementById('editTemplateFormat');
  const contentArea = document.getElementById('editTemplateContent');
  if (!nameInput || !contentArea) return;

  const name = nameInput.value.trim();
  const desc = descInput ? descInput.value.trim() : '';
  const format = formatSelect ? formatSelect.value : 'auto';
  const rawContent = contentArea.value;

  if (!name) {
    showToast("Please enter a template name", false);
    return;
  }
  if (!rawContent.trim()) {
    showToast("Please enter template content", false);
    return;
  }

  const userTemplates = getUserCustomTemplates();
  const templateId = currentlyEditingTemplateId || ('custom-tpl-' + Date.now());

  userTemplates[templateId] = {
    id: templateId,
    name: name,
    desc: desc,
    format: format,
    rawContent: rawContent,
    isCustom: true,
    updatedAt: Date.now()
  };

  saveUserCustomTemplates(userTemplates);
  closeEditTemplateModal();
  openInsertTemplateModal();
  showToast(`Template "${name}" saved!`);
}

function deleteTemplate(templateKey, event) {
  if (event) {
    event.stopPropagation();
    event.preventDefault();
  }

  const userTemplates = getUserCustomTemplates();
  const tpl = userTemplates[templateKey];
  if (!tpl) return;

  if (confirm(`Delete custom template "${tpl.name}" permanently?`)) {
    delete userTemplates[templateKey];
    saveUserCustomTemplates(userTemplates);
    openInsertTemplateModal();
    showToast(`Deleted template "${tpl.name}"`);
  }
}

function applyInsertTemplate(templateKey) {
  const allTpls = getAllAvailableTemplates();
  const tpl = allTpls[templateKey];
  if (!tpl) return;

  const today = getTodayDateString();
  const d = new Date();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  
  const editorLabel = document.getElementById('editorLabel');
  const title = editorLabel ? editorLabel.innerText.replace(/\.(adoc|md)$/i, '') : 'Note';

  let finalContent = '';

  if (tpl.rawContent) {
    finalContent = tpl.rawContent
      .replace(/\{\{title\}\}/g, title)
      .replace(/\{\{date\}\}/g, today)
      .replace(/\{\{time\}\}/g, time)
      .replace(/\{\{author\}\}/g, 'Paul');
  } else if (typeof tpl.getContent === 'function') {
    finalContent = tpl.getContent(title, currentMode, today);
  }

  if (finalContent) {
    insertAtCursor(`\n${finalContent}\n`);
    closeInsertTemplateModal();
    showToast(`Template "${tpl.name}" inserted!`);
  }
}

/* --------------------------------------------------------------------------
 * Global Tasks Hub Engine
 * -------------------------------------------------------------------------- */

/**
 * Parses every task item from document content
 */
function extractTasksFromDocument(doc) {
  if (!doc || !doc.content || doc.isTrash) return [];

  const lines = doc.content.split(/\r?\n/);
  const tasks = [];
  let inCodeBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (doc.type === 'asciidoc') {
      if (line.match(/^----\s*$/) || line.match(/^\.\.\.\.\s*$/) || line.match(/^\[source/i) || line.match(/^\[plantuml/i)) {
        if (line.match(/^----\s*$/) || line.match(/^\.\.\.\.\s*$/)) inCodeBlock = !inCodeBlock;
        continue;
      }
    } else {
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        continue;
      }
    }

    if (inCodeBlock) continue;

    // AsciiDoc task checkbox: * [ ] task or * [x] task or * [X] task
    // Markdown task checkbox: - [ ] task or - [x] task or - [X] task
    const match = line.match(/^(\s*(?:[\*\-]|\d+\.)\s+\[([ xX])\]\s+)(.*)$/);
    if (match) {
      const isCompleted = (match[2].toLowerCase() === 'x');
      const text = match[3].trim();
      tasks.push({
        docId: doc.id,
        docName: doc.name,
        docType: doc.type,
        lineIndex: i,
        rawPrefix: match[1],
        isCompleted: isCompleted,
        text: text
      });
    }
  }

  return tasks;
}

async function getAllWorkspaceTasks() {
  const docs = await dbGetDocuments();
  const allTasks = [];

  for (const doc of docs) {
    if (doc.isTrash) continue;
    const docTasks = extractTasksFromDocument(doc);
    allTasks.push(...docTasks);
  }

  const pending = allTasks.filter(t => !t.isCompleted);
  const completed = allTasks.filter(t => t.isCompleted);

  return { all: allTasks, pending, completed };
}

async function updateGlobalTaskCountBadge() {
  const badge = document.getElementById('tasksPendingCountBadge');
  if (!badge) return;

  const { pending } = await getAllWorkspaceTasks();
  badge.innerText = pending.length;
  if (pending.length > 0) {
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function openTasksHubModal() {
  const modal = document.getElementById('tasksHubModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  tasksSearchQuery = '';
  const searchInput = document.getElementById('tasksHubSearchInput');
  if (searchInput) searchInput.value = '';
  renderTasksHubList();
}

function closeTasksHubModal() {
  const modal = document.getElementById('tasksHubModal');
  if (modal) modal.classList.add('hidden');
}

function setTasksHubFilter(filter) {
  activeTasksFilter = filter;
  const btnPending = document.getElementById('tabTasksPending');
  const btnCompleted = document.getElementById('tabTasksCompleted');
  const btnAll = document.getElementById('tabTasksAll');

  const activeClass = "px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs cursor-pointer";
  const inactiveClass = "px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer";

  if (btnPending) btnPending.className = (filter === 'pending') ? activeClass : inactiveClass;
  if (btnCompleted) btnCompleted.className = (filter === 'completed') ? activeClass : inactiveClass;
  if (btnAll) btnAll.className = (filter === 'all') ? activeClass : inactiveClass;

  renderTasksHubList();
}

function onTasksHubSearch(val) {
  tasksSearchQuery = val.trim().toLowerCase();
  renderTasksHubList();
}

async function renderTasksHubList() {
  const container = document.getElementById('tasksHubListContainer');
  if (!container) return;

  const { all, pending, completed } = await getAllWorkspaceTasks();

  // Update tabs label counters
  const btnPending = document.getElementById('tabTasksPending');
  const btnCompleted = document.getElementById('tabTasksCompleted');
  const btnAll = document.getElementById('tabTasksAll');
  if (btnPending) btnPending.innerText = `Pending (${pending.length})`;
  if (btnCompleted) btnCompleted.innerText = `Completed (${completed.length})`;
  if (btnAll) btnAll.innerText = `All (${all.length})`;

  let list = (activeTasksFilter === 'pending') ? pending : (activeTasksFilter === 'completed' ? completed : all);

  if (tasksSearchQuery) {
    list = list.filter(t => t.text.toLowerCase().includes(tasksSearchQuery) || t.docName.toLowerCase().includes(tasksSearchQuery));
  }

  if (list.length === 0) {
    container.innerHTML = `
      <div class="py-12 text-center text-slate-400 dark:text-slate-500 text-xs">
        <i class="fa-solid fa-list-check text-3xl mb-2 opacity-40 block"></i>
        <p class="font-medium text-sm">No tasks found</p>
        <p class="text-[11px] mt-1">Add tasks in your notes using <code class="bg-slate-100 dark:bg-slate-700 px-1 py-0.5 rounded">- [ ] task</code></p>
      </div>
    `;
    return;
  }

  // Group tasks by note
  const grouped = new Map();
  for (const t of list) {
    if (!grouped.has(t.docId)) {
      grouped.set(t.docId, { docId: t.docId, docName: t.docName, docType: t.docType, tasks: [] });
    }
    grouped.get(t.docId).tasks.push(t);
  }

  let html = '';
  for (const group of grouped.values()) {
    const icon = group.docType === 'asciidoc' ? 'fa-file-lines text-teal-600' : 'fa-brands fa-markdown text-blue-500';

    html += `
      <div class="mb-4 bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-2xs">
        <div onclick="openDocumentFromWorkspace('${group.docId}'); closeTasksHubModal();" 
             class="p-2.5 px-3 bg-slate-100/70 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-200/50 dark:hover:bg-slate-700 transition">
          <div class="flex items-center gap-2 min-w-0">
            <i class="fa-solid ${icon} text-xs"></i>
            <span class="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">${escapeHtml(group.docName)}</span>
          </div>
          <span class="text-[10px] text-slate-400 font-mono">${group.tasks.length} task${group.tasks.length > 1 ? 's' : ''}</span>
        </div>

        <div class="p-2 space-y-1 bg-white dark:bg-slate-800">
          ${group.tasks.map(task => `
            <div class="flex items-start gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/40 transition group">
              <input type="checkbox" 
                     ${task.isCompleted ? 'checked' : ''} 
                     onchange="toggleTaskInSourceDocument('${task.docId}', ${task.lineIndex}, this.checked)"
                     class="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4">
              <div onclick="jumpToTaskInDocument('${task.docId}', ${task.lineIndex})" class="flex-1 min-w-0 cursor-pointer">
                <span class="text-xs ${task.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200 font-medium'} leading-normal">${escapeHtml(task.text)}</span>
              </div>
              <button onclick="jumpToTaskInDocument('${task.docId}', ${task.lineIndex})" title="Jump to line in editor" class="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs transition cursor-pointer p-1">
                <i class="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

async function toggleTaskInSourceDocument(docId, lineIndex, newCheckedState) {
  const doc = await dbGetDocument(docId);
  if (!doc || !doc.content) return;

  const lines = doc.content.split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) return;

  const line = lines[lineIndex];
  const char = newCheckedState ? 'x' : ' ';
  
  // Replace [ ] with [x] or vice versa
  const newLine = line.replace(/(\[)([ xX])(\])/, `$1${char}$3`);
  lines[lineIndex] = newLine;
  doc.content = lines.join('\n');
  doc.updatedAt = Date.now();
  await dbSaveDocument(doc);

  // If this document is currently open in CodeMirror, sync it live in the editor!
  if (currentDocumentId === docId && cmEditor) {
    const lineLen = cmEditor.getLine(lineIndex).length;
    cmEditor.replaceRange(newLine, { line: lineIndex, ch: 0 }, { line: lineIndex, ch: lineLen });
    renderDocument();
  }

  updateGlobalTaskCountBadge();
  renderTasksHubList();
  showToast(newCheckedState ? "Task completed!" : "Task reopened");
}

async function jumpToTaskInDocument(docId, lineIndex) {
  closeTasksHubModal();
  await openDocumentFromWorkspace(docId);
  
  if (cmEditor) {
    setTimeout(() => {
      cmEditor.setSelection({ line: lineIndex, ch: 0 }, { line: lineIndex, ch: cmEditor.getLine(lineIndex).length });
      cmEditor.scrollIntoView({ line: lineIndex, ch: 0 }, 150);
      cmEditor.focus();
    }, 60);
  }
}

/**
 * Transforms checklists in preview pane for both AsciiDoc (* [ ] / * [x]) and Markdown (- [ ] / - [x])
 * into interactive, clickable checkboxes that automatically update the source note in CodeMirror.
 */
function processChecklistsInPreview(container = output) {
  if (!container) return;

  const listItems = container.querySelectorAll('li');
  if (listItems.length === 0) return;

  let taskCounter = 0;

  listItems.forEach(li => {
    // 1. Check if element has an input checkbox (from Asciidoctor [%interactive] or Marked)
    const existingInput = li.querySelector('input[type="checkbox"]');
    if (existingInput) {
      const currentTaskIdx = taskCounter++;
      existingInput.dataset.taskIndex = currentTaskIdx;
      existingInput.removeAttribute('disabled');
      existingInput.className = "task-checkbox mr-2.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4 align-middle shrink-0";
      
      const isChecked = existingInput.hasAttribute('checked') || existingInput.getAttribute('data-item-complete') === '1' || existingInput.checked;
      existingInput.checked = isChecked;

      li.style.listStyleType = 'none';
      const parentUl = li.closest('ul');
      if (parentUl) {
        parentUl.classList.add('checklist');
        parentUl.style.listStyleType = 'none';
      }

      const pElement = li.querySelector('p');
      const textContainer = pElement || li;
      
      if (isChecked) {
        textContainer.classList.add('line-through', 'opacity-70', 'text-slate-500', 'dark:text-slate-400');
      } else {
        textContainer.classList.remove('line-through', 'opacity-70', 'text-slate-500', 'dark:text-slate-400');
      }

      existingInput.onclick = (e) => {
        e.stopPropagation();
      };

      existingInput.onchange = () => {
        const checked = existingInput.checked;
        if (checked) {
          textContainer.classList.add('line-through', 'opacity-70', 'text-slate-500', 'dark:text-slate-400');
          textContainer.classList.remove('text-slate-800', 'dark:text-slate-200');
        } else {
          textContainer.classList.remove('line-through', 'opacity-70', 'text-slate-500', 'dark:text-slate-400');
          textContainer.classList.add('text-slate-800', 'dark:text-slate-200');
        }
        handlePreviewCheckboxToggle(li, checked, currentTaskIdx);
      };
      return;
    }

    // 2. Fallback: AsciiDoc list item handling if Asciidoctor output plain [ ] / [x]
    const targetElement = li.querySelector('p') || li;
    const rawText = targetElement.textContent.trim();

    const boxMatch = rawText.match(/^\[([ \u00A0xX*]|&nbsp;|&#160;)\]\s*(.*)$/s);
    if (!boxMatch) return;

    const currentTaskIdx = taskCounter++;
    li.dataset.checklistProcessed = "true";
    const boxChar = boxMatch[1];
    const isChecked = (boxChar.toLowerCase() === 'x' || boxChar === '*');
    const taskContentText = boxMatch[2];

    const cleanHtml = targetElement.innerHTML.replace(/^(\s*<[^>]+>)*\s*\[(?:[ \u00A0xX*]|&nbsp;|&#160;)\]\s*/i, '');

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = isChecked;
    checkbox.dataset.taskIndex = currentTaskIdx;
    checkbox.className = 'task-checkbox mr-2.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer w-4 h-4 align-middle shrink-0';

    const textSpan = document.createElement('span');
    textSpan.className = isChecked ? 'task-item-text line-through opacity-70 text-slate-500 dark:text-slate-400' : 'task-item-text text-slate-800 dark:text-slate-200';
    textSpan.innerHTML = cleanHtml;

    targetElement.innerHTML = '';
    targetElement.appendChild(checkbox);
    targetElement.appendChild(textSpan);
    targetElement.classList.add('task-item-row', 'flex', 'items-start', 'my-0.5');

    li.style.listStyleType = 'none';
    const parentUl = li.closest('ul');
    if (parentUl) {
      parentUl.classList.add('checklist');
      parentUl.style.listStyleType = 'none';
    }

    checkbox.onclick = (e) => {
      e.stopPropagation();
    };

    checkbox.onchange = () => {
      const checked = checkbox.checked;
      if (checked) {
        textSpan.classList.add('line-through', 'opacity-70', 'text-slate-500', 'dark:text-slate-400');
        textSpan.classList.remove('text-slate-800', 'dark:text-slate-200');
      } else {
        textSpan.classList.remove('line-through', 'opacity-70', 'text-slate-500', 'dark:text-slate-400');
        textSpan.classList.add('text-slate-800', 'dark:text-slate-200');
      }
      handlePreviewCheckboxToggle(li, checked, currentTaskIdx);
    };
  });
}

async function handlePreviewCheckboxToggle(li, isChecked, taskIndex) {
  if (!cmEditor || !currentDocumentId) return;

  const lineCount = cmEditor.lineCount();
  const taskLines = [];
  const taskRegex = /^\s*(?:[\*\-]|\d+\.)\s+\[([ \u00A0xX*])\]/;

  for (let i = 0; i < lineCount; i++) {
    const line = cmEditor.getLine(i);
    if (taskRegex.test(line)) {
      taskLines.push({ lineIndex: i, text: line });
    }
  }

  let targetLineIdx = -1;

  // 1. Precise task index match (guaranteed matching order)
  if (typeof taskIndex === 'number' && taskIndex >= 0 && taskIndex < taskLines.length) {
    targetLineIdx = taskLines[taskIndex].lineIndex;
  }

  // 2. Fallback text search match if index not available
  if (targetLineIdx === -1) {
    const cleanHint = (li.innerText || li.textContent || '').replace(/^\[[ \u00A0xX*]\]\s*/, '').trim();
    for (const t of taskLines) {
      if (cleanHint && t.text.includes(cleanHint.slice(0, 15))) {
        targetLineIdx = t.lineIndex;
        break;
      }
    }
  }

  if (targetLineIdx !== -1) {
    const currentLine = cmEditor.getLine(targetLineIdx);
    const newChar = isChecked ? 'x' : ' ';
    const newLine = currentLine.replace(/(\[)([ \u00A0xX*])(\])/, `$1${newChar}$3`);
    
    // Modify CodeMirror line directly in concordance!
    const lineLen = currentLine.length;
    cmEditor.replaceRange(newLine, { line: targetLineIdx, ch: 0 }, { line: targetLineIdx, ch: lineLen });
    queueSaveToIndexedDB();
    if (typeof updateGlobalTaskCountBadge === 'function') {
      updateGlobalTaskCountBadge();
    }
    showToast(isChecked ? "Task checked in code!" : "Task reopened in code");
  }
}
