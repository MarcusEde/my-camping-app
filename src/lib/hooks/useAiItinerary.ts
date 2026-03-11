// src/lib/hooks/useAiItinerary.ts
"use client";

import { useCallback, useState } from "react";

// import { generatePlan } from "@/app/dashboard/actions";

export function useAiItinerary(campgroundName: string) {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      // TODO: Replace with actual server action call
      // const res = await generatePlan(campgroundName, weather);
      // setPlan(res);
      setPlan(`Här är din plan för ${campgroundName}...`);
    } catch (err) {
      console.error("[AiItinerary]", err);
    } finally {
      setLoading(false);
    }
  }, [campgroundName]);

  return { plan, loading, generate };
}
