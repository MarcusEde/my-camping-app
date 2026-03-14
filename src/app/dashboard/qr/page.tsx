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

  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const proto = headersList.get("x-forwarded-proto") || "http";
  const baseUrl = `${proto}://${host}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-[20px] font-black tracking-tight text-stone-900">
          QR-kod
        </h1>
        <p className="mt-1 text-[12px] leading-relaxed text-stone-400 max-w-md">
          Designa en QR-kod som gäster skannar för att nå er gästapp. Ändra
          mall, färger och text — förhandsvisningen uppdateras direkt.
        </p>
      </div>

      <QRDesigner campground={campground} baseUrl={baseUrl} />
    </div>
  );
}
