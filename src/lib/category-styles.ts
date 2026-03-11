// src/lib/category-styles.ts

export interface CategoryStyle {
  colors: [string, string, string]; // gradient start, mid, end
  emoji: string;
  dotColor: string;
}

export const CATEGORY_STYLES: Record<string, CategoryStyle> = {
  beach: {
    colors: ["#bae6fd", "#a5f3fc", "#eff6ff"],
    emoji: "🏖️",
    dotColor: "#7dd3fc",
  },
  cafe: {
    colors: ["#fde68a", "#fed7aa", "#fefce8"],
    emoji: "☕",
    dotColor: "#fcd34d",
  },
  swimming: {
    colors: ["#bfdbfe", "#e0f2fe", "#ecfeff"],
    emoji: "🏊",
    dotColor: "#93c5fd",
  },
  spa: {
    colors: ["#ddd6fe", "#e9d5ff", "#fdf4ff"],
    emoji: "🧖",
    dotColor: "#c4b5fd",
  },
  restaurant: {
    colors: ["#fecdd3", "#fee2e2", "#fff7ed"],
    emoji: "🍽️",
    dotColor: "#fda4af",
  },
  park: {
    colors: ["#a7f3d0", "#bbf7d0", "#f7fee7"],
    emoji: "🌲",
    dotColor: "#6ee7b7",
  },
  museum: {
    colors: ["#cbd5e1", "#dbeafe", "#eef2ff"],
    emoji: "🏛️",
    dotColor: "#94a3b8",
  },
  bowling: {
    colors: ["#d8b4fe", "#ddd6fe", "#fdf4ff"],
    emoji: "🎳",
    dotColor: "#c084fc",
  },
  cinema: {
    colors: ["#a5b4fc", "#ddd6fe", "#faf5ff"],
    emoji: "🎬",
    dotColor: "#818cf8",
  },
  shopping: {
    colors: ["#99f6e4", "#a7f3d0", "#f0fdf4"],
    emoji: "🛍️",
    dotColor: "#5eead4",
  },
  activity: {
    colors: ["#fbbf24", "#fde68a", "#fffbeb"],
    emoji: "🎯",
    dotColor: "#f59e0b",
  },
  playground: {
    colors: ["#a3e635", "#bef264", "#f7fee7"],
    emoji: "🛝",
    dotColor: "#84cc16",
  },
  sports: {
    colors: ["#6ee7b7", "#a7f3d0", "#ecfdf5"],
    emoji: "🏸",
    dotColor: "#34d399",
  },
  attraction: {
    colors: ["#f9a8d4", "#fbcfe8", "#fdf2f8"],
    emoji: "🎡",
    dotColor: "#f472b6",
  },
  other: {
    colors: ["#fbbf24", "#fed7aa", "#fffbeb"],
    emoji: "⭐",
    dotColor: "#f59e0b",
  },
};

export function getCategoryStyle(category: string): CategoryStyle {
  return CATEGORY_STYLES[category] ?? CATEGORY_STYLES.other;
}

/**
 * Gradient angle varies per card based on the place ID hash.
 * Prevents adjacent cards from looking identical.
 */
const GRADIENT_ANGLES = [135, 90, 45, 180];

export function gradientAngle(id: string): number {
  const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return GRADIENT_ANGLES[hash % GRADIENT_ANGLES.length];
}

export function buildGradientCSS(
  colors: [string, string, string],
  angle: number,
): string {
  return `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]}, ${colors[2]})`;
}
