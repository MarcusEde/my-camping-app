"use client";

import { CATEGORY_ICONS } from "@/lib/constants";
import { Itinerary } from "@/lib/planner";
import { Language, translations } from "@/lib/translations";
import { WeatherData } from "@/lib/weather";
import { CachedPlace, PlaceCategory, PromotedPartner } from "@/types/database";
import { useState } from "react";

interface Props {
  campground: any;
  places: CachedPlace[];
  weather: WeatherData | null;
  partners: PromotedPartner[] | null;
  itinerary: Itinerary | null;
}

export default function GuestAppUI({
  campground,
  places,
  weather,
  partners,
  itinerary,
}: Props) {
  // 🇸🇪 DEFAULT TO SWEDISH
  const [lang, setLang] = useState<Language>("sv");
  const t = translations[lang];

  // Logic to split places
  const pinnedPlaces = places.filter((p) => p.is_pinned);
  const regularPlaces = places.filter((p) => !p.is_pinned);
  const indoorPlaces = regularPlaces.filter((p) => p.is_indoor);
  const outdoorPlaces = regularPlaces.filter((p) => !p.is_indoor);
  const isBadWeather = weather?.isRaining || false;

  return (
    <div className="bg-gray-50 min-h-screen pb-24 font-sans text-gray-900">
      {/* ================= HEADER ================= */}
      <header className="relative bg-[#2A3C34] text-white pt-8 pb-12 px-6 rounded-b-[2.5rem] shadow-xl">
        {/* Language Toggle */}
        <div className="absolute top-4 left-4 flex gap-2 text-xs font-bold">
          <button
            onClick={() => setLang("sv")}
            className={`px-3 py-1 rounded-full transition-all ${lang === "sv" ? "bg-white text-[#2A3C34]" : "bg-[#2A3C34]/50 border border-white/30"}`}
          >
            SE
          </button>
          <button
            onClick={() => setLang("en")}
            className={`px-3 py-1 rounded-full transition-all ${lang === "en" ? "bg-white text-[#2A3C34]" : "bg-[#2A3C34]/50 border border-white/30"}`}
          >
            EN
          </button>
        </div>

        {/* Weather Badge (Floating) */}
        {weather && (
          <div className="absolute top-4 right-4 bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="text-xl">{weather.icon}</span>
            <span className="text-sm font-semibold">{weather.temp}°C</span>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-emerald-200 text-xs font-bold uppercase tracking-[0.2em] mb-2">
            {t.welcome}
          </p>
          <h1 className="text-3xl font-serif font-medium tracking-tight mb-2">
            {campground.name}
          </h1>
          <p className="text-white/70 text-sm max-w-xs mx-auto">
            {t.concierge_subtitle}
          </p>
        </div>
      </header>

      {/* ================= MAIN CONTENT ================= */}
      <main className="px-5 -mt-6">
        {/* ☔ RAINY DAY CARD */}
        {isBadWeather && (
          <div className="bg-white p-5 rounded-2xl shadow-lg border-l-4 border-blue-500 mb-6 flex gap-4 items-start">
            <div className="bg-blue-100 p-2 rounded-full text-2xl">☔</div>
            <div>
              <h3 className="font-bold text-gray-900">
                {t.weather_rain_title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {t.weather_rain_desc}
              </p>
            </div>
          </div>
        )}

        {/* 🏆 SPONSORS (Premium Look) */}
        {partners && partners.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
              {t.sponsors_title}
            </h2>
            <div className="space-y-4">
              {partners.map((p) => (
                <div
                  key={p.id}
                  className="bg-gradient-to-br from-[#F5E6CA] to-[#E6D2AA] p-[1px] rounded-2xl shadow-sm"
                >
                  <div className="bg-[#FFFDF5] p-5 rounded-2xl h-full">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-serif text-lg font-bold text-[#5C4D35]">
                        {p.business_name}
                      </h3>
                      <span className="bg-[#E6D2AA] text-[#5C4D35] text-[10px] font-bold px-2 py-1 rounded uppercase">
                        {t.sponsor_badge}
                      </span>
                    </div>
                    <p className="text-sm text-[#85755B] leading-relaxed mb-4">
                      {p.description}
                    </p>
                    <div className="flex gap-3">
                      {/* Buttons similar to before but with translations */}
                      {p.website_url && (
                        <a
                          href={p.website_url}
                          target="_blank"
                          className="flex-1 bg-[#5C4D35] text-[#FFFDF5] text-center text-xs font-bold py-2.5 rounded-lg"
                        >
                          {t.visit_website}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ✨ AI PLANNER (Accordion Style) */}
        {itinerary && (
          <div className="mb-8">
            <details className="group bg-white rounded-2xl shadow-sm border border-indigo-50 overflow-hidden">
              <summary className="list-none p-4 flex items-center justify-between cursor-pointer active:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 text-xl">
                    ✨
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">
                      {t.ai_planner_title}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {t.ai_planner_subtitle}
                    </p>
                  </div>
                </div>
                <span className="text-gray-400 group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <div className="p-5 border-t border-gray-100 bg-gray-50/50">
                {/* Simplified Timeline View */}
                <div className="space-y-6 border-l-2 border-indigo-100 ml-2 pl-6 relative">
                  {["morning", "afternoon", "evening"].map((time) => {
                    // @ts-ignore
                    const item = itinerary[time];
                    return (
                      <div key={time} className="relative">
                        <div className="absolute -left-[31px] top-0 bg-white border-2 border-indigo-100 w-4 h-4 rounded-full"></div>
                        <span className="text-xs font-bold text-indigo-500 uppercase">
                          {item.time}
                        </span>
                        <h4 className="font-bold text-gray-900">
                          {item.title}
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          {item.description}
                        </p>
                        {item.place_name && (
                          <div className="mt-2 text-xs inline-flex items-center gap-1 bg-white border px-2 py-1 rounded text-gray-600">
                            📍 {item.place_name}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </details>
          </div>
        )}

        {/* ⭐ STAFF PICKS */}
        {pinnedPlaces.length > 0 && (
          <section className="mb-8">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
              {t.staff_picks}
            </h2>
            {pinnedPlaces.map((place) => (
              <PlaceCardRow key={place.id} place={place} t={t} lang={lang} />
            ))}
          </section>
        )}

        {/* 🏠 / 🌲 DYNAMIC SECTIONS */}
        <section className="mb-8">
          <div className="flex items-baseline justify-between mb-3 ml-1">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              {isBadWeather ? t.indoor_title : t.outdoor_title}
            </h2>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded-full">
              {isBadWeather ? t.indoor_subtitle : t.outdoor_subtitle}
            </span>
          </div>
          {(isBadWeather ? indoorPlaces : outdoorPlaces).map((place) => (
            <PlaceCardRow key={place.id} place={place} t={t} lang={lang} />
          ))}
        </section>

        {/* THE "OTHER" LIST (Secondary) */}
        <section>
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 ml-1">
            {isBadWeather ? t.outdoor_title : t.indoor_title}
          </h2>
          {(isBadWeather ? outdoorPlaces : indoorPlaces).map((place) => (
            <PlaceCardRow key={place.id} place={place} t={t} lang={lang} />
          ))}
        </section>
      </main>

      {/* ================= BOTTOM NAVIGATION (MOBILE APP FEEL) ================= */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-between items-center text-[10px] font-bold text-gray-400 z-50 md:hidden">
        <button className="flex flex-col items-center gap-1 text-[#2A3C34]">
          <span className="text-xl">🏠</span>
          {t.nav_home}
        </button>
        <button className="flex flex-col items-center gap-1">
          <span className="text-xl">📅</span>
          {t.nav_planner}
        </button>
        <button className="flex flex-col items-center gap-1">
          <span className="text-xl">ℹ️</span>
          {t.nav_info}
        </button>
      </nav>
    </div>
  );
}

// --- SUB COMPONENTS ---

function PlaceCardRow({
  place,
  t,
  lang,
}: {
  place: CachedPlace;
  t: any;
  lang: Language;
}) {
  const [showTranslated, setShowTranslated] = useState(false);
  const icon = CATEGORY_ICONS[place.category as PlaceCategory] ?? "📍";

  // Basic travel time calculation (keeping it simple for now)
  const travel = null; // Re-add your travel logic here if you want

  return (
    <div className="bg-white p-4 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] mb-3 flex gap-4 items-start border border-gray-100">
      <div className="bg-gray-50 w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start">
          <h3 className="font-bold text-gray-900 truncate">{place.name}</h3>
          {place.rating && (
            <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
              ★ {place.rating}
            </span>
          )}
        </div>

        {place.owner_note && (
          <div className="mt-2 bg-gray-50 p-2 rounded-lg border-l-2 border-[#2A3C34]">
            <p className="text-sm text-[#2A3C34] italic">
              {t.owner_note_prefix}{" "}
              {showTranslated
                ? "Translated: " + place.owner_note
                : place.owner_note}
            </p>
            {lang === "en" && !showTranslated && (
              <button
                onClick={() => setShowTranslated(true)}
                className="text-[10px] text-blue-600 font-bold mt-1 hover:underline"
              >
                Translate to English
              </button>
            )}
          </div>
        )}

        {place.address && (
          <p className="text-xs text-gray-400 mt-1 truncate">{place.address}</p>
        )}
      </div>
    </div>
  );
}
