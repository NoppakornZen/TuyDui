'use client';

import { useState } from 'react';
import { useProjectMembers } from '../../src/lib/use-project-members';
import './ShareModal.css';

type ShareModalProps = {
  projectId: string;
  projectName: string;
  onClose: () => void;
};

export default function ShareModal({ projectId, projectName, onClose }: ShareModalProps) {
  const {
    members,
    invites,
    loading,
    createInvite,
    updateMemberRole,
    removeMember,
    deleteInvite,
  } = useProjectMembers(projectId);

  const [selectedRole, setSelectedRole] = useState<'editor' | 'viewer'>('editor');
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function handleCreateInvite() {
    try {
      setCreating(true);
      await createInvite(selectedRole);
    } catch (err) {
      console.error('Create invite error:', err);
      alert(`Failed to create invite link: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleCopyLink(inviteCode: string) {
    const link = `${window.location.origin}/invite/${inviteCode}`;
    await navigator.clipboard.writeText(link);
    setCopiedCode(inviteCode);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function handleUpdateRole(memberId: string, role: 'editor' | 'viewer') {
    try {
      await updateMemberRole(memberId, role);
    } catch (err) {
      alert('Failed to update role');
    }
  }

  async function handleRemoveMember(memberId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from this project?`)) return;
    try {
      await removeMember(memberId);
    } catch (err) {
      alert('Failed to remove member');
    }
  }

  async function handleDeleteInvite(inviteId: string) {
    if (!confirm('Delete this invite link?')) return;
    try {
      await deleteInvite(inviteId);
    } catch (err) {
      alert('Failed to delete invite');
    }
  }

  const isOwner = true;

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2>Share "{projectName}"</h2>
          <button className="share-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="share-modal-content">
          {loading ? (
            <div className="share-loading">
              <div className="spinner" />
            </div>
          ) : (
            <>
              {/* Create Invite Section */}
              {isOwner && (
                <div className="share-section">
                  <h3 className="share-section-title">Create Invite Link</h3>
                  <p className="share-section-subtitle">
                    สร้าง link เชิญเพื่อนเข้ามาร่วมงาน แบบ Canva
                  </p>

                  <div className="create-invite-form">
                    <div className="role-selector">
                      <button
                        className={`role-option ${selectedRole === 'editor' ? 'selected' : ''}`}
                        onClick={() => setSelectedRole('editor')}
                      >
                        <div className="role-option-title">Can Edit</div>
                        <div className="role-option-desc">
                          แก้ไข map, requirements และ changes ได้
                        </div>
                      </button>
                      <button
                        className={`role-option ${selectedRole === 'viewer' ? 'selected' : ''}`}
                        onClick={() => setSelectedRole('viewer')}
                      >
                        <div className="role-option-title">Can View</div>
                        <div className="role-option-desc">
                          ดูอย่างเดียว ไม่สามารถแก้ไขได้
                        </div>
                      </button>
                    </div>

                    <button
                      className="button-primary"
                      onClick={handleCreateInvite}
                      disabled={creating}
                      style={{ width: '100%' }}
                    >
                      {creating ? 'Creating link...' : 'Create Invite Link'}
                    </button>
                  </div>
                </div>
              )}

              {/* Active Invite Links */}
              {invites.length > 0 && (
                <div className="share-section">
                  <h3 className="share-section-title">Active Invite Links</h3>
                  {invites.map((invite) => (
                    <div key={invite.id} className="invite-link-card">
                      <div className="invite-link-header">
                        <span className={`invite-role-badge ${invite.role}`}>
                          {invite.role === 'editor' ? 'Can Edit' : 'Can View'}
                        </span>
                        {isOwner && (
                          <button
                            className="delete-invite-btn"
                            onClick={() => handleDeleteInvite(invite.id)}
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="invite-link-url">
                        <input
                          type="text"
                          value={`${window.location.origin}/invite/${invite.invite_code}`}
                          readOnly
                        />
                        <button
                          className={`copy-link-btn ${copiedCode === invite.invite_code ? 'copied' : ''}`}
                          onClick={() => handleCopyLink(invite.invite_code)}
                        >
                          {copiedCode === invite.invite_code ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                      <div className="invite-link-meta">
                        <span>
                          {invite.use_count} {invite.use_count === 1 ? 'person' : 'people'} joined
                          {invite.max_uses && ` · ${invite.max_uses} max`}
                        </span>
                        <span>Expires {formatExpiry(invite.expires_at)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Members List */}
              <div className="share-section">
                <h3 className="share-section-title">
                  Members ({members.filter((m) => m.accepted_at).length})
                </h3>
                {members.filter((m) => m.accepted_at).length === 0 ? (
                  <div className="empty-members">No members yet</div>
                ) : (
                  <div className="members-list">
                    {members
                      .filter((m) => m.accepted_at)
                      .map((member) => (
                        <div key={member.id} className="member-card">
                          <div className="member-avatar">
                            {member.email?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div className="member-info">
                            <div className="member-name">
                              {member.email || 'Unknown User'}
                            </div>
                            <div className="member-email">
                              Joined {formatDate(member.invited_at)}
                            </div>
                          </div>
                          {isOwner && member.role !== 'owner' ? (
                            <>
                              <select
                                className="member-role-select"
                                value={member.role}
                                onChange={(e) =>
                                  handleUpdateRole(member.id, e.target.value as 'editor' | 'viewer')
                                }
                              >
                                <option value="editor">Can Edit</option>
                                <option value="viewer">Can View</option>
                              </select>
                              <button
                                className="remove-member-btn"
                                onClick={() =>
                                  handleRemoveMember(member.id, member.email || 'this user')
                                }
                                title="Remove member"
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <span className="invite-role-badge owner">
                              {member.role === 'owner' ? 'Owner' : member.role === 'editor' ? 'Editor' : 'Viewer'}
                            </span>
                          )}
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDate(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
}

function formatExpiry(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return 'expired';
  if (days === 1) return 'in 1 day';
  if (days < 7) return `in ${days} days`;
  return d.toLocaleDateString('th-TH', { month: 'short', day: 'numeric' });
}
