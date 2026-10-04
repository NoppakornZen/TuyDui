'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import './invite.css';

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.code as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projectName, setProjectName] = useState('');
  const [role, setRole] = useState<'editor' | 'viewer'>('viewer');

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const { supabase } = await import('../../../src/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/login?redirect=/invite/${inviteCode}`;
        return;
      }

      loadInviteInfo();
    } catch (err) {
      setError('Failed to check authentication');
      setLoading(false);
    }
  }

  async function loadInviteInfo() {
    try {
      const { lookupInvite } = await import('../../../src/lib/use-project-members');
      const invite = await lookupInvite(inviteCode);

      setProjectName(invite.projectName);
      setRole(invite.role);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load invite');
      setLoading(false);
    }
  }

  async function handleAccept() {
    try {
      setLoading(true);
      setError('');

      const { acceptInvite } = await import('../../../src/lib/use-project-members');
      const projectId = await acceptInvite(inviteCode);

      router.push(`/workspace/${projectId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join project');
      setLoading(false);
    }
  }

  function handleDecline() {
    router.push('/projects');
  }

  return (
    <div className="invite-page">
      <div className="invite-container">
        {loading ? (
          <div className="invite-loading">
            <div className="spinner" />
            <p>Loading invitation...</p>
          </div>
        ) : error ? (
          <div className="invite-error">
            <div className="error-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="32" r="30" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
                <path d="M32 20v16M32 44h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <h1>Invalid Invitation</h1>
            <p>{error}</p>
            <button className="button-primary" onClick={() => router.push('/projects')}>
              Return to Projects
            </button>
          </div>
        ) : (
          <div className="invite-content">
            <div className="invite-icon">
              <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                <rect x="10" y="20" width="60" height="45" rx="4" stroke="currentColor" strokeWidth="2.5" opacity="0.3"/>
                <path d="M10 28l30 18 30-18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="55" cy="55" r="12" fill="#FF6B35"/>
                <path d="M52 55l3 3 6-6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <h1>Join Project</h1>
            <p className="project-name">{projectName}</p>

            <div className="invite-details">
              <div className="detail-row">
                <span className="detail-label">Access Level</span>
                <span className={`role-badge ${role}`}>
                  {role === 'editor' ? 'Can Edit' : 'Can View'}
                </span>
              </div>

              <div className="permission-list">
                <div className="permission-title">With this access, you can:</div>
                {role === 'editor' ? (
                  <>
                    <div className="permission-item">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M16.667 5L7.5 14.167 3.333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Edit project map and nodes</span>
                    </div>
                    <div className="permission-item">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M16.667 5L7.5 14.167 3.333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Manage requirements and changes</span>
                    </div>
                    <div className="permission-item">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M16.667 5L7.5 14.167 3.333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Collaborate with the team</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="permission-item">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M16.667 5L7.5 14.167 3.333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>View project map and structure</span>
                    </div>
                    <div className="permission-item">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M16.667 5L7.5 14.167 3.333 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <span>Read requirements and history</span>
                    </div>
                    <div className="permission-item disabled">
                      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                        <path d="M3.333 3.333l13.334 13.334M16.667 3.333L3.333 16.667" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                      <span>Cannot make changes</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="invite-actions">
              <button className="button-secondary" onClick={handleDecline}>
                Decline
              </button>
              <button className="button-primary" onClick={handleAccept}>
                Accept Invitation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
