'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { googleName, loadOwnProfile, profileLabel, saveOwnProfile, uploadAvatar } from '../../src/lib/profile';
import Avatar from '../components/Avatar';
import './profile.css';

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [accountName, setAccountName] = useState('');
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { user, profile } = await loadOwnProfile();
      if (!user || !profile) {
        window.localStorage.setItem('tuydui-after-login', '/profile');
        router.push('/login');
        return;
      }
      setAccountName(googleName(user));
      setEmail(user.email ?? '');
      setNickname(profile.nickname);
      setDisplayName(profile.display_name);
      setAvatarUrl(profile.avatar_url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'โหลดโปรไฟล์ไม่ได้');
    } finally {
      setLoading(false);
    }
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    try {
      setSaving(true);
      setSaved(false);
      setError('');
      await saveOwnProfile({ nickname, displayName, avatarUrl });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'บันทึกไม่ได้');
    } finally {
      setSaving(false);
    }
  }

  async function onAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setUploading(true);
      setError('');
      setAvatarUrl(await uploadAvatar(file));
      setSaved(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'อัปโหลดรูปไม่ได้');
    } finally {
      setUploading(false);
    }
  }

  const shown = profileLabel({ nickname, display_name: displayName }, accountName || email);

  return (
    <main className="profile-app">
      <header className="profile-topbar">
        <a className="profile-brand" href="/projects">TuyDui</a>
        <a className="profile-back" href="/projects">กลับไปโปรเจกต์</a>
      </header>

      <div className="profile-wrap">
        <p className="profile-kicker">ACCOUNT</p>
        <h1>โปรไฟล์</h1>

        {loading ? (
          <p className="profile-status">กำลังโหลด...</p>
        ) : (
          <form className="profile-card" onSubmit={onSubmit}>
            <div className="profile-identity">
              <label className="profile-photo">
                <Avatar className="profile-mark" label={shown} url={avatarUrl} />
                <input type="file" accept="image/*" onChange={onAvatar} disabled={uploading} />
                <span className="profile-photo-label">{uploading ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูป'}</span>
              </label>
              <div>
                <strong>{shown || 'ยังไม่ได้ตั้งชื่อ'}</strong>
                <small>{email}</small>
              </div>
            </div>

            <label htmlFor="nickname">
              ชื่อเล่น
              <input
                id="nickname"
                value={nickname}
                maxLength={40}
                onChange={(event) => { setNickname(event.target.value); setSaved(false); }}
                placeholder="ชื่อที่เห็นในวงกลมสมาชิก"
              />
            </label>

            <label htmlFor="display-name">
              ชื่อแสดง
              <input
                id="display-name"
                value={displayName}
                maxLength={80}
                onChange={(event) => { setDisplayName(event.target.value); setSaved(false); }}
                placeholder={accountName || 'ชื่อเต็ม'}
              />
            </label>

            <p className="profile-note">
              {accountName
                ? `ถ้าเว้นว่างทั้งสองช่อง โปรเจกต์จะใช้ชื่อจาก Google: ${accountName}`
                : 'ถ้าเว้นว่างทั้งสองช่อง โปรเจกต์จะใช้ชื่อจากบัญชี Google'}
            </p>

            {error && <p className="profile-error">{error}</p>}

            <div className="profile-actions">
              <button className="button-primary" type="submit" disabled={saving}>
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
              {saved && <span>บันทึกแล้ว</span>}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
