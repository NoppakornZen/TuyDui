'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { googleName, loadOwnProfile, profileLabel } from '../../src/lib/profile';
import Avatar from '../components/Avatar';
import LanguageToggle from '../components/LanguageToggle';
import { useLocale } from '../components/LocaleProvider';
import { clearProjectDraft, readProjectDraft } from '../../src/lib/draft';
import { FREE_PROJECT_LIMIT, isFreeProjectLimitError } from '../../src/domain/project-quota';
import { loadProjectList, projectCreateErrorMessage, verifyCreatedProject } from '../../src/lib/project-queries';
import './projects.css';

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
  const { t, locale } = useLocale();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [ownerProjectCount, setOwnerProjectCount] = useState(0);
  const [projectName, setProjectName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [dataWarning, setDataWarning] = useState('');
  const [quotaConflict, setQuotaConflict] = useState(false);
  const [profileMark, setProfileMark] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') === 'quota') {
      setLoading(false);
      setProfileMark('TD');
      setOwnerProjectCount(FREE_PROJECT_LIMIT);
      setShowQuotaModal(true);
      return;
    }
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const { user, profile } = await loadOwnProfile().catch(() => ({ user: null, profile: null }));
      if (!user) {
        router.push('/login');
        return;
      }
      const label = profileLabel(profile, googleName(user) || user.email || '');
      setProfileMark(label);
      setAvatarUrl(profile?.avatar_url ?? '');

      const { supabase } = await import('../../src/lib/supabase');

      const pending = window.localStorage.getItem('tuydui-after-login');
      if (pending && pending.startsWith('/') && !pending.startsWith('//')) {
        window.localStorage.removeItem('tuydui-after-login');
        router.replace(pending as never);
        return;
      }

      const draft = readProjectDraft();
      if (draft?.name && draft?.clientName) {
        setProjectName(draft.name);
        setClientName(draft.clientName);
        setDescription(draft.brief);
        setDraftRestored(true);
        setShowModal(true);
      }

      const result = await loadProjectList(supabase, user.id);
      setOwnerProjectCount(result.ownerProjectCount);
      setProjects(result.projects);
      setDataWarning(result.sharedLoadWarning ? t.projects.sharedLoadWarning : '');
      setQuotaConflict((current) => current && result.projects.length === 0);
    } catch (err) {
      console.error('Failed to load projects:', err);
      setProjects([]);
      setError(t.projects.loadError);
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

      const { data, error: createError } = await supabase.rpc('create_project_with_free_limit', {
        project_name: projectName.trim(),
        project_client_name: clientName.trim(),
        project_description: description.trim(),
      });

      if (createError) {
        if (isFreeProjectLimitError(createError)) {
          setShowModal(false);
          setQuotaConflict(true);
          setShowQuotaModal(true);
          await loadProjects();
          setCreating(false);
          return;
        }
        throw createError;
      }

      const created = Array.isArray(data) ? data[0] : data;
      if (!created || typeof created !== 'object' || !('id' in created) || typeof created.id !== 'string') {
        throw new Error('Project creation returned no project.');
      }

      // Do not claim success or open a workspace until the current session can
      // read the row back through the same RLS path used by the app.
      await verifyCreatedProject(supabase, user.id, created.id);

      clearProjectDraft();

      router.push(`/workspace/${created.id}`);
    } catch (err) {
      setError(projectCreateErrorMessage(err, t.projects.createError));
      setCreating(false);
    }
  }

  function openCreateModal() {
    setError('');
    if (ownerProjectCount >= FREE_PROJECT_LIMIT) {
      setShowQuotaModal(true);
      return;
    }
    setShowModal(true);
  }

  async function handleSignOut() {
    const { supabase } = await import('../../src/lib/supabase');
    await supabase.auth.signOut();
    router.push('/login');
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(locale === 'th' ? 'th-TH' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  return (
    <main className="projects-app">
      <header className="projects-topbar">
        <div className="projects-brand-group">
          <a className="profile-entry" href="/profile" title="Profile">
            <Avatar className="profile-entry-avatar" label={profileMark} url={avatarUrl} />
          </a>
          <a className="projects-brand brand-wordmark" href="/projects">Tuy<span className="wordmark-accent">Dui</span></a>
        </div>
        <div className="projects-account">
          <LanguageToggle compact />
          <button onClick={handleSignOut} className="signout-btn">{t.projects.signOut}</button>
        </div>
      </header>

      <div className="projects-container">
        {draftRestored && <div className="draft-restored-banner">✓ {t.projects.restored}</div>}
        {dataWarning && <div className="projects-data-warning" role="status">{dataWarning}</div>}
        {error && !showModal && <div className="projects-load-error" role="alert">{error}<button type="button" onClick={loadProjects}>{t.projects.retry}</button></div>}
        <div className="projects-header">
          <div>
            <div className="projects-kicker"><span /> {t.projects.workspace}</div>
            <h1>{t.projects.title}</h1>
            <p>{t.projects.subtitle}</p>
          </div>
          <div className="projects-create-cluster">
            <button
              className="button-primary"
              onClick={openCreateModal}
              title={ownerProjectCount >= FREE_PROJECT_LIMIT ? t.projects.quotaUsed : t.projects.quotaHint}
            >
              ＋ {t.projects.new}
            </button>
            <span className={`project-quota-note ${ownerProjectCount >= FREE_PROJECT_LIMIT ? 'is-used' : ''}`}>
              {ownerProjectCount >= FREE_PROJECT_LIMIT ? t.projects.quotaUsed : t.projects.quotaHint}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="projects-loading">
            <div className="spinner" />
            <p>{t.common.loading}</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="projects-empty">
            <div className="empty-icon">📁</div>
            <h2>{quotaConflict ? t.projects.quotaEmptyTitle : t.projects.empty}</h2>
            <p>{quotaConflict ? t.projects.quotaEmptyBody : t.projects.emptyBody}</p>
            {quotaConflict ? <button className="button-light" onClick={loadProjects}>{t.projects.retry}</button> : <button className="button-primary" onClick={openCreateModal}>{t.projects.createFirst}</button>}
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map((project) => (
              <button
                key={project.id}
                className="project-card"
                onClick={() => router.push(`/workspace/${project.id}`)}
              >
                <div className="project-card-header">
                  <h3>{project.name}</h3>
                  {project.access === 'shared' && (
                    <span className="baseline-badge">{t.projects.shared}</span>
                  )}
                  {project.baseline_confirmed_at && (
                    <span className="baseline-badge">✓ {t.projects.baseline}</span>
                  )}
                </div>
                <div className="project-client">
                  <strong>{t.projects.client}:</strong> {project.client_name}
                </div>
                {project.description && (
                  <p className="project-description">{project.description}</p>
                )}
                <div className="project-card-footer">
                  <span>{t.projects.updated} {formatDate(project.updated_at)}</span>
                  <span className="project-arrow">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.projects.createTitle}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={createProject}>
              <div className="form-group">
                <label htmlFor="project-name">{t.draft.name}</label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder={t.draft.namePlaceholder}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="client-name">{t.draft.client}</label>
                <input
                  id="client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t.draft.clientPlaceholder}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">{t.projects.description}</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.draft.briefPlaceholder}
                  rows={3}
                />
              </div>

              {error && <div className="form-error">{error}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="button-light"
                  onClick={() => setShowModal(false)}
                  disabled={creating}
                >
                  {t.projects.cancel}
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={creating || !projectName.trim() || !clientName.trim()}
                >
                  {creating ? t.projects.creating : t.projects.create}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuotaModal && (
        <div className="modal-overlay quota-overlay" onClick={() => setShowQuotaModal(false)}>
          <div
            className="quota-modal-content"
            role="dialog"
            aria-modal="true"
            aria-labelledby="quota-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="modal-close quota-modal-close" onClick={() => setShowQuotaModal(false)} aria-label={t.projects.quotaClose}>✕</button>
            <div className="quota-modal-mark" aria-hidden="true">✓</div>
            <div className="quota-modal-copy">
              <p className="quota-modal-kicker">{locale === 'th' ? 'สิทธิ์ทดลองใช้งาน' : 'FREE TRIAL'}</p>
              <h2 id="quota-modal-title">{t.projects.quotaTitle}</h2>
            <p>{quotaConflict && projects.length === 0 ? t.projects.quotaEmptyBody : t.projects.quotaBody}</p>
            </div>
            <div className="planned-package">
              <span>{t.projects.plannedLabel}</span>
              <strong>{t.projects.plannedValue}</strong>
              <small>{t.projects.plannedNote}</small>
            </div>
            <button className="button-primary quota-modal-cta" onClick={() => setShowQuotaModal(false)}>
              {t.projects.quotaCta}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
