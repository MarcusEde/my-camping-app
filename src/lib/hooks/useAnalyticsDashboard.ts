import { getAnalyticsStats } from "@/lib/analytics";
import type { AnalyticsStats } from "@/types/database";
import { useEffect, useState } from "react";

type Period = 7 | 30 | 90;

interface UseAnalyticsDashboardProps {
  campgroundId: string;
}

export function useAnalyticsDashboard({
  campgroundId,
}: UseAnalyticsDashboardProps) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>(7);

  useEffect(() => {
    setLoading(true);
    getAnalyticsStats(campgroundId, period)
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [campgroundId, period]);

  return {
    stats,
    loading,
    period,
    setPeriod,
  };
}
