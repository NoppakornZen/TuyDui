'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ShareModal from '../../components/ShareModal';
import ProjectPeople from '../../components/ProjectPeople';
import { googleName, loadOwnProfile, loadProfiles, profileLabel } from '../../../src/lib/profile';
import { authenticatedFetch } from '../../../src/lib/authenticated-fetch';
import { SAMPLE_BRIEF } from '../../../src/lib/sample-brief';
import { applyReviewToScope, mergeAppliedScope, emptyWorkspace, normalizeWorkspace, requirementForAI, type MapNode, type Edge, type RequirementRow, type ChangeRow, type StoredDocument, type WorkspaceSnapshot, type ApprovedScope } from '../../../src/domain/workspace';
import { loadWorkspace, saveWorkspace, confirmWorkspaceBaseline, approveWorkspaceChange, WorkspaceSaveQueue, type WorkspaceRecord } from '../../../src/services/workspace-store';
import Icon, { type IconName } from '../../components/Icon';
import Dialog from '../../components/Dialog';
import './workspace-design.css';

type WorkspaceTab = 'overview' | 'map' | 'requirements' | 'changes' | 'history';
type SuggestedNode = { tempId: string; parentTempId?: string; title: string; summary?: string; category: string; requirementIds: string[]; suggestedRole?: string; suggestedMemberId?: string };

const initialNodes: MapNode[] = [
  { id: 'root', title: 'Project', kind: 'project', owner: 'Project team', requirements: 0, x: 640, y: 280, requirementIds: [] },
];
const initialEdges: Edge[] = [];
const initialRequirements: RequirementRow[] = [];
const initialChanges: ChangeRow[] = [];

export default function WorkspacePage() {
  const params = useParams();
  return <ProjectWorkspace key={String(params.projectId)} projectId={String(params.projectId)} />;
}

function ProjectWorkspace({ projectId }: { projectId: string }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [projectTitle, setProjectTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [nodes, setNodes] = useState(initialNodes);
  const [edges, setEdges] = useState(initialEdges);
  const [selectedId, setSelectedId] = useState('root');
  const [connectMode, setConnectMode] = useState(false);
  const [panMode, setPanMode] = useState(false);
  const [adding, setAdding] = useState<'node' | 'requirement' | null>(null);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; nodeX: number; nodeY: number } | null>(null);
  const [hand, setHand] = useState<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('overview');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [requirements, setRequirements] = useState<RequirementRow[]>(initialRequirements);
  const [changes, setChanges] = useState<ChangeRow[]>(initialChanges);
  const [history, setHistory] = useState<string[]>([]);
  const [baselineConfirmed, setBaselineConfirmed] = useState(false);
  const [showBaselinePrompt, setShowBaselinePrompt] = useState(false);
  const baselinePromptedRef = useRef(false);
  const [nodeNotes, setNodeNotes] = useState<Record<string, string>>({});
  const [clientMessage, setClientMessage] = useState('');
  const [changeFile, setChangeFile] = useState<File | null>(null);
  const [pendingReview, setPendingReview] = useState<ChangeReview | null>(null);
  const reviewedScopeRef = useRef('');
  const [copied, setCopied] = useState(false);
  const [briefText, setBriefText] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [mapProposal, setMapProposal] = useState<SuggestedNode[] | null>(null);
  const [aiBusy, setAiBusy] = useState<'change' | 'brief' | 'pdf' | 'map' | null>(null);
  const [aiStage, setAiStage] = useState('');
  const aiElapsed = useElapsedSeconds(aiBusy !== null);
  const [aiError, setAiError] = useState('');
  const [briefProposals, setBriefProposals] = useState<RequirementRow[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [ownerName, setOwnerName] = useState('');
  const [ownerAvatar, setOwnerAvatar] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [cloudReady, setCloudReady] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'pending'>('saved');
  const [mutationBusy, setMutationBusy] = useState(false);
  const [approvedScope, setApprovedScope] = useState<ApprovedScope | null>(null);
  const [aiMembers, setAiMembers] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [reviewTarget, setReviewTarget] = useState<ChangeRow | null>(null);
  const [reviewPrice, setReviewPrice] = useState('');
  const [reviewTime, setReviewTime] = useState('');
  const [reviewDeadline, setReviewDeadline] = useState('');
  const [reviewExplanation, setReviewExplanation] = useState('');
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewLink, setReviewLink] = useState('');
  const [reviewLinkCopied, setReviewLinkCopied] = useState(false);
  const [changeReviews, setChangeReviews] = useState<Record<string, Array<{ status: string; token: string }>>>({});
  const queueRef = useRef<WorkspaceSaveQueue | null>(null);
  const lastSavedRef = useRef('');
  const operationRef = useRef(false);
  const loadingRef = useRef(false);
  const cloudVersionRef = useRef(0);
  const snapshot = useMemo<WorkspaceSnapshot>(() => ({ nodes, edges, requirements, changes, history, nodeNotes, documents, briefProposals }), [nodes, edges, requirements, changes, history, nodeNotes, documents, briefProposals]);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;
  const canvasRef = useRef<HTMLDivElement>(null);
  const inspectorRef = useRef<HTMLElement>(null);
  const detailsButtonRef = useRef<HTMLButtonElement>(null);
  const nodeMovedRef = useRef(false);
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0];
  const pendingChanges = changes.filter((change) => change.decision === 'Pending');
  const workAreas = nodes.filter((node) => node.kind === 'work_area');
  const assigned = requirements.filter((row) => row.owner !== 'Unassigned').length;
  const coverage = requirements.length === 0 ? 0 : Math.round((assigned / requirements.length) * 100);
  const latestDocument = documents[documents.length - 1];
  const linkedRequirements = requirements.filter((row) => selected?.requirementIds.includes(row.id));
  const editable = canEdit && !mutationBusy;
  const selectedIsApproved = selected.kind === 'project' ? baselineConfirmed : Boolean(approvedScope?.nodes.some((node) => node.id === selected.id));

  function showSnapshot(data: WorkspaceSnapshot) {
    snapshotRef.current = data;
    setNodes(data.nodes); setEdges(data.edges); setRequirements(data.requirements);
    setChanges(data.changes); setHistory(data.history); setNodeNotes(data.nodeNotes);
    setDocuments(data.documents); setBriefProposals(data.briefProposals);
  }

  function showRecord(record: WorkspaceRecord) {
    cloudVersionRef.current = record.version;
    lastSavedRef.current = JSON.stringify(record.snapshot);
    if (queueRef.current) queueRef.current.version = record.version;
    showSnapshot(record.snapshot);
    setApprovedScope(record.approved_scope);
    setBaselineConfirmed(record.approved_scope !== null);
  }

  useEffect(() => {
    loadProject();
  }, [projectId]);

  async function loadProject() {
    if (loadingRef.current) return;
    loadingRef.current = true;
    try {
      setLoading(true); setLoadError(''); setCloudReady(false);
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

      if (error) throw error;
      if (!project) {
        router.push('/projects');
        return;
      }

      setProjectTitle(project.name);
      setClientName(project.client_name);
      const owner = await ownerIdentity(project.owner_id, user.id);
      setOwnerName(owner.name);
      setOwnerAvatar(owner.avatar);

      const ownerAccess = project.owner_id === user.id;
      let editAccess = ownerAccess;
      if (!ownerAccess) {
        const { data: member, error: memberError } = await supabase.from('project_members').select('role').eq('project_id', projectId).eq('user_id', user.id).not('accepted_at', 'is', null).maybeSingle();
        if (memberError) throw memberError;
        editAccess = member?.role === 'editor' || member?.role === 'owner';
      }
      setIsOwner(ownerAccess); setCanEdit(editAccess);
      try {
        const { data: memberRows } = await supabase.from('project_members').select('user_id, role').eq('project_id', projectId).not('accepted_at', 'is', null);
        const memberIds = [...new Set([project.owner_id as string, ...(memberRows ?? []).map((row) => row.user_id as string)])];
        const profiles = await loadProfiles(memberIds);
        setAiMembers(memberIds.map((id) => ({
          id,
          name: profileLabel(profiles.get(id) ?? null, id === user.id ? googleName(user) || user.email || '' : '') || `Member ${id.slice(0, 4)}`,
          role: id === project.owner_id ? 'owner' : (memberRows ?? []).find((row) => row.user_id === id)?.role ?? 'editor',
        })));
      } catch { setAiMembers([]); }
      let record = await loadWorkspace(projectId);
      if (!record && ownerAccess) {
        const fallback = emptyWorkspace(project.name, owner.name);
        // Only the owner imports the older device's copy. Keep it as a backup.
        const legacy = ownerAccess ? window.localStorage.getItem(`briefdiff-project-${projectId}`) : null;
        const imported = legacy ? normalizeWorkspace(JSON.parse(legacy), fallback) : fallback;
        record = await saveWorkspace(projectId, imported, 0);
      }
      if (!record && !ownerAccess) throw new Error('The project owner needs to open this project on the original device once to move it online.');
      if (editAccess) {
        queueRef.current = new WorkspaceSaveQueue(record?.version ?? 0, async (data, version) => {
          const saved = await saveWorkspace(projectId, data, version);
          lastSavedRef.current = JSON.stringify(data);
          cloudVersionRef.current = saved.version;
          return saved;
        });
      }
      if (record) showRecord(record);
      else showSnapshot(emptyWorkspace(project.name, owner.name));
      setCloudReady(true);
      void loadReviews();
      // Sample-project onboarding: prefill the demo brief so the first AI
      // extraction is one click away, then strip the flag from the URL.
      if (new URLSearchParams(window.location.search).get('sample') === '1' && (record?.snapshot.requirements.length ?? 0) === 0) {
        setBriefText(SAMPLE_BRIEF);
        setActiveTab('requirements');
        router.replace(`/workspace/${projectId}`);
      }
    } catch (err) {
      console.error('Failed to load project:', err);
      setLoadError(err instanceof Error ? err.message : 'Could not load the online workspace.');
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!cloudReady || !canEdit || operationRef.current || JSON.stringify(snapshot) === lastSavedRef.current) return;
    queueRef.current?.enqueue(snapshot);
    setSaveStatus('pending');
    const timer = window.setTimeout(() => { void flushWorkspace().catch(() => undefined); }, 500);
    return () => window.clearTimeout(timer);
  }, [snapshot, cloudReady, canEdit]);

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (canEdit && cloudReady && JSON.stringify(snapshotRef.current) !== lastSavedRef.current) {
        event.preventDefault(); event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warnUnsaved);
    return () => window.removeEventListener('beforeunload', warnUnsaved);
  }, [canEdit, cloudReady]);

  useEffect(() => {
    if (!cloudReady) return;
    let stopped = false;
    const refresh = async () => {
      if (document.visibilityState !== 'visible' || operationRef.current || JSON.stringify(snapshotRef.current) !== lastSavedRef.current) return;
      try {
        const record = await loadWorkspace(projectId);
        if (!stopped && record && record.version > cloudVersionRef.current && !operationRef.current && JSON.stringify(snapshotRef.current) === lastSavedRef.current) {
          showRecord(record); setPendingReview(null); setSaveStatus('saved');
        }
      } catch { /* Keep the displayed work; the next save shows an actionable error. */ }
    };
    const timer = window.setInterval(() => void refresh(), 15000);
    window.addEventListener('focus', refresh);
    return () => { stopped = true; window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [cloudReady, projectId]);

  async function flushWorkspace() {
    const queue = queueRef.current;
    if (!queue) return;
    if (JSON.stringify(snapshotRef.current) !== lastSavedRef.current) queue.enqueue(snapshotRef.current);
    setSaveStatus('saving'); setSaveError('');
    try {
      await queue.flush();
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('pending');
      setSaveError(error instanceof Error ? error.message : 'Could not save your work. Please try again.');
      throw error;
    }
  }

  function downloadUnsavedWork() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(snapshotRef.current, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = `workspace-${projectId}.json`; link.click(); URL.revokeObjectURL(url);
  }

  useEffect(() => {
    if (activeTab !== 'map' || loading || loadError) return;
    const viewport = canvasRef.current;
    if (!viewport) return;

    const onMapWheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.deltaY === 0) return;
      setZoom((current) => Math.max(0.25, Math.min(2, current + (event.deltaY < 0 ? .08 : -.08))));
    };

    viewport.addEventListener('wheel', onMapWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', onMapWheel);
  }, [activeTab, loading, loadError]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const mapSize = useMemo(() => ({
    width: Math.max(2400, ...nodes.map((node) => node.x + CARD_W + 240)),
    height: Math.max(1400, ...nodes.map((node) => node.y + CARD_H + 240)),
  }), [nodes]);
  const updateZoom = (next: number) => setZoom(Math.max(0.25, Math.min(2, next)));


  function fitMap() {
    const viewport = canvasRef.current;
    if (!viewport || nodes.length === 0) return;
    const left = Math.min(...nodes.map((node) => node.x));
    const top = Math.min(...nodes.map((node) => node.y));
    const width = Math.max(...nodes.map((node) => node.x + CARD_W)) - left;
    const height = Math.max(...nodes.map((node) => node.y + CARD_H)) - top;
    const scale = Math.max(.25, Math.min(1, (viewport.clientWidth - 72) / width, (viewport.clientHeight - 96) / height));
    setZoom(scale);
    setPan({ x: (viewport.clientWidth - width * scale) / 2 - left * scale, y: (viewport.clientHeight - height * scale) / 2 - top * scale });
  }

  useEffect(() => {
    if (activeTab !== 'map' || loading) return;
    const frame = requestAnimationFrame(fitMap);
    return () => cancelAnimationFrame(frame);
  }, [activeTab, loading, nodes.length, detailsOpen]);

  useEffect(() => {
    if (!detailsOpen || !window.matchMedia('(max-width: 1000px)').matches) return;
    const frame = requestAnimationFrame(() => inspectorRef.current?.scrollIntoView({ block: 'start' }));
    return () => cancelAnimationFrame(frame);
  }, [detailsOpen, selectedId]);

  function closeDetails() {
    setDetailsOpen(false);
    detailsButtonRef.current?.focus({ preventScroll: true });
  }

  function selectNode(id: string) {
    if (panMode) return;
    if (connectMode) {
      if (!editable) return;
      if (!connectSource) { setConnectSource(id); return; }
      if (connectSource !== id && !edges.some((edge) => (edge.from === connectSource && edge.to === id) || (edge.from === id && edge.to === connectSource))) {
        setEdges((current) => [...current, { id: `e-${Date.now()}`, from: connectSource, to: id }]);
      }
      setConnectMode(false); setConnectSource(null); return;
    }
    setSelectedId(id);
    if (!nodeMovedRef.current) setDetailsOpen(true);
    nodeMovedRef.current = false;
  }

  function onNodePointerDown(event: React.PointerEvent, node: MapNode) {
    nodeMovedRef.current = false;
    if (!editable || event.button !== 0 || connectMode || panMode) return;
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setDrag({ id: node.id, x: event.clientX, y: event.clientY, nodeX: node.x, nodeY: node.y });
  }

  function onNodePointerMove(event: React.PointerEvent) {
    if (!drag) return;
    const dx = (event.clientX - drag.x) / zoom;
    const dy = (event.clientY - drag.y) / zoom;
    if (Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y) > 4) nodeMovedRef.current = true;
    setNodes((current) => current.map((node) => node.id === drag.id ? { ...node, x: drag.nodeX + dx, y: drag.nodeY + dy } : node));
  }

  function onCanvasPointerDown(event: React.PointerEvent) {
    if (event.button !== 2 && !(panMode && event.button === 0)) return;
    event.preventDefault();
    setHand({ x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y });
    canvasRef.current?.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event: React.PointerEvent) {
    if (!hand) return;
    setPan({ x: hand.panX + event.clientX - hand.x, y: hand.panY + event.clientY - hand.y });
  }

  function addNode() {
    if (!editable) return;
    setNewItemTitle(''); setAdding('node');
  }

  function addRequirement() {
    if (!editable) return;
    setNewItemTitle(''); setAdding('requirement');
  }

  function submitNewItem(event: React.FormEvent) {
    event.preventDefault();
    const title = newItemTitle.trim();
    if (!title || !editable || !adding) return;
    if (adding === 'node') {
      const id = `node-${Date.now()}`;
      setNodes((current) => [...current, { id, title, kind: 'work_area', owner: 'Unassigned', requirements: 0, x: 720, y: 650, requirementIds: [] }]);
      setSelectedId(id);
    } else {
      const id = `REQ-${String(19 + requirements.length).padStart(3, '0')}`;
      setRequirements((current) => [...current, { id, title, description: title, area: 'Unassigned', owner: 'Unassigned', source: 'Manual', status: 'Review' }]);
      setHistory((current) => [`${id} added manually · Just now`, ...current]);
    }
    setAdding(null); setNewItemTitle('');
  }

  async function reviewChange(event: React.FormEvent) {
    event.preventDefault();
    const raw = clientMessage.trim();
    if ((!raw && !changeFile) || aiBusy || !editable) return;
    if (!approvedScope) { setAiError('Confirm the baseline before reviewing a change.'); return; }
    setAiBusy('change');
    setAiStage('Comparing the request with the approved scope');
    setPendingReview(null);
    setAiError('');
    setCopied(false);
    const context = {
      projectId,
      text: raw,
      members: aiMembers,
    };
    try {
      await flushWorkspace();
      const response = changeFile
        ? await authenticatedFetch('/api/changes', { method: 'POST', body: (() => { const body = new FormData(); body.set('file', changeFile); body.set('context', JSON.stringify(context)); return body; })() })
        : await authenticatedFetch('/api/changes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(context) });
      const payload = await response.json().catch(() => ({})) as { data?: ChangeReview; error?: string; workspaceVersion?: number; document?: StoredDocument };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'AI request failed.');
      if (payload.workspaceVersion !== queueRef.current?.version) throw new Error('The approved scope changed. Reload the project and review the request again.');
      setPendingReview(payload.data);
      reviewedScopeRef.current = JSON.stringify(approvedScope);
      if (payload.document) setDocuments((current) => current.some((item) => item.id === payload.document!.id) ? current : [...current, payload.document!]);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setAiBusy(null);
    }
  }

  async function applyReview() {
    if (!pendingReview || !approvedScope || pendingReview.edits.length === 0 || !editable) return;
    if (reviewedScopeRef.current !== JSON.stringify(approvedScope)) { setAiError('The approved scope changed. Review the request again.'); return; }
    operationRef.current = true; setMutationBusy(true); setAiError('');
    try {
    await flushWorkspace();
    const source = changeFile?.name || 'Change brief';
    const idPrefix = crypto.randomUUID();
    const nextScope = applyReviewToScope(approvedScope, pendingReview, source, idPrefix);
    const nextDraft = mergeAppliedScope(snapshotRef.current, approvedScope, nextScope);
    const next: WorkspaceSnapshot = { ...snapshotRef.current, ...nextDraft,
      changes: [{ id: `change-${idPrefix}`, title: pendingReview.summary, type: pendingReview.magnitude === 'major' ? 'NEW SYSTEM' : 'UPDATED', detail: clientMessage || source, decision: 'Applied to map', explanation: pendingReview.explanation }, ...changes],
      history: [`Current approved scope updated · ${new Date().toISOString()}`, ...history],
    };
    const record = await approveWorkspaceChange(projectId, next, nextScope, pendingReview, queueRef.current!.version);
    showRecord(record); setSaveStatus('saved');
    setPendingReview(null);
    setClientMessage('');
    setChangeFile(null);
    setActiveTab('map');
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Could not apply the change.');
    } finally { operationRef.current = false; setMutationBusy(false); }
  }

  async function copyClientMessage() {
    if (!pendingReview?.clientMessage) return;
    await navigator.clipboard.writeText(pendingReview.clientMessage);
    setCopied(true);
  }

  async function readBrief(event: React.FormEvent) {
    event.preventDefault();
    const text = briefText.trim();
    if (!text || aiBusy || !editable) return;
    setAiBusy('brief');
    setAiStage('Extracting requirements from the brief');
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
    if (!pdfFile || aiBusy || !editable) return;
    setAiBusy('pdf');
    setAiStage('Uploading and reading the PDF');
    setAiError('');
    const body = new FormData();
    body.set('file', pdfFile);
    body.set('projectId', projectId);
    try {
      const response = await authenticatedFetch('/api/documents', {
        method: 'POST',
        body,
      });
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
      setAiStage('Building the project map');
      await drawMap(projectTitle, next);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setAiBusy(null);
    }
  }

  function editProposal(id: string, patch: Partial<RequirementRow>) {
    if (!editable) return;
    setBriefProposals((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row));
  }

  function acceptBriefProposals() {
    if (!editable) return;
    if (briefProposals.length === 0) return;
    setRequirements((current) => [...current.filter((existing) => !briefProposals.some((item) => existing.id === item.id)), ...briefProposals]);
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
      members: aiMembers,
    });
    if (suggested.length === 0) throw new Error('The model did not suggest any work areas.');
    const laid = layoutFromStructure(title, suggested, aiMembers, rows.map((row) => row.id));
    setNodes(laid.nodes);
    setEdges(laid.edges);
    setSelectedId('root');
    setMapProposal(null);
    setActiveTab('map');
    setHistory((current) => [`Project map built with ${laid.nodes.length - 1} work areas · Just now`, ...current]);
    if (!baselineConfirmed && isOwner && !baselinePromptedRef.current) {
      baselinePromptedRef.current = true;
      setShowBaselinePrompt(true);
    }
  }

  async function buildMap() {
    if (requirements.length === 0 || aiBusy || !editable) return;
    setAiBusy('map');
    setAiStage('Creating the project map');
    setAiError('');
    try {
      await drawMap(projectTitle, requirements);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setAiBusy(null);
    }
  }

  function decideChange(id: string, commercialDecision: string) {
    if (!editable) return;
    setChanges((current) => current.map((change) => change.id === id ? { ...change, commercialDecision } : change));
    setHistory((current) => [`${changes.find((change) => change.id === id)?.title ?? 'Change'} marked ${commercialDecision} · ${new Date().toISOString()}`, ...current]);
  }

  async function loadReviews() {
    try {
      const response = await authenticatedFetch(`/api/reviews?projectId=${projectId}`);
      const payload = await response.json().catch(() => ({})) as { data?: Array<{ changeId: string; token: string; status: string }> };
      if (!response.ok || !payload.data) return;
      const grouped: Record<string, Array<{ status: string; token: string }>> = {};
      for (const row of payload.data) {
        if (!row.changeId) continue;
        grouped[row.changeId] = [...(grouped[row.changeId] ?? []), { status: row.status, token: row.token }];
      }
      setChangeReviews(grouped);
    } catch { /* Review status badges are optional; the page still works without them. */ }
  }

  function openReviewDialog(change: ChangeRow) {
    if (!editable) return;
    setReviewTarget(change);
    setReviewPrice('');
    setReviewTime('');
    setReviewDeadline('');
    setReviewExplanation('');
    setReviewLink('');
    setReviewLinkCopied(false);
    setAiError('');
  }

  async function draftReviewExplanation() {
    if (!reviewTarget || reviewBusy) return;
    setReviewBusy(true);
    setAiError('');
    try {
      const price = reviewPrice.trim() ? Number(reviewPrice) : undefined;
      const explanation = await runAI<string>({
        task: 'draft_change_explanation',
        change: {
          id: reviewTarget.id,
          projectId,
          rawRequest: reviewTarget.detail,
          summary: reviewTarget.title,
          classification: reviewTarget.type === 'NEW SYSTEM' ? 'new_scope' : 'modified',
          price: Number.isFinite(price) ? price : undefined,
          newDeadline: reviewDeadline || undefined,
        },
        existingScopeSummary: approvedScope?.requirements.map((row) => row.title).join('; ') ?? '',
      });
      setReviewExplanation(explanation);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'AI request failed.');
    } finally {
      setReviewBusy(false);
    }
  }

  async function publishReview() {
    if (!reviewTarget || reviewBusy || !reviewExplanation.trim()) return;
    setReviewBusy(true);
    setAiError('');
    try {
      await flushWorkspace();
      const response = await authenticatedFetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          projectId,
          changeId: reviewTarget.id,
          rawRequest: reviewTarget.detail,
          summary: reviewTarget.title,
          classification: reviewTarget.type === 'NEW SYSTEM' ? 'new_scope' : 'modified',
          clientExplanation: reviewExplanation.trim(),
          priceThb: reviewPrice.trim() ? Number(reviewPrice) : null,
          extraTimeText: reviewTime.trim(),
          newDeadline: reviewDeadline || null,
        }),
      });
      const payload = await response.json().catch(() => ({})) as { data?: { token: string; path: string }; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error || 'Could not create the client review link.');
      setReviewLink(`${window.location.origin}${payload.data.path}`);
      setHistory((current) => [`Client review link sent for ${reviewTarget.title} · ${new Date().toISOString()}`, ...current]);
      void loadReviews();
    } catch (error) {
      setAiError(error instanceof Error ? error.message : 'Could not create the client review link.');
    } finally {
      setReviewBusy(false);
    }
  }

  async function copyReviewLink() {
    if (!reviewLink) return;
    await navigator.clipboard.writeText(reviewLink);
    setReviewLinkCopied(true);
  }

  async function confirmBaseline() {
    if (baselineConfirmed || !isOwner || !editable || aiBusy) return;
    if (requirements.length === 0) { setAiError('Add requirements before confirming the baseline.'); return; }
    operationRef.current = true; setMutationBusy(true); setAiError('');
    try {
      await flushWorkspace();
      showRecord(await confirmWorkspaceBaseline(projectId, queueRef.current!.version));
      setSaveStatus('saved');
      setShowBaselinePrompt(false);
    } catch (error) { setAiError(error instanceof Error ? error.message : 'Could not confirm the baseline.'); }
    finally { operationRef.current = false; setMutationBusy(false); }
  }

  const tabItems: Array<{ id: WorkspaceTab; icon: IconName; label: string; count?: number }> = [
    { id: 'overview', icon: 'grid', label: 'Overview' },
    { id: 'map', icon: 'map', label: 'Project Map' },
    { id: 'requirements', icon: 'list', label: 'Requirements', count: requirements.length },
    { id: 'changes', icon: 'changes', label: 'Changes', count: pendingChanges.length },
    { id: 'history', icon: 'history', label: 'Activity' },
  ];
  const tabTitle = { overview: 'Project overview', map: 'Project Map', requirements: 'Brief and requirements', changes: 'Review scope changes', history: 'Project activity' }[activeTab];
  const tabDescription = { overview: 'Scope, responsibilities, and pending decisions in one place.', map: 'See how your work connects. Click a node for details.', requirements: 'Import a brief, review AI suggestions, and add requirements to your project.', changes: 'Compare new requests with the agreed scope before taking on more work.', history: 'Review requirements, proposals, and team decisions.' }[activeTab];

  if (loading) return <main className="workspace-app"><div className="app-loading" role="status"><div className="spinner" /><p>Opening project...</p></div></main>;
  if (loadError) return <main className="workspace-app"><div className="workspace-load-error" role="alert"><h2>Could not load the project</h2><p>{loadError}</p><button className="button-primary" onClick={loadProject}>Try again</button><a href="/projects">Back to projects</a></div></main>;

  return (
    <main className="workspace-app">
      <header className="workspace-topbar">
        <div className="workspace-crumb"><a className="workspace-back" href="/projects"><Icon name="back" size={15} />Projects</a><b>/</b><strong>{projectTitle}</strong></div>
        <div className={`workspace-save-state ${saveError ? 'has-error' : ''}`} data-state={saveStatus} role={saveError ? 'alert' : 'status'}>
          <Icon name={saveError ? 'changes' : saveStatus === 'saved' ? 'check' : 'history'} size={13} />
          <span>{saveError || (!canEdit ? 'View only' : saveStatus === 'saved' ? 'Saved online' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes')}</span>
          {saveError && <><button onClick={() => void flushWorkspace().catch(() => undefined)}>Retry save</button><button onClick={downloadUnsavedWork}>Download backup</button><button onClick={() => window.location.reload()}>Reload latest version</button></>}
        </div>
        <div className="workspace-context-actions"><ProjectPeople projectId={projectId} /><button className="button-light" onClick={() => setShowShareModal(true)}><Icon name="share" size={15} />Share project</button></div>
      </header>
      <div className="workspace-project-header"><div><h1>{projectTitle}</h1><p>Client · {clientName}<span>{latestDocument ? `Brief V${latestDocument.version} · ${latestDocument.name}` : 'No brief imported yet'}</span></p></div><span className={`project-baseline-state ${baselineConfirmed ? 'confirmed' : ''}`}><Icon name={baselineConfirmed ? 'check' : 'shield'} size={14} />{baselineConfirmed ? 'Baseline V1 confirmed' : 'Scope is still a draft'}</span></div>
      <div className="workspace-navigation">
        <nav aria-label="Project navigation">{tabItems.map(({ id, icon, label, count }) => <button key={id} className={activeTab === id ? 'side-active' : ''} aria-pressed={activeTab === id} onClick={() => setActiveTab(id)}><Icon name={icon} size={16} /><span>{label}</span>{count !== undefined && <em className={id === 'changes' && count > 0 ? 'danger' : ''}>{count}</em>}</button>)}</nav>
        <button ref={detailsButtonRef} className="details-toggle" aria-expanded={detailsOpen} aria-controls="node-details" onClick={() => detailsOpen ? closeDetails() : setDetailsOpen(true)}><Icon name="list" size={15} />{activeTab === 'map' ? 'Node details' : 'Work details'}</button>
      </div>
      <div className={`workspace-layout ${detailsOpen ? 'with-inspector' : ''}`}>
        <section className={`workspace-main ${activeTab === 'map' ? 'workspace-map' : ''}`} aria-label={tabTitle}>
          <div className="workspace-header"><div><h2>{tabTitle}</h2><p>{tabDescription}</p></div></div>
          {activeTab === 'overview' && <div className="workspace-overview">
            <div className="overview-metrics">
              <div className="metric-card"><small>Approved scope</small><strong>{approvedScope?.requirements.length ?? 0} <i>{approvedScope?.requirements.length === 1 ? 'requirement' : 'requirements'}</i></strong><span>Baseline and approved additions</span></div>
              <div className="metric-card"><small>Awaiting decision</small><strong className={pendingChanges.length ? 'rose-text' : ''}>{pendingChanges.length} <i>{pendingChanges.length === 1 ? 'request' : 'requests'}</i></strong><span>Requests to review and decide</span></div>
              <div className="metric-card"><small>Assigned requirements</small><strong>{coverage}<i>%</i></strong><span>{assigned} of {requirements.length} requirements</span></div>
              <div className="metric-card"><small>Original baseline</small><strong className={baselineConfirmed ? 'green-text' : ''}>{baselineConfirmed ? 'V1' : 'Draft'}</strong><span>{baselineConfirmed ? 'Confirmed and locked' : 'Scope not yet confirmed'}</span></div>
            </div>
            {!baselineConfirmed && <section className="overview-next"><header><h3>Scope is still a draft</h3><p>Review the brief and map before confirming the agreed scope.</p></header><div className="workflow-steps">
              <button className="button-light" onClick={() => setActiveTab('requirements')}>Add brief and requirements<Icon name="arrow" size={14} /></button>
              <button className="button-light" onClick={() => setActiveTab('map')}>Review project map<Icon name="arrow" size={14} /></button>
              <button className="button-primary" disabled={!isOwner || !editable || aiBusy !== null || requirements.length === 0} onClick={confirmBaseline}>{mutationBusy ? 'Confirming...' : 'Confirm baseline'}</button>
            </div>{aiError && <p className="ai-error" role="alert">{aiError}</p>}</section>}
            <div className="overview-columns">
              <div className="overview-card"><header><div><h3>Work areas <span>{workAreas.length}</span></h3><p>Responsibilities and linked requirements</p></div><button onClick={() => setActiveTab('map')}>Open map →</button></header>{workAreas.length === 0 ? <div className="overview-empty"><p>No work areas in the map yet.</p><button className="button-light" onClick={() => setActiveTab('requirements')}>Add brief and requirements</button></div> : workAreas.map((node) => <button className="overview-work-row" key={node.id} onClick={() => { setSelectedId(node.id); setDetailsOpen(true); setActiveTab('map'); }}><span><strong>{node.title}</strong><small>{node.owner === 'Unassigned' ? 'Unassigned' : node.owner}</small></span><em>{requirementCount(node.requirementIds.length)}</em><Icon name="arrow" size={14} /></button>)}</div>
              <div className="overview-card"><header><div><h3>Pending decisions</h3><p>New requests and scope changes</p></div><button onClick={() => setActiveTab('changes')}>View all →</button></header>{pendingChanges.length === 0 ? <div className="overview-empty"><Icon name="check" size={25} /><p>No requests awaiting a decision.</p><button className="button-light" onClick={() => setActiveTab('changes')}>Review a new request<Icon name="arrow" size={14} /></button></div> : pendingChanges.slice(0, 3).map((change) => <button className="overview-change" key={change.id} onClick={() => setActiveTab('changes')}><em>{change.type.split(' ')[0]}</em><span><strong>{change.title}</strong><small>{change.decision === 'Pending' ? 'Awaiting decision' : change.decision}</small></span><Icon name="arrow" size={14} /></button>)}</div>
            </div>
            {history.length > 0 && <div className="overview-card overview-activity"><header><h3>Recent activity</h3><button onClick={() => setActiveTab('history')}>View activity →</button></header>{history.slice(0, 3).map((item, index) => <div className="history-row" key={`${item}-${index}`}><span><strong>{item.split(' · ')[0]}</strong><small>{activityTime(item.split(' · ')[1])}</small></span></div>)}</div>}
          </div>}
          {activeTab === 'requirements' && <div className="workspace-table">
            <header><div><h3>Brief and requirements <span className="beta-label">{requirements.length}</span></h3><p>Review and add AI suggestions before confirming the agreed scope.</p></div><button className="button-primary" onClick={addRequirement} disabled={!editable}><Icon name="plus" size={15} />Add requirement</button></header>
            <div className="brief-inputs">
              <form className="ai-composer" onSubmit={readPdf}><label htmlFor="brief-pdf"><Icon name="upload" size={17} />Import a PDF brief</label><input id="brief-pdf" type="file" accept="application/pdf,.pdf" disabled={!editable || aiBusy !== null} onChange={(event) => setPdfFile(event.target.files?.[0] ?? null)} /><p className="ai-note">Save each document version, suggest requirements, and build a project map.</p><div className="composer-actions"><button className="button-primary" type="submit" disabled={!editable || aiBusy !== null || !pdfFile}><Icon name="spark" size={15} />{aiBusy === 'pdf' ? 'Reading brief and building map...' : 'Read PDF brief'}</button></div></form>
              <form className="ai-composer" onSubmit={readBrief}><label htmlFor="brief-text"><Icon name="file" size={17} />Or paste your brief</label><textarea id="brief-text" readOnly={!editable} value={briefText} onChange={(event) => setBriefText(event.target.value)} placeholder="Paste your brief or client requirements here..." /><div className="composer-actions"><button className="button-light" type="submit" disabled={!editable || aiBusy !== null || !briefText.trim()}>{aiBusy === 'brief' ? 'Reading brief...' : 'Extract requirements'}</button></div></form>
            </div>
            {aiError && <p className="ai-error" role="alert" style={{ margin: '0 20px 20px' }}>{aiError}</p>}
            {briefProposals.length > 0 && <div className="ai-proposals"><strong>AI suggestions · {requirementCount(briefProposals.length)}</strong><p>Edit the titles and descriptions before adding them. Adding requirements does not confirm the baseline.</p>{briefProposals.map((row) => <div className="proposal-row" key={row.id}><label className="sr-only" htmlFor={`proposal-title-${row.id}`}>Requirement title</label><input id={`proposal-title-${row.id}`} readOnly={!editable} value={row.title} onChange={(event) => editProposal(row.id, { title: event.target.value })} /><label className="sr-only" htmlFor={`proposal-detail-${row.id}`}>Requirement description</label><textarea id={`proposal-detail-${row.id}`} readOnly={!editable} value={row.description} onChange={(event) => editProposal(row.id, { description: event.target.value })} /><small>{row.source} · {row.status}{row.quote ? ` · "${row.quote}"` : ''}</small></div>)}<button className="button-primary" type="button" disabled={!editable} onClick={acceptBriefProposals}>Add for review<Icon name="arrow" size={15} /></button></div>}
            {requirements.length === 0 ? <p className="table-empty">No requirements yet<br />Import a brief above or add a requirement manually.</p> : <div className="requirements-list"><div className="requirement-head"><span>Requirements</span><span>Assigned to</span><span>Source</span><span>Status</span></div>{requirements.map((row) => <div className="requirement-row" key={row.id}><span><strong>{row.title}</strong><small>{row.id} · {row.area}{row.quote ? ` · "${row.quote.slice(0, 90)}"` : ''}</small></span><b>{row.owner === 'Unassigned' ? 'Unassigned' : row.owner}</b><span className="requirement-source">{row.source}</span><em className={row.status === 'Clear' ? '' : 'review'}>{({ Clear: 'Clear', Review: 'Review', Proposal: 'Proposal', 'Needs review': 'Needs review', Approved: 'Approved' } as Record<string, string>)[row.status] || row.status}</em></div>)}</div>}
          </div>}
          {activeTab === 'changes' && <div className="workspace-table">
            <header><div><h3>New client request</h3><p>{baselineConfirmed ? 'AI compares the request with the approved scope. Review the result and decide how to handle additional work.' : 'Confirm the baseline first to establish a scope for comparison.'}</p></div></header>
            <form className="ai-composer" onSubmit={reviewChange}><label htmlFor="client-message">Client message or new brief</label><textarea id="client-message" readOnly={!editable} value={clientMessage} onChange={(event) => setClientMessage(event.target.value)} placeholder="e.g. The client wants a membership system beyond the agreed website..." /><label htmlFor="change-pdf"><Icon name="upload" size={16} />Or attach a PDF brief</label><input id="change-pdf" type="file" accept="application/pdf,.pdf" disabled={!editable || aiBusy !== null} onChange={(event) => setChangeFile(event.target.files?.[0] ?? null)} /><div className="composer-actions"><button className="button-primary" type="submit" disabled={!editable || aiBusy !== null || (!clientMessage.trim() && !changeFile)}><Icon name="spark" size={15} />{aiBusy === 'change' ? 'Reviewing request...' : 'Compare with approved scope'}</button>{aiError && <span className="ai-error" role="alert">{aiError}</span>}</div></form>
            {pendingReview && <div className="ai-proposals review-result"><em>{reviewLabel(pendingReview)}</em><h3>{pendingReview.summary}</h3><p>{pendingReview.explanation}</p>{pendingReview.clientMessage && <div className="ai-explanation"><p>{pendingReview.clientMessage}</p><button className="button-light" type="button" onClick={copyClientMessage}>{copied ? 'Copied' : 'Copy client message'}</button></div>}{pendingReview.edits.length > 0 ? <div className="review-actions"><button className="button-light" type="button" disabled={!editable} onClick={() => { setPendingReview(null); setHistory((current) => ['Change review cancelled. The map was not changed · Just now', ...current]); }}>Cancel proposal</button><button className="button-primary" type="button" disabled={!editable || aiBusy !== null} onClick={applyReview}>Approve and update map<Icon name="arrow" size={15} /></button></div> : <p>No changes to the current map.</p>}</div>}
            <div className="change-review-banner"><Icon name="changes" size={18} /><div><strong>{pendingChanges.length} {pendingChanges.length === 1 ? 'request' : 'requests'} awaiting a decision</strong><span>Approval updates the scope. Record the pricing decision separately below.</span></div></div>
            {changes.length === 0 ? <p className="table-empty">No changes recorded yet.</p> : <div className="change-card-grid">{changes.map((change) => <article className="change-review-card" key={change.id}><em>{change.type}</em><h3>{change.title}</h3><p>{change.detail}</p>{change.explanation && <p className="ai-explanation">{change.explanation}</p>}<span>{change.confidence ? `Confidence: ${change.confidence} · ` : ''}Status: {change.decision === 'Pending' ? 'Pending' : change.decision}</span>{change.commercialDecision && <p>Pricing: {change.commercialDecision === 'Included' ? 'Included' : change.commercialDecision === 'Charge extra' ? 'Charge extra' : 'Needs discussion'}</p>}<div className="change-actions"><button aria-pressed={change.commercialDecision === 'Included'} disabled={!editable} onClick={() => decideChange(change.id, 'Included')}>Included</button><button aria-pressed={change.commercialDecision === 'Charge extra'} disabled={!editable} onClick={() => decideChange(change.id, 'Charge extra')}>Charge extra</button><button aria-pressed={change.commercialDecision === 'Needs discussion'} disabled={!editable} onClick={() => decideChange(change.id, 'Needs discussion')}>Discuss</button></div>{(changeReviews[change.id] ?? []).map((review) => <span className={`client-review-badge ${review.status}`} key={review.token}>{review.status === 'approved' ? 'Client approved' : review.status === 'needs_discussion' ? 'Client wants to talk' : 'Waiting for client'}</span>)}{editable && <button className="button-light client-review-open" type="button" onClick={() => openReviewDialog(change)}><Icon name="share" size={13} />Send to client for approval</button>}</article>)}</div>}
          </div>}
          {activeTab === 'history' && <div className="workspace-table history-list"><header><div><h3>All activity</h3><p>Project activity, with the most recent entries first.</p></div></header>{history.length === 0 ? <p className="table-empty">No activity yet.<br />New requirements and decisions will appear here.</p> : history.map((item, index) => <div className="history-row" key={`${item}-${index}`}><b>●</b><span><strong>{item.split(' · ')[0]}</strong><small>{activityTime(item.split(' · ')[1])}</small></span><em>Recorded</em></div>)}</div>}
          {activeTab === 'map' && <>
            {!baselineConfirmed && workAreas.length > 0 && requirements.length > 0 && <div className="map-baseline-prompt">
              <div><strong>Set your first agreed scope</strong><p>Confirm this baseline to compare future client requests with the work you agreed to do.</p>{!isOwner && <small>Only the project owner can confirm the baseline.</small>}</div>
              {isOwner && <button className="button-primary" disabled={!editable || aiBusy !== null} onClick={() => { setAiError(''); setShowBaselinePrompt(true); }}><Icon name="shield" size={15} />Confirm baseline</button>}
            </div>}
            <div className="workspace-actions" aria-label="Map tools"><button className="button-light zoom-button" aria-label="Zoom out" onClick={() => updateZoom(zoom - .1)}>−</button><span className="zoom-readout">{Math.round(zoom * 100)}%</span><button className="button-light zoom-button" aria-label="Zoom in" onClick={() => updateZoom(zoom + .1)}>+</button><span className="toolbar-divider" /><button className={`button-light ${panMode ? 'active' : ''}`} aria-pressed={panMode} onClick={() => { setPanMode((value) => !value); setConnectMode(false); setConnectSource(null); }}>Pan map</button><button className={`button-light connect ${connectMode ? 'active' : ''}`} aria-pressed={connectMode} disabled={!editable} onClick={() => { setConnectMode((value) => !value); setConnectSource(null); setPanMode(false); }}><Icon name="changes" size={13} />{connectMode ? 'Select 2 nodes' : 'Connect nodes'}</button><button className="button-light" type="button" onClick={buildMap} disabled={!editable || aiBusy !== null || requirements.length === 0}><Icon name="spark" size={13} />{aiBusy === 'map' ? 'Creating...' : 'Build from requirements'}</button><button className="button-primary map-add" onClick={addNode} disabled={!editable}><Icon name="plus" size={14} />Add node</button></div>
            {aiError && <p className="ai-error" role="alert">{aiError}</p>}
            <div className={`map-viewport ${hand ? 'is-panning' : ''} ${panMode ? 'pan-mode' : ''}`} ref={canvasRef} onContextMenu={(event) => event.preventDefault()} onPointerDown={onCanvasPointerDown} onPointerMove={onCanvasPointerMove} onPointerUp={() => setHand(null)} onPointerCancel={() => setHand(null)}>
              <div className="map-world" style={{ width: mapSize.width, height: mapSize.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
                <svg className="map-edges" width={mapSize.width} height={mapSize.height}>{edges.map((edge) => { const from = nodeById.get(edge.from); const to = nodeById.get(edge.to); if (!from || !to) return null; return <path key={edge.id} d={flowPath(from, to)} aria-label="Click to remove connection" onClick={() => editable && setEdges((current) => current.filter((item) => item.id !== edge.id))} />; })}</svg>
                {nodes.map((node) => { const parent = edges.find((edge) => edge.to === node.id); const label = node.kind === 'project' ? 'Project' : parent?.from === 'root' ? 'Work area' : 'Subtask'; return <button key={node.id} className={`map-node ${node.kind === 'project' ? 'project-node' : ''} ${node.impacted ? 'impacted' : ''} ${selectedId === node.id ? 'selected' : ''} ${connectSource === node.id ? 'connect-source' : ''}`} aria-pressed={selectedId === node.id} style={{ left: node.x, top: node.y }} onClick={() => selectNode(node.id)} onPointerDown={(event) => onNodePointerDown(event, node)} onPointerMove={onNodePointerMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}><span className="node-label">{label}{node.impacted && <i>Affected</i>}</span><strong>{node.title}</strong><small>{node.summary || requirementCount(node.requirementIds.length)}</small><footer><b className={`node-avatar ${node.owner.includes('Frontend') ? 'blue' : node.owner.includes('Growth') ? 'rose' : 'green'}`}>{node.owner[0] || '?'}</b><span>{node.owner === 'Unassigned' ? 'Unassigned' : node.owner}</span><em>{node.kind === 'project' ? (baselineConfirmed ? 'Baseline V1' : 'Draft') : requirementCount(node.requirementIds.length)}</em></footer></button>; })}
              </div>
              <div className="map-corner-tools"><button title="Fit map to screen" aria-label="Fit map to screen" onClick={fitMap}><Icon name="grid" size={13} /> Fit to screen</button><button title="Reset map view" onClick={() => { setPan({ x: 0, y: 0 }); setZoom(1); }}>Reset</button></div><div className="map-tip">Scroll to zoom · Right-drag to pan · Click a node for details</div>
            </div>
            <button className="map-details-link" onClick={() => { setDetailsOpen(true); inspectorRef.current?.scrollIntoView({ block: 'start' }); }}><Icon name="list" size={15} />View selected node details ↓</button>
            <p className="ai-note" style={{ marginTop: 10 }}>Click a node for responsibilities and details · Enable “Pan map” on touchscreens · Click a connection to remove it</p>
          </>}
        </section>
        {detailsOpen && <aside ref={inspectorRef} className="workspace-inspector" id="node-details" aria-label="Work details">
          <div className="inspector-heading"><strong>{selected.kind === 'project' ? 'Project details' : 'Node details'}</strong><button className="icon-button" aria-label="Close work details" onClick={closeDetails}><Icon name="close" size={16} /></button></div>
          <h2>{selected.title}</h2>
          <span className={`inspector-status ${selectedIsApproved && !selected.impacted ? 'confirmed' : ''}`}>{selected.impacted ? 'Affected by a new request' : selected.kind === 'project' ? (baselineConfirmed ? 'Baseline V1 confirmed' : 'Scope in progress') : selectedIsApproved ? 'In the approved scope' : 'Draft · Not in the approved scope'}</span>
          {selected.summary && <div className="inspector-section"><h3>Work details</h3><p className="inspector-summary">{selected.summary}</p></div>}
          <div className="inspector-section"><h3>Assigned to</h3><div className="inspector-owner">{selected.kind === 'project' && ownerAvatar ? <img className="node-avatar" src={ownerAvatar} alt="" /> : <b className="node-avatar green">{(selected.kind === 'project' ? ownerName : selected.owner)[0] || '?'}</b>}<span>{selected.kind === 'project' ? (ownerName || selected.owner) : selected.owner === 'Unassigned' ? 'Unassigned' : selected.owner}</span></div></div>
          <div className="inspector-section"><h3>Linked requirements · {linkedRequirements.length}</h3>{linkedRequirements.length === 0 ? <div className="inspector-requirement"><strong>No requirements yet</strong><small>Import a brief, review suggestions, then build the map.</small><button className="inline-link" onClick={() => setActiveTab('requirements')}>Go to requirements →</button></div> : linkedRequirements.map((row) => <div className="inspector-requirement" key={row.id}><strong>{row.title}</strong><small>{row.source}{row.quote ? ` · "${row.quote.slice(0, 120)}"` : ''}</small></div>)}</div>
          <div className="inspector-section"><h3><label htmlFor="node-notes">Team notes</label></h3><textarea id="node-notes" readOnly={!editable} value={nodeNotes[selected.id] ?? ''} onChange={(event) => setNodeNotes((current) => ({ ...current, [selected.id]: event.target.value }))} placeholder="What should the team know about this work?" /></div>
          <button className="button-primary inspector-save" disabled={!editable} onClick={() => { setHistory((current) => [`Notes saved for ${selected.title} · Just now`, ...current]); void flushWorkspace().catch(() => undefined); }}><Icon name="check" size={15} />Save details</button>
          {!baselineConfirmed && isOwner && <button className="baseline-action" disabled={!editable || aiBusy !== null || requirements.length === 0} onClick={confirmBaseline}>{mutationBusy ? 'Confirming...' : 'Confirm original baseline'}</button>}
          <p className="inspector-footnote">{canEdit ? 'Changes save online automatically. Check the status at the top.' : 'You have view-only access to this project.'}</p>
          {aiError && <p className="ai-error" role="alert">{aiError}</p>}
        </aside>}
      </div>
      {showBaselinePrompt && !baselineConfirmed && isOwner && <Dialog labelledBy="baseline-prompt-title" onClose={() => setShowBaselinePrompt(false)}>
        <div className="dialog-header"><div><h2 id="baseline-prompt-title">Confirm your first baseline</h2><p>Your project map is ready.</p></div><button className="icon-button" aria-label="Close dialog" onClick={() => setShowBaselinePrompt(false)}><Icon name="close" /></button></div>
        <div className="baseline-prompt-content">
          <p>Review the map and requirements before confirming this as the scope agreed with your client.</p>
          <div className="baseline-prompt-summary"><span><strong>{requirements.length}</strong> {requirements.length === 1 ? 'requirement' : 'requirements'}</span><span><strong>{workAreas.length}</strong> {workAreas.length === 1 ? 'work area' : 'work areas'}</span></div>
          <p className="baseline-prompt-note">Confirmation locks the original baseline. Future approved changes are tracked separately, so you can always refer back to this first agreement.</p>
          {aiError && <p className="ai-error" role="alert">{aiError}</p>}
          <div className="dialog-actions"><button className="button-light" data-autofocus onClick={() => setShowBaselinePrompt(false)}>Review first</button><button className="button-primary" disabled={!editable || aiBusy !== null || requirements.length === 0} onClick={confirmBaseline}><Icon name="shield" size={15} />{mutationBusy ? 'Confirming...' : 'Confirm baseline'}</button></div>
        </div>
      </Dialog>}
      {adding && <Dialog labelledBy="add-item-title" onClose={() => setAdding(null)}>
        <div className="dialog-header"><div><h2 id="add-item-title">{adding === 'node' ? 'Add a map node' : 'Add requirement'}</h2><p>{adding === 'node' ? 'Name a work area to organize your project.' : 'Describe the work to add it for review.'}</p></div><button className="icon-button" aria-label="Close dialog" onClick={() => setAdding(null)}><Icon name="close" /></button></div>
        <form className="workspace-add-form" onSubmit={submitNewItem}><div className="form-group"><label htmlFor="new-item-title">{adding === 'node' ? 'Node title' : 'Requirement title'}</label><input id="new-item-title" data-autofocus autoFocus required value={newItemTitle} onChange={(event) => setNewItemTitle(event.target.value)} placeholder={adding === 'node' ? 'e.g. Homepage design' : 'e.g. Display product listings'} /></div><div className="dialog-actions"><button className="button-light" type="button" onClick={() => setAdding(null)}>Cancel</button><button className="button-primary" type="submit" disabled={!editable || !newItemTitle.trim()}>{adding === 'node' ? 'Add node' : 'Add requirement'}</button></div></form>
      </Dialog>}
      {showShareModal && <ShareModal projectId={projectId} projectName={projectTitle} isOwner={isOwner} onClose={() => setShowShareModal(false)} />}
      {aiBusy && <AiProgress stage={aiStage} seconds={aiElapsed} />}
      {reviewTarget && <Dialog labelledBy="client-review-title" onClose={() => setReviewTarget(null)}>
        <div className="dialog-header"><div><h2 id="client-review-title">Send to client for approval</h2><p>The client opens the link without an account, reads the terms, and decides. A decision is recorded and cannot be changed.</p></div><button className="icon-button" aria-label="Close dialog" onClick={() => setReviewTarget(null)}><Icon name="close" /></button></div>
        <div className="client-review-form">
          <div className="client-review-request"><small>Client request</small><strong>{reviewTarget.title}</strong><p>{reviewTarget.detail}</p></div>
          {reviewLink ? (
            <div className="client-review-done">
              <p><Icon name="check" size={15} />Review link created. Send it to {clientName || 'your client'} — it works without a login.</p>
              <div className="client-review-link"><input readOnly value={reviewLink} onFocus={(event) => event.target.select()} /><button className="button-primary" type="button" onClick={copyReviewLink}>{reviewLinkCopied ? 'Copied' : 'Copy link'}</button></div>
              <p className="ai-note">You will see the client&apos;s decision on the change card and in Activity.</p>
            </div>
          ) : (
            <>
              <div className="client-review-terms">
                <div className="form-group"><label htmlFor="review-price">Extra charge (THB)</label><input id="review-price" data-autofocus inputMode="decimal" value={reviewPrice} onChange={(event) => setReviewPrice(event.target.value)} placeholder="e.g. 8000" /></div>
                <div className="form-group"><label htmlFor="review-time">Extra time <small>(optional)</small></label><input id="review-time" value={reviewTime} onChange={(event) => setReviewTime(event.target.value)} placeholder="e.g. 1 more week" /></div>
                <div className="form-group"><label htmlFor="review-deadline">New deadline <small>(optional)</small></label><input id="review-deadline" type="date" value={reviewDeadline} onChange={(event) => setReviewDeadline(event.target.value)} /></div>
              </div>
              <div className="form-group"><label htmlFor="review-explanation">Explanation for the client</label><textarea id="review-explanation" rows={5} value={reviewExplanation} onChange={(event) => setReviewExplanation(event.target.value)} placeholder="Explain in the client's language why this request is outside the agreed scope." /><button className="button-light client-review-draft" type="button" disabled={reviewBusy} onClick={draftReviewExplanation}><Icon name="spark" size={14} />{reviewBusy ? 'Drafting...' : 'Draft with AI'}</button><small>AI only drafts from what you entered — it never invents a price or a deadline. Review before sending.</small></div>
              {aiError && <p className="ai-error" role="alert">{aiError}</p>}
              <div className="dialog-actions"><button className="button-light" type="button" onClick={() => setReviewTarget(null)}>Cancel</button><button className="button-primary" type="button" disabled={reviewBusy || !reviewExplanation.trim()} onClick={publishReview}><Icon name="share" size={14} />{reviewBusy ? 'Creating link...' : 'Create client link'}</button></div>
            </>
          )}
        </div>
      </Dialog>}
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
  if (review.classification === 'in_scope') return 'Already in scope';
  if (review.classification === 'ambiguous') return 'More details needed';
  if (review.magnitude === 'major') return 'New system';
  return review.classification === 'new_scope' ? 'Additional work' : 'Existing work changed';
}

function activityTime(value?: string) {
  if (!value) return 'Saved online';
  if (value === 'Just now') return 'Just now';
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function requirementCount(count: number) {
  return `${count} ${count === 1 ? 'requirement' : 'requirements'}`;
}

function useElapsedSeconds(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    setSeconds(0);
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return seconds;
}

function formatElapsed(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function AiProgress({ stage, seconds }: { stage: string; seconds: number }) {
  return (
    <div className="ai-progress" role="status" aria-live="polite">
      <div className="ai-progress-row">
        <span className="ai-progress-label">{stage || 'Processing'}...</span>
        <span className="ai-progress-time">{formatElapsed(seconds)}</span>
      </div>
      <div className="ai-progress-track"><div className="ai-progress-bar" /></div>
    </div>
  );
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
  const response = await authenticatedFetch('/api/ai', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({})) as { data?: T; error?: string };
  if (!response.ok || payload.data == null) throw new Error(payload.error || 'AI request failed.');
  return payload.data;
}

function toRequirement(row: RequirementRow) {
  return requirementForAI(row, '');
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

async function ownerIdentity(ownerId: string, currentUserId: string) {
  if (ownerId === currentUserId) {
    const { user, profile } = await loadOwnProfile();
    return {
      name: profileLabel(profile, googleName(user) || user?.email || '') || 'Project owner',
      avatar: profile?.avatar_url ?? '',
    };
  }
  const { loadProfiles } = await import('../../../src/lib/profile');
  const profile = (await loadProfiles([ownerId])).get(ownerId);
  return { name: profileLabel(profile ?? null) || 'Project owner', avatar: profile?.avatar_url ?? '' };
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
