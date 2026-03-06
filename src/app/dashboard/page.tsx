import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { 
  LogOut, 
  Settings as SettingsIcon, 
  LayoutDashboard, 
  MapPin 
} from "lucide-react";
import { 
  logout, 
  togglePin, 
  toggleHide, 
  saveNote, 
  addCustomRental 
} from "./actions";
import SettingsForm from "./settings/SettingsForm";

export default async function DashboardPage() {
  const supabase = await createClient();

  // 1. Kolla att användaren är inloggad
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Hämta campingen som tillhör användaren
  const { data: campground } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!campground) return <div>Ingen camping hittades för detta konto.</div>;

  // 3. Hämta alla platser (kurerade listan)
  const { data: places } = await supabase
    .from("cached_places")
    .select("*")
    .eq("campground_id", campground.id)
    .order("is_pinned", { ascending: false });

  // 4. Hämta alla anslag (anslagstavlan)
  const { data: announcements } = await supabase
    .from("announcements")
    .select("*")
    .eq("campground_id", campground.id)
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SIDEBAR / NAV */}
      <nav className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center gap-2 font-black text-xl tracking-tighter">
          <div className="w-8 h-8 rounded-lg bg-gray-900 flex items-center justify-center text-white text-xs">CC</div>
          CAMP CONCIERGE <span className="text-gray-400 font-normal">| {campground.name}</span>
        </div>
        
        <form action={logout}>
          <button className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-red-600 transition-colors">
            <LogOut size={18} /> Logga ut
          </button>
        </form>
      </nav>

      <main className="max-w-7xl mx-auto py-10 px-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* VÄNSTER KOLUMN: INSTÄLLNINGAR & BRANDING */}
        <div className="lg:col-span-7 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <SettingsIcon className="text-gray-400" />
            <h2 className="text-2xl font-black">Inställningar</h2>
          </div>
          
          <SettingsForm 
            campground={campground} 
            announcements={announcements || []} 
          />
        </div>

        {/* HÖGER KOLUMN: HANTERA PLATSER (Din befintliga lista) */}
        <div className="lg:col-span-5 space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="text-gray-400" />
            <h2 className="text-2xl font-black">Hantera Platser</h2>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
             {/* Här kan du behålla din gamla logik för att lista places, 
                 pinna, dölja och lägga till egna rentals */}
             <p className="text-sm text-gray-400 mb-6 italic text-center">
               Här styr du vilka utflyktsmål som syns i "Utforska"-fliken.
             </p>
             
             {/* EXEMPEL PÅ LISTA (Du kan klistra in din gamla mappnings-logik här) */}
             <div className="space-y-3">
               {places?.map(place => (
                 <div key={place.id} className="p-4 border rounded-2xl flex justify-between items-center hover:bg-gray-50">
                    <span className="font-bold text-sm">{place.name}</span>
                    <div className="flex gap-2">
                       {/* Knappar för pin/hide som anropar dina actions */}
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>

      </main>
    </div>
  );
}