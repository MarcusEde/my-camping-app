import { getCachedItinerary } from "@/lib/planner";
import { translations } from "@/lib/translations";
import { WeatherData } from "@/lib/weather";
import { CachedPlace, Campground } from "@/types/database";

export default async function AiItinerary({
  campground,
  places,
  weather,
  lang = "sv",
}: {
  campground: Campground;
  places: CachedPlace[];
  weather: WeatherData | null;
  lang?: "sv" | "en";
}) {
  const itinerary = await getCachedItinerary(campground, places, weather, lang);
  if (!itinerary) return null;

  const t = translations[lang];

  return (
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
      </summary>
      <div className="p-5 border-t bg-gray-50/50">
        <p className="text-sm italic mb-6 bg-white p-3 rounded-lg border border-indigo-100 italic">
          "{itinerary.tip_of_the_day}"
        </p>
        <div className="space-y-6 border-l-2 border-indigo-100 ml-2 pl-6 relative">
          {[itinerary.morning, itinerary.afternoon, itinerary.evening].map(
            (item, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[31px] top-0 bg-white border-2 border-indigo-100 w-4 h-4 rounded-full" />
                <span className="text-xs font-bold text-indigo-500 uppercase">
                  {item.time}
                </span>
                <h4 className="font-bold text-gray-900">{item.title}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ),
          )}
        </div>
      </div>
    </details>
  );
}
