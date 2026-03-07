import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Om användaren landar på "/", skicka till rätt plats
  if (user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}