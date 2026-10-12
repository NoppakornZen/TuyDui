'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadOwnProfile } from '../../src/lib/profile';
import { SAMPLE_PROJECT } from '../../src/lib/sample-brief';
import Icon from '../components/Icon';
import Dialog from '../components/Dialog';
import './projects-design.css';

type Project = {
  id: string;
  name: string;
  client_name: string;
  description: string;
  baseline_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  access: 'owner' | 'shared';
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'owner' | 'shared'>('all');
  const router = useRouter();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const { user } = await loadOwnProfile().catch(() => ({ user: null }));
      if (!user) {
        router.push('/login');
        return;
      }

      const { supabase } = await import('../../src/lib/supabase');

      const pending = window.localStorage.getItem('tuydui-after-login');
      if (pending && pending.startsWith('/') && !pending.startsWith('//')) {
        window.localStorage.removeItem('tuydui-after-login');
        router.replace(pending as Parameters<typeof router.replace>[0]);
        return;
      }

      const { data: owned, error: ownedError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (ownedError) throw ownedError;

      const { data: memberships, error: memberError } = await supabase
        .from('project_members')
        .select('project_id, projects(*)')
        .eq('user_id', user.id)
        .not('accepted_at', 'is', null);

      if (memberError) throw memberError;

      const ownedIds = new Set((owned ?? []).map((project) => project.id));
      const shared = (memberships ?? [])
        .map((row) => {
          const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
          return project as Omit<Project, 'access'> | null;
        })
        .filter((project): project is Omit<Project, 'access'> => !!project && !ownedIds.has(project.id))
        .map((project) => ({ ...project, access: 'shared' as const }));

      const all = [
        ...(owned ?? []).map((project) => ({ ...project, access: 'owner' as const })),
        ...shared,
      ].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

      setProjects(all);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!projectName.trim() || !clientName.trim() || creating) return;

    try {
      setCreating(true);
      setError('');

      const { supabase } = await import('../../src/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error('Not authenticated');

      const { data, error: createError } = await supabase
        .from('projects')
        .insert({
          owner_id: user.id,
          name: projectName.trim(),
          client_name: clientName.trim(),
          description: description.trim(),
        })
        .select()
        .single();

      if (createError) throw createError;

      router.push(`/workspace/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
      setCreating(false);
    }
  }

  async function createSampleProject() {
    if (creating) return;
    try {
      setCreating(true);
      setError('');
      const { supabase } = await import('../../src/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { data, error: createError } = await supabase
        .from('projects')
        .insert({ owner_id: user.id, name: SAMPLE_PROJECT.name, client_name: SAMPLE_PROJECT.client, description: SAMPLE_PROJECT.description })
        .select()
        .single();
      if (createError) throw createError;
      router.push(`/workspace/${data.id}?sample=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create the sample project');
      setCreating(false);
    }
  }

  async function handleSignOut() {
    const { supabase } = await import('../../src/lib/supabase');
    await supabase.auth.signOut();
    router.push('/login');
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  const search = query.trim().toLocaleLowerCase();
  const visibleProjects = projects.filter((project) => (filter === 'all' || project.access === filter) && [project.name, project.client_name, project.description].some((value) => (value || '').toLocaleLowerCase().includes(search)));
  const ownedCount = projects.filter((project) => project.access === 'owner').length;
  const confirmedCount = projects.filter((project) => !!project.baseline_confirmed_at).length;

  return (
    <main className="projects-app">
      <div className="projects-container">
        <div className="projects-header">
          <div><h1>Projects</h1><p>Briefs, project scope, and client requests.</p></div>
          <div className="projects-header-actions">
            <button className="button-light" onClick={createSampleProject} disabled={creating}><Icon name="spark" />Try a sample project</button>
            <button className="button-primary" onClick={() => setShowModal(true)}><Icon name="plus" />Create project</button>
          </div>
        </div>
        {error && !showModal && <div className="error-banner" role="alert"><span>{error}</span><button className="button-light" onClick={() => { setError(''); void loadProjects(); }}>Try again</button></div>}
        <p className="projects-summary">{loading ? 'Loading...' : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'} · ${confirmedCount} with confirmed scope · ${projects.length - ownedCount} shared with you`}</p>
        <div className="projects-toolbar">
          <div className="project-filters" aria-label="Filter projects">
            <button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>All <span>{projects.length}</span></button>
            <button aria-pressed={filter === 'owner'} onClick={() => setFilter('owner')}>Owned by me <span>{ownedCount}</span></button>
            <button aria-pressed={filter === 'shared'} onClick={() => setFilter('shared')}>Shared with me <span>{projects.length - ownedCount}</span></button>
          </div>
          <label className="project-search"><Icon name="search" size={16} /><span className="sr-only">Search projects or clients</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects or clients..." /></label>
        </div>
        {loading ? <div className="projects-loading" role="status"><div className="spinner" /><p>Loading projects...</p></div> : projects.length === 0 ? (
          <div className="projects-empty"><div className="empty-icon"><Icon name="folder" size={30} /></div><h2>Start your first project</h2><p>Create a project, then upload a PDF brief or paste text<br />to start building requirements and a project map.<br />Or try the sample project to see the full flow in a few minutes.</p><div className="projects-empty-actions"><button className="button-light" onClick={createSampleProject} disabled={creating}><Icon name="spark" />Try a sample project</button><button className="button-primary" onClick={() => setShowModal(true)}><Icon name="plus" />Create your first project</button></div></div>
        ) : visibleProjects.length === 0 ? (
          <div className="projects-empty"><div className="empty-icon"><Icon name="search" size={28} /></div><h2>No matching projects</h2><p>Try a different search or view all projects.</p><button className="button-light" onClick={() => { setQuery(''); setFilter('all'); }}>View all projects</button></div>
        ) : <div className="projects-list"><div className="project-list-head" aria-hidden="true"><span>Project name</span><span>Client</span><span>Scope</span><span>Last updated</span><span /></div>{visibleProjects.map((project) => (
          <button key={project.id} className="project-card" onClick={() => router.push(`/workspace/${project.id}`)}>
            <div className="project-title-cell"><h3>{project.name}</h3><p className="project-description">{project.description || 'No project description yet.'}</p></div>
            <span className="project-client">{project.client_name}</span>
            <span className={`baseline-badge ${project.baseline_confirmed_at ? '' : 'draft'}`}>{project.baseline_confirmed_at ? <><Icon name="check" size={13} />Confirmed</> : 'Draft scope'}</span>
            <span className="project-updated">{formatDate(project.updated_at)}<small>{project.access === 'shared' ? 'Shared with you' : 'You own this project'}</small></span>
            <Icon name="arrow" size={17} />
          </button>
        ))}</div>}
        <p className="projects-helper">The baseline is your agreed scope. Use it to compare new client requests.</p>
      </div>
      {showModal && <Dialog labelledBy="create-project-title" onClose={() => setShowModal(false)}>
        <div className="dialog-header"><div><h2 id="create-project-title">Create a new project</h2><p>Name the project and client. You can add the brief next.</p></div><button className="icon-button" onClick={() => setShowModal(false)} aria-label="Close dialog"><Icon name="close" /></button></div>
        <form className="project-create-form" onSubmit={createProject}>
          <div className="form-group"><label htmlFor="project-name">Project name</label><input id="project-name" value={projectName} onChange={(event) => setProjectName(event.target.value)} placeholder="e.g. Coffee shop website" required autoFocus data-autofocus /></div>
          <div className="form-group"><label htmlFor="client-name">Client name</label><input id="client-name" value={clientName} onChange={(event) => setClientName(event.target.value)} placeholder="e.g. Northstar Studio" required /></div>
          <div className="form-group"><label htmlFor="description">Description <small>(optional)</small></label><textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Project goals or anything the team should know" rows={3} /></div>
          {error && <div className="form-error" role="alert">{error}</div>}
          <div className="modal-actions"><button type="button" className="button-light" onClick={() => setShowModal(false)} disabled={creating}>Cancel</button><button type="submit" className="button-primary" disabled={creating || !projectName.trim() || !clientName.trim()}>{creating ? 'Creating...' : 'Create project'}<Icon name="arrow" size={16} /></button></div>
        </form>
      </Dialog>}
    </main>
  );
}
