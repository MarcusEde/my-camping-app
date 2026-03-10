// src/app/dashboard/qr/page.tsx
import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import QRDesigner from "./QRDesigner";

export default async function QRPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: campground } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!campground) redirect("/onboarding");

  // Get base URL from headers (works in both dev and prod)
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[20px] font-black tracking-tight text-stone-900">
          QR-kod
        </h1>
        <p className="mt-1 text-[12px] text-stone-400">
          Designa och ladda ner en QR-kod som gäster kan skanna för att nå er
          gästapp.
        </p>
      </div>
      <QRDesigner campground={campground} baseUrl={baseUrl} />
    </div>
  );
}
