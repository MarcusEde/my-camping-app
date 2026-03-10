import { createClient } from "@supabase/supabase-js";

// We get these from your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// This creates the "Bridge" to your database
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
