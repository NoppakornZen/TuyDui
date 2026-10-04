import type { SupabaseClient, User } from '@supabase/supabase-js';

export type Profile = {
  user_id: string;
  nickname: string;
  display_name: string;
};

const EMPTY = { nickname: '', display_name: '' };

export function googleName(user: User | null) {
  const meta = user?.user_metadata ?? {};
  return String(meta.full_name || meta.name || '').trim();
}

export function profileLabel(profile: Pick<Profile, 'nickname' | 'display_name'> | null, fallback = '') {
  const nickname = profile?.nickname.trim() ?? '';
  const display = profile?.display_name.trim() ?? '';
  return nickname || display || fallback.trim();
}

export function profileInitial(label: string) {
  const first = Array.from(label.trim())[0];
  return first ? first.toLocaleUpperCase('th-TH') : '?';
}

async function client(): Promise<SupabaseClient> {
  const { supabase } = await import('./supabase');
  return supabase;
}

export async function loadOwnProfile() {
  const supabase = await client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, nickname, display_name')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('Profile table is not ready:', error.message);
    return { user, profile: { user_id: user.id, ...EMPTY }, ready: false };
  }
  return { user, profile: (data as Profile | null) ?? { user_id: user.id, ...EMPTY }, ready: true };
}

export async function saveOwnProfile(input: { nickname: string; displayName: string }) {
  const supabase = await client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const row = {
    user_id: user.id,
    nickname: input.nickname.trim(),
    display_name: input.displayName.trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' });
  if (error?.code === 'PGRST205') {
    throw new Error('ยังไม่ได้สร้างตาราง profiles ใน Supabase ให้รันไฟล์ supabase/migrations/004_profiles.sql ใน SQL Editor ก่อน');
  }
  if (error) throw new Error(error.message);
  return { user_id: user.id, nickname: row.nickname, display_name: row.display_name };
}

export async function loadProfiles(userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, Profile>();
  if (unique.length === 0) return map;

  const supabase = await client();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, nickname, display_name')
    .in('user_id', unique);

  if (error) {
    console.warn('Failed to load profiles:', error.message);
    return map;
  }
  for (const row of (data ?? []) as Profile[]) map.set(row.user_id, row);
  return map;
}
