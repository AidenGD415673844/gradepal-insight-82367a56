import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { AppShell } from '@/components/grade/AppShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccount } from '@/lib/account-session';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/account')({
  head: () => ({ meta: [{ title: 'Your account — GradeCalc' }, { name: 'description', content: 'Manage your private GradeCalc personal profile.' }, { property: 'og:title', content: 'Your account — GradeCalc' }, { property: 'og:description', content: 'View and update your personal GradeCalc profile.' }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary' }] }),
  component: AccountPage,
});
function AccountPage() {
  const { user, loading } = useAccount();
  const client = useQueryClient();
  const [name, setName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const profile = useQuery({ queryKey: ['profile', user?.id], enabled: Boolean(user), queryFn: async () => {
    if (!user) return null;
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    if (error) throw error; return data;
  } });
  async function save(event: FormEvent) {
    event.preventDefault(); if (!user || !profile.data) return; setBusy(true);
    const { error } = await supabase.from('profiles').update({ display_name: (name ?? profile.data.display_name).trim(), updated_at: new Date().toISOString() }).eq('id', user.id);
    setBusy(false); if (error) { toast.error(error.message); return; }
    await client.invalidateQueries({ queryKey: ['profile', user.id] }); toast.success('Profile saved');
  }
  return <AppShell title="Your account"><div className="max-w-lg space-y-6"><h2 className="text-2xl font-bold">Personal profile</h2>{loading ? <p>Loading account…</p> : !user ? <Button asChild><Link to="/auth">Sign in to your account</Link></Button> : <><p className="text-sm text-muted-foreground break-all">{user.email}</p>{profile.isPending ? <p>Loading profile…</p> : profile.error ? <div role="alert" className="space-y-3"><p className="text-destructive">Your profile could not be loaded.</p><Button variant="outline" onClick={() => profile.refetch()}>Try again</Button></div> : <form onSubmit={save} className="space-y-4"><Label htmlFor="profile-name">Display name</Label><Input id="profile-name" autoComplete="name" required maxLength={80} value={name ?? profile.data?.display_name ?? ''} onChange={e => setName(e.target.value)} /><Button type="submit" disabled={busy}>Save profile</Button></form>}<p className="text-sm text-muted-foreground">Your profile is saved to your account. Grades and tasks are still stored in this browser; your file has not been imported yet.</p></>}</div></AppShell>;
}