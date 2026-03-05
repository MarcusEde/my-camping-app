import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout, saveNote, toggleHide, togglePin } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: campground } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("owner_id", user.id)
    .single();
  if (!campground)
    return (
      <div className="p-20 text-center">
        No campground found for this account.
      </div>
    );

  const { data: places } = await supabase
    .from("cached_places")
    .select("*")
    .eq("campground_id", campground.id)
    .order("is_pinned", { ascending: false });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b px-8 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-bold flex items-center gap-2">
          🏕️ {campground.name}{" "}
          <span className="text-slate-400 font-normal">Dashboard</span>
        </h1>
        <form action={logout}>
          <button className="text-sm text-slate-500 hover:text-red-600 font-bold transition-colors">
            Log Out
          </button>
        </form>
      </header>

      <main className="max-w-5xl mx-auto w-full p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="md:col-span-2 bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-bold">Public Concierge Link</h2>
              <p className="text-slate-400 text-sm mb-4">
                Share this link with your guests.
              </p>
            </div>
            <a
              href={`/camp/${campground.slug}`}
              target="_blank"
              className="bg-emerald-500 hover:bg-emerald-600 text-white text-center py-2.5 rounded-xl font-bold text-sm transition-all"
            >
              Preview Guest App ↗
            </a>
          </div>
          <div className="bg-white border p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2">
              Staff Picks
            </p>
            <p className="text-5xl font-bold text-amber-500">
              {places?.filter((p) => p.is_pinned).length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border shadow-sm divide-y overflow-hidden">
          <div className="p-6 bg-slate-50/50">
            <h2 className="font-bold text-slate-800 tracking-tight">
              Curation Management
            </h2>
          </div>
          {places?.map((place) => (
            <div
              key={place.id}
              className={`p-6 flex flex-col md:flex-row gap-6 transition-all ${place.is_hidden ? "bg-slate-50 opacity-40 grayscale" : "hover:bg-slate-50/20"}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900">{place.name}</h3>
                  {place.is_pinned && (
                    <span className="text-[10px] bg-amber-100 text-amber-700 font-bold px-2 py-0.5 rounded-full uppercase">
                      Staff Pick
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-4 capitalize">
                  {place.category.replace("_", " ")} • ⭐{" "}
                  {place.rating || "N/A"}
                </p>
                <form action={saveNote} className="flex gap-2">
                  <input type="hidden" name="place_id" value={place.id} />
                  <input
                    name="note"
                    defaultValue={place.owner_note || ""}
                    placeholder="Add an insider tip..."
                    className="flex-1 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-emerald-500/20 border-slate-200 outline-none"
                  />
                  <button className="bg-slate-900 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-black transition-all">
                    Save
                  </button>
                </form>
              </div>
              <div className="flex md:flex-col gap-2 shrink-0">
                <form action={togglePin} className="flex-1">
                  <input type="hidden" name="place_id" value={place.id} />
                  <input
                    type="hidden"
                    name="current_status"
                    value={place.is_pinned.toString()}
                  />
                  <button
                    className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-bold border transition-all ${place.is_pinned ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-white border-slate-200 text-slate-600"}`}
                  >
                    {place.is_pinned ? "★ Pinned" : "☆ Pin Item"}
                  </button>
                </form>
                <form action={toggleHide} className="flex-1">
                  <input type="hidden" name="place_id" value={place.id} />
                  <input
                    type="hidden"
                    name="current_status"
                    value={place.is_hidden.toString()}
                  />
                  <button
                    className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-bold border transition-all ${place.is_hidden ? "bg-slate-800 text-white" : "bg-white border-slate-200 text-red-500 hover:bg-red-50"}`}
                  >
                    {place.is_hidden ? "Show" : "Hide"}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
