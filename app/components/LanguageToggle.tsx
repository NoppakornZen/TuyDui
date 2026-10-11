'use client';

import { useLocale } from './LocaleProvider';

export default function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale, t } = useLocale();
  return (
    <div className={`language-toggle${compact ? ' language-toggle-compact' : ''}`} role="group" aria-label={t.common.language}>
      <button type="button" className={locale === 'th' ? 'active' : ''} onClick={() => setLocale('th')}>TH</button>
      <button type="button" className={locale === 'en' ? 'active' : ''} onClick={() => setLocale('en')}>EN</button>
    </div>
  );
}
