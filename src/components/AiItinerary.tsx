import { getCachedItinerary } from "@/lib/planner";
import { translations } from "@/lib/translations"; // Import translations dictionary
import { WeatherData } from "@/lib/weather";
import { CachedPlace, Campground } from "@/types/database";

// This component does the heavy lifting!
export default async function AiItinerary({
  campground,
  places,
  weather,
  lang = "sv", // Default to Swedish
}: {
  campground: Campground;
  places: CachedPlace[];
  weather: WeatherData | null;
  lang?: "sv" | "en";
}) {
  // This AWAIT is what takes 5-10 seconds...
  // But now it happens inside this isolated component!
  const itinerary = await getCachedItinerary(campground, places, weather);

  if (!itinerary) return null;

  const t = translations[lang];

  return (
    <div className="mb-8 animate-fade-in">
      <details className="group bg-white rounded-2xl shadow-sm border border-indigo-50 overflow-hidden">
        <summary className="list-none p-4 flex items-center justify-between cursor-pointer active:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600 text-xl">
              ✨
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{t.ai_planner_title}</h3>
              <p className="text-xs text-gray-500">{t.ai_planner_subtitle}</p>
            </div>
          </div>
          <span className="text-gray-400 group-open:rotate-180 transition-transform">
            ▼
          </span>
        </summary>

        <div className="p-5 border-t border-gray-100 bg-gray-50/50">
          <p className="text-sm text-gray-700 italic mb-6 bg-white p-3 rounded-lg border border-indigo-100 shadow-inner">
            "{itinerary.tip_of_the_day}"
          </p>
          {/* Timeline rendering... (Same as before) */}
          <div className="space-y-6 border-l-2 border-indigo-100 ml-2 pl-6 relative">
            {/* Morning */}
            <div className="relative">
              <div className="absolute -left-[31px] top-0 bg-white border-2 border-indigo-100 w-4 h-4 rounded-full"></div>
              <span className="text-xs font-bold text-indigo-500 uppercase">
                {itinerary.morning.time}
              </span>
              <h4 className="font-bold text-gray-900">
                {itinerary.morning.title}
              </h4>
              <p className="text-sm text-gray-600 mt-1">
                {itinerary.morning.description}
              </p>
            </div>
            {/* ... Afternoon & Evening ... */}
          </div>
        </div>
      </details>
    </div>
  );
}
