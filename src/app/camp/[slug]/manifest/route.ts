import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: camp } = await supabase
    .from("campgrounds")
    .select("name, primary_color, logo_url")
    .eq("slug", slug)
    .single();

  const name = camp?.name ?? "Camp Concierge";
  const color = camp?.primary_color ?? "#2A3C34";

  const manifest = {
    name,
    short_name: name,
    start_url: `/camp/${slug}`,
    display: "standalone",
    orientation: "portrait",
    theme_color: color,
    background_color: "#FDFCFB",
    icons: camp?.logo_url
      ? [
          { src: camp.logo_url, sizes: "192x192", type: "image/png" },
          { src: camp.logo_url, sizes: "512x512", type: "image/png" },
        ]
      : [],
  };

  return NextResponse.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
