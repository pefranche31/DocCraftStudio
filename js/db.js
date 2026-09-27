/**
 * DocCraft Studio - IndexedDB Storage Engine (DocCraftDB_v3)
 * Persistent document, folder, and attachment database
 */

var dbInstance = null;

function initDB() {
  return new Promise((resolve, reject) => {
    // Use 'DocCraftDB_v3' to bypass any locked sessions or version mismatches
    const request = indexedDB.open('DocCraftDB_v3', 3);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      const oldVersion = e.oldVersion;

      if (oldVersion < 1) {
        db.createObjectStore('documents', { keyPath: 'id' });
        const attachmentStore = db.createObjectStore('attachments', { keyPath: 'id' });
        attachmentStore.createIndex('documentId', 'documentId', { unique: false });
      }
      if (oldVersion < 2) {
        if (!db.objectStoreNames.contains('folders')) {
          db.createObjectStore('folders', { keyPath: 'id' });
        }
      }
      if (oldVersion < 3) {
        if (!db.objectStoreNames.contains('config')) {
          db.createObjectStore('config', { keyPath: 'key' });
        }
      }
    };

    request.onsuccess = (e) => {
      dbInstance = e.target.result;
      resolve(dbInstance);
    };

    request.onerror = (e) => {
      console.error("Failed to open IndexedDB DocCraftDB_v3:", e.target.error);
      reject(e.target.error);
    };
  });
}

function dbGetDocuments() {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve([]);
    const tx = dbInstance.transaction('documents', 'readonly');
    const store = tx.objectStore('documents');
    const request = store.getAll();
    request.onsuccess = () => {
      const docs = request.result || [];
      docs.sort((a, b) => b.updatedAt - a.updatedAt);
      resolve(docs);
    };
    request.onerror = () => reject(request.error);
  });
}

function dbGetDocument(id) {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve(null);
    const tx = dbInstance.transaction('documents', 'readonly');
    const store = tx.objectStore('documents');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function dbSaveDocument(docObj) {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve();
    const tx = dbInstance.transaction('documents', 'readwrite');
    const store = tx.objectStore('documents');
    const request = store.put(docObj);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function dbDeleteDocument(id) {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve();
    const tx = dbInstance.transaction(['documents', 'attachments'], 'readwrite');
    const docStore = tx.objectStore('documents');
    const attachStore = tx.objectStore('attachments');
    
    docStore.delete(id);
    
    // Delete attachments too
    const index = attachStore.index('documentId');
    const request = index.openCursor(IDBKeyRange.only(id));
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) {
        attachStore.delete(cursor.primaryKey);
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

function dbGetFolders() {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve([]);
    const tx = dbInstance.transaction('folders', 'readonly');
    const store = tx.objectStore('folders');
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function dbGetFolder(id) {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve(null);
    const tx = dbInstance.transaction('folders', 'readonly');
    const store = tx.objectStore('folders');
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function dbSaveFolder(folderObj) {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve();
    const tx = dbInstance.transaction('folders', 'readwrite');
    const store = tx.objectStore('folders');
    const request = store.put(folderObj);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function cascadeDeleteFolder(folderId) {
  const folders = await dbGetFolders();
  const subFolders = folders.filter(f => f.parentId === folderId);
  
  for (const sf of subFolders) {
    await cascadeDeleteFolder(sf.id);
  }
  
  const docs = await dbGetDocuments();
  const folderDocs = docs.filter(d => d.folderId === folderId);
  
  for (const docObj of folderDocs) {
    await dbDeleteDocument(docObj.id);
  }
  
  const tx = dbInstance.transaction('folders', 'readwrite');
  const store = tx.objectStore('folders');
  await new Promise((resolve) => {
    const req = store.delete(folderId);
    req.onsuccess = () => resolve();
  });
}

function dbGetAttachments(docId) {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve([]);
    const tx = dbInstance.transaction('attachments', 'readonly');
    const store = tx.objectStore('attachments');
    const index = store.index('documentId');
    const request = index.getAll(IDBKeyRange.only(docId));
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function dbSaveAttachment(attachObj) {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve();
    const tx = dbInstance.transaction('attachments', 'readwrite');
    const store = tx.objectStore('attachments');
    const request = store.put(attachObj);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function dbDeleteAttachment(id) {
  return new Promise((resolve, reject) => {
    if (!dbInstance) return resolve();
    const tx = dbInstance.transaction('attachments', 'readwrite');
    const store = tx.objectStore('attachments');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function processImageFileForAttachment(file, suggestedName = null) {
  if (!currentDocumentId) {
    showToast("Please open a document first before attaching pictures", false);
    return null;
  }

  let filename = suggestedName || file.name;
  if (!filename || filename === 'image.png') {
    const userInput = prompt("Please enter a name for the pasted picture (without extension):", `Picture_${Date.now()}`);
    if (!userInput) return null; // Cancelled
    filename = userInput.trim() + (file.type === 'image/jpeg' ? '.jpg' : '.png');
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target.result;
      const attachmentObj = {
        id: 'attach-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        documentId: currentDocumentId,
        filename: filename,
        mimeType: file.type,
        dataUrl: dataUrl,
        createdAt: Date.now()
      };
      await dbSaveAttachment(attachmentObj);
      showToast(`Attached picture: ${filename}`);
      resolve(attachmentObj);
    };
    reader.onerror = () => reject(new Error("File read failed"));
    reader.readAsDataURL(file);
  });
}

function updateSaveStatus(status, text) {
  const badge = document.getElementById('saveStatusBadge');
  const label = document.getElementById('saveStatusText');
  const icon = document.getElementById('saveStatusIcon');
  if (!badge || !label || !icon) return;

  label.innerText = text;
  if (status === 'saving') {
    icon.className = 'fa-solid fa-spinner fa-spin text-indigo-500';
    badge.className = 'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-sans border border-indigo-200 dark:border-indigo-800';
  } else if (status === 'synced') {
    icon.className = 'fa-solid fa-cloud-arrow-up text-emerald-500';
    badge.className = 'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-sans border border-emerald-200 dark:border-emerald-800';
  } else if (status === 'error') {
    icon.className = 'fa-solid fa-cloud-exclamation text-red-500';
    badge.className = 'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-sans border border-red-200 dark:border-red-800';
  } else {
    icon.className = 'fa-solid fa-cloud text-slate-400';
    badge.className = 'inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-sans border border-slate-200 dark:border-slate-700';
  }
}

function queueSaveToIndexedDB() {
  if (!currentDocumentId) return;
  updateSaveStatus('saving', 'Saving...');

  clearTimeout(dbSaveDebounceTimer);
  dbSaveDebounceTimer = setTimeout(saveCurrentDocument, 300);
}

async function saveCurrentDocument() {
  if (!currentDocumentId) return;
  const content = getEditorValue();
  const doc = await dbGetDocument(currentDocumentId);
  if (!doc) return;

  doc.content = content;
  doc.updatedAt = Date.now();
  await dbSaveDocument(doc);
  updateSaveStatus('synced', 'Saved');
}

function getDefaultNewDocContent(finalName, type) {
  const title = finalName.replace(/\.(adoc|md)$/i, '');
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  if (type === 'asciidoc') {
    return `= ${title}
:toc: left
:toc-title: Table of content
:toclevels: 4
:tags: tag1, tag2
:status: draft
:author: Paul

== Introduction

`;
  } else {
    return `---
title: ${title}
date: ${today}
tags: [tag1, tag2]
status: draft
author: Paul
---

# ${title}

`;
  }
}

async function createNewDocument(name, content = "") {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  const ext = trimmedName.split('.').pop().toLowerCase();
  const type = (ext === 'md' || ext === 'markdown') ? 'markdown' : 'asciidoc';
  const finalName = (ext === 'md' || ext === 'adoc') ? trimmedName : `${trimmedName}.adoc`;

  const finalContent = (content !== "" && content !== null && content !== undefined)
    ? content
    : getDefaultNewDocContent(finalName, type);

  const newId = 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  const docObj = {
    id: newId,
    name: finalName,
    content: finalContent,
    type: type,
    updatedAt: Date.now(),
    folderId: null
  };

  await dbSaveDocument(docObj);
  return docObj;
}
