import { useEffect, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

export type MemberRole = 'owner' | 'editor' | 'viewer';

export type Member = {
  id: string;
  user_id: string;
  role: MemberRole;
  invited_at: string;
  accepted_at: string | null;
  email?: string;
};

export type Invite = {
  id: string;
  invite_code: string;
  role: 'editor' | 'viewer';
  created_at: string;
  expires_at: string;
  use_count: number;
  max_uses: number | null;
};

function fail(error: { message: string; code?: string } | null, fallback: string): never {
  const detail = error?.message || fallback;
  const code = error?.code ? ` (${error.code})` : '';
  throw new Error(`${detail}${code}`);
}

async function client(): Promise<SupabaseClient> {
  const { supabase } = await import('../lib/supabase');
  return supabase;
}

async function currentUserId(supabase: SupabaseClient) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user.id;
}

export function useProjectMembers(projectId: string) {
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadMembers() {
    if (!projectId) {
      setMembers([]);
      return;
    }
    const supabase = await client();
    const { data, error } = await supabase
      .from('project_members')
      .select('id, user_id, role, invited_at, accepted_at')
      .eq('project_id', projectId)
      .order('invited_at', { ascending: false });

    if (error) {
      console.warn('Failed to load members:', error.message);
      setMembers([]);
      return;
    }
    setMembers((data ?? []) as Member[]);
  }

  async function loadInvites() {
    if (!projectId) {
      setInvites([]);
      return;
    }
    const supabase = await client();
    const { data, error } = await supabase
      .from('project_invites')
      .select('id, invite_code, role, created_at, expires_at, use_count, max_uses')
      .eq('project_id', projectId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Failed to load invites:', error.message);
      setInvites([]);
      return;
    }
    setInvites((data ?? []) as Invite[]);
  }

  async function createInvite(role: 'editor' | 'viewer', maxUses?: number) {
    const supabase = await client();
    const userId = await currentUserId(supabase);

    const { data, error } = await supabase
      .from('project_invites')
      .insert({
        project_id: projectId,
        invite_code: generateInviteCode(),
        role,
        created_by: userId,
        max_uses: maxUses ?? null,
      })
      .select('id, invite_code, role, created_at, expires_at, use_count, max_uses')
      .single();

    if (error) fail(error, 'Could not create invite link');
    const invite = data as Invite;
    setInvites((current) => [invite, ...current.filter((item) => item.id !== invite.id)]);
    return invite;
  }

  async function updateMemberRole(memberId: string, role: 'editor' | 'viewer') {
    const supabase = await client();
    const { error } = await supabase
      .from('project_members')
      .update({ role })
      .eq('id', memberId)
      .eq('project_id', projectId);

    if (error) fail(error, 'Could not update role');
    setMembers((current) => current.map((member) => (
      member.id === memberId ? { ...member, role } : member
    )));
  }

  async function removeMember(memberId: string) {
    const supabase = await client();
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('id', memberId)
      .eq('project_id', projectId);

    if (error) fail(error, 'Could not remove member');
    setMembers((current) => current.filter((member) => member.id !== memberId));
  }

  async function deleteInvite(inviteId: string) {
    const supabase = await client();
    const { error } = await supabase
      .from('project_invites')
      .delete()
      .eq('id', inviteId)
      .eq('project_id', projectId);

    if (error) fail(error, 'Could not delete invite');
    setInvites((current) => current.filter((invite) => invite.id !== inviteId));
  }

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([loadMembers(), loadInvites()]).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return {
    members,
    invites,
    loading,
    createInvite,
    updateMemberRole,
    removeMember,
    deleteInvite,
    refreshMembers: loadMembers,
    refreshInvites: loadInvites,
  };
}

type InvitePreview = {
  id: string;
  project_id: string;
  role: 'editor' | 'viewer';
  expires_at: string;
  use_count: number;
  max_uses: number | null;
  project_name: string;
};

export async function lookupInvite(inviteCode: string) {
  const supabase = await client();
  const { data, error } = await supabase.rpc('lookup_invite', {
    invite_code_input: inviteCode,
  });

  if (error) fail(error, 'Could not read invite');
  const invite = (Array.isArray(data) ? data[0] : data) as InvitePreview | undefined;
  if (!invite) throw new Error('This invite link is invalid or has expired');
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    throw new Error('This invite link has reached its usage limit');
  }
  return { ...invite, projectName: invite.project_name || 'Project' };
}

export async function acceptInvite(inviteCode: string) {
  const supabase = await client();
  await currentUserId(supabase);
  const { data, error } = await supabase.rpc('accept_project_invite', {
    invite_code_input: inviteCode,
  });

  if (error) fail(error, 'Could not join project');
  if (!data) throw new Error('Could not join project');
  return data as string;
}

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}
