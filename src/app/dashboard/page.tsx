// src/app/dashboard/page.tsx
import { createClient } from "@/lib/supabase/server";
import {
  ExternalLink,
  Plus,
  ShieldCheck
} from "lucide-react";
import { redirect } from "next/navigation";
import {
  addCustomRental,
  logout,
  saveNote,
  toggleHide,
  togglePin,
} from "./actions";

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

  if (!campground) return <OnboardingUI />;

  const { data: places } = await supabase
    .from("cached_places")
    .select("*")
    .eq("campground_id", campground.id)
    .order("is_pinned", { ascending: false });

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col font-sans text-slate-900">
      {/* PROFESSIONAL NAV */}
      <nav className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded flex items-center justify-center text-white font-bold text-xs">
            {campground.name[0]}
          </div>
          <span className="text-sm font-semibold tracking-tight">
            {campground.name} Console
          </span>
        </div>
        <div className="flex items-center gap-4">
          <a
            href={`/camp/${campground.slug}`}
            target="_blank"
            className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
          >
            View Live Site <ExternalLink size={12} />
          </a>
          <form action={logout}>
            <button className="text-xs font-medium text-slate-400 hover:text-red-500 transition-colors">
              Sign Out
            </button>
          </form>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto w-full p-8 space-y-10">
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Service Management
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Control the digital experience for your guests at{" "}
              {campground.name}.
            </p>
          </div>

          {/* THE "ADD SERVICE" ACTION BAR - Professional alternative to bubbles */}
          <form
            action={addCustomRental}
            className="flex items-center gap-2 bg-white p-1.5 border border-slate-200 rounded-lg shadow-sm"
          >
            <input
              name="name"
              placeholder="e.g. Electric Bike Hire"
              className="bg-transparent border-none text-sm px-3 py-1 outline-none w-48 md:w-64"
              required
            />
            <button className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-xs font-bold hover:bg-indigo-700 flex items-center gap-2 transition-all">
              <Plus size={14} /> Add Service
            </button>
          </form>
        </div>

        {/* DATA TABLE - The "B2B" Standard */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Service / Location
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Status
                </th>
                <th className="px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Guest Note (Insider Tip)
                </th>
                <th className="px-6 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {places?.map((place) => (
                <tr
                  key={place.id}
                  className={`group hover:bg-slate-50/50 transition-colors ${place.is_hidden ? "opacity-50 grayscale" : ""}`}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${place.is_pinned ? "bg-amber-400" : "bg-slate-200"}`}
                      />
                      <div>
                        <p className="text-sm font-bold text-slate-800">
                          {place.name}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize">
                          {place.category.replace("_", " ")}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {place.is_pinned && (
                      <span className="text-[9px] bg-amber-50 text-amber-600 font-black px-2 py-0.5 rounded border border-amber-100 uppercase">
                        Staff Pick
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <form action={saveNote} className="flex items-center gap-2">
                      <input type="hidden" name="place_id" value={place.id} />
                      <input
                        name="note"
                        defaultValue={place.owner_note || ""}
                        placeholder="Add tip..."
                        className="bg-transparent border-none text-xs text-slate-500 italic w-full focus:ring-0 outline-none hover:text-slate-900 transition-colors"
                      />
                    </form>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <form action={togglePin}>
                        <input type="hidden" name="place_id" value={place.id} />
                        <input
                          type="hidden"
                          name="current_status"
                          value={place.is_pinned.toString()}
                        />
                        <button
                          className={`p-1.5 rounded border ${place.is_pinned ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-white text-slate-300 hover:text-amber-500"}`}
                        >
                          ★
                        </button>
                      </form>
                      <form action={toggleHide}>
                        <input type="hidden" name="place_id" value={place.id} />
                        <input
                          type="hidden"
                          name="current_status"
                          value={place.is_hidden.toString()}
                        />
                        <button className="p-1.5 rounded border bg-white text-slate-300 hover:text-red-500">
                          {place.is_hidden ? "Show" : "Hide"}
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

function OnboardingUI() {
  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
      <div className="max-w-md w-full bg-white p-10 rounded-2xl shadow-sm border border-slate-200 text-center">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <ShieldCheck size={24} />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Identity Pending</h2>
        <p className="text-sm text-slate-500 mt-2">
          Your account needs to be verified before you can access the Åsa
          Camping dashboard.
        </p>
      </div>
    </div>
  );
}
