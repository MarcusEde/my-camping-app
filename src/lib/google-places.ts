import { PlaceCategory } from "@/types/database";

/**
 * The shape of data we extract from Google's response.
 *
 * Python mental model:
 *   class GoogleResult(TypedDict):
 *       name: str
 *       google_place_id: str
 *       ...etc
 */
interface GooglePlaceResult {
  google_place_id: string;
  name: string;
  address: string | null;
  rating: number | null;
  category: PlaceCategory;
  is_indoor: boolean;
  latitude: number | null;
  longitude: number | null;
  raw_data: Record<string, unknown>;
}

/**
 * Google's category types mapped to our simple categories.
 * Google returns types like "italian_restaurant" — we simplify them.
 */
const GOOGLE_TYPE_MAP: Record<
  string,
  { category: PlaceCategory; indoor: boolean }
> = {
  restaurant: { category: "restaurant", indoor: true },
  italian_restaurant: { category: "restaurant", indoor: true },
  pizza_restaurant: { category: "restaurant", indoor: true },
  chinese_restaurant: { category: "restaurant", indoor: true },
  seafood_restaurant: { category: "restaurant", indoor: true },
  cafe: { category: "cafe", indoor: true },
  coffee_shop: { category: "cafe", indoor: true },
  museum: { category: "museum", indoor: true },
  bowling_alley: { category: "bowling", indoor: true },
  movie_theater: { category: "cinema", indoor: true },
  spa: { category: "spa", indoor: true },
  shopping_mall: { category: "shopping", indoor: true },
  park: { category: "park", indoor: false },
  hiking_area: { category: "park", indoor: false },
  campground: { category: "park", indoor: false },
  beach: { category: "beach", indoor: false },
  swimming_pool: { category: "swimming", indoor: false },
  tourist_attraction: { category: "other", indoor: false },
};

/**
 * Fetches nearby places from Google Places API (New).
 *
 * Python equivalent:
 *   response = requests.post(url, json=body, headers=headers)
 *   return response.json()
 */
export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    console.error("❌ GOOGLE_PLACES_API_KEY is missing from .env.local!");
    return [];
  }

  // The Google Places API (New) uses a POST request with a JSON body.
  const url = "https://places.googleapis.com/v1/places:searchNearby";

  const body = {
    // Types of places we want to find
    includedTypes: [
      "restaurant",
      "cafe",
      "museum",
      "park",
      "bowling_alley",
      "movie_theater",
      "spa",
      "shopping_mall",
      "tourist_attraction",
      "swimming_pool",
    ],
    // Search within 10km of the campground
    locationRestriction: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 10000.0, // 10km in meters
      },
    },
    // Max results (keep it low to save money!)
    maxResultCount: 15,
  };

  // The "Field Mask" tells Google which fields to return.
  // ONLY request what you need — each field costs money!
  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": apiKey,
    "X-Goog-FieldMask": [
      "places.id",
      "places.displayName",
      "places.formattedAddress",
      "places.rating",
      "places.types",
      "places.location",
    ].join(","),
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Google API Error:", response.status, errorText);
      return [];
    }

    const data = await response.json();

    // If Google returns no results
    if (!data.places || data.places.length === 0) {
      console.log("📭 Google found 0 places nearby.");
      return [];
    }

    // Map Google's format to OUR format
    const results: GooglePlaceResult[] = data.places.map(
      (place: Record<string, unknown>) => {
        // Find the first Google type that matches our category map
        const types = (place.types as string[]) || [];
        const matchedType = types.find((t) => GOOGLE_TYPE_MAP[t]);
        const mapping = matchedType
          ? GOOGLE_TYPE_MAP[matchedType]
          : { category: "other" as PlaceCategory, indoor: false };

        const location = place.location as {
          latitude: number;
          longitude: number;
        } | null;
        const displayName = place.displayName as { text: string } | null;

        return {
          google_place_id: place.id as string,
          name: displayName?.text ?? "Unknown Place",
          address: (place.formattedAddress as string) ?? null,
          rating: (place.rating as number) ?? null,
          category: mapping.category,
          is_indoor: mapping.indoor,
          latitude: location?.latitude ?? null,
          longitude: location?.longitude ?? null,
          raw_data: place,
        };
      },
    );

    console.log(`✅ Google returned ${results.length} places!`);
    return results;
  } catch (err) {
    console.error("❌ Network error calling Google:", err);
    return [];
  }
}
