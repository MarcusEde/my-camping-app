"use client";
import { CATEGORY_ICONS } from "@/lib/constants";
import { Language, translations } from "@/lib/translations";
import { CachedPlace, PlaceCategory } from "@/types/database";
import { useState } from "react";

export default function GuestAppUI({
  campground,
  places,
  weather,
  partners,
}: any) {
  const [lang, setLang] = useState<Language>("sv");
  const t = translations[lang];

  const visible = places.filter((p: any) => !p.is_hidden);
  const pinned = visible.filter((p: any) => p.is_pinned);
  const others = visible.filter((p: any) => !p.is_pinned);

  return (
    <div className="pb-24 font-sans text-gray-900">
      <header className="bg-[#2A3C34] text-white pt-8 pb-12 px-6 rounded-b-[2.5rem] text-center relative shadow-xl">
        <div className="absolute top-4 left-4 flex gap-2">
          <button
            onClick={() => setLang("sv")}
            className={`px-3 py-1 rounded-full text-[10px] font-bold ${lang === "sv" ? "bg-white text-emerald-900" : "bg-white/10"}`}
          >
            SV
          </button>
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 rounded-full text-[10px] font-bold ${lang === "en" ? "bg-white text-emerald-900" : "bg-white/10"}`}
          >
            EN
          </button>
        </div>
        <p className="text-emerald-300 text-[10px] font-bold uppercase tracking-widest mb-2">
          {t.welcome}
        </p>
        <h1 className="text-3xl font-serif mb-2">{campground.name}</h1>
      </header>

      <main className="px-5 -mt-6 space-y-8">
        {pinned.length > 0 && (
          <section>
            <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
              {t.staff_picks}
            </h2>
            {pinned.map((place: any) => (
              <PlaceCard key={place.id} place={place} />
            ))}
          </section>
        )}
        <section>
          <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
            Local Attractions
          </h2>
          {others.map((place: any) => (
            <PlaceCard key={place.id} place={place} />
          ))}
        </section>
      </main>
    </div>
  );
}

function PlaceCard({ place }: { place: CachedPlace }) {
  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex gap-4 mb-4">
      <div className="bg-slate-50 w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0">
        {CATEGORY_ICONS[place.category as PlaceCategory] || "📍"}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 truncate">{place.name}</h3>
        {place.owner_note && (
          <p className="text-xs text-emerald-700 italic my-2 bg-emerald-50 p-2 rounded-lg">
            "{place.owner_note}"
          </p>
        )}
        <div className="flex gap-2 mt-3">
          <a
            href={googleMapsUrl}
            target="_blank"
            className="flex-1 bg-slate-900 text-white text-center py-2 rounded-xl text-[10px] font-bold"
          >
            Directions
          </a>
        </div>
      </div>
    </div>
  );
}
