import Brand from '../components/Brand';
import './login-design.css';

export default function LoginScreen({ loading, error, onSignIn }: { loading: boolean; error: string; onSignIn: () => void }) {
  return <main className="login-page">
    <header className="login-topbar"><Brand href="/login" /><span>For freelancers and agencies</span></header>
    <div className="login-content">
    <section className="login-story" aria-label="About TuyDui">
      <h1>Know what was agreed.<br /><span>See what changed.</span></h1>
      <p>Keep your briefs, map your work, and review client requests.{' '}<br />Give your team one shared scope to work from.</p>
      <dl className="login-workflow"><div><dt>Brief</dt><dd>Import a PDF or text, then review AI suggestions.</dd></div><div><dt>Plan</dt><dd>See how work connects and who is responsible.</dd></div><div><dt>Changes</dt><dd>Compare new requests with the approved scope before deciding.</dd></div></dl>
    </section>
    <section className="login-form-side" aria-label="Sign in">
      <div className="login-form">
        <h2>Sign in</h2>
        <p>Open your projects{' '}<br />or start with your first brief.</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <button className="google-signin" onClick={onSignIn} disabled={loading}>
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>
        <p className="login-footnote">Beta · Up to 10 free AI requests per day.{' '}<br />Review AI suggestions before using them in your project.</p>
      </div>
    </section>
    </div>
    <footer className="login-footer">TuyDui · A shared scope for your team</footer>
  </main>;
}
