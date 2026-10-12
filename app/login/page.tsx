'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import LanguageToggle from '../components/LanguageToggle';
import { useLocale } from '../components/LocaleProvider';
import { readProjectDraft } from '../../src/lib/draft';
import './login.css';

function nextPath() {
  const value = new URLSearchParams(window.location.search).get('redirect') || '';
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '';
  return value;
}

export default function LoginPage() {
  const { t, locale } = useLocale();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => { setHasDraft(Boolean(readProjectDraft())); }, []);

  async function handleGoogleSignIn() {
    try {
      setLoading(true); setError('');
      const { supabase } = await import('../../src/lib/supabase');
      const next = nextPath();
      if (next) window.localStorage.setItem('tuydui-after-login', next);
      const { error: signInError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}/projects` } });
      if (signInError) throw signInError;
    } catch (err) {
      const message = err instanceof Error ? err.message : '';
      setError(message.includes('supabaseUrl') || message.includes('Supabase') ? t.login.error : (message || t.login.error)); setLoading(false);
    }
  }

  const copy = locale === 'th' ? {
    headline: 'รู้ว่าเราตกลงอะไร', changed: 'เห็นว่าอะไรเปลี่ยนไป',
    body: <>เก็บ brief วางแผนงาน และตรวจคำขอใหม่จากลูกค้า<br />ให้ทีมใช้ขอบเขตงานเดียวกันในการทำงาน</>,
    plan: 'แผนงาน', briefBody: 'เริ่มจาก PDF หรือข้อความ แล้วตรวจข้อเสนอจาก AI', planBody: 'เห็นว่างานเชื่อมกันอย่างไร และใครรับผิดชอบ', changeBody: 'เทียบคำขอใหม่กับ scope ที่ยืนยันแล้วก่อนตัดสินใจ', open: <>เปิดโปรเจกต์ของคุณ<br />หรือเริ่มจาก brief แรกของคุณ</>, beta: <>Beta · การใช้ AI จะถูกติดตามระหว่างช่วงทดลอง<br />ตรวจคำแนะนำจาก AI ก่อนนำไปใช้ในโปรเจกต์</>, footer: 'ขอบเขตงานเดียวกันสำหรับทีมของคุณ',
  } : {
    headline: 'Know what was agreed.', changed: 'See what changed.',
    body: <>Keep your briefs, map your work, and review client requests.<br />Give your team one shared scope to work from.</>,
    plan: 'Plan', briefBody: 'Import a PDF or text, then review AI suggestions.', planBody: 'See how work connects and who is responsible.', changeBody: 'Compare new requests with the approved scope before deciding.', open: <>Open your projects<br />or start with your first brief.</>, beta: <>Beta · AI usage is monitored during the preview.<br />Review AI suggestions before using them in your project.</>, footer: 'A shared scope for your team',
  };

  return (
    <main className="login-page">
      <div className="login-topbar"><Link href="/" className="login-brand"><span className="login-brand-mark">T</span>TuyDui <small>BETA</small></Link><div className="login-top-actions"><LanguageToggle compact /><Link href="/" className="login-back">{t.login.back}</Link></div></div>
      <section className="login-grid">
        <div className="login-about"><div className="login-audience">{t.landing.forWho}</div><h1><span>{copy.headline}</span><strong>{copy.changed}</strong></h1><p>{copy.body}</p><div className="login-features"><div><b>{t.tutorial.brief}</b><span>{copy.briefBody}</span></div><div><b>{copy.plan}</b><span>{copy.planBody}</span></div><div><b>{t.tutorial.change}</b><span>{copy.changeBody}</span></div></div></div>
        <div className="login-panel"><h2>{t.login.title}</h2><p>{copy.open}</p>{hasDraft && <div className="login-draft-note">✓ {t.draft.saved}</div>}{error && <div className="login-error">{error}</div>}<button className="login-google" onClick={handleGoogleSignIn} disabled={loading}><svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>{loading ? t.login.loading : t.login.google}</button><div className="login-beta">{copy.beta}</div></div>
      </section>
      <footer className="login-footer">TuyDui · {copy.footer}</footer>
    </main>
  );
}
