import { PlaceCategory } from "@/types/database";

export const CATEGORY_ICONS: Record<PlaceCategory, string> = {
  restaurant: "🍽️",
  cafe: "☕",
  museum: "🏛️",
  park: "🌲",
  beach: "🏖️",
  bowling: "🎳",
  swimming: "🏊",
  shopping: "🛍️",
  cinema: "🎬",
  spa: "🧖",
  activity: "🎯", // ← add
  playground: "🛝", // ← add
  sports: "🏸", // ← add
  attraction: "🎡", // ← add
  other: "⭐",
};
