'use client';

import Link from 'next/link';
import LanguageToggle from './components/LanguageToggle';
import ProjectDraftForm from './components/ProjectDraftForm';
import { useLocale } from './components/LocaleProvider';
import './landing.css';

export default function LandingPage() {
  const { t } = useLocale();
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link href="/" className="landing-brand">TuyDui<span>·</span></Link>
        <nav>
          <a href="#how-it-works">{t.nav.how}</a>
          <Link href="/tutorial">{t.nav.tutorial}</Link>
          <LanguageToggle compact />
          <Link href="/login" className="landing-signin">{t.nav.signIn}</Link>
        </nav>
      </header>
      <section className="landing-hero">
        <div className="landing-hero-copy">
          <div className="landing-eyebrow"><span />{t.landing.eyebrow}</div>
          <h1>{t.landing.title.split('\n').map((line) => <span key={line}>{line}</span>)}</h1>
          <p>{t.landing.description}</p>
          <div className="landing-actions">
            <Link href="/tutorial" className="landing-primary">{t.landing.primary}<span>→</span></Link>
            <a href="#draft" className="landing-secondary">{t.landing.secondary}</a>
          </div>
          <div className="landing-trust">✦ {t.landing.note}</div>
        </div>
        <div className="landing-hero-visual" aria-label="TuyDui scope map preview">
          <div className="scope-window">
            <div className="scope-window-top"><span /><span /><span /><b>PROJECT MAP</b><i>•••</i></div>
            <div className="scope-map-grid">
              <div className="map-line line-one" /><div className="map-line line-two" /><div className="map-line line-three" />
              <div className="map-node node-main"><small>PROJECT</small><strong>Coffee shop site</strong><em>On track</em></div>
              <div className="map-node node-one"><small>REQUIREMENT</small><strong>Editable menu</strong><em className="green">In scope</em></div>
              <div className="map-node node-two"><small>NEW REQUEST</small><strong>Loyalty points</strong><em className="orange">Needs a decision</em></div>
              <div className="map-node node-three"><small>DELIVERABLE</small><strong>Ordering flow</strong><em className="green">In scope</em></div>
            </div>
            <div className="scope-window-footer"><span><i className="dot-green" />Baseline confirmed</span><b>3 requirements</b></div>
          </div>
        </div>
      </section>
      <section className="landing-section landing-audience"><p className="landing-section-kicker">{t.landing.forWho}</p><h2>{t.landing.three}</h2></section>
      <section className="landing-steps" id="how-it-works">
        {t.landing.steps.map(([number, title, body]) => <article key={number}><div className="step-number">{number}</div><h3>{title}</h3><p>{body}</p></article>)}
      </section>
      <section className="landing-outcome"><div><div className="landing-eyebrow"><span />{t.landing.outcomeTitle}</div><p>{t.landing.outcomeBody}</p></div><div className="outcome-pills"><span>Brief</span><b>→</b><span>Requirements</span><b>→</b><span>Decision</span></div></section>
      <section className="landing-draft" id="draft"><ProjectDraftForm /></section>
      <footer className="landing-footer"><span className="landing-brand">TuyDui<span>·</span></span><span>Scope clarity for small teams</span><Link href="/login">{t.nav.signIn}</Link></footer>
    </main>
  );
}
