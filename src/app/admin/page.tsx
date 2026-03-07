import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminCampgroundCard from './AdminCampgroundCard';

const MASTER_ADMIN_EMAIL = 'test@camping.se'; // Samma som i actions.ts

export const metadata = { title: 'Master Admin – Camp Concierge' };

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Säkerhet: Kasta ut vanliga campingägare till deras egen dashboard
   if (!user) redirect('/login');
  
  // LOGGA UTT EPOSTEN FÖR ATT SE VAD DEN EGENTLIGEN ÄR!
  console.log("INLOGGAD SOM:", user.email);

  // Hämta ALLA campingar i systemet
  const { data: campgrounds } = await supabase
    .from('campgrounds')
    .select('id, name, slug, latitude, longitude, created_at')
    .order('created_at', { ascending: false });

  // Hämta ALLA platser för att kunna räkna hur många varje camping har
  const { data: places } = await supabase
    .from('cached_places')
    .select('id, campground_id, google_place_id');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-indigo-900 px-8 py-6 text-white shadow-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Super Admin</h1>
            <p className="text-sm font-medium text-indigo-300">Hantera alla kunders campingar</p>
          </div>
          <div className="rounded-lg bg-indigo-800 px-4 py-2 text-sm font-bold shadow-inner">
            {campgrounds?.length} aktiva campingar
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-8 py-10">
        <div className="grid gap-6">
          {campgrounds?.map((camp) => {
            const campPlaces = places?.filter(p => p.campground_id === camp.id) || [];
            const googlePlacesCount = campPlaces.filter(p => p.google_place_id !== null).length;
            const customPlacesCount = campPlaces.length - googlePlacesCount;

            return (
              <AdminCampgroundCard 
                key={camp.id} 
                campground={camp} 
                googleCount={googlePlacesCount}
                customCount={customPlacesCount}
              />
            );
          })}
        </div>
      </main>
    </div>
  );
}