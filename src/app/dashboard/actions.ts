'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

// ━━━ HELPERS ━━━
async function getOwnedCampgroundId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: campground } = await supabase
    .from('campgrounds')
    .select('id, slug')
    .eq('owner_id', user.id)
    .single();

  if (!campground) throw new Error('No campground found');
  return campground.id;
}

function revalidateAll(slug?: string) {
  revalidatePath('/dashboard');
  if (slug) {
    revalidatePath(`/camp/${slug}`);
  }
  // Also revalidate the dynamic route pattern
  revalidatePath('/camp/[slug]', 'page');
}

// ━━━ AUTH ━━━
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

// ━━━ CAMPGROUND SETTINGS ━━━
export async function updateCampgroundSettings(
  campgroundId: string,
  data: {
    primary_color?: string;
    wifi_name?: string;
    wifi_password?: string;
    trash_rules?: string;
    check_out_info?: string;
    emergency_info?: string;
  }
) {
  const supabase = await createClient();

  // Security: verify ownership
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: campground } = await supabase
    .from('campgrounds')
    .select('id, slug, owner_id')
    .eq('id', campgroundId)
    .single();

  if (!campground || campground.owner_id !== user.id) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase
    .from('campgrounds')
    .update({
      primary_color: data.primary_color ?? undefined,
      wifi_name: data.wifi_name ?? null,
      wifi_password: data.wifi_password ?? null,
      trash_rules: data.trash_rules ?? null,
      check_out_info: data.check_out_info ?? null,
      emergency_info: data.emergency_info ?? null,
    })
    .eq('id', campgroundId);

  if (error) throw new Error(error.message);

  revalidateAll(campground.slug);
  return { success: true };
}

// ━━━ ANNOUNCEMENTS ━━━
export async function createAnnouncement(
  campgroundId: string,
  title: string,
  content: string,
  type: 'info' | 'event' | 'warning'
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Verify ownership
  const { data: campground } = await supabase
    .from('campgrounds')
    .select('id, slug, owner_id')
    .eq('id', campgroundId)
    .single();

  if (!campground || campground.owner_id !== user.id) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase
    .from('announcements')
    .insert([{
      campground_id: campgroundId,
      title: title.trim(),
      content: content.trim(),
      type,
    }]);

  if (error) throw new Error(error.message);

  revalidateAll(campground.slug);
  return { success: true };
}

export async function deleteAnnouncement(announcementId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Fetch announcement to get campground_id, then verify ownership
  const { data: announcement } = await supabase
    .from('announcements')
    .select('id, campground_id')
    .eq('id', announcementId)
    .single();

  if (!announcement) throw new Error('Announcement not found');

  const { data: campground } = await supabase
    .from('campgrounds')
    .select('id, slug, owner_id')
    .eq('id', announcement.campground_id)
    .single();

  if (!campground || campground.owner_id !== user.id) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', announcementId);

  if (error) throw new Error(error.message);

  revalidateAll(campground.slug);
  return { success: true };
}

// ━━━ PLACES ━━━
async function verifyPlaceOwnership(placeId: string) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: place } = await supabase
    .from('cached_places')
    .select('id, campground_id')
    .eq('id', placeId)
    .single();

  if (!place) throw new Error('Place not found');

  const { data: campground } = await supabase
    .from('campgrounds')
    .select('id, slug, owner_id')
    .eq('id', place.campground_id)
    .single();

  if (!campground || campground.owner_id !== user.id) {
    throw new Error('Unauthorized');
  }

  return { supabase, campground };
}

export async function togglePin(placeId: string, currentState: boolean) {
  const { supabase, campground } = await verifyPlaceOwnership(placeId);

  const { error } = await supabase
    .from('cached_places')
    .update({ is_pinned: !currentState })
    .eq('id', placeId);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
}

export async function toggleHide(placeId: string, currentState: boolean) {
  const { supabase, campground } = await verifyPlaceOwnership(placeId);

  const { error } = await supabase
    .from('cached_places')
    .update({ is_hidden: !currentState })
    .eq('id', placeId);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
}

export async function saveNote(placeId: string, note: string) {
  const { supabase, campground } = await verifyPlaceOwnership(placeId);

  const { error } = await supabase
    .from('cached_places')
    .update({ owner_note: note.trim() || null })
    .eq('id', placeId);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
}

export async function addCustomPlace(
  campgroundId: string,
  name: string,
  category: string,
  address?: string
) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: campground } = await supabase
    .from('campgrounds')
    .select('id, slug, owner_id')
    .eq('id', campgroundId)
    .single();

  if (!campground || campground.owner_id !== user.id) {
    throw new Error('Unauthorized');
  }

  const { error } = await supabase.from('cached_places').insert([{
    campground_id: campgroundId,
    name: name.trim(),
    category,
    address: address?.trim() || null,
    google_place_id: null,
    rating: null,
    latitude: null,
    longitude: null,
    raw_data: null,
    is_pinned: true,
    is_hidden: false,
    is_indoor: ['bowling', 'museum', 'cinema', 'spa', 'shopping'].includes(category),
    fetched_at: new Date().toISOString(),
  }]);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
  return { success: true };
}

export async function deletePlace(placeId: string) {
  const { supabase, campground } = await verifyPlaceOwnership(placeId);

  // Only allow deleting custom places (no google_place_id)
  const { data: place } = await supabase
    .from('cached_places')
    .select('google_place_id')
    .eq('id', placeId)
    .single();

  if (place?.google_place_id) {
    throw new Error('Cannot delete synced Google Places. Use hide instead.');
  }

  const { error } = await supabase
    .from('cached_places')
    .delete()
    .eq('id', placeId);

  if (error) throw new Error(error.message);
  revalidateAll(campground.slug);
}
