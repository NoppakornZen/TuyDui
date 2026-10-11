'use client';

import Link from 'next/link';
import { useState } from 'react';
import LanguageToggle from '../components/LanguageToggle';
import ProjectDraftForm from '../components/ProjectDraftForm';
import { useLocale } from '../components/LocaleProvider';
import './tutorial.css';

export default function TutorialPage() {
  const { t } = useLocale();
  const [step, setStep] = useState(0);
  const steps = [t.tutorial.brief, t.tutorial.requirements, t.tutorial.map, t.tutorial.change];
  return (
    <main className="tutorial-page">
      <header className="tutorial-nav"><Link href="/" className="landing-brand">TuyDui<span>·</span></Link><div><LanguageToggle compact /><Link href="/login" className="tutorial-login">{t.nav.signIn}</Link></div></header>
      <section className="tutorial-heading"><div className="landing-eyebrow"><span />{t.tutorial.label}</div><h1>{t.tutorial.title}</h1><p>{t.tutorial.subtitle}</p></section>
      <section className="tutorial-card">
        <div className="tutorial-progress"><div className="tutorial-progress-line"><span style={{ width: `${(step / (steps.length - 1)) * 100}%` }} /></div>{steps.map((label, index) => <button type="button" className={index <= step ? 'active' : ''} key={label} onClick={() => setStep(index)}><i>{index + 1}</i><span>{label}</span></button>)}</div>
        <div className="tutorial-content"><div className="tutorial-copy"><span className="demo-label">{t.tutorial.demo}</span><h2>{steps[step]}</h2>{step === 0 && <p>{t.tutorial.briefText}</p>}{step === 1 && <><p>{t.tutorial.requirementText}</p><div className="tutorial-tag green">✓ {t.tutorial.inScope}</div></>}{step === 2 && <div className="mini-map"><div className="mini-node mini-main">Coffee shop site</div><div className="mini-node mini-req">Editable menu</div><div className="mini-node mini-deliver">Ordering flow</div><b>↗</b><b>↘</b></div>}{step === 3 && <><p>{t.tutorial.changeText}</p><div className="tutorial-tag orange">＋ {t.tutorial.newScope}</div></>}</div><div className="tutorial-side"><div className="tutorial-side-label">{String(step + 1).padStart(2, '0')} / 04</div><div className="tutorial-side-mark">{step === 0 ? '✦' : step === 1 ? '✓' : step === 2 ? '⌘' : '!'}</div><p>{t.landing.note}</p></div></div>
        <div className="tutorial-actions">{step > 0 ? <button type="button" className="tutorial-back" onClick={() => setStep(step - 1)}>← {t.tutorial.back}</button> : <span />}{step < steps.length - 1 ? <button type="button" className="landing-primary" onClick={() => setStep(step + 1)}>{t.tutorial.continue} <span>→</span></button> : <a className="landing-primary" href="#tutorial-draft">{t.tutorial.finish} <span>→</span></a>}</div>
      </section>
      <section className="tutorial-draft" id="tutorial-draft"><ProjectDraftForm compact /></section>
      <div className="tutorial-bottom"><Link href="/">← {t.nav.how}</Link><button type="button" onClick={() => setStep(0)}>{t.tutorial.reset}</button></div>
    </main>
  );
}
