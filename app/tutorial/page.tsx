'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import LanguageToggle from '../components/LanguageToggle';
import ProjectDraftForm from '../components/ProjectDraftForm';
import { useLocale } from '../components/LocaleProvider';
import './tutorial.css';

type Requirement = { id: number; text: string; included: boolean };

export default function TutorialPage() {
  const { t, locale } = useLocale();
  const en = locale === 'en';
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [requirements, setRequirements] = useState<Requirement[]>([
    { id: 1, text: en ? 'Editable product menu' : 'แก้ไขเมนูสินค้าได้เอง', included: true },
    { id: 2, text: en ? 'Online ordering flow' : 'ขั้นตอนสั่งซื้อออนไลน์', included: true },
    { id: 3, text: en ? 'Story about the shop' : 'เรื่องราวของร้าน', included: true },
  ]);
  const [editing, setEditing] = useState<number | null>(null);
  const [baseline, setBaseline] = useState<string[] | null>(null);
  const [decision, setDecision] = useState<'add' | 'later' | null>(null);
  const [proposal, setProposal] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const steps = useMemo(() => en
      ? ['Brief', 'Requirements', 'Project map', 'Confirm the sample plan', 'A new client request']
    : ['บรีฟลูกค้า', 'รายการงาน', 'แผนผังโปรเจกต์', 'ยืนยันแผนตัวอย่าง', 'เมื่อมีคำขอใหม่'], [en]);

  function updateRequirement(id: number, patch: Partial<Requirement>) {
    setRequirements((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function addRequirement() {
    const id = Date.now();
    setRequirements((items) => {
      const label = en ? 'Social media launch' : 'เปิดตัวผ่านโซเชียล';
      const count = items.filter((item) => item.text.startsWith(label)).length;
      return [...items, { id, text: count ? `${label} ${count + 1}` : label, included: true }];
    });
    setAnnouncement(en ? 'Added a requirement and linked it to the project map.' : 'เพิ่มรายการแล้ว และเชื่อมไว้ในแผนผังโปรเจกต์');
  }

  const included = requirements.filter((item) => item.included);
  const stageLabel = `${String(step + 1).padStart(2, '0')} / 05`;

  return (
    <main className="tutorial-page">
      <header className="tutorial-nav"><Link href="/" className="landing-brand brand-wordmark">Tuy<span className="wordmark-accent">Dui</span></Link><div><LanguageToggle compact /><Link href="/login" className="tutorial-login">{t.nav.signIn}</Link></div></header>
      <section className="tutorial-heading"><h1>{en ? 'From brief to an editable plan' : 'จากบรีฟ สู่แผนที่ปรับได้'}</h1><p>{t.tutorial.subtitle}</p></section>
      {!done ? <section className="tutorial-card" aria-label={en ? 'Interactive tutorial' : 'บทแนะนำแบบทดลองทำ'}>
        <div className="tutorial-progress" aria-label={`${en ? 'Step' : 'ขั้น'} ${step + 1} ${en ? 'of' : 'จาก'} 5`}><div className="tutorial-progress-line"><span style={{ width: `${(step / 4) * 100}%` }} /></div>{steps.map((label, index) => <button type="button" className={index <= step ? 'active' : ''} aria-current={index === step ? 'step' : undefined} key={label} onClick={() => { setStep(index); setAnnouncement(''); }}><i>{index + 1}</i><span>{label}</span></button>)}</div>
        <div className="tutorial-content" key={step}>
          <div className="tutorial-copy" aria-live="polite"><span className="demo-label">{t.tutorial.demo}</span><h2>{steps[step]}</h2>
            {step === 0 && <div className="brief-preview"><span>{en ? 'CLIENT BRIEF' : 'บรีฟจากลูกค้า'}</span><p>{en ? <>Build a coffee shop website with <strong>a menu</strong>, <strong>online ordering</strong>, and <strong>a story about the shop</strong>.</> : <>อยากได้เว็บไซต์ร้านกาแฟ มี<strong>เมนูสินค้า</strong> <strong>ระบบสั่งซื้อออนไลน์</strong> และ<strong>หน้าเล่าเรื่องของร้าน</strong></>}</p><small>{en ? 'Goal · Let customers order and learn about the shop' : 'เป้าหมาย · ให้ลูกค้าสั่งซื้อและรู้จักร้านมากขึ้น'}</small></div>}
            {step === 1 && <><p>{en ? 'Edit the list or add an item. Changes also appear in the map.' : 'แก้ไขรายการหรือเพิ่มงานได้ รายการที่เปลี่ยนจะเชื่อมกับแผนผังในขั้นถัดไป'}</p><div className="requirement-list">{requirements.map((item) => <div className={`requirement-row${item.included ? '' : ' is-muted'}`} key={item.id}><button type="button" className="requirement-toggle" aria-pressed={item.included} onClick={() => updateRequirement(item.id, { included: !item.included })}>{item.included ? '✓' : '○'}</button>{editing === item.id ? <input aria-label={en ? 'Edit requirement' : 'แก้ไขรายการงาน'} value={item.text} autoFocus onChange={(event) => updateRequirement(item.id, { text: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') setEditing(null); }} /> : <span>{item.text}</span>}<button type="button" className="text-action" onClick={() => setEditing(editing === item.id ? null : item.id)}>{editing === item.id ? (en ? 'Done' : 'เสร็จ') : (en ? 'Edit' : 'แก้ไข')}</button><button type="button" className="text-action remove-action" aria-label={`${en ? 'Remove' : 'ลบ'} ${item.text}`} onClick={() => setRequirements((items) => items.filter((entry) => entry.id !== item.id))}>×</button></div>)}<button className="add-action" type="button" onClick={addRequirement}>＋ {en ? 'Add a requirement' : 'เพิ่มรายการงาน'}</button></div></>}
            {step === 2 && <><p>{en ? 'Select a node to edit it. Add a requirement here and it stays linked to the list.' : 'เลือกโหนดเพื่อแก้ชื่อได้ เพิ่มรายการจากตรงนี้ก็จะไปอยู่ในรายการงานด้วย'}</p><div className="map-workbench"><div className="mini-map interactive-map" aria-label={en ? 'Editable project map' : 'แผนผังโปรเจกต์ที่แก้ไขได้'}><svg className="map-edges" viewBox="0 0 600 270" preserveAspectRatio="none" aria-hidden="true"><path d="M300 125 C220 80 180 65 130 55"/><path d="M300 125 C385 80 420 70 475 55"/><path d="M300 125 C230 185 180 205 130 215"/><path d="M300 125 C385 185 420 205 475 215"/></svg><div className="map-work-root">{en ? 'Coffee shop website' : 'เว็บไซต์ร้านกาแฟ'}</div>{included.slice(0, 4).map((item, index) => <button type="button" key={item.id} className={`map-work-node map-position-${index}`} onClick={() => setEditing(editing === item.id ? null : item.id)} aria-label={`${en ? 'Edit map node' : 'แก้ไขโหนด'}: ${item.text}`}>{editing === item.id ? <input value={item.text} autoFocus onClick={(event) => event.stopPropagation()} onChange={(event) => updateRequirement(item.id, { text: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') setEditing(null); }} /> : item.text}</button>)}</div>{included.length > 4 && <div className="map-overflow-list"><span>{en ? 'More connected work' : 'งานอื่นที่เชื่อมกับโปรเจกต์'}</span>{included.slice(4).map((item) => <div key={item.id}><button type="button" onClick={() => setEditing(editing === item.id ? null : item.id)}>{item.text}</button>{editing === item.id && <input aria-label={en ? 'Edit map node' : 'แก้ไขโหนด'} autoFocus value={item.text} onChange={(event) => updateRequirement(item.id, { text: event.target.value })} onKeyDown={(event) => { if (event.key === 'Enter') setEditing(null); }} />}</div>)}</div>}<div className="map-actions"><button type="button" className="add-action" onClick={addRequirement}>＋ {en ? 'Add connected work' : 'เพิ่มงานในแผน'}</button><span>{included.length + 1} {en ? 'connected nodes' : 'โหนดที่เชื่อมกัน'}</span></div></div></>}
            {step === 3 && <><p>{en ? 'Confirm this sample plan to compare a future request against it.' : 'กดยืนยันแผนตัวอย่าง เพื่อใช้เป็นฐานเปรียบเทียบคำขอใหม่'}</p><div className="baseline-panel"><div><strong>{en ? 'Included in this sample plan' : 'รายการในแผนตัวอย่าง'}</strong><span>{included.length} {en ? 'items' : 'รายการ'}</span></div><ul>{included.map((item) => <li key={item.id}>{item.text}</li>)}</ul><button type="button" className={`baseline-button${baseline ? ' confirmed' : ''}`} onClick={() => { setBaseline(included.map((item) => item.text)); setAnnouncement(en ? 'Sample plan confirmed. You can keep exploring the example.' : 'ยืนยันแผนตัวอย่างแล้ว ลองดูขั้นต่อไปได้เลย'); }}>{baseline ? `✓ ${en ? 'Sample plan confirmed' : 'ยืนยันแผนตัวอย่างแล้ว'}` : (en ? 'Confirm sample plan' : 'ยืนยันแผนตัวอย่าง')}</button></div></>}
            {step === 4 && <><p>{en ? 'A new request has arrived. Compare it with the confirmed plan, then choose what to do.' : 'มีบรีฟใหม่เข้ามา ลองเทียบกับแผนที่ยืนยันไว้ แล้วเลือกแนวทางต่อได้เลย'}</p><div className="change-compare"><div><small>{en ? 'AGREED SAMPLE PLAN' : 'แผนตัวอย่างที่ตกลงไว้'}</small><strong>{baseline?.join(', ') || (en ? 'Confirm the sample plan in the previous step' : 'กลับไปยืนยันแผนตัวอย่างในขั้นก่อน')}</strong></div><span className="compare-arrow">→</span><div className="new-request"><small>{en ? 'NEW CLIENT BRIEF' : 'บรีฟใหม่จากลูกค้า'}</small><strong>{en ? 'Member accounts and loyalty points' : 'ระบบสมาชิกและสะสมแต้ม'}</strong></div></div><div className="decision-actions"><button type="button" aria-pressed={decision === 'add'} onClick={() => { setDecision('add'); setProposal(true); setAnnouncement(en ? 'A proposed plan update is ready. The confirmed baseline remains unchanged.' : 'แสดงข้อเสนอปรับแผนแล้ว ขอบเขตเดิมยังคงเดิม'); }}>{en ? 'Review a plan update' : 'ดูข้อเสนอปรับแผน'}</button><button type="button" aria-pressed={decision === 'later'} onClick={() => { setDecision('later'); setProposal(false); setAnnouncement(en ? 'The request is marked for discussion. The sample plan stays as agreed.' : 'ทำเครื่องหมายรอคุยเพิ่มเติม แผนตัวอย่างยังคงตามที่ตกลง'); }}>{en ? 'Discuss it later' : 'ขอคุยก่อน'}</button></div>{proposal && <div className="proposal-panel" role="status"><b>＋ {en ? 'Proposed plan update' : 'ข้อเสนอปรับแผน'}</b><p>{en ? 'Add loyalty points as new work. Keep the original plan as the confirmed baseline until you approve this change.' : 'เพิ่มระบบสมาชิกและสะสมแต้มเป็นงานใหม่ โดยคงแผนเดิมไว้เป็นขอบเขตที่ยืนยันแล้ว จนกว่าจะอนุมัติการเปลี่ยนแปลง'}</p></div>}{decision === 'later' && <div className="proposal-panel" role="status">{en ? 'The request is waiting for a conversation. The confirmed plan has not changed.' : 'คำขอนี้รอการพูดคุยเพิ่มเติม แผนที่ยืนยันไว้ยังไม่เปลี่ยน'}</div>}</>}
            {announcement && <p className="tutorial-announcement" role="status">{announcement}</p>}
          </div>
          <aside className="tutorial-side"><div className="tutorial-side-label">{stageLabel}</div><div className="tutorial-side-mark">{['✦', '✓', '⌘', '◎', '↗'][step]}</div><p>{en ? 'Try it yourself. Your sample changes carry through the next steps.' : 'ลองทำได้เลย สิ่งที่แก้ในตัวอย่างจะต่อเนื่องไปยังขั้นถัดไป'}</p></aside>
        </div>
        <div className="tutorial-actions"><button type="button" className="tutorial-back" onClick={() => { if (step > 0) setStep(step - 1); setAnnouncement(''); }} disabled={step === 0}>← {t.tutorial.back}</button><button type="button" className="skip-tour" onClick={() => { setDone(true); setAnnouncement(''); }}>{en ? 'Skip tour' : 'ข้ามตัวอย่าง'}</button>{step < 4 ? <button type="button" className="landing-primary" onClick={() => { setStep(step + 1); setAnnouncement(''); }}>{t.tutorial.continue} <span>→</span></button> : <button type="button" className="landing-primary" onClick={() => { setDone(true); setAnnouncement(''); }}>{en ? 'Create your project' : 'สร้างโปรเจกต์ของคุณ'} <span>→</span></button>}</div>
      </section> : <section className="tutorial-completion"><span className="completion-mark">✓</span><p className="demo-label">{en ? 'You are ready to begin' : 'พร้อมเริ่มโปรเจกต์แล้ว'}</p><h2>{en ? 'Turn your brief into a plan' : 'เริ่มแผนงานจากบรีฟของคุณ'}</h2><p>{en ? 'Start a private draft, then sign in when you are ready to save it as a project.' : 'เริ่มกรอกร่างส่วนตัวได้เลย แล้วเข้าสู่ระบบเมื่อพร้อมบันทึกเป็นโปรเจกต์จริง'}</p><ProjectDraftForm compact /><button type="button" className="tutorial-restart" onClick={() => { setDone(false); setStep(0); }}>{en ? 'Back to the sample' : 'กลับไปดูตัวอย่าง'}</button></section>}
      <div className="tutorial-bottom"><Link href="/">← {en ? 'Home' : 'หน้าแรก'}</Link><button type="button" onClick={() => { setStep(0); setDone(false); setRequirements([{ id: 1, text: en ? 'Editable product menu' : 'แก้ไขเมนูสินค้าได้เอง', included: true }, { id: 2, text: en ? 'Online ordering flow' : 'ขั้นตอนสั่งซื้อออนไลน์', included: true }, { id: 3, text: en ? 'Story about the shop' : 'เรื่องราวของร้าน', included: true }]); setBaseline(null); setDecision(null); setProposal(false); }}>{t.tutorial.reset}</button></div>
    </main>
  );
}
