import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { logout, saveNote, toggleHide, togglePin } from "./actions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 1. Get the owner's campground
  const { data: campground } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!campground) {
    return (
      <main className="p-8 max-w-xl mx-auto mt-20 text-center">
        <h1 className="text-2xl font-bold mb-4">
          🛠️ Building Your Concierge...
        </h1>
      </main>
    );
  }

  // 2. Fetch all places Google found for this campground
  const { data: places } = await supabase
    .from("cached_places")
    .select("*")
    .eq("campground_id", campground.id)
    .order("is_pinned", { ascending: false }) // Pinned at the top
    .order("name", { ascending: true }); // Alphabetical after that

  return (
    <main className="p-8 max-w-5xl mx-auto mt-10">
      {/* Header Area */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            🏕️ {campground.name} Dashboard
          </h1>
          <p className="text-gray-600">
            Manage your AI Concierge recommendations
          </p>
        </div>

        <form action={logout}>
          <button className="bg-red-50 text-red-600 px-4 py-2 rounded-md font-bold hover:bg-red-100">
            Log Out
          </button>
        </form>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <p className="text-sm font-bold text-blue-900 uppercase">Guest URL</p>
          <a
            href={`/camp/${campground.slug}`}
            target="_blank"
            className="text-blue-600 hover:underline font-mono"
          >
            /camp/{campground.slug} ↗
          </a>
        </div>
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
          <p className="text-sm font-bold text-emerald-900 uppercase">
            Total Places
          </p>
          <p className="text-2xl text-emerald-700">{places?.length || 0}</p>
        </div>
        <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-sm font-bold text-amber-900 uppercase">Pinned</p>
          <p className="text-2xl text-amber-700">
            {places?.filter((p) => p.is_pinned).length || 0}
          </p>
        </div>
      </div>

      {/* ========================================= */}
      {/* CURATION LIST                               */}
      {/* ========================================= */}
      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gray-50 p-4 border-b">
          <h2 className="text-lg font-bold">📍 Curate Your Recommendations</h2>
          <p className="text-sm text-gray-500">
            Pin your favorites, hide the bad ones, and add personal notes.
          </p>
        </div>

        <div className="divide-y">
          {places?.map((place) => (
            <div
              key={place.id}
              className={`p-4 flex gap-4 ${place.is_hidden ? "opacity-50 bg-gray-50" : ""}`}
            >
              {/* Info Column */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{place.name}</h3>
                  {place.is_pinned && (
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-bold">
                      Pinned
                    </span>
                  )}
                  {place.is_hidden && (
                    <span className="bg-gray-200 text-gray-700 text-xs px-2 py-0.5 rounded font-bold">
                      Hidden
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-500">
                  {place.category} • ⭐ {place.rating}
                </p>

                {/* Note Form */}
                <form action={saveNote} className="mt-3 flex gap-2">
                  <input type="hidden" name="place_id" value={place.id} />
                  <input
                    name="note"
                    defaultValue={place.owner_note || ""}
                    placeholder="Add an insider tip... (e.g. 'Best pizza in town!')"
                    className="border text-sm p-1.5 rounded w-full max-w-md bg-gray-50 focus:bg-white"
                  />
                  <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-sm font-bold">
                    Save Note
                  </button>
                </form>
              </div>

              {/* Action Buttons Column */}
              <div className="flex flex-col gap-2 w-32">
                <form action={togglePin}>
                  <input type="hidden" name="place_id" value={place.id} />
                  <input
                    type="hidden"
                    name="current_status"
                    value={place.is_pinned.toString()}
                  />
                  <button
                    className={`w-full py-1.5 rounded text-sm font-bold border transition-colors ${
                      place.is_pinned
                        ? "bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200"
                        : "bg-white border-gray-300 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {place.is_pinned ? "⭐ Unpin" : "⭐ Pin to Top"}
                  </button>
                </form>

                <form action={toggleHide}>
                  <input type="hidden" name="place_id" value={place.id} />
                  <input
                    type="hidden"
                    name="current_status"
                    value={place.is_hidden.toString()}
                  />
                  <button
                    className={`w-full py-1.5 rounded text-sm font-bold border transition-colors ${
                      place.is_hidden
                        ? "bg-gray-800 border-gray-900 text-white hover:bg-gray-700"
                        : "bg-white border-gray-300 text-red-600 hover:bg-red-50"
                    }`}
                  >
                    {place.is_hidden ? "👁️ Unhide" : "🚫 Hide Place"}
                  </button>
                </form>
              </div>
            </div>
          ))}

          {places?.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              No places found yet. Have you scanned the guest QR code to trigger
              the first fetch?
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
