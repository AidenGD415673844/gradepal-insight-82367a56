import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { LogIn, LogOut, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/lib/account-session';
import { supabase } from '@/integrations/supabase/client';

export function AccountControl() {
  const { user, loading } = useAccount();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    await navigate({ to: '/auth', replace: true });
  }
  if (loading) return <Button size="sm" variant="outline" disabled>Account</Button>;
  return user ? <div className="flex items-center gap-1"><Button size="sm" variant="outline" asChild><Link to="/account"><UserRound />Account</Link></Button><Button size="icon" variant="ghost" aria-label="Sign out" title="Sign out" onClick={signOut}><LogOut /></Button></div> : <Button size="sm" variant="outline" asChild><Link to="/auth"><LogIn />Sign in</Link></Button>;
}