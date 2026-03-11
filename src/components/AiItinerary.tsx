// src/components/AiItinerary.tsx
"use client";

import { useAiItinerary } from "@/lib/hooks/useAiItinerary";
import { aiItineraryLabels } from "@/lib/translations";
import type { Campground } from "@/types/database";
import type { Lang, WeatherProp } from "@/types/guest";

interface Props {
  campground: Campground;
  weather: WeatherProp | null;
  lang: Lang;
}

export default function AiItinerary({ campground, weather, lang }: Props) {
  const { plan, loading, generate } = useAiItinerary(campground.name);
  const l = aiItineraryLabels[lang];

  return (
    <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
      <h2 className="mb-2 flex items-center gap-2 text-xl font-bold">
        <span className="text-purple-500">✨</span> {l.title}
      </h2>
      <p className="mb-6 text-sm text-gray-500">
        {l.subtitle(campground.name)}
      </p>

      {loading ? (
        <AiItineraryLoadingState />
      ) : plan ? (
        <div className="prose prose-sm text-gray-700">{plan}</div>
      ) : (
        <button
          onClick={generate}
          className="w-full rounded-2xl bg-purple-600 py-4 font-bold text-white transition-colors hover:bg-purple-700"
        >
          {l.button}
        </button>
      )}
    </div>
  );
}

function AiItineraryLoadingState() {
  return (
    <div className="flex animate-pulse flex-col space-y-4">
      <div className="h-4 w-3/4 rounded bg-gray-200" />
      <div className="h-4 w-full rounded bg-gray-200" />
    </div>
  );
}
