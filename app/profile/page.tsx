'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { googleName, loadOwnProfile, profileLabel, saveOwnProfile, uploadAvatar } from '../../src/lib/profile';
import Avatar from '../components/Avatar';
import Icon from '../components/Icon';
import './profile-design.css';

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
      setError(err instanceof Error ? err.message : 'Could not load your profile.');
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
      setError(err instanceof Error ? err.message : 'Could not save your profile.');
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
      setError(err instanceof Error ? err.message : 'Could not upload the image.');
    } finally {
      setUploading(false);
    }
  }

  const shown = profileLabel({ nickname, display_name: displayName }, accountName || email);

  return (
    <main className="profile-app">
      <div className="profile-wrap">
        <a className="profile-back" href="/projects"><Icon name="back" size={15} />Back to projects</a>
        <h1>Profile</h1>
        <p className="profile-intro">The name and photo your team sees.</p>

        {loading ? (
          <p className="profile-status">Loading...</p>
        ) : (
          <form className="profile-card" onSubmit={onSubmit}>
            <div className="profile-identity">
              <label className="profile-photo">
                <Avatar className="profile-mark" label={shown} url={avatarUrl} />
                <input type="file" accept="image/*" onChange={onAvatar} disabled={uploading} />
                <span className="profile-photo-label">{uploading ? 'Uploading...' : 'Change photo'}</span>
              </label>
              <div>
                <strong>{shown || 'No name set'}</strong>
                <small>{email}</small>
              </div>
            </div>

            <label htmlFor="nickname">
              Nickname
              <input
                id="nickname"
                value={nickname}
                maxLength={40}
                onChange={(event) => { setNickname(event.target.value); setSaved(false); }}
                placeholder="Name shown in member avatars"
              />
            </label>

            <label htmlFor="display-name">
              Display name
              <input
                id="display-name"
                value={displayName}
                maxLength={80}
                onChange={(event) => { setDisplayName(event.target.value); setSaved(false); }}
                placeholder={accountName || 'Full name'}
              />
            </label>

            <p className="profile-note">
              {accountName
                ? `Leave both fields blank to use your Google name: ${accountName}`
                : 'Leave both fields blank to use your Google account name.'}
            </p>

            {error && <p className="profile-error" role="alert">{error}</p>}

            <div className="profile-actions">
              <button className="button-primary" type="submit" disabled={saving}>
                <Icon name="check" size={16} />{saving ? 'Saving...' : 'Save profile'}
              </button>
              {saved && <span role="status">Saved</span>}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
