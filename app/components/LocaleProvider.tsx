'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'th' | 'en';

const dictionaries = {
  th: {
    nav: { how: 'วิธีทำงาน', tutorial: 'ลองใช้ตัวอย่าง', signIn: 'เข้าสู่ระบบ', start: 'เริ่มร่างโปรเจกต์' },
    landing: {
      eyebrow: 'Scope clarity for small teams',
      title: 'คุมขอบเขตงาน\nก่อนงานจะบาน',
      description: 'TuyDui ช่วยเปลี่ยน brief ให้เป็น requirements ที่คุยกันรู้เรื่อง เห็นภาพโปรเจกต์ร่วมกัน และตัดสินใจได้เมื่อมีงานใหม่เข้ามา',
      primary: 'ลองดู flow ตัวอย่าง',
      secondary: 'เริ่มร่างโปรเจกต์',
      note: 'ตัวอย่างนี้ไม่เรียก AI จริง และไม่สร้างข้อมูลในโปรเจกต์ของคุณ',
      forWho: 'สร้างมาเพื่อคนทำงานที่ต้องคุม scope ทุกวัน',
      three: 'เห็นสิ่งที่ตกลงกัน ตั้งแต่ต้นจนจบ',
      steps: [
        ['01', 'เริ่มจาก brief', 'รวบรวมโจทย์ ลูกค้า และเป้าหมายให้อยู่ในที่เดียว'],
        ['02', 'ทำให้เป็นภาพเดียวกัน', 'เปลี่ยน brief เป็น requirements และ project map ที่แก้ไขได้'],
        ['03', 'ตัดสินใจก่อนรับงานเพิ่ม', 'เมื่อมี scope ใหม่ ระบบช่วยชี้ให้เห็น แล้วคุณเลือกทางเดินเอง'],
      ],
      outcomeTitle: 'ไม่ต้องเถียงกันจากความรู้สึก',
      outcomeBody: 'มีหลักฐานที่อ่านง่ายว่าอะไรอยู่ใน scope เดิม อะไรคือคำขอใหม่ และควรคุยต่ออย่างไร',
    },
    tutorial: {
      label: 'Interactive example', title: 'ลอง flow ของ TuyDui ด้วยข้อมูลตัวอย่าง',
      subtitle: 'กดดูทีละขั้นเพื่อเห็นภาพการทำงาน ตั้งแต่ brief ไปจนถึงการตัดสินใจเรื่อง scope',
      demo: 'ตัวอย่างจำลอง', brief: 'Brief', requirements: 'Requirements', map: 'Project map', change: 'Scope change',
      briefText: 'ทำเว็บไซต์ร้านกาแฟ มีเมนูสินค้า ระบบสั่งซื้อ และหน้าเรื่องราวของร้าน',
      requirementText: 'ลูกค้าต้องการหน้าเมนูที่แก้ไขรายการสินค้าได้เอง',
      changeText: 'เพิ่มระบบสมาชิกและสะสมแต้ม',
      inScope: 'อยู่ใน scope เดิม', newScope: 'คำขอใหม่',
      continue: 'ถัดไป', back: 'ย้อนกลับ', startDraft: 'เริ่มจากข้อมูลของฉัน',
      finish: 'ลองร่างโปรเจกต์จริง', reset: 'เริ่มดูใหม่',
    },
    draft: { title: 'เริ่มร่างโปรเจกต์ก่อนเข้าสู่ระบบ', subtitle: 'กรอกข้อมูลพื้นฐานไว้ก่อนได้ เมื่อพร้อมสร้างหรือใช้ AI ค่อยเข้าสู่ระบบ', name: 'ชื่อโปรเจกต์', client: 'ชื่อลูกค้า', brief: 'Brief หรือเป้าหมายงาน', namePlaceholder: 'เช่น เว็บไซต์ร้านกาแฟ', clientPlaceholder: 'เช่น บริษัท ABC', briefPlaceholder: 'เล่าโจทย์สั้น ๆ ที่อยากให้ทีมเข้าใจตรงกัน', save: 'บันทึกไว้แล้วไปต่อ', saved: 'บันทึกร่างไว้ในเบราว์เซอร์นี้แล้ว', privacy: 'ยังไม่ส่งข้อมูลไปที่เซิร์ฟเวอร์', required: 'กรุณากรอกชื่อโปรเจกต์และลูกค้า' },
    login: { title: 'เข้าสู่ระบบเพื่อทำงานต่อ', subtitle: 'ร่างโปรเจกต์ของคุณจะยังอยู่หลังจากเข้าสู่ระบบ', google: 'เข้าสู่ระบบด้วย Google', loading: 'กำลังเข้าสู่ระบบ...', back: 'กลับหน้าแรก', error: 'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้' },
    projects: { workspace: 'พื้นที่ทำงานของคุณ', title: 'โปรเจกต์ทั้งหมด', subtitle: 'เลือกโปรเจกต์เพื่อเริ่มจัดการ scope และ requirements', new: 'สร้างโปรเจกต์ใหม่', empty: 'ยังไม่มีโปรเจกต์', emptyBody: 'สร้างโปรเจกต์แรกของคุณเพื่อเริ่มติดตาม scope และจัดการ requirements', createFirst: 'สร้างโปรเจกต์แรก', signOut: 'ออกจากระบบ', restored: 'กู้คืนร่างโปรเจกต์จากก่อนเข้าสู่ระบบแล้ว', createTitle: 'สร้างโปรเจกต์ใหม่', cancel: 'ยกเลิก', creating: 'กำลังสร้าง...', create: 'สร้างโปรเจกต์', description: 'รายละเอียด (ไม่บังคับ)', updated: 'อัปเดตล่าสุด', client: 'ลูกค้า', shared: 'แชร์ร่วมกัน', baseline: 'Baseline V1', loadError: 'โหลดโปรเจกต์ไม่สำเร็จ' },
    common: { loading: 'กำลังโหลด...', language: 'ภาษา' },
  },
  en: {
    nav: { how: 'How it works', tutorial: 'Try the example', signIn: 'Sign in', start: 'Start a project draft' },
    landing: {
      eyebrow: 'Scope clarity for small teams',
      title: 'Keep scope clear\nbefore work expands',
      description: 'TuyDui turns a brief into shared requirements, an editable project map, and a clear decision when new work appears.',
      primary: 'See the example flow', secondary: 'Start a project draft',
      note: 'This is a sample flow. It does not call live AI or create project data.',
      forWho: 'Built for people who keep scope on track every day',
      three: 'Keep the agreement visible from start to finish',
      steps: [['01', 'Start with the brief', 'Keep the client ask, context, and goals in one place'], ['02', 'Build a shared picture', 'Turn the brief into editable requirements and a project map'], ['03', 'Decide before taking on more', 'See what changed, then choose how to handle it'],],
      outcomeTitle: 'Replace memory with a shared record', outcomeBody: 'See what was in the original scope, what is new, and what needs a conversation next.',
    },
    tutorial: {
      label: 'Interactive example', title: 'Try TuyDui with sample project data', subtitle: 'Move through the flow to see how a brief becomes a scope decision.', demo: 'Sample only', brief: 'Brief', requirements: 'Requirements', map: 'Project map', change: 'Scope change', briefText: 'Build a coffee shop website with a menu, ordering, and an about page.', requirementText: 'The client needs to edit menu items without a developer.', changeText: 'Add accounts and a loyalty points system.', inScope: 'In the original scope', newScope: 'New request', continue: 'Continue', back: 'Back', startDraft: 'Start with my project', finish: 'Draft a real project', reset: 'Start over',
    },
    draft: { title: 'Draft a project before signing in', subtitle: 'Save the basics first. Sign in when you want to create a real project or use AI.', name: 'Project name', client: 'Client name', brief: 'Brief or project goal', namePlaceholder: 'e.g. Coffee shop website', clientPlaceholder: 'e.g. ABC Company', briefPlaceholder: 'Share the short version of what the team should understand', save: 'Save draft and continue', saved: 'Draft saved in this browser', privacy: 'Nothing is sent to the server yet', required: 'Add a project name and client name' },
    login: { title: 'Sign in to continue', subtitle: 'Your project draft will stay with you after sign-in.', google: 'Continue with Google', loading: 'Signing in...', back: 'Back to home', error: 'We could not sign you in right now' },
    projects: { workspace: 'YOUR WORKSPACE', title: 'All projects', subtitle: 'Choose a project to manage scope and requirements', new: 'New project', empty: 'No projects yet', emptyBody: 'Create your first project to start tracking scope and requirements.', createFirst: 'Create your first project', signOut: 'Sign out', restored: 'Your pre-login project draft has been restored.', createTitle: 'Create a new project', cancel: 'Cancel', creating: 'Creating...', create: 'Create project', description: 'Description (optional)', updated: 'Updated', client: 'Client', shared: 'Shared', baseline: 'Baseline V1', loadError: 'Could not load projects' },
    common: { loading: 'Loading...', language: 'Language' },
  },
} as const;

type Dictionary = typeof dictionaries.th | typeof dictionaries.en;
type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void; t: Dictionary };
const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('th');

  useEffect(() => {
    const saved = window.localStorage.getItem('tuydui-locale');
    if (saved === 'th' || saved === 'en') setLocaleState(saved);
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem('tuydui-locale', next);
    document.documentElement.lang = next;
  }

  const value = useMemo(() => ({ locale, setLocale, t: dictionaries[locale] }), [locale]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const value = useContext(LocaleContext);
  if (!value) throw new Error('useLocale must be used inside LocaleProvider');
  return value;
}
