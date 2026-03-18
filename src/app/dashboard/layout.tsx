import { createClient } from "@/lib/supabase/server";
import type { Campground } from "@/types/database";
import { redirect } from "next/navigation";
import { logout } from "./actions";
import DashboardNav from "./DashboardNav";

export const metadata = { title: "Camp Concierge – Dashboard" };

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: campgroundRaw } = await supabase
    .from("campgrounds")
    .select("*")
    .eq("owner_id", user.id)
    .single();

  if (!campgroundRaw) redirect("/login");

  const campground = campgroundRaw as Campground;

  return (
    <DashboardNav campground={campground} logoutAction={logout}>
      {children}
    </DashboardNav>
  );
}
