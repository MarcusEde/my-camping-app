// src/app/camp/[slug]/layout.tsx

import { loadCampMeta } from "@/lib/data/camp-loader";
import type { Metadata, Viewport } from "next";

interface Props {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export async function generateViewport({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Viewport> {
  const { slug } = await params;
  const camp = await loadCampMeta(slug);

  return {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
    themeColor: camp?.primary_color ?? "#2A3C34",
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const camp = await loadCampMeta(slug);
  const name = camp?.name ?? "Camp Concierge";

  return {
    title: name,
    description: `Gästguide för ${name}`,
    appleWebApp: {
      capable: true,
      title: name,
      statusBarStyle: "black-translucent",
    },
    manifest: `/camp/${slug}/manifest`,
    other: {
      "mobile-web-app-capable": "yes",
    },
  };
}

export default function CampLayout({ children }: Props) {
  return <>{children}</>;
}
