'use client';

import { useState } from 'react';
import { useProjectMembers } from '../../src/lib/use-project-members';
import Avatar from './Avatar';
import Dialog from './Dialog';
import Icon from './Icon';
import './share-design.css';

type ShareModalProps = {
  projectId: string;
  projectName: string;
  isOwner: boolean;
  onClose: () => void;
};

export default function ShareModal({ projectId, projectName, isOwner, onClose }: ShareModalProps) {
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

  return (
    <Dialog className="share-modal" labelledBy="share-project-title" onClose={onClose}>
        <div className="share-modal-header">
          <div><h2 id="share-project-title">Share project</h2><p>{projectName} · Invite your team and manage access.</p></div>
          <button className="share-modal-close" onClick={onClose} aria-label="Close dialog"><Icon name="close" size={16} /></button>
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
                  <h3 className="share-section-title">Invite your team</h3>
                  <p className="share-section-subtitle">
                    Choose an access level and share the invite link.
                  </p>

                  <div className="create-invite-form">
                    <div className="role-selector">
                      <button
                        className={`role-option ${selectedRole === 'editor' ? 'selected' : ''}`}
                        aria-pressed={selectedRole === 'editor'}
                        onClick={() => setSelectedRole('editor')}
                      >
                        <div className="role-option-title">Can edit</div>
                        <div className="role-option-desc">
                          Edit the map, requirements, and changes.
                        </div>
                      </button>
                      <button
                        className={`role-option ${selectedRole === 'viewer' ? 'selected' : ''}`}
                        aria-pressed={selectedRole === 'viewer'}
                        onClick={() => setSelectedRole('viewer')}
                      >
                        <div className="role-option-title">View only</div>
                        <div className="role-option-desc">
                          View the project without making changes.
                        </div>
                      </button>
                    </div>

                    <button
                      className="button-primary"
                      onClick={handleCreateInvite}
                      disabled={creating}
                      style={{ width: '100%' }}
                    >
                      {creating ? 'Creating link...' : 'Create invite link'}
                    </button>
                  </div>
                </div>
              )}

              {/* Active Invite Links */}
              {invites.length > 0 && (
                <div className="share-section">
                  <h3 className="share-section-title">Active invite links</h3>
                  {invites.map((invite) => (
                    <div key={invite.id} className="invite-link-card">
                      <div className="invite-link-header">
                        <span className={`invite-role-badge ${invite.role}`}>
                          {invite.role === 'editor' ? 'Can edit' : 'View only'}
                        </span>
                        {isOwner && (
                          <button
                            className="delete-invite-btn"
                            onClick={() => handleDeleteInvite(invite.id)}
                          >
                            Delete link
                          </button>
                        )}
                      </div>
                      <div className="invite-link-url">
                        <input
                          type="text"
                          value={`${window.location.origin}/invite/${invite.invite_code}`}
                          aria-label="Project invite link"
                          readOnly
                        />
                        <button
                          className={`copy-link-btn ${copiedCode === invite.invite_code ? 'copied' : ''}`}
                          onClick={() => handleCopyLink(invite.invite_code)}
                        >
                          {copiedCode === invite.invite_code ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <div className="invite-link-meta">
                        <span>
                          {invite.use_count} {invite.use_count === 1 ? 'person has' : 'people have'} joined
                          {invite.max_uses && ` · Limit: ${invite.max_uses}`}
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
                  <div className="empty-members">No members have joined yet.</div>
                ) : (
                  <div className="members-list">
                    {members
                      .filter((m) => m.accepted_at)
                      .map((member) => (
                        <div key={member.id} className="member-card">
                          <Avatar className="member-avatar" label={member.name || member.email || 'U'} url={member.avatarUrl} />
                          <div className="member-info">
                            <div className="member-name">
                              {member.name || member.email || 'Unknown User'}
                            </div>
                            <div className="member-email">
                              Joined {formatDate(member.invited_at)}
                            </div>
                          </div>
                          {isOwner && member.role !== 'owner' ? (
                            <>
                              <select
                                className="member-role-select"
                                aria-label={`Access for ${member.name || member.email || 'Member'}`}
                                value={member.role}
                                onChange={(e) =>
                                  handleUpdateRole(member.id, e.target.value as 'editor' | 'viewer')
                                }
                              >
                                <option value="editor">Can edit</option>
                                <option value="viewer">View only</option>
                              </select>
                              <button
                                className="remove-member-btn"
                                onClick={() =>
                                  handleRemoveMember(member.id, member.email || 'this user')
                                }
                                title="Remove member"
                                aria-label={`Remove ${member.name || member.email || 'member'} from the project`}
                              >
                                ✕
                              </button>
                            </>
                          ) : (
                            <span className="invite-role-badge owner">
                              {member.role === 'owner' ? 'Owner' : member.role === 'editor' ? 'Can edit' : 'View only'}
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
    </Dialog>
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
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatExpiry(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days <= 0) return 'expired';
  if (days === 1) return 'in 1 day';
  if (days < 7) return `in ${days} days`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
