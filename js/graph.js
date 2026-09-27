/**
 * DocCraft Studio - Interactive Knowledge Graph View
 * 100% offline HTML5 Canvas force-directed graph simulation
 */

var graphCanvas = null;
var graphCtx = null;
var graphAnimationId = null;

var graphNodes = [];
var graphLinks = [];
var graphFilteredNodes = [];
var graphFilteredLinks = [];

// Simulation physics state
var graphAlpha = 1.0;
var graphTransform = { x: 0, y: 0, k: 1 };
var isGraphPanning = false;
var graphPanStart = { x: 0, y: 0 };
var draggedGraphNode = null;
var hoveredGraphNode = null;

// Controls & Filter state
var graphViewMode = 'global'; // 'global' | 'local'
var graphFilterTag = 'all';
var graphFilterFolder = 'all';

/* --------------------------------------------------------------------------
 * Graph Data Builder
 * -------------------------------------------------------------------------- */

async function buildGraphDataset() {
  const docs = await dbGetDocuments();
  const folders = await dbGetFolders();
  const nonTrashDocs = docs.filter(d => !d.isTrash);

  // Map of title -> doc
  const docMap = new Map();
  const nodesMap = new Map();

  nonTrashDocs.forEach(d => {
    const title = d.name.replace(/\.(adoc|md)$/i, '').toLowerCase();
    docMap.set(title, d);
    docMap.set(d.name.toLowerCase(), d);

    // Extract tags
    const tags = [];
    const tagMatches = d.content ? d.content.matchAll(/(?:^|\s)#([a-zA-Z0-9_\-\/]+)/g) : [];
    for (const m of tagMatches) {
      if (!tags.includes(m[1].toLowerCase())) tags.push(m[1].toLowerCase());
    }

    const node = {
      id: d.id,
      name: d.name,
      title: d.name.replace(/\.(adoc|md)$/i, ''),
      type: d.type,
      folderId: d.folderId,
      tags: tags,
      isActive: (currentDocumentId === d.id),
      inDegree: 0,
      outDegree: 0,
      x: (Math.random() - 0.5) * 500,
      y: (Math.random() - 0.5) * 500,
      vx: 0,
      vy: 0,
      radius: 7
    };
    nodesMap.set(d.id, node);
  });

  const links = [];

  // Parse WikiLinks in every document
  for (const doc of nonTrashDocs) {
    if (!doc.content) continue;
    const sourceNode = nodesMap.get(doc.id);
    if (!sourceNode) continue;

    const matches = doc.content.matchAll(/\[\[(.*?)\]\]/g);
    for (const match of matches) {
      const rawTarget = match[1].trim();
      const parts = rawTarget.split('|');
      const targetTitle = parts[0].trim().toLowerCase();

      const targetDoc = docMap.get(targetTitle) || docMap.get(`${targetTitle}.adoc`) || docMap.get(`${targetTitle}.md`);
      if (targetDoc && targetDoc.id !== doc.id) {
        const targetNode = nodesMap.get(targetDoc.id);
        if (targetNode) {
          // Avoid duplicate links
          const exists = links.some(l => 
            (l.source.id === sourceNode.id && l.target.id === targetNode.id) ||
            (l.source.id === targetNode.id && l.target.id === sourceNode.id)
          );
          if (!exists) {
            links.push({ source: sourceNode, target: targetNode });
            sourceNode.outDegree++;
            targetNode.inDegree++;
          }
        }
      }
    }
  }

  // Calculate radius based on inDegree (hub sizing)
  for (const node of nodesMap.values()) {
    node.radius = Math.min(24, Math.max(6, 6 + (node.inDegree + node.outDegree) * 2.2));
  }

  graphNodes = Array.from(nodesMap.values());
  graphLinks = links;

  applyGraphFilters();
}

function applyGraphFilters() {
  let visibleNodes = [...graphNodes];

  // 1. Local Graph mode: only current note + 1-hop connected neighbors
  if (graphViewMode === 'local' && currentDocumentId) {
    const neighborIds = new Set();
    neighborIds.add(currentDocumentId);

    graphLinks.forEach(l => {
      if (l.source.id === currentDocumentId) neighborIds.add(l.target.id);
      if (l.target.id === currentDocumentId) neighborIds.add(l.source.id);
    });

    visibleNodes = visibleNodes.filter(n => neighborIds.has(n.id));
  }

  // 2. Tag filter
  if (graphFilterTag !== 'all') {
    visibleNodes = visibleNodes.filter(n => n.tags.includes(graphFilterTag.toLowerCase()));
  }

  // 3. Folder filter
  if (graphFilterFolder !== 'all') {
    visibleNodes = visibleNodes.filter(n => n.folderId === graphFilterFolder);
  }

  const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
  const visibleLinks = graphLinks.filter(l => visibleNodeIds.has(l.source.id) && visibleNodeIds.has(l.target.id));

  graphFilteredNodes = visibleNodes;
  graphFilteredLinks = visibleLinks;

  // Restart physics cooling
  graphAlpha = 1.0;
}

/* --------------------------------------------------------------------------
 * Physics Engine (Force Simulation)
 * -------------------------------------------------------------------------- */

function tickGraphSimulation() {
  if (graphAlpha < 0.005) return; // Simulation settled to sleep (0 CPU usage)

  const nodes = graphFilteredNodes;
  const links = graphFilteredLinks;
  const count = nodes.length;

  const repulseStrength = 320;
  const springLength = 80;
  const springStrength = 0.04;
  const centerStrength = 0.015;

  // 1. Repulsion between nodes (Coulomb)
  for (let i = 0; i < count; i++) {
    const na = nodes[i];
    for (let j = i + 1; j < count; j++) {
      const nb = nodes[j];
      const dx = nb.x - na.x;
      const dy = nb.y - na.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) dist = 0.1;

      if (dist < 400) {
        const force = (repulseStrength / (dist * dist)) * graphAlpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;

        if (na !== draggedGraphNode) {
          na.vx -= fx;
          na.vy -= fy;
        }
        if (nb !== draggedGraphNode) {
          nb.vx += fx;
          nb.vy += fy;
        }
      }
    }
  }

  // 2. Spring attraction along links (Hooke)
  for (const l of links) {
    const source = l.source;
    const target = l.target;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) dist = 0.1;

    const displacement = dist - springLength;
    const force = displacement * springStrength * graphAlpha;
    const fx = (dx / dist) * force;
    const fy = (dy / dist) * force;

    if (source !== draggedGraphNode) {
      source.vx += fx;
      source.vy += fy;
    }
    if (target !== draggedGraphNode) {
      target.vx -= fx;
      target.vy -= fy;
    }
  }

  // 3. Centering force & update velocities
  for (let i = 0; i < count; i++) {
    const n = nodes[i];
    if (n === draggedGraphNode) continue;

    n.vx -= n.x * centerStrength * graphAlpha;
    n.vy -= n.y * centerStrength * graphAlpha;

    // Velocity friction
    n.vx *= 0.85;
    n.vy *= 0.85;

    n.x += n.vx;
    n.y += n.vy;
  }

  graphAlpha *= 0.985; // Cool down
}

/* --------------------------------------------------------------------------
 * Canvas Rendering
 * -------------------------------------------------------------------------- */

function renderGraphCanvas() {
  if (!graphCanvas || !graphCtx) return;

  tickGraphSimulation();

  const width = graphCanvas.width;
  const height = graphCanvas.height;
  const ctx = graphCtx;

  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Apply pan & zoom transform
  ctx.translate(width / 2 + graphTransform.x, height / 2 + graphTransform.y);
  ctx.scale(graphTransform.k, graphTransform.k);

  const isDark = document.documentElement.classList.contains('dark');
  const linkColor = isDark ? 'rgba(148, 163, 184, 0.22)' : 'rgba(100, 116, 139, 0.28)';
  const linkHighlightColor = isDark ? 'rgba(129, 140, 248, 0.85)' : 'rgba(79, 70, 229, 0.85)';
  const textColor = isDark ? '#cbd5e1' : '#334155';

  // 1. Draw Links
  for (const l of graphFilteredLinks) {
    const isHighlighted = hoveredGraphNode && (l.source.id === hoveredGraphNode.id || l.target.id === hoveredGraphNode.id);

    ctx.beginPath();
    ctx.moveTo(l.source.x, l.source.y);
    ctx.lineTo(l.target.x, l.target.y);
    ctx.strokeStyle = isHighlighted ? linkHighlightColor : linkColor;
    ctx.lineWidth = isHighlighted ? 2.5 : 1.2;
    ctx.stroke();
  }

  // 2. Draw Nodes
  for (const n of graphFilteredNodes) {
    const isHovered = (hoveredGraphNode && hoveredGraphNode.id === n.id);
    const isConnected = hoveredGraphNode && graphFilteredLinks.some(l => 
      (l.source.id === hoveredGraphNode.id && l.target.id === n.id) ||
      (l.target.id === hoveredGraphNode.id && l.source.id === n.id)
    );

    ctx.beginPath();
    ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);

    if (n.isActive) {
      ctx.fillStyle = '#f59e0b'; // Amber for currently open active note
    } else if (n.type === 'asciidoc') {
      ctx.fillStyle = isDark ? '#2dd4bf' : '#0d9488'; // Teal
    } else {
      ctx.fillStyle = isDark ? '#60a5fa' : '#3b82f6'; // Blue for Markdown
    }

    ctx.fill();

    // Node outer border / halo
    if (n.isActive || isHovered || isConnected) {
      ctx.lineWidth = isHovered ? 3.5 : 2;
      ctx.strokeStyle = isHovered ? '#ffffff' : (n.isActive ? '#fbbf24' : 'rgba(99, 102, 241, 0.7)');
      ctx.stroke();
    }

    // 3. Draw Labels (if node is large enough or zoomed in or hovered)
    if (graphTransform.k > 0.8 || isHovered || isConnected || n.isActive || n.radius >= 11) {
      ctx.font = `${isHovered ? 'bold ' : ''}${Math.max(10, Math.min(13, 11 / graphTransform.k))}px Inter, sans-serif`;
      ctx.fillStyle = isHovered ? (isDark ? '#ffffff' : '#000000') : textColor;
      ctx.textAlign = 'center';
      ctx.fillText(n.title, n.x, n.y + n.radius + 13);
    }
  }

  ctx.restore();

  // Draw floating node tooltip if hovering
  if (hoveredGraphNode) {
    drawHoverTooltip(ctx, hoveredGraphNode, width, height);
  }

  graphAnimationId = requestAnimationFrame(renderGraphCanvas);
}

function drawHoverTooltip(ctx, node, width, height) {
  // Convert node coordinates to screen space
  const screenX = node.x * graphTransform.k + width / 2 + graphTransform.x;
  const screenY = node.y * graphTransform.k + height / 2 + graphTransform.y;

  const title = node.title;
  const info = `${node.type.toUpperCase()} • ${node.inDegree + node.outDegree} links`;
  
  ctx.save();
  ctx.font = 'bold 12px Inter, sans-serif';
  const textWidth = Math.max(ctx.measureText(title).width, ctx.measureText(info).width);
  const boxWidth = textWidth + 24;
  const boxHeight = 44;
  const boxX = Math.min(width - boxWidth - 10, Math.max(10, screenX - boxWidth / 2));
  const boxY = Math.max(10, screenY - node.radius * graphTransform.k - boxHeight - 8);

  // Background card
  ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
  ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 8);
  ctx.fill();
  ctx.stroke();

  // Tooltip Text
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.fillText(title, boxX + 12, boxY + 18);

  ctx.font = '10px Inter, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(info, boxX + 12, boxY + 34);

  ctx.restore();
}

/* --------------------------------------------------------------------------
 * Mouse & Gesture Interactivity
 * -------------------------------------------------------------------------- */

function initGraphCanvasListeners() {
  if (!graphCanvas) return;

  function getNodeAtScreenPos(clientX, clientY) {
    const rect = graphCanvas.getBoundingClientRect();
    const x = (clientX - rect.left - graphCanvas.width / 2 - graphTransform.x) / graphTransform.k;
    const y = (clientY - rect.top - graphCanvas.height / 2 - graphTransform.y) / graphTransform.k;

    for (let i = graphFilteredNodes.length - 1; i >= 0; i--) {
      const n = graphFilteredNodes[i];
      const dx = n.x - x;
      const dy = n.y - y;
      if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) {
        return n;
      }
    }
    return null;
  }

  graphCanvas.onmousedown = (e) => {
    const targetNode = getNodeAtScreenPos(e.clientX, e.clientY);
    if (targetNode) {
      draggedGraphNode = targetNode;
      graphAlpha = 0.5; // Awaken simulation
    } else {
      isGraphPanning = true;
      graphPanStart = { x: e.clientX - graphTransform.x, y: e.clientY - graphTransform.y };
    }
  };

  graphCanvas.onmousemove = (e) => {
    if (draggedGraphNode) {
      const rect = graphCanvas.getBoundingClientRect();
      draggedGraphNode.x = (e.clientX - rect.left - graphCanvas.width / 2 - graphTransform.x) / graphTransform.k;
      draggedGraphNode.y = (e.clientY - rect.top - graphCanvas.height / 2 - graphTransform.y) / graphTransform.k;
      draggedGraphNode.vx = 0;
      draggedGraphNode.vy = 0;
      graphAlpha = Math.max(graphAlpha, 0.3);
    } else if (isGraphPanning) {
      graphTransform.x = e.clientX - graphPanStart.x;
      graphTransform.y = e.clientY - graphPanStart.y;
    } else {
      const node = getNodeAtScreenPos(e.clientX, e.clientY);
      if (node !== hoveredGraphNode) {
        hoveredGraphNode = node;
        graphCanvas.style.cursor = node ? 'pointer' : 'default';
      }
    }
  };

  window.onmouseup = () => {
    draggedGraphNode = null;
    isGraphPanning = false;
  };

  // Single click: focus node and awaken physics (allows playing with graph without leaving)
  graphCanvas.onclick = (e) => {
    const node = getNodeAtScreenPos(e.clientX, e.clientY);
    if (node) {
      hoveredGraphNode = node;
      graphAlpha = Math.max(graphAlpha, 0.4);
    }
  };

  // Double click: open note document in workspace
  graphCanvas.ondblclick = (e) => {
    const node = getNodeAtScreenPos(e.clientX, e.clientY);
    if (node) {
      closeKnowledgeGraphModal();
      openDocumentFromWorkspace(node.id);
      showToast(`Navigated to: ${node.name}`);
    }
  };

  // Zoom with wheel
  graphCanvas.onwheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newK = Math.min(3.5, Math.max(0.2, graphTransform.k * zoomFactor));
    graphTransform.k = newK;
  };
}

/* --------------------------------------------------------------------------
 * Modal Controls & Lifecycle
 * -------------------------------------------------------------------------- */

async function openKnowledgeGraphModal() {
  const modal = document.getElementById('knowledgeGraphModal');
  const canvas = document.getElementById('knowledgeGraphCanvas');
  if (!modal || !canvas) return;

  modal.classList.remove('hidden');

  graphCanvas = canvas;
  graphCtx = canvas.getContext('2d');

  // Resize canvas to modal dimensions
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  // Reset transform
  graphTransform = { x: 0, y: 0, k: 1 };
  hoveredGraphNode = null;
  draggedGraphNode = null;

  initGraphCanvasListeners();
  populateGraphFilterDropdowns();

  await buildGraphDataset();

  if (graphAnimationId) cancelAnimationFrame(graphAnimationId);
  renderGraphCanvas();
}

function closeKnowledgeGraphModal() {
  const modal = document.getElementById('knowledgeGraphModal');
  if (modal) modal.classList.add('hidden');

  if (graphAnimationId) {
    cancelAnimationFrame(graphAnimationId);
    graphAnimationId = null;
  }
}

function setGraphViewMode(mode) {
  graphViewMode = mode;
  const btnGlobal = document.getElementById('btnGraphModeGlobal');
  const btnLocal = document.getElementById('btnGraphModeLocal');

  const activeClass = "px-3 py-1 rounded-lg text-xs font-bold bg-indigo-600 text-white shadow-xs cursor-pointer";
  const inactiveClass = "px-3 py-1 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer";

  if (btnGlobal) btnGlobal.className = (mode === 'global') ? activeClass : inactiveClass;
  if (btnLocal) btnLocal.className = (mode === 'local') ? activeClass : inactiveClass;

  applyGraphFilters();
}

async function populateGraphFilterDropdowns() {
  const tagSelect = document.getElementById('graphFilterTag');
  const folderSelect = document.getElementById('graphFilterFolder');
  if (!tagSelect || !folderSelect) return;

  // 1. Tags
  const allTags = new Set();
  const docs = await dbGetDocuments();
  docs.filter(d => !d.isTrash).forEach(d => {
    if (d.content) {
      const matches = d.content.matchAll(/(?:^|\s)#([a-zA-Z0-9_\-\/]+)/g);
      for (const m of matches) allTags.add(m[1].toLowerCase());
    }
  });

  tagSelect.innerHTML = `<option value="all">All Tags (${allTags.size})</option>` +
    Array.from(allTags).sort().map(t => `<option value="${escapeHtml(t)}">#${escapeHtml(t)}</option>`).join('');

  // 2. Folders
  const folders = await dbGetFolders();
  folderSelect.innerHTML = `<option value="all">All Folders (${folders.length})</option>` +
    folders.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('');
}

function onGraphTagFilterChange(val) {
  graphFilterTag = val;
  applyGraphFilters();
}

function onGraphFolderFilterChange(val) {
  graphFilterFolder = val;
  applyGraphFilters();
}

function resetGraphView() {
  graphTransform = { x: 0, y: 0, k: 1 };
  graphAlpha = 1.0;
}
