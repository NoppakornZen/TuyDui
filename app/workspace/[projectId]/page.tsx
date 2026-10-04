'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ShareModal from '../../components/ShareModal';
import './workspace-redesign.css';
import './workspace-dashboard.css';

type NodeKind = 'project' | 'work_area';
type MapNode = { id: string; title: string; kind: NodeKind; owner: string; requirements: number; x: number; y: number; impacted?: boolean; requirementIds: string[]; summary?: string };
type Edge = { id: string; from: string; to: string };
type WorkspaceTab = 'overview' | 'map' | 'requirements' | 'changes' | 'history';
type RequirementRow = { id: string; title: string; description: string; area: string; owner: string; source: string; status: string; quote?: string; page?: number; documentId?: string; clarity?: string };
type ChangeRow = { id: string; title: string; type: string; detail: string; decision: string; explanation?: string; confidence?: string };
type StoredDocument = { id: string; name: string; version: number; pageCount: number; uploadedAt: string };
type SuggestedNode = { tempId: string; parentTempId?: string; title: string; summary?: string; category: string; requirementIds: string[]; suggestedRole?: string; suggestedMemberId?: string };

const team = [
  { id: 'zen', name: 'Zen', role: 'Backend' },
  { id: 'pee', name: 'Pee', role: 'Frontend' },
  { id: 'arm', name: 'Arm', role: 'Design' },
  { id: 'nan', name: 'Nan', role: 'Growth' },
];

const initialNodes: MapNode[] = [
  { id: 'root', title: 'Project', kind: 'project', owner: 'Project team', requirements: 0, x: 640, y: 280, requirementIds: [] },
];
const initialEdges: Edge[] = [];
const initialRequirements: RequirementRow[] = [];
const initialChanges: ChangeRow[] = [];

export default function WorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [loading, setLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedId, setSelectedId] = useState('root');
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; nodeX: number; nodeY: number } | null>(null);
  const [hand, setHand] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [requirements, setRequirements] = useState<RequirementRow[]>(initialRequirements);
  const [changes, setChanges] = useState<ChangeRow[]>(initialChanges);
  const [history, setHistory] = useState<string[]>([]);
  const [baselineConfirmed, setBaselineConfirmed] = useState(false);
  const [nodeNotes, setNodeNotes] = useState<Record<string, string>>({});
  const [clientMessage, setClientMessage] = useState('');
  const [changeFile, setChangeFile] = useState<File | null>(null);
  const [pendingReview, setPendingReview] = useState<ChangeReview | null>(null);
  const [copied, setCopied] = useState(false);
  const [briefText, setBriefText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [mapProposal, setMapProposal] = useState<SuggestedNode[] | null>(null);
  const [aiBusy, setAiBusy] = useState<'change' | 'brief' | 'pdf' | 'map' | null>(null);
  const [aiError, setAiError] = useState('');
  const [briefProposals, setBriefProposals] = useState<RequirementRow[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const pendingChanges = changes.filter((change) => change.decision === 'Pending');
  const workAreas = nodes.filter((node) => node.kind === 'work_area');
  const assigned = requirements.filter((row) => row.owner !== 'Unassigned').length;
  const coverage = requirements.length === 0 ? 0 : Math.round((assigned / requirements.length) * 100);
  const latestDocument = documents[documents.length - 1];
  const linkedRequirements = requirements.filter((row) => selected.requirementIds.includes(row.id));

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    try {
      setLoading(true);
      const { supabase } = await import('../../../src/lib/supabase');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error || !project) {
        router.push('/projects');
        return;
      }

      setProjectTitle(project.name);
      setClientName(project.client_name);
      setBaselineConfirmed(!!project.baseline_confirmed_at);

      const storageKey = `briefdiff-project-${projectId}`;
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        try {
          const data = JSON.parse(saved) as { nodes?: MapNode[]; edges?: Edge[]; zoom?: number; pan?: { x: number; y: number }; requirements?: Array<RequirementRow & { description?: string }>; changes?: ChangeRow[]; history?: string[]; nodeNotes?: Record<string, string>; documents?: StoredDocument[] };
          if (data.nodes?.length) setNodes(data.nodes.map((node) => ({ ...node, requirementIds: node.requirementIds ?? [] })));
          if (data.edges) setEdges(data.edges);
          if (data.zoom) setZoom(data.zoom);
          if (data.pan) setPan(data.pan);
          if (data.requirements) setRequirements(data.requirements.map((row) => ({ ...row, description: row.description || row.title })));
          if (data.changes) setChanges(data.changes);
          if (data.history) setHistory(data.history);
          if (data.nodeNotes) setNodeNotes(data.nodeNotes);
          if (data.documents) setDocuments(data.documents);
        } catch { window.localStorage.removeItem(storageKey); }
      } else {
        setNodes([{ id: 'root', title: project.name, kind: 'project', owner: 'Project team', requirements: 0, x: 640, y: 280, requirementIds: [] }]);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
      router.push('/projects');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!projectId || loading) return;
    const storageKey = `briefdiff-project-${projectId}`;
    window.localStorage.setItem(storageKey, JSON.stringify({ nodes, edges, zoom, pan, requirements, changes, history, nodeNotes, documents }));
  }, [nodes, edges, zoom, pan, requirements, changes, history, nodeNotes, documents, projectId, loading]);

  useEffect(() => {
    const viewport = canvasRef.current;
    if (!viewport) return;

    const preventScroll = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    viewport.addEventListener('wheel', preventScroll, { passive: false });
    return () => viewport.removeEventListener('wheel', preventScroll);
  }, []);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const mapSize = useMemo(() => ({
    width: Math.max(2400, ...nodes.map((node) => node.x + CARD_W + 240)),
    height: Math.max(1400, ...nodes.map((node) => node.y + CARD_H + 240)),
  }), [nodes]);
  const updateZoom = (next: number) => setZoom(Math.max(0.25, Math.min(2, next)));

  function selectNode(id: string) {
    if (connectMode) {
      if (!connectSource) { setConnectSource(id); return; }
      if (connectSource !== id && !edges.some((edge) => (edge.from === connectSource && edge.to === id) || (edge.from === id && edge.to === connectSource))) {
        setEdges((current) => [...current, { id: `e-${Date.now()}`, from: connectSource, to: id }]);
      }
      setConnectMode(false); setConnectSource(null); return;
    }
    setSelectedId(id);
  }

  function onNodePointerDown(event: React.PointerEvent, node: MapNode) {
    if (event.button !== 0 || connectMode) return;
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setDrag({ id: node.id, x: event.clientX, y: event.clientY, nodeX: node.x, nodeY: node.y });
  }

  function onNodePointerMove(event: React.PointerEvent) {
    if (!drag) return;
    const dx = (event.clientX - drag.x) / zoom;
    const dy = (event.clientY - drag.y) / zoom;
    setNodes((current) => current.map((node) => node.id === drag.id ? { ...node, x: drag.nodeX + dx, y: drag.nodeY + dy } : node));
  }

  function onCanvasPointerDown(event: React.PointerEvent) {
    if (event.button !== 2) return;
    event.preventDefault();
    setHand({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y });
    canvasRef.current?.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event: React.PointerEvent) {
    if (!hand) return;
    setPan({ x: hand.panX + event.clientX - hand.x, y: hand.panY + event.clientY - hand.y });
  }

  function addNode() {
    const title = window.prompt('Node name', 'New work area')?.trim();
    if (!title) return;
    const id = `node-${Date.now()}`;
    setNodes((current) => [...current, { id, title, kind: 'work_area', owner: 'Unassigned', requirements: 0, x: 720, y: 650, requirementIds: [] }]);
    setSelectedId(id);
  }

  function addRequirement() {
    const title = window.prompt('Requirement name', 'New requirement')?.trim();
    if (!title) return;
    const id = `REQ-${String(19 + requirements.length).padStart(3, '0')}`;
    setRequirements((current) => [...current, { id, title, description: title, area: 'Unassigned', owner: 'Unassigned', source: 'Manual', status: 'Review' }]);
    setHistory((current) => [`${id} added manually · Just now`, ...current]);
  }

  async function reviewChange(event: React.FormEvent) {
    event.preventDefault();
    const raw = clientMessage.trim();
    if ((!raw && !changeFile) || aiBusy) return;
    if (requirements.length === 0) { setAiError('Add requirements before reviewing a change.'); return; }
    setAiBusy('change');
    setAiError('');
    setCopied(false);
    const context = {
      projectId,
      text: raw,
      requirements: requirements.map(toRequirement),
      nodes: nodes.map((node) => ({ id: node.id, title: node.title, summary: node.summary ?? '', requirementIds: node.requirementIds })),
      members: team,
    };
    try {
      const response = changeFile
        ? await fetch('/api/changes', { method: 'POST', body: (() => { const body = new FormData(); body.set('file', changeFile); body.set('context', JSON.stringify(context)); return body; })() })
        : await fetch('/api/changes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(context) });
      const payload = await response.json().catch(() => ({})) as { data?: ChangeReview; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'AI request failed.');
      setPendingReview(payload.data);
      setHistory((current) => [`Change reviewed as ${payload.data!.classification.replace('_', ' ')} · Just now`, ...current]);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setAiBusy(null);
    }
  }

  function applyReview() {
    if (!pendingReview || pendingReview.edits.length === 0) return;
    const source = changeFile?.name || 'Change brief';
    let nextRequirements = requirements;
    let nextNodes = nodes.map((node) => ({ ...node, impacted: false }));
    const nextEdges = [...edges];
    pendingReview.edits.forEach((edit, index) => {
      const linked = ensureRequirement(nextRequirements, edit.title, edit.summary, source);
      nextRequirements = linked.rows;
      if (edit.action === 'update' && edit.nodeId) {
        nextNodes = nextNodes.map((node) => node.id === edit.nodeId ? { ...node, title: edit.title, summary: edit.summary, impacted: true, requirementIds: [...new Set([...node.requirementIds, linked.id])] } : node);
        return;
      }
      const parent = nextNodes.find((node) => node.id === edit.parentId) ?? nextNodes[0];
      const id = `node-${Date.now()}-${index}`;
      const spot = placeUnder(parent, nextNodes);
      nextNodes = [...nextNodes, { id, title: edit.title, summary: edit.summary, kind: 'work_area', owner: 'Unassigned', requirements: 1, x: spot.x, y: spot.y, impacted: true, requirementIds: [linked.id] }];
      nextEdges.push({ id: `e-${id}`, from: parent?.id ?? 'root', to: id });
    });
    setRequirements(nextRequirements);
    setNodes(nextNodes);
    setEdges(nextEdges);
    setChanges((current) => [{ id: `change-${Date.now()}`, title: pendingReview.summary, type: pendingReview.magnitude === 'major' ? 'NEW SYSTEM' : 'UPDATED', detail: clientMessage || source, decision: 'Applied to map', explanation: pendingReview.explanation }, ...current]);
    setHistory((current) => [`Current map updated from the change review · Just now`, ...current]);
    setPendingReview(null);
    setClientMessage('');
    setChangeFile(null);
    setActiveTab('map');
  }

  async function copyClientMessage() {
    if (!pendingReview?.clientMessage) return;
    await navigator.clipboard.writeText(pendingReview.clientMessage);
    setCopied(true);
  }

  async function readBrief(event: React.FormEvent) {
    event.preventDefault();
    const text = briefText.trim();
    if (!text || aiBusy) return;
    setAiBusy('brief');
    setAiError('');
    try {
      const extracted = await runAI<ExtractedRequirement[]>({
        task: 'extract_requirements',
        projectId,
        document: { id: 'DOC-PASTE', name: 'Pasted brief', sourceType: 'brief' },
        text,
      });
      setBriefProposals(extracted.map((item, index) => ({
        id: `REQ-P${Date.now()}-${index + 1}`,
        title: item.title,
        description: item.description,
        area: item.category,
        owner: item.suggestedRoles[0] ?? 'Unassigned',
        source: item.evidence[0]?.page ? `Paste · p.${item.evidence[0].page}` : 'Pasted brief',
        status: item.clarity === 'clear' ? 'Proposal' : 'Needs review',
      })));
      setHistory((current) => [`AI extracted ${extracted.length} requirements for review · Just now`, ...current]);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setAiBusy(null);
    }
  }

  async function readPdf(event: React.FormEvent) {
    event.preventDefault();
    if (!pdfFile || aiBusy) return;
    setAiBusy('pdf');
    setAiError('');
    const body = new FormData();
    body.set('file', pdfFile);
    body.set('projectId', projectId);
    try {
      const response = await fetch('/api/documents', { method: 'POST', body });
      const payload = await response.json().catch(() => ({})) as { error?: string; document?: StoredDocument; data?: ExtractedRequirement[] };
      if (payload.document) setDocuments((current) => current.some((item) => item.id === payload.document!.id) ? current : [...current, payload.document!]);
      if (!response.ok || !payload.data || !payload.document) throw new Error(payload.error || 'Could not read the PDF.');
      const document = payload.document;
      const rows = payload.data.map((item, index) => ({
        id: `${document.id}-${item.id || index + 1}`,
        title: item.title,
        description: item.description,
        area: item.category,
        owner: item.suggestedRoles[0] ?? 'Unassigned',
        source: item.evidence[0]?.page ? `${document.name} · V${document.version} · p.${item.evidence[0].page}` : `${document.name} · V${document.version}`,
        status: item.clarity === 'clear' ? 'Proposal' : 'Needs review',
        quote: item.evidence[0]?.quote,
        page: item.evidence[0]?.page,
        documentId: document.id,
        clarity: item.clarity,
      }));
      const next = [...requirements.filter((item) => !rows.some((row) => row.id === item.id)), ...rows];
      setRequirements(next);
      setBriefProposals(rows);
      setHistory((current) => [`V${document.version} stored. AI proposed ${rows.length} requirements · Just now`, ...current]);
      setPdfFile(null);
      await drawMap(projectTitle, next);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setAiBusy(null);
    }
  }

  function editProposal(id: string, patch: Partial<RequirementRow>) {
    setBriefProposals((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function acceptBriefProposals() {
    if (briefProposals.length === 0) return;
    setRequirements((current) => [...current, ...briefProposals.filter((item) => !current.some((existing) => existing.id === item.id))]);
    setHistory((current) => [`${briefProposals.length} proposed requirements added for review · Just now`, ...current]);
    setBriefProposals([]);
    setBriefText('');
  }

  async function drawMap(title: string, rows: RequirementRow[]) {
    if (rows.length === 0) return;
    const suggested = await runAI<SuggestedNode[]>({
      task: 'suggest_project_structure',
      projectId,
      requirements: rows.map(toRequirement),
      members: team,
    });
    if (suggested.length === 0) throw new Error('The model did not suggest any work areas.');
    const laid = layoutFromStructure(title, suggested, team, rows.map((row) => row.id));
    setNodes(laid.nodes);
    setEdges(laid.edges);
    setSelectedId('root');
    setMapProposal(null);
    setActiveTab('map');
    setHistory((current) => [`Project map built with ${laid.nodes.length - 1} work areas · Just now`, ...current]);
  }

  async function buildMap() {
    if (requirements.length === 0 || aiBusy) return;
    setAiBusy('map');
    setAiError('');
    try {
      await drawMap(projectTitle, requirements);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setAiBusy(null);
    }
  }

  function decideChange(id: string, decision: string) {
    setChanges((current) => current.map((change) => change.id === id ? { ...change, decision } : change));
    setHistory((current) => [`${changes.find((change) => change.id === id)?.title ?? 'Change'} marked ${decision} · Just now`, ...current]);
  }

  function confirmBaseline() {
    if (baselineConfirmed) { window.alert('Baseline V1 is already confirmed and cannot be edited.'); return; }
    setBaselineConfirmed(true);
    setHistory((current) => ['Baseline V1 confirmed · Just now', ...current]);
  }

  if (loading) {
    return (
      <main className="workspace-app">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '24px' }}>
          <div className="spinner" style={{ width: '48px', height: '48px', border: '4px solid rgba(255,255,255,0.1)', borderTopColor: '#FF6B35', borderRadius: '50%' }} />
          <p style={{ color: 'rgba(255,255,255,0.6)' }}>กำลังโหลดโปรเจกต์...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="workspace-app">
      <header className="workspace-topbar"><a className="workspace-brand" href="/projects">TuyDui</a><div className="workspace-crumb">Projects <b>/</b> <strong>{projectTitle}</strong></div><button className="button-light" style={{ marginLeft: 'auto', marginRight: '16px', display: 'flex', alignItems: 'center', gap: '8px' }} onClick={() => setShowShareModal(true)}><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 11v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h2M10 1h6v6M7 11l9-9"/></svg>Share</button><div className="workspace-account"><span>{clientName}</span><b>{clientName[0] || 'C'}</b></div></header>
      <div className="workspace-layout">
        <aside className="workspace-sidebar"><div className="sidebar-eyebrow">PROJECT WORKSPACE</div><h1>{projectTitle}</h1><p>{latestDocument ? `V${latestDocument.version} · ${latestDocument.name}` : 'No brief yet'}</p><nav>{([['overview','▦','Overview',''],['map','⌘','Project map',''],['requirements','≡','Requirements',String(requirements.length)],['changes','↗','Changes',String(pendingChanges.length)],['history','◷','History','']] as const).map(([tab, icon, label, count]) => <button key={tab} className={activeTab === tab ? 'side-active' : ''} onClick={() => setActiveTab(tab)}>{icon} <span>{label}</span>{count && <em className={tab === 'changes' ? 'danger' : ''}>{count}</em>}</button>)}</nav><div className="sidebar-baseline"><span className="check">{baselineConfirmed ? '✓' : '–'}</span><div><strong>{baselineConfirmed ? 'Baseline V1' : 'Baseline'}</strong><small>{baselineConfirmed ? 'Confirmed' : 'Not confirmed'}</small></div></div></aside>
        <section className="workspace-main"><div className="workspace-header"><div><div className="workspace-kicker"><span /> ACTIVE PROJECT</div><h2>{activeTab === 'map' ? 'Project map' : activeTab === 'overview' ? projectTitle : activeTab === 'requirements' ? 'Requirements' : activeTab === 'changes' ? 'Change review' : 'Project history'}</h2><p>{activeTab === 'map' ? `${requirements.length} requirements · ${workAreas.length} work areas · ${pendingChanges.length} open changes` : latestDocument ? `${latestDocument.pageCount} pages in the latest brief` : 'Send a PDF brief to start'}</p></div>{activeTab === 'map' && <div className="workspace-actions"><button className="button-light" onClick={() => updateZoom(zoom - .1)}>−</button><span className="zoom-readout">{Math.round(zoom * 100)}%</span><button className="button-light" onClick={() => updateZoom(zoom + .1)}>＋</button><button className={`button-light connect ${connectMode ? 'active' : ''}`} onClick={() => { setConnectMode((value) => !value); setConnectSource(null); }}>{connectMode ? 'Select nodes' : '↗ Connect'}</button><button className="button-light" type="button" onClick={buildMap} disabled={aiBusy !== null || requirements.length === 0}>{aiBusy === 'map' ? 'Building map…' : 'Build map'}</button><button className="button-primary" onClick={addNode}>＋ Add node</button></div>}</div>
          {activeTab === 'overview' && <div className="workspace-overview"><div className="overview-metrics"><div><small>Current scope</small><strong>{requirements.length} <i>requirements</i></strong><span>From the current brief</span></div><div><small>Open changes</small><strong className="rose-text">{pendingChanges.length} <i>need review</i></strong><span className="rose-text">AI proposes. You decide.</span></div><div><small>Team coverage</small><strong>{coverage}% <i>assigned</i></strong><span>{assigned} of {requirements.length} have an owner</span></div><div><small>Baseline</small><strong>{baselineConfirmed ? '✓' : '–'} <i>{baselineConfirmed ? 'V1 confirmed' : 'Not confirmed'}</i></strong><span>{baselineConfirmed ? 'Locked' : 'AI output is not scope yet'}</span></div></div><div className="overview-columns"><div className="overview-card"><header><div><h3>Living project map</h3><p>Your project, connected to the source brief.</p></div><button onClick={() => setActiveTab('map')}>Open map →</button></header><div className="overview-map-preview"><span>PROJECT</span><strong>{projectTitle}</strong><div>{workAreas.length === 0 ? <b>No map yet</b> : workAreas.slice(0, 6).map((node) => <b key={node.id}>{node.title}</b>)}</div></div></div><div className="overview-card"><header><div><h3>Needs your decision</h3><p>AI analysis is ready for review.</p></div><button onClick={() => setActiveTab('changes')}>See all →</button></header>{pendingChanges.length === 0 ? <p className="ai-note">No open changes. Check a client message to see an AI proposal.</p> : pendingChanges.slice(0, 3).map((change) => <button className="overview-change" key={change.id} onClick={() => setActiveTab('changes')}><em>{change.type.split(' ')[0]}</em><span><strong>{change.title}</strong><small>{change.decision}</small></span><b>›</b></button>)}</div></div></div>}
          {activeTab === 'requirements' && <div className="workspace-table"><header><div><h3>Requirements</h3><p>{requirements.length} requirements. A PDF stays a proposal until you add it. It does not confirm the baseline.</p></div><button className="button-primary" onClick={addRequirement}>＋ Add requirement</button></header>
            <form className="ai-composer" onSubmit={readPdf}>
              <label htmlFor="brief-pdf">Send a PDF brief</label>
              <input id="brief-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)} />
              <div><button className="button-primary" type="submit" disabled={aiBusy !== null || !pdfFile}>{aiBusy === 'pdf' ? 'Reading PDF and building the map…' : 'Read PDF'}</button>{aiError && <span className="ai-error">{aiError}</span>}</div>
              <p className="ai-note">The PDF is kept as its own version. Requirements stay proposals, and the map is drawn from them. This does not confirm the baseline.</p>
            </form>
            <form className="ai-composer" onSubmit={readBrief}>
              <label htmlFor="brief-text">Or paste brief text</label>
              <textarea id="brief-text" value={briefText} onChange={(event) => setBriefText(event.target.value)} placeholder="Paste the client brief here. The AI will extract requirements. It will not change the baseline." />
              <div><button className="button-light" type="submit" disabled={aiBusy !== null}>{aiBusy === 'brief' ? 'Reading brief…' : 'Extract from text'}</button></div>
            </form>
            {briefProposals.length > 0 && <div className="ai-proposals"><strong>Proposed requirements</strong><p>Edit them before adding. Adding them does not confirm the baseline.</p>{briefProposals.map((row) => <div className="proposal-row" key={row.id}><input value={row.title} onChange={(event) => editProposal(row.id, { title: event.target.value })} /><textarea value={row.description} onChange={(event) => editProposal(row.id, { description: event.target.value })} /><small>{row.source} · {row.status}{row.quote ? ` · "${row.quote}"` : ''}</small></div>)}<button className="button-primary" type="button" onClick={acceptBriefProposals}>Add for review</button></div>}
            {requirements.map((row) => <div className="requirement-row" key={row.id}><span><strong>{row.id} · {row.title}</strong><small>{row.area}{row.quote ? ` · "${row.quote.slice(0, 90)}"` : ''}</small></span><b>{row.owner}</b><a>{row.source}</a><em className={row.status === 'Clear' ? '' : 'review'}>{row.status}</em>›</div>)}
          </div>}
          {activeTab === 'changes' && <div className="workspace-table"><header><div><h3>Change review</h3><p>Compare a new brief with the current map. The map stays as it is until you apply the review.</p></div></header>
            <form className="ai-composer" onSubmit={reviewChange}>
              <label htmlFor="client-message">New brief</label>
              <textarea id="client-message" value={clientMessage} onChange={(event) => setClientMessage(event.target.value)} placeholder="Paste the new client brief." />
              <label htmlFor="change-pdf">Or send a PDF</label>
              <input id="change-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setChangeFile(event.target.files?.[0] ?? null)} />
              <div><button className="button-primary" type="submit" disabled={aiBusy !== null}>{aiBusy === 'change' ? 'Reviewing…' : 'Review'}</button>{aiError && <span className="ai-error">{aiError}</span>}</div>
            </form>
            {pendingReview && <div className="ai-proposals review-result"><em>{reviewLabel(pendingReview)}</em><h3>{pendingReview.summary}</h3><p>{pendingReview.explanation}</p>{pendingReview.clientMessage && <div className="ai-explanation"><p>{pendingReview.clientMessage}</p><button className="button-light" type="button" onClick={copyClientMessage}>{copied ? 'Copied' : 'Copy client message'}</button></div>}{pendingReview.edits.length > 0 ? <div className="review-actions"><button className="button-light" type="button" onClick={() => { setPendingReview(null); setHistory((current) => ['Change review cancelled. The map was not changed · Just now', ...current]); }}>Cancel</button><button className="button-primary" type="button" onClick={applyReview}>Apply to current map</button></div> : <p>The current map stays as it is.</p>}</div>}
            <div className="change-review-banner"><strong>{pendingChanges.length} changes need your decision</strong><span>Nothing is added to the approved scope until you choose.</span></div>
            {changes.map((change) => <div className="change-review-card" key={change.id}><em>{change.type}</em><h3>{change.title}</h3><p>{change.detail}</p>{change.explanation && <p className="ai-explanation">{change.explanation}</p>}{change.confidence && <span>Confidence hint: {change.confidence} · Status: {change.decision}</span>}{!change.confidence && <span>Status: {change.decision}</span>}<div className="change-actions"><button onClick={() => decideChange(change.id, 'Included')}>Include</button><button onClick={() => decideChange(change.id, 'Charge extra')}>Charge extra</button><button onClick={() => decideChange(change.id, 'Needs discussion')}>Discuss</button></div></div>)}
          </div>}
          {activeTab === 'history' && <div className="workspace-table history-list"><header><div><h3>Project history</h3><p>What was stored, proposed, and decided.</p></div></header>{history.length === 0 ? <p className="ai-note">Nothing recorded yet.</p> : history.map((item, index) => <div className="history-row" key={`${item}-${index}`}><b>●</b><span><strong>{item.split(' · ')[0]}</strong><small>{item.split(' · ')[1] ?? 'Recorded locally'}</small></span><em>Audit</em></div>)}</div>}
          {activeTab === 'map' && <>
          {aiError && <p className="ai-error">{aiError}</p>}
          <div className={`map-viewport ${hand ? 'is-panning' : ''}`} ref={canvasRef} onContextMenu={(event) => event.preventDefault()} onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={() => setHand(null)} onPointerCancel={() => setHand(null)} onWheel={(event) => { event.preventDefault(); updateZoom(zoom + (event.deltaY < 0 ? .08 : -.08)); }}>
            <div className="map-world" style={{ width: mapSize.width, height: mapSize.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
              <svg className="map-edges" width={mapSize.width} height={mapSize.height}>{edges.map((edge) => { const from = nodeById.get(edge.from); const to = nodeById.get(edge.to); if (!from || !to) return null; return <path key={edge.id} d={flowPath(from, to)} onClick={() => setEdges((current) => current.filter((item) => item.id !== edge.id))} />; })}</svg>
              {nodes.map((node) => { const parent = edges.find((edge) => edge.to === node.id); const label = node.kind === 'project' ? 'PROJECT' : parent?.from === 'root' ? 'PHASE' : 'BRANCH'; return <button key={node.id} className={`map-node ${node.kind === 'project' ? 'project-node' : ''} ${node.impacted ? 'impacted' : ''} ${selectedId === node.id ? 'selected' : ''} ${connectSource === node.id ? 'connect-source' : ''}`} style={{ left: node.x, top: node.y }} onClick={() => selectNode(node.id)} onPointerDown={(event) => onNodePointerDown(event, node)} onPointerMove={onNodePointerMove} onPointerUp={() => setDrag(null)}><span className="node-label">{label}{node.impacted && <i>IMPACTED</i>}</span><strong>{node.title}</strong><small>{node.summary || `${node.requirementIds.length} requirements`}</small><footer><b className={`node-avatar ${node.owner.includes('Frontend') ? 'blue' : node.owner.includes('Growth') ? 'rose' : 'green'}`}>{node.owner[0] || '?'}</b><span>{node.owner}</span><em>{node.kind === 'project' ? (baselineConfirmed ? 'Baseline V1' : 'Not confirmed') : `${node.requirementIds.length} req`}</em></footer></button>; })}
            </div>
            <div className="map-corner-tools"><button title="Reset view" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}>⊞</button><button title="Map settings">⚙</button></div><div className="map-tip">Scroll to zoom · Right-drag to move · Click a card to read it</div>
          </div>
          </>}
        </section>
        <aside className="workspace-inspector"><div className="inspector-kicker">{selected.kind === 'project' ? 'PROJECT' : 'WORK AREA'}</div><h2>{selected.title}</h2><span className="inspector-status">{selected.impacted ? 'Impacted by open change' : selected.kind === 'project' && baselineConfirmed ? 'Baseline V1 confirmed' : 'Not confirmed'}</span>{selected.summary && <div className="inspector-section"><h3>What this covers</h3><p className="inspector-summary">{selected.summary}</p></div>}<div className="inspector-section"><h3>Owner</h3><div className="inspector-owner"><b className="node-avatar green">{selected.owner[0] || '?'}</b><span>{selected.owner}</span></div></div><div className="inspector-section"><h3>Connected requirements</h3>{linkedRequirements.length === 0 ? <div className="inspector-requirement"><strong>No requirements yet</strong><small>Read a PDF, add the proposals, then build the map.</small><button className="inline-link" onClick={() => setActiveTab('requirements')}>Open requirements →</button></div> : linkedRequirements.map((row) => <div className="inspector-requirement" key={row.id}><strong>{row.title}</strong><small>{row.source}{row.quote ? ` · "${row.quote.slice(0, 120)}"` : ''}</small></div>)}</div><div className="inspector-section"><h3>Notes</h3><textarea value={nodeNotes[selected.id] ?? ''} onChange={(event) => setNodeNotes((current) => ({ ...current, [selected.id]: event.target.value }))} placeholder="Add a note for your team..." /></div><button className="button-primary inspector-save" onClick={() => { setHistory((current) => [`Notes saved for ${selected.title} · Just now`, ...current]); window.alert('Node details saved locally.'); }}>Save node details</button>{!baselineConfirmed && <button className="baseline-action" onClick={confirmBaseline}>Confirm baseline</button>}</aside>
      </div>
      {showShareModal && (
        <ShareModal
          projectId={projectId}
          projectName={projectTitle}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </main>
  );
}

type ChangeReview = {
  classification: 'in_scope' | 'modified' | 'new_scope' | 'ambiguous';
  magnitude: 'small' | 'major';
  summary: string;
  explanation: string;
  clientMessage: string | null;
  edits: Array<{ action: 'add' | 'update'; nodeId?: string; parentId?: string; title: string; summary: string }>;
};

function reviewLabel(review: ChangeReview) {
  if (review.classification === 'in_scope') return 'ALREADY IN THE MAP';
  if (review.classification === 'ambiguous') return 'NEEDS DETAIL';
  if (review.magnitude === 'major') return 'NEW SYSTEM';
  return review.classification === 'new_scope' ? 'SMALL ADDITION' : 'SMALL CHANGE';
}

function ensureRequirement(rows: RequirementRow[], title: string, description: string, source: string) {
  const found = rows.find((row) => row.title.trim() === title.trim());
  if (found) return { rows, id: found.id };
  const id = `REQ-C${Date.now()}-${rows.length}`;
  return { rows: [...rows, { id, title, description, area: 'Change', owner: 'Unassigned', source, status: 'Proposal' }], id };
}

function placeUnder(parent: MapNode | undefined, existing: MapNode[]) {
  const y = (parent?.y ?? 36) + ROW;
  const row = existing.filter((node) => Math.abs(node.y - y) < 70);
  const x = row.length === 0 ? (parent?.x ?? 80) : Math.max(...row.map((node) => node.x)) + CARD_W + GAP_X;
  return { x, y };
}

type ExtractedRequirement = {
  id: string;
  title: string;
  description: string;
  category: string;
  clarity: string;
  suggestedRoles: string[];
  evidence: Array<{ page?: number; quote?: string }>;
};

async function runAI<T>(body: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok || payload.data == null) throw new Error(payload.error || 'AI request failed.');
  return payload.data;
}

function toRequirement(row: RequirementRow) {
  const clarity = row.clarity === 'ambiguous' || row.clarity === 'missing_detail' || row.clarity === 'conflict' ? row.clarity : 'clear';
  return {
    id: row.id,
    projectId: '',
    title: row.title,
    description: row.description,
    category: row.area,
    clarity,
    evidence: [{ documentId: row.documentId ?? 'DOC-001', page: row.page, quote: row.quote || row.description }],
    suggestedRoles: row.owner !== 'Unassigned' ? [row.owner] : [],
    approved: false,
  };
}

const CARD_W = 220;
const CARD_H = 132;
const GAP_X = 28;
const ROW = 176;

function flowPath(from: MapNode, to: MapNode) {
  const x1 = from.x + CARD_W / 2;
  const y1 = from.y + CARD_H;
  const x2 = to.x + CARD_W / 2;
  const y2 = to.y;
  const bend = Math.max(24, (y2 - y1) / 2);
  return `M ${x1} ${y1} C ${x1} ${y1 + bend}, ${x2} ${y2 - bend}, ${x2} ${y2}`;
}

function layoutFromStructure(title: string, suggested: SuggestedNode[], members: Array<{ id: string; name: string; role: string }>, allIds: string[]) {
  const byId = new Map(suggested.map((node) => [node.tempId, node]));
  const children = new Map<string, SuggestedNode[]>();
  const roots: SuggestedNode[] = [];
  for (const node of suggested) {
    const parentId = node.parentTempId && byId.has(node.parentTempId) && node.parentTempId !== node.tempId ? node.parentTempId : undefined;
    if (!parentId) roots.push(node);
    else children.set(parentId, [...(children.get(parentId) ?? []), node]);
  }
  const widthOf = (id: string, seen: Set<string>): number => {
    if (seen.has(id)) return CARD_W;
    const kids = (children.get(id) ?? []).filter((kid) => !seen.has(kid.tempId));
    if (kids.length === 0) return CARD_W;
    const next = new Set(seen);
    next.add(id);
    return Math.max(CARD_W, kids.reduce((sum, kid) => sum + widthOf(kid.tempId, next), 0) + GAP_X * (kids.length - 1));
  };
  const nodes: MapNode[] = [];
  const edges: Edge[] = [];
  const place = (item: SuggestedNode, left: number, depth: number, seen: Set<string>) => {
    if (seen.has(item.tempId)) return;
    const width = widthOf(item.tempId, seen);
    const next = new Set(seen);
    next.add(item.tempId);
    nodes.push(placedNode(item, left + (width - CARD_W) / 2, 36 + depth * ROW, members));
    let childLeft = left;
    for (const kid of (children.get(item.tempId) ?? []).filter((kid) => !next.has(kid.tempId))) {
      edges.push({ id: `e-${kid.tempId}`, from: item.tempId, to: kid.tempId });
      place(kid, childLeft, depth + 1, next);
      childLeft += widthOf(kid.tempId, next) + GAP_X;
    }
  };
  const phaseWidths = roots.map((root) => widthOf(root.tempId, new Set()));
  const total = phaseWidths.reduce((sum, value) => sum + value, 0) + GAP_X * Math.max(0, roots.length - 1);
  nodes.push({ id: 'root', title, kind: 'project', owner: 'Project team', requirements: allIds.length, x: 80 + total / 2 - CARD_W / 2, y: 36, requirementIds: allIds, summary: `${roots.length} branches` });
  let cursor = 80;
  roots.forEach((phase, index) => {
    edges.push({ id: `e-${phase.tempId}`, from: 'root', to: phase.tempId });
    place(phase, cursor, 1, new Set());
    cursor += phaseWidths[index] + GAP_X;
  });
  return { nodes, edges };
}

function placedNode(item: SuggestedNode, x: number, y: number, members: Array<{ id: string; name: string; role: string }>): MapNode {
  const member = members.find((person) => person.id === item.suggestedMemberId);
  return {
    id: item.tempId,
    title: item.title,
    summary: item.summary,
    kind: 'work_area',
    owner: member ? `${member.name} · ${member.role}` : item.suggestedRole || 'Unassigned',
    requirements: item.requirementIds.length,
    x,
    y,
    requirementIds: item.requirementIds,
  };
}
