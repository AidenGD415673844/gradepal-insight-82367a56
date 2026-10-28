import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { GraduationCap, LoaderCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';
import '@lovable.dev/cloud-auth-js/styles.css';
import { useAccount } from '@/lib/account-session';
import { safeAccountDestination, validateNewPassword } from '@/lib/account-rules';

export const Route = createFileRoute('/auth')({
  head: () => ({ meta: [{ title: 'Sign in — GradeCalc' }, { name: 'description', content: 'Sign in or create your GradeCalc account with a private personal profile.' }, { property: 'og:title', content: 'Sign in — GradeCalc' }, { property: 'og:description', content: 'Access your personal GradeCalc account.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: AuthPage,
});
function AuthPage() {
  const { user, loading, refresh } = useAccount();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (loading || !user) return;
    const destination = safeAccountDestination(sessionStorage.getItem('gradecalc-auth-return'));
    sessionStorage.removeItem('gradecalc-auth-return');
    void navigate({ to: destination, replace: true });
  }, [user, loading, navigate]);
  function switchMode(next: typeof mode) { setMode(next); setError(''); setMessage(''); }
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setMessage('');
    if (mode === 'signup') { const problem = validateNewPassword(password, confirmation); if (problem) { setError(problem); return; } }
    setBusy(true);
    try {
      if (mode === 'forgot') {
        const result = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
        if (result.error) throw result.error;
        setMessage('If an account exists for this email, you’ll receive a password reset link.');
      } else if (mode === 'signup') {
        const result = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { display_name: name.trim() }, emailRedirectTo: `${window.location.origin}/auth` } });
        if (result.error) throw result.error;
        if (result.data.session) await refresh();
        else setMessage('Check your email to confirm your account, then sign in.');
      } else {
        const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (result.error) throw result.error;
        await refresh();
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to sign in. Please try again.'); }
    finally { setBusy(false); }
  }
  async function social(provider: 'google' | 'lovable') {
    setBusy(true); setError('');
    try {
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: `${window.location.origin}/auth` });
      if (result.error) throw result.error;
      if (!('redirected' in result && result.redirected)) await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Sign-in failed. Try again.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-background px-4 py-12"><div className="mx-auto max-w-sm space-y-7">
    <Button variant="ghost" size="sm" asChild><Link to="/"><ArrowLeft />Dashboard</Link></Button>
    <div className="space-y-2"><GraduationCap className="h-10 w-10 text-primary" /><p className="text-sm font-semibold text-primary">GradeCalc</p><h1 className="text-3xl font-bold">{mode === 'signup' ? 'Create your account' : mode === 'forgot' ? 'Reset your password' : 'Welcome back'}</h1></div>
    {mode !== 'forgot' && <div className="flex gap-2 border-b pb-3"><Button variant={mode === 'signin' ? 'default' : 'ghost'} onClick={() => switchMode('signin')} disabled={busy}>Sign in</Button><Button variant={mode === 'signup' ? 'default' : 'ghost'} onClick={() => switchMode('signup')} disabled={busy}>Create account</Button></div>}
    <form onSubmit={submit} className="space-y-4">
      {mode === 'signup' && <div className="space-y-2"><Label htmlFor="display-name">Display name</Label><Input id="display-name" autoComplete="name" value={name} onChange={e => setName(e.target.value)} maxLength={80} required /></div>}
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
      {mode !== 'forgot' && <div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} minLength={mode === 'signup' ? 8 : undefined} required /></div>}
      {mode === 'signup' && <div className="space-y-2"><Label htmlFor="confirmation">Confirm password</Label><Input id="confirmation" type="password" autoComplete="new-password" value={confirmation} onChange={e => setConfirmation(e.target.value)} required /></div>}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{message && <p role="status" className="text-sm text-success">{message}</p>}
      <Button className="w-full" disabled={busy || loading} type="submit">{busy && <LoaderCircle className="animate-spin" />}{mode === 'signup' ? 'Create account' : mode === 'forgot' ? 'Send reset link' : 'Sign in'}</Button>
    </form>
    {mode === 'signin' && <Button variant="link" className="px-0" onClick={() => switchMode('forgot')}>Forgot password?</Button>}
    {mode === 'forgot' ? <Button variant="link" onClick={() => switchMode('signin')}>Back to sign in</Button> : <div className="space-y-3 border-t pt-5"><Button variant="outline" className="w-full" disabled={busy} onClick={() => social('google')}>Continue with Google</Button><Button className="lovable-auth-button w-full" disabled={busy} onClick={() => social('lovable')}>Continue with Lovable</Button></div>}
  </div></main>;
}