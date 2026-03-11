// src/app/camp/[slug]/page.tsx

import GuestAppUI from "@/components/GuestAppUI";
import StatusGatePage from "@/components/StatusGatePage";
import { loadCampground, loadCampPageData } from "@/lib/data/camp-loader";
import type { GateStatus } from "@/lib/translations";
import { notFound } from "next/navigation";

export default async function CampPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const campground = await loadCampground(slug);

  if (!campground) notFound();

  // Block guests if inactive or cancelled
  const blockedStatuses: Record<string, GateStatus> = {
    inactive: "inactive",
    cancelled: "cancelled",
  };

  const gateStatus = blockedStatuses[campground.subscription_status];
  if (gateStatus) {
    return <StatusGatePage campground={campground} status={gateStatus} />;
  }

  const data = await loadCampPageData(campground);

  return (
    <GuestAppUI
      campground={data.campground}
      places={data.places}
      announcements={data.announcements}
      partners={data.partners}
      weather={data.weather}
      distanceMap={data.distanceMap}
      internalLocations={data.internalLocations}
    />
  );
}

export const dynamic = "force-dynamic";
