'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import './projects.css';

type Project = {
  id: string;
  name: string;
  client_name: string;
  description: string;
  baseline_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  _counts?: {
    requirements: number;
    nodes: number;
    pending_changes: number;
  };
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
  const router = useRouter();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    try {
      setLoading(true);
      const { supabase } = await import('../../src/lib/supabase');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false });

      if (fetchError) throw fetchError;
      setProjects(data || []);
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

  async function handleSignOut() {
    const { supabase } = await import('../../src/lib/supabase');
    await supabase.auth.signOut();
    router.push('/login');
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('th-TH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  return (
    <main className="projects-app">
      <header className="projects-topbar">
        <a className="projects-brand" href="/projects">TuyDui</a>
        <div className="projects-account">
          <button onClick={handleSignOut} className="signout-btn">ออกจากระบบ</button>
        </div>
      </header>

      <div className="projects-container">
        <div className="projects-header">
          <div>
            <div className="projects-kicker"><span /> YOUR WORKSPACE</div>
            <h1>โปรเจกต์ทั้งหมด</h1>
            <p>เลือกโปรเจกต์เพื่อเริ่มจัดการ scope และ requirements</p>
          </div>
          <button className="button-primary" onClick={() => setShowModal(true)}>
            ＋ สร้างโปรเจกต์ใหม่
          </button>
        </div>

        {loading ? (
          <div className="projects-loading">
            <div className="spinner" />
            <p>กำลังโหลดโปรเจกต์...</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="projects-empty">
            <div className="empty-icon">📁</div>
            <h2>ยังไม่มีโปรเจกต์</h2>
            <p>สร้างโปรเจกต์แรกของคุณเพื่อเริ่มติดตาม scope และจัดการ requirements</p>
            <button className="button-primary" onClick={() => setShowModal(true)}>
              สร้างโปรเจกต์แรก
            </button>
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
                  {project.baseline_confirmed_at && (
                    <span className="baseline-badge">✓ Baseline V1</span>
                  )}
                </div>
                <div className="project-client">
                  <strong>Client:</strong> {project.client_name}
                </div>
                {project.description && (
                  <p className="project-description">{project.description}</p>
                )}
                <div className="project-card-footer">
                  <span>อัปเดตล่าสุด {formatDate(project.updated_at)}</span>
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
              <h2>สร้างโปรเจกต์ใหม่</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={createProject}>
              <div className="form-group">
                <label htmlFor="project-name">ชื่อโปรเจกต์</label>
                <input
                  id="project-name"
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="เว็บไซต์ e-commerce"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="client-name">ชื่อลูกค้า</label>
                <input
                  id="client-name"
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="บริษัท ABC จำกัด"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="description">รายละเอียด (ไม่บังคับ)</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="รายละเอียดเพิ่มเติมเกี่ยวกับโปรเจกต์..."
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
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  disabled={creating || !projectName.trim() || !clientName.trim()}
                >
                  {creating ? 'กำลังสร้าง...' : 'สร้างโปรเจกต์'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
