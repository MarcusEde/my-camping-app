'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { Campground, Announcement } from '@/types/database';
import { redirect } from 'next/navigation';

// --- NYA FUNKTIONER FÖR ÅSA-DEMON ---

export async function updateCampgroundSettings(campgroundId: string, data: Partial<Campground>) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('campgrounds')
    .update({
      primary_color: data.primary_color,
      wifi_name: data.wifi_name,
      wifi_password: data.wifi_password,
      trash_rules: data.trash_rules,
      check_out_info: data.check_out_info,
      emergency_info: data.emergency_info,
    })
    .eq('id', campgroundId);

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  return { success: true };
}

export async function createAnnouncement(campgroundId: string, title: string, content: string, type: 'info' | 'event' | 'warning') {
  const supabase = await createClient();
  const { error } = await supabase
    .from('announcements')
    .insert([{ campground_id: campgroundId, title, content, type }]);

  if (error) throw new Error(error.message);
  revalidatePath('/dashboard');
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string) {
  const supabase = await createClient();
  await supabase.from('announcements').delete().eq('id', announcementId);
  revalidatePath('/dashboard');
}

// --- DINA BEFINTLIGA FUNKTIONER (Som Dashboarden behöver) ---

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

export async function togglePin(placeId: string, currentState: boolean) {
  const supabase = await createClient();
  await supabase.from('cached_places').update({ is_pinned: !currentState }).eq('id', placeId);
  revalidatePath('/dashboard');
}

export async function toggleHide(placeId: string, currentState: boolean) {
  const supabase = await createClient();
  await supabase.from('cached_places').update({ is_hidden: !currentState }).eq('id', placeId);
  revalidatePath('/dashboard');
}

export async function saveNote(placeId: string, note: string) {
  const supabase = await createClient();
  await supabase.from('cached_places').update({ owner_note: note }).eq('id', placeId);
  revalidatePath('/dashboard');
}

export async function addCustomRental(campgroundId: string, name: string, category: any) {
  const supabase = await createClient();
  const { error } = await supabase.from('cached_places').insert([{
    campground_id: campgroundId,
    name: name,
    category: category,
    is_pinned: true,
    fetched_at: new Date().toISOString()
  }]);
  if (error) throw error;
  revalidatePath('/dashboard');
}