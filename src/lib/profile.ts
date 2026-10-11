import type { SupabaseClient, User } from '@supabase/supabase-js';

export type Profile = {
  user_id: string;
  nickname: string;
  display_name: string;
  avatar_url: string;
};

const EMPTY = { nickname: '', display_name: '', avatar_url: '' };
const AVATAR_BUCKET = 'avatars';

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
    .select('user_id, nickname, display_name, avatar_url')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    console.warn('Profile table is not ready:', error.message);
    return { user, profile: { user_id: user.id, ...EMPTY }, ready: false };
  }
  return { user, profile: (data as Profile | null) ?? { user_id: user.id, ...EMPTY }, ready: true };
}

export async function uploadAvatar(file: File) {
  if (!file.type.startsWith('image/')) throw new Error('เลือกไฟล์รูปภาพเท่านั้น');
  if (file.size > 2 * 1024 * 1024) throw new Error('รูปต้องมีขนาดไม่เกิน 2 MB');

  const supabase = await client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const extension = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
  const path = `${user.id}/avatar.${extension}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function saveOwnProfile(input: { nickname: string; displayName: string; avatarUrl: string }) {
  const supabase = await client();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const row = {
    user_id: user.id,
    nickname: input.nickname.trim(),
    display_name: input.displayName.trim(),
    avatar_url: input.avatarUrl.trim(),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'user_id' });
  if (error?.code === 'PGRST205') {
    throw new Error('ยังไม่ได้สร้างตาราง profiles ใน Supabase ให้รันไฟล์ supabase/migrations/004_profiles.sql ใน SQL Editor ก่อน');
  }
  if (error) throw new Error(error.message);
  return { user_id: user.id, nickname: row.nickname, display_name: row.display_name, avatar_url: row.avatar_url };
}

export async function loadProfiles(userIds: string[]) {
  const unique = [...new Set(userIds.filter(Boolean))];
  const map = new Map<string, Profile>();
  if (unique.length === 0) return map;

  const supabase = await client();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id, nickname, display_name, avatar_url')
    .in('user_id', unique);

  if (error) {
    console.warn('Failed to load profiles:', error.message);
    return map;
  }
  for (const row of (data ?? []) as Profile[]) map.set(row.user_id, row);
  return map;
}
