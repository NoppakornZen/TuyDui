const state = { activeView: 'overview', zoom: 100, panX: 0, panY: 0, nodes: 0, connectMode: false, connectSource: null, dragging: null, panning: null, edges: [['root', 'design'], ['root', 'frontend'], ['root', 'backend'], ['root', 'growth']].map(([from, to], id) => ({ id, from, to })) };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const nodeProfiles = {
  root: { kicker: 'PROJECT', title: 'NN Website', status: 'Baseline V1', avatar: 'Z', avatarClass: 'green', owner: 'Zen · Backend' },
  design: { kicker: 'WORK AREA', title: 'Design system', status: 'On track', avatar: 'A', avatarClass: '', owner: 'Arm · Design' },
  frontend: { kicker: 'WORK AREA', title: 'Frontend experience', status: '1 impacted', avatar: 'P', avatarClass: 'blue', owner: 'Pee · Frontend' },
  backend: { kicker: 'WORK AREA', title: 'Backend platform', status: '1 open change', avatar: 'Z', avatarClass: 'green', owner: 'Zen · Backend' },
  growth: { kicker: 'WORK AREA', title: 'Launch & growth', status: 'On track', avatar: 'N', avatarClass: 'rose', owner: 'Nan · Growth' }
};
const workspaceState = JSON.parse(localStorage.getItem('briefdiff-workspace') || '{"decisions":{},"approvedRequirementCount":18}');
function persistWorkspace() { localStorage.setItem('briefdiff-workspace', JSON.stringify(workspaceState)); }
function persistMap() {
  const positions = {};
  $$('.canvas-node').forEach((node) => { positions[node.dataset.node] = { left: node.style.left, top: node.style.top }; });
  localStorage.setItem('briefdiff-map', JSON.stringify({ positions, edges: state.edges, panX: state.panX, panY: state.panY, zoom: state.zoom }));
}
function restoreMap() {
  try {
    const saved = JSON.parse(localStorage.getItem('briefdiff-map') || 'null');
    if (!saved) return;
    Object.entries(saved.positions || {}).forEach(([id, position]) => { const node = $(`[data-node="${id}"]`); if (node) { node.style.left = position.left; node.style.top = position.top; } });
    if (Array.isArray(saved.edges)) state.edges = saved.edges.filter((edge) => edge && edge.from && edge.to);
    state.panX = Number(saved.panX) || 0; state.panY = Number(saved.panY) || 0; state.zoom = Math.max(75, Math.min(130, Number(saved.zoom) || 100));
    $('#zoomLevel').textContent = `${state.zoom}%`; applyCanvasTransform();
  } catch { localStorage.removeItem('briefdiff-map'); }
}

function switchView(view) {
  state.activeView = view;
  $$('.view-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `view-${view}`));
  $$('.nav-item[data-view], .tab[data-tab]').forEach((item) => {
    const key = item.dataset.view || item.dataset.tab;
    item.classList.toggle('active', key === view);
  });
  if (view === 'map') window.setTimeout(renderEdges, 20);
}

$$('.nav-item[data-view]').forEach((item) => item.addEventListener('click', () => switchView(item.dataset.view)));
$$('.tab[data-tab]').forEach((item) => item.addEventListener('click', () => switchView(item.dataset.tab)));
$$('[data-view-link]').forEach((item) => item.addEventListener('click', () => switchView(item.dataset.viewLink)));

const drawer = $('#detailDrawer');
const drawerOverlay = $('#drawerOverlay');
function openDrawer() { drawer.classList.add('open'); drawerOverlay.classList.add('open'); }
function closeDrawer() { drawer.classList.remove('open'); drawerOverlay.classList.remove('open'); }
$$('[data-open-change]').forEach((item) => item.addEventListener('click', openDrawer));
$('#closeDrawer').addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

const modalOverlay = $('#modalOverlay');
function openModal() { modalOverlay.classList.add('open'); $('#nodeName').focus(); }
function closeModal() { modalOverlay.classList.remove('open'); }
$('#addNode').addEventListener('click', openModal);
$('#closeModal').addEventListener('click', closeModal);
$('#cancelModal').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (event) => { if (event.target === modalOverlay) closeModal(); });

function toast(title, message) {
  $('#toastTitle').textContent = title;
  $('#toastText').textContent = message;
  $('#toast').classList.add('show');
  window.clearTimeout(window.toastTimer);
  window.toastTimer = window.setTimeout(() => $('#toast').classList.remove('show'), 3200);
}

$('#saveNode').addEventListener('click', () => {
  const name = $('#nodeName').value.trim() || 'New work area';
  const node = document.createElement('div');
  node.className = 'canvas-node';
  node.dataset.node = `custom-${++state.nodes}`;
  node.style.left = `${25 + (state.nodes % 3) * 25}%`;
  node.style.top = `${70 + (state.nodes % 3) * 135}px`;
  node.innerHTML = `<span class="node-kicker">WORK AREA</span><strong>${escapeHtml(name)}</strong><span class="node-meta">Newly added</span><div class="node-footer"><span class="node-state">Needs setup</span></div>`;
  $('#canvasGrid').appendChild(node);
  makeDraggable(node);
  renderEdges();
  persistMap();
  closeModal();
  toast('Node added', `${name} is now on your project map.`);
});

function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char])); }
function selectNode(node) {
  if (state.connectMode) {
    if (!state.connectSource) {
      state.connectSource = node.dataset.node;
      node.classList.add('connect-source');
      $('#canvasHint').textContent = 'Now select the node this should connect to';
      toast('Source selected', 'Choose a destination node to create the connection.');
      return;
    }
    const target = node.dataset.node;
    const source = state.connectSource;
    if (source === target) {
      state.connectSource = null;
      node.classList.remove('connect-source');
      $('#canvasHint').textContent = 'Choose a different destination node';
      toast('Choose another node', 'A connection needs two different nodes.');
      return;
    }
    const exists = state.edges.some((edge) => edge.from === source && edge.to === target || edge.from === target && edge.to === source);
    if (!exists) {
      state.edges.push({ id: ++state.nodes + 1000, from: source, to: target });
      renderEdges();
      persistMap();
      toast('Connection added', 'The two work areas are now linked.');
    } else toast('Already connected', 'Those nodes already have a relationship.');
    state.connectMode = false;
    state.connectSource = null;
    $$('.canvas-node').forEach((item) => item.classList.remove('connect-source'));
    $('#connectNodes').classList.remove('active');
    $('#canvasHint').textContent = 'Drag nodes to arrange · Connect two nodes to edit relationships';
    return;
  }
  $$('.canvas-node').forEach((item) => item.classList.remove('selected'));
  node.classList.add('selected');
  openNodeDrawer(node.dataset.node);
}
function openNodeDrawer(nodeId) {
  const profile = nodeProfiles[nodeId] || { kicker: 'WORK AREA', title: 'New work area', status: 'Needs setup', avatar: '?', avatarClass: '', owner: 'Unassigned' };
  $('#nodeDrawerKicker').textContent = profile.kicker;
  $('#nodeDrawerTitle').textContent = profile.title;
  $('#nodeDrawerStatus').textContent = profile.status;
  $('#nodeDrawerAvatar').textContent = profile.avatar;
  $('#nodeDrawerAvatar').className = `mini-avatar ${profile.avatarClass}`;
  $('#nodeOwner').value = profile.owner;
  const connected = state.edges.filter((edge) => edge.from === nodeId || edge.to === nodeId).length;
  $('#nodeRelationshipText').textContent = `Connected to ${connected} ${connected === 1 ? 'project node' : 'project nodes'}. Select Connect to add another relationship.`;
  $('#nodeDrawerOverlay').classList.add('open'); $('#nodeDrawer').classList.add('open');
}
function closeNodeDrawer() { $('#nodeDrawerOverlay').classList.remove('open'); $('#nodeDrawer').classList.remove('open'); }
$('#closeNodeDrawer').addEventListener('click', closeNodeDrawer);
$('#nodeDrawerOverlay').addEventListener('click', closeNodeDrawer);
$('#saveNodeDetails').addEventListener('click', () => { persistMap(); closeNodeDrawer(); toast('Node details saved', 'The owner and notes are saved for this session.'); });
function renderEdges() {
  const layer = $('#edgeLayer');
  if (!layer) return;
  layer.replaceChildren();
  const canvas = $('#canvasGrid');
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  layer.setAttribute('viewBox', `0 0 ${width} ${height}`);
  state.edges.forEach((edge) => {
    const source = canvas.querySelector(`[data-node="${edge.from}"]`);
    const target = canvas.querySelector(`[data-node="${edge.to}"]`);
    if (!source || !target) return;
    const x1c = source.offsetLeft + source.offsetWidth / 2;
    const y1c = source.offsetTop + source.offsetHeight / 2;
    const x2c = target.offsetLeft + target.offsetWidth / 2;
    const y2c = target.offsetTop + target.offsetHeight / 2;
    const dx = x2c - x1c;
    const dy = y2c - y1c;
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const x1 = x1c + (horizontal ? Math.sign(dx) * source.offsetWidth / 2 : 0);
    const y1 = y1c + (horizontal ? 0 : Math.sign(dy) * source.offsetHeight / 2);
    const x2 = x2c - (horizontal ? Math.sign(dx) * target.offsetWidth / 2 : 0);
    const y2 = y2c - (horizontal ? 0 : Math.sign(dy) * target.offsetHeight / 2);
    const bend = Math.max(48, Math.abs(horizontal ? x2 - x1 : y2 - y1) * .42);
    const curve = horizontal
      ? `M${x1} ${y1} C${x1 + Math.sign(dx) * bend} ${y1},${x2 - Math.sign(dx) * bend} ${y2},${x2} ${y2}`
      : `M${x1} ${y1} C${x1} ${y1 + Math.sign(dy) * bend},${x2} ${y2 - Math.sign(dy) * bend},${x2} ${y2}`;
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.dataset.edgeId = edge.id;
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', curve);
    hit.setAttribute('class', 'map-edge-hit');
    hit.setAttribute('tabindex', '0');
    hit.setAttribute('role', 'button');
    hit.setAttribute('aria-label', 'Remove connection');
    hit.addEventListener('click', (event) => {
      event.stopPropagation();
      state.edges = state.edges.filter((item) => item.id !== edge.id);
      renderEdges();
      persistMap();
      toast('Connection removed', 'The relationship was removed from this map.');
    });
    hit.addEventListener('keydown', (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace' || event.key === 'Enter') hit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    const visible = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    visible.setAttribute('d', curve);
    visible.setAttribute('class', 'map-edge');
    group.append(hit, visible);
    layer.appendChild(group);
  });
}
function makeDraggable(node) {
  node.addEventListener('pointerdown', (event) => {
    if (state.connectMode || event.button !== 0) return;
    state.dragging = { node, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: node.offsetLeft, top: node.offsetTop, moved: false };
    node.setPointerCapture(event.pointerId);
    node.classList.add('dragging');
  });
  node.addEventListener('pointermove', (event) => {
    const drag = state.dragging;
    if (!drag || drag.node !== node) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    node.style.left = `${Math.max(8, drag.left + dx / (state.zoom / 100))}px`;
    node.style.top = `${Math.max(8, drag.top + dy / (state.zoom / 100))}px`;
    renderEdges();
  });
  node.addEventListener('pointerup', (event) => {
    if (!state.dragging || state.dragging.node !== node) return;
    const moved = state.dragging.moved;
    state.dragging = null;
    node.classList.remove('dragging');
    if (moved) {
      node.dataset.justDragged = 'true';
      window.setTimeout(() => { delete node.dataset.justDragged; }, 0);
      persistMap();
      toast('Map updated', 'Node position updated for this session.');
    }
    if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
  });
  node.addEventListener('click', () => { if (!node.dataset.justDragged) selectNode(node); });
}
$$('.canvas-node').forEach(makeDraggable);
window.addEventListener('resize', renderEdges);
setTimeout(renderEdges, 80);
restoreMap();
setTimeout(renderEdges, 100);

function setZoom(next) {
  state.zoom = Math.max(75, Math.min(130, next));
  $('#zoomLevel').textContent = `${state.zoom}%`;
  applyCanvasTransform();
  renderEdges();
}
function applyCanvasTransform() {
  $('#canvasGrid').style.transform = `translate(${state.panX}px, ${state.panY}px) scale(${state.zoom / 100})`;
}
$('#zoomIn').addEventListener('click', () => setZoom(state.zoom + 10));
$('#zoomOut').addEventListener('click', () => setZoom(state.zoom - 10));
$('#canvasWrap').addEventListener('wheel', (event) => {
  if (!event.ctrlKey) return;
  event.preventDefault();
  setZoom(state.zoom + (event.deltaY < 0 ? 10 : -10));
}, { passive: false });

$('#fitMap').addEventListener('click', () => {
  state.panX = 0;
  state.panY = 0;
  setZoom(100);
  persistMap();
  $('#canvasWrap').scrollTo({ left: 0, top: 0, behavior: 'smooth' });
  toast('Map reset', 'The map view returned to its default scale.');
});

const canvasWrap = $('#canvasWrap');
canvasWrap.addEventListener('contextmenu', (event) => event.preventDefault());
canvasWrap.addEventListener('pointerdown', (event) => {
  if (event.button !== 2) return;
  event.preventDefault();
  state.panning = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, panX: state.panX, panY: state.panY };
  canvasWrap.setPointerCapture(event.pointerId);
  canvasWrap.classList.add('hand-panning');
});
canvasWrap.addEventListener('pointermove', (event) => {
  if (!state.panning) return;
  state.panX = state.panning.panX + event.clientX - state.panning.startX;
  state.panY = state.panning.panY + event.clientY - state.panning.startY;
  applyCanvasTransform();
});
canvasWrap.addEventListener('pointerup', (event) => {
  if (!state.panning) return;
  state.panning = null;
  canvasWrap.classList.remove('hand-panning');
  if (canvasWrap.hasPointerCapture(event.pointerId)) canvasWrap.releasePointerCapture(event.pointerId);
});
canvasWrap.addEventListener('pointercancel', () => {
  state.panning = null;
  canvasWrap.classList.remove('hand-panning');
});

const mapWorkspace = $('.map-workspace');
$('#expandMap').addEventListener('click', async () => {
  if (!document.fullscreenElement) {
    try { await mapWorkspace.requestFullscreen(); } catch { mapWorkspace.classList.add('expanded-map'); }
  } else document.exitFullscreen();
});
document.addEventListener('fullscreenchange', () => {
  const expanded = Boolean(document.fullscreenElement);
  mapWorkspace.classList.toggle('expanded-map', expanded);
  $('#expandMap').textContent = expanded ? '⤢' : '⛶';
  $('#expandMap').title = expanded ? 'Exit expanded map' : 'Expand map';
  window.setTimeout(renderEdges, 80);
});
$('#connectNodes').addEventListener('click', () => {
  state.connectMode = !state.connectMode;
  state.connectSource = null;
  $$('.canvas-node').forEach((item) => item.classList.remove('connect-source'));
  $('#connectNodes').classList.toggle('active', state.connectMode);
  $('#canvasHint').textContent = state.connectMode ? 'Select a source node, then a destination node' : 'Drag nodes to arrange · Connect two nodes to edit relationships';
  toast(state.connectMode ? 'Connection mode on' : 'Connection mode off', state.connectMode ? 'Select two nodes to create a relationship.' : 'You can continue arranging the map.');
});

function decision(title, text) {
  closeDrawer();
  toast(title, text);
}
function setChangeDecision(decisionKey, title, text) {
  workspaceState.decisions.google = decisionKey;
  if (decisionKey === 'included') workspaceState.approvedRequirementCount = Math.max(19, Number(workspaceState.approvedRequirementCount) || 18);
  persistWorkspace();
  const status = $('#detailDrawer .drawer-status .change-type');
  status.textContent = decisionKey === 'included' ? 'INCLUDED' : decisionKey === 'charge_extra' ? 'READY FOR PRICING' : 'NEEDS DISCUSSION';
  status.className = `change-type ${decisionKey === 'included' ? 'modified' : decisionKey === 'charge_extra' ? 'new' : 'unclear'}`;
  $$('[data-open-change="google"]').forEach((card) => card.classList.add('decision-recorded'));
  decision(title, text);
}
$('#chargeChange').addEventListener('click', () => setChangeDecision('charge_extra', 'Change moved to pricing', 'Add price and timeline before publishing the client review.'));
$('#includeChange').addEventListener('click', () => setChangeDecision('included', 'Scope updated', 'Google Login was added to the current approved scope.'));
$('.decision-button.discuss').addEventListener('click', () => setChangeDecision('needs_discussion', 'Saved for discussion', 'The change remains unresolved until you have more detail.'));
if (workspaceState.decisions.google) {
  $$('[data-open-change="google"]').forEach((card) => card.classList.add('decision-recorded'));
}
$('#newChange').addEventListener('click', () => { openDrawer(); });
$('#uploadBrief').addEventListener('click', () => toast('Upload ready', 'Connect your storage provider to upload a project brief.'));
$('#addSource').addEventListener('click', () => toast('Source upload', 'Connect your storage provider to add another document version.'));

// Keep the prototype's primary navigation keyboard friendly.
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { closeDrawer(); closeModal(); }
});
