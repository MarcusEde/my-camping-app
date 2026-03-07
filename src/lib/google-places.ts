import { PlaceCategory } from "@/types/database";

export interface GooglePlaceResult {
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

const GOOGLE_TYPE_MAP: Record<string, { category: PlaceCategory; indoor: boolean }> = {
  restaurant: { category: "restaurant", indoor: true },
  pizza_restaurant: { category: "restaurant", indoor: true },
  cafe: { category: "cafe", indoor: true },
  bakery: { category: "cafe", indoor: true },
  ice_cream_shop: { category: "cafe", indoor: false },
  museum: { category: "museum", indoor: true },
  bowling_alley: { category: "bowling", indoor: true },
  spa: { category: "spa", indoor: true },
  supermarket: { category: "shopping", indoor: true },
  grocery_store: { category: "shopping", indoor: true },
  shopping_mall: { category: "shopping", indoor: true },
  park: { category: "park", indoor: false },
  hiking_area: { category: "park", indoor: false },
  beach: { category: "beach", indoor: false },
  swimming_pool: { category: "swimming", indoor: false },
  tourist_attraction: { category: "other", indoor: false },
};

export async function fetchPlacesByText(
  lat: number,
  lng: number,
  searchQuery: string,
  categoryFallback: PlaceCategory,
  radius: number = 3000
): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    throw new Error("GOOGLE_PLACES_API_KEY saknas i .env.local!");
  }

  const url = "https://places.googleapis.com/v1/places:searchText";

  const body = {
    textQuery: searchQuery,
    languageCode: "sv",
    locationBias: {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: radius, 
      },
    },
    maxResultCount: 8, 
  };

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
      "places.regularOpeningHours" 
    ].join(","),
  };

  try {
    console.log(`\n🗺️ [GOOGLE PLACES API] 💰 Söker efter: "${searchQuery}" (Radie: ${radius}m)`);
    console.time(`Google Places Time [${searchQuery}]`);

    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    console.timeEnd(`Google Places Time [${searchQuery}]`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [GOOGLE PLACES API] Fel (${response.status}):`, errorText);
      throw new Error(`Google API Fel (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const count = data.places ? data.places.length : 0;
    
    console.log(`🗺️ [GOOGLE PLACES API] ✅ Returnerade ${count} platser för "${searchQuery}".`);
    
    if (count === 0) return [];

    const results: GooglePlaceResult[] = data.places.map((place: Record<string, unknown>) => {
      const pTypes = (place.types as string[]) || [];
      const matchedType = pTypes.find((t) => GOOGLE_TYPE_MAP[t]);
      
      const mapping = matchedType
        ? { ...GOOGLE_TYPE_MAP[matchedType] }
        : { category: categoryFallback, indoor: false };

      const location = place.location as { latitude: number; longitude: number; } | null;
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
    });

    return results;
  } catch (err) {
    console.error(`❌ Network error for query "${searchQuery}":`, err);
    return [];
  }
}