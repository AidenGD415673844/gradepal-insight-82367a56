import { createFileRoute, Link } from '@tanstack/react-router';
import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { validateNewPassword } from '@/lib/account-rules';

export const Route = createFileRoute('/reset-password')({
  head: () => ({ meta: [{ title: 'Reset password — GradeCalc' }, { name: 'description', content: 'Choose a new password using your GradeCalc recovery email.' }, { property: 'og:title', content: 'Reset password — GradeCalc' }, { property: 'og:description', content: 'Securely recover your GradeCalc account.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: ResetPassword,
});
function ResetPassword() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    if (hash.get('type') === 'recovery') {
      void supabase.auth.getUser().then(({ data }) => { if (data.user) setReady(true); });
    }
    // The root account listener owns auth events; URL recovery tokens are
    // consumed by the generated client, so await its initialization once.
    void supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      const amr = (() => { try { return JSON.parse(atob(data.session.access_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).amr; } catch { return []; } })();
      if (hash.get('type') === 'recovery' || amr?.some((item: { method: string }) => item.method === 'recovery')) {
        void supabase.auth.getUser().then(({ data: identity }) => { if (identity.user) setReady(true); });
      }
    });
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); const problem = validateNewPassword(password, confirmation); if (problem) { setError(problem); return; }
    setBusy(true); setError('');
    try { const { error } = await supabase.auth.updateUser({ password }); if (error) throw error; setDone(true); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Password update failed.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen bg-background px-4 py-16"><div className="mx-auto max-w-sm space-y-5"><h1 className="text-2xl font-bold">Choose a new password</h1>{done ? <><p role="status" className="text-success">Your password has been updated.</p><Button asChild><Link to="/account">Continue to account</Link></Button></> : ready ? <form className="space-y-4" onSubmit={submit}><Label htmlFor="new-password">New password</Label><Input id="new-password" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e => setPassword(e.target.value)} /><Label htmlFor="confirm-new">Confirm new password</Label><Input id="confirm-new" type="password" autoComplete="new-password" required value={confirmation} onChange={e => setConfirmation(e.target.value)} />{error && <p role="alert" className="text-destructive text-sm">{error}</p>}<Button type="submit" disabled={busy}>Update password</Button></form> : <><p className="text-muted-foreground">Open the latest password reset link from your email to continue.</p><Button asChild variant="outline"><Link to="/auth">Request a new link</Link></Button></>}</div></main>;
}