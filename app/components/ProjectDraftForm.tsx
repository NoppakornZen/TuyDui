'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { readProjectDraft, saveProjectDraft, type ProjectDraft } from '../../src/lib/draft';
import { useLocale } from './LocaleProvider';

export default function ProjectDraftForm({ compact = false }: { compact?: boolean }) {
  const { t } = useLocale();
  const router = useRouter();
  const [draft, setDraft] = useState<ProjectDraft>({ name: '', clientName: '', brief: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const previous = readProjectDraft();
    if (previous) setDraft(previous);
  }, []);

  function update(key: keyof ProjectDraft, value: string) {
    setSaved(false);
    setDraft((current) => {
      const next = { ...current, [key]: value };
      saveProjectDraft(next);
      return next;
    });
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft.name.trim() || !draft.clientName.trim()) return;
    saveProjectDraft({ name: draft.name.trim(), clientName: draft.clientName.trim(), brief: draft.brief.trim() });
    setSaved(true);
    window.localStorage.setItem('tuydui-after-login', '/projects');
    router.push('/login?redirect=/projects');
  }

  return (
    <form className={`draft-form${compact ? ' draft-form-compact' : ''}`} onSubmit={submit}>
      <div className="draft-form-heading">
        <div><span className="eyebrow-dot" />{t.landing.eyebrow}</div>
        <h2>{t.draft.title}</h2>
        <p>{t.draft.subtitle}</p>
      </div>
      <div className="draft-fields">
        <label><span>{t.draft.name}</span><input value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder={t.draft.namePlaceholder} required /></label>
        <label><span>{t.draft.client}</span><input value={draft.clientName} onChange={(event) => update('clientName', event.target.value)} placeholder={t.draft.clientPlaceholder} required /></label>
        <label className="draft-brief"><span>{t.draft.brief}</span><textarea value={draft.brief} onChange={(event) => update('brief', event.target.value)} placeholder={t.draft.briefPlaceholder} rows={compact ? 3 : 4} /></label>
      </div>
      <div className="draft-form-footer">
        <span>{saved ? t.draft.saved : `ⓘ ${t.draft.privacy}`}</span>
        <button type="submit" className="button-primary" disabled={!draft.name.trim() || !draft.clientName.trim()}>{t.draft.save} <span>→</span></button>
      </div>
    </form>
  );
}

