export default function Brand({ href = '/projects', beta = true }: { href?: string; beta?: boolean }) {
  return <a className="brand" href={href} aria-label="TuyDui — Projects"><span className="brand-mark"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 6h14M12 6v12M6 12h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /><circle cx="12" cy="18" r="2" fill="currentColor" /></svg></span><span className="brand-word">TuyDui</span>{beta && <span className="beta-label">BETA</span>}</a>;
}
