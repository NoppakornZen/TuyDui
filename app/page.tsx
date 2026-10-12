'use client';

import Link from 'next/link';
import LanguageToggle from './components/LanguageToggle';
import { useLocale } from './components/LocaleProvider';
import './landing.css';
import './landing-v2.css';

export default function LandingPage() {
  const { t, locale } = useLocale();
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link href="/" className="landing-brand">TuyDui<span>·</span></Link>
        <nav><LanguageToggle compact /></nav>
      </header>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><span />{t.landing.eyebrow}</div>
          <h1>{t.landing.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h1>
          <p>{t.landing.description}</p>
          <div className="landing-actions">
            <Link href="/tutorial" className="landing-primary">{t.landing.primary}<span>→</span></Link>
          </div>
          <div className="landing-trust">✦ {t.landing.note}</div>
        </div>
        <div className="landing-hero-visual" aria-label="TuyDui scope map preview">
          <div className="scope-window">
            <div className="scope-window-top"><span /><span /><span /><b>{locale === 'th' ? 'แผนผังโปรเจกต์' : 'PROJECT MAP'}</b><small className="preview-brief-chip">{locale === 'th' ? 'จากบรีฟร้านกาแฟ' : 'FROM COFFEE SHOP BRIEF'}</small><i>•••</i></div>
            <div className="scope-map-grid">
              <div className="map-line line-one" /><div className="map-line line-two" /><div className="map-line line-three" />
              <div className="map-node node-main"><small>{locale === 'th' ? 'โปรเจกต์' : 'PROJECT'}</small><strong>Coffee shop site</strong><em>{locale === 'th' ? 'กำลังดำเนินการ' : 'On track'}</em></div>
              <div className="map-node node-one"><small>{locale === 'th' ? 'รายการงาน' : 'REQUIREMENT'}</small><strong>Editable menu</strong><em className="green">{locale === 'th' ? 'อยู่ในแผนเดิม' : 'In scope'}</em></div>
              <div className="map-node node-two"><small>{locale === 'th' ? 'บรีฟใหม่ · ข้อเสนอ' : 'NEW BRIEF · PROPOSAL'}</small><strong>{locale === 'th' ? 'ระบบสมาชิกและสะสมแต้ม' : 'Members & loyalty points'}</strong><em className="orange">{locale === 'th' ? 'เสนอปรับแผน' : 'Proposed update'}</em></div>
              <div className="map-node node-three"><small>{locale === 'th' ? 'สิ่งที่จะส่งมอบ' : 'DELIVERABLE'}</small><strong>Ordering flow</strong><em className="green">{locale === 'th' ? 'อยู่ในแผนเดิม' : 'In scope'}</em></div>
            </div>
            <div className="scope-window-footer"><span><i className="dot-green" />{locale === 'th' ? 'ยืนยันแผนแล้ว' : 'Baseline confirmed'}</span><b>3 {locale === 'th' ? 'รายการงาน' : 'requirements'}</b></div>
          </div>
        </div>
      </section>
      <section className="landing-section landing-audience"><p className="landing-section-kicker">{t.landing.forWho}</p><h2>{t.landing.three}</h2></section>
      <section className="landing-steps" id="how-it-works">
        {t.landing.steps.map(([number, title, body]) => <article key={number}><div className="step-number">{number}</div><h3>{title}</h3><p>{body}</p></article>)}
      </section>
      <section className="landing-outcome"><div><div className="landing-eyebrow"><span />{t.landing.outcomeTitle}</div><p>{t.landing.outcomeBody}</p></div><div className="outcome-pills"><span>{locale === 'th' ? 'บรีฟ' : 'Brief'}</span><b>→</b><span>{locale === 'th' ? 'แผนงาน' : 'Plan'}</span><b>→</b><span>{locale === 'th' ? 'ปรับแผน' : 'Plan update'}</span></div></section>
      <footer className="landing-footer"><span className="landing-brand">TuyDui<span>·</span></span><span>{locale === 'th' ? 'วางแผนงานร่วมกันอย่างชัดเจน' : 'A clear shared plan for small teams'}</span></footer>
    </main>
  );
}
