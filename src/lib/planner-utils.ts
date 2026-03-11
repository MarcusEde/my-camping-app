// src/lib/planner-utils.ts

/** Today's date as "YYYY-MM-DD" */
export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Parse "HH:MM" → minutes since midnight */
export function getItemMinutes(time: string): number {
  const m = time.match(/^(\d{1,2}):(\d{2})$/);
  return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
}

/** Current minutes since midnight (browser local time) */
export function browserNowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

/**
 * Time-based dimming: an item is "past" when
 *   • the NEXT item's start time has been reached, OR
 *   • (last item) 90 minutes after its start time.
 */
export function computeDimming(
  items: { time: string }[],
  nowMin: number,
): boolean[] {
  return items.map((item, i) => {
    const next = items[i + 1];
    if (next) return nowMin >= getItemMinutes(next.time);
    return nowMin > getItemMinutes(item.time) + 90;
  });
}
