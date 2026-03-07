'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { fetchPlacesByText } from '@/lib/google-places';

const MASTER_ADMIN_EMAIL = 'test@camping.se'; 

async function verifySuperAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.email !== MASTER_ADMIN_EMAIL) {
    throw new Error('Unauthorized. Master Admin only.');
  }
  return supabase;
}

export async function adminSyncCampground(campgroundId: string) {
  const supabase = await verifySuperAdmin();

  const { data: campground } = await supabase
    .from('campgrounds')
    .select('id, name, latitude, longitude')
    .eq('id', campgroundId)
    .single();

  if (!campground) throw new Error('Hittade inte campingen');

  const searchQueries = [
    { query: "restaurang pizza", category: "restaurant" as const, radius: 4000 },
    { query: "café bageri", category: "cafe" as const, radius: 4000 },
    { query: "glasscafé glass", category: "cafe" as const, radius: 4000 },
    { query: "mataffär ica coop", category: "shopping" as const, radius: 4000 },
    { query: "strand badplats bad", category: "beach" as const, radius: 5000 },
    { query: "naturreservat", category: "park" as const, radius: 12000 }, 
    { query: "museum slott", category: "museum" as const, radius: 15000 }, 
    { query: "spa kallbadhus", category: "spa" as const, radius: 25000 } 
  ];

  let allPlacesFromGoogle: any[] = [];
  for (const s of searchQueries) {
    const results = await fetchPlacesByText(
      campground.latitude, 
      campground.longitude, 
      s.query, 
      s.category, 
      s.radius
    );
    allPlacesFromGoogle = [...allPlacesFromGoogle, ...results];
  }

  // Ett Set med ALLA Google IDs som kom tillbaka levande idag
  const incomingGoogleIds = new Set<string>();
  
  let addedCount = 0;
  let updatedCount = 0;

  for (const p of allPlacesFromGoogle) {
    if (incomingGoogleIds.has(p.google_place_id)) continue; 
    incomingGoogleIds.add(p.google_place_id);

    const rawDataForDb = p.raw_data.regularOpeningHours 
      ? { openingHours: (p.raw_data.regularOpeningHours as any).weekdayDescriptions } 
      : null;

    const { data: existing } = await supabase
      .from('cached_places')
      .select('id')
      .eq('google_place_id', p.google_place_id)
      .eq('campground_id', campgroundId)
      .single();

    if (existing) {
      await supabase
        .from('cached_places')
        .update({
          name: p.name,
          address: p.address,
          rating: p.rating,
          raw_data: rawDataForDb,
          fetched_at: new Date().toISOString()
        })
        .eq('id', existing.id);
        
      updatedCount++;
    } else {
      await supabase.from('cached_places').insert([{
        campground_id: campgroundId,
        google_place_id: p.google_place_id,
        name: p.name,
        address: p.address,
        category: p.category,
        rating: p.rating,
        latitude: p.latitude,
        longitude: p.longitude,
        is_indoor: p.is_indoor,
        is_pinned: false,
        is_hidden: false,
        raw_data: rawDataForDb,
        fetched_at: new Date().toISOString()
      }]);
      addedCount++;
    }
  }

  // STÄDNING! (Om ställen stängt för gott)
  // Vi gömmer alla platser i db som har ett google_place_id, men som Google INTE returnerade idag.
  const { error: hideError } = await supabase
    .from('cached_places')
    .update({ is_hidden: true })
    .eq('campground_id', campgroundId)
    .not('google_place_id', 'is', null) // Rör inte campingägarens egna manuella platser
    .not('google_place_id', 'in', `(${Array.from(incomingGoogleIds).join(',')})`); // Om de saknas i dagens hämtning

  if (hideError) console.error("Kunde inte gömma döda platser:", hideError);

  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/camp/[slug]', 'page');
  
  return { success: true, addedCount, updatedCount };
}

export async function adminClearGooglePlaces(campgroundId: string) {
  const supabase = await verifySuperAdmin();

  const { error } = await supabase
    .from('cached_places')
    .delete()
    .eq('campground_id', campgroundId)
    .not('google_place_id', 'is', null);

  if (error) throw new Error(error.message);
  
  revalidatePath('/admin');
  revalidatePath('/dashboard');
  revalidatePath('/camp/[slug]', 'page');
  
  return { success: true };
}