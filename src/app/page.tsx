import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  // Create the Supabase connection
  const supabase = await createClient();

  // Try to read from the campgrounds table
  const { data, error } = await supabase.from("campgrounds").select("*");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-4">🏕️ Supabase Connection Test</h1>

      {error ? (
        <div className="bg-red-100 text-red-800 p-4 rounded">
          <p className="font-bold">❌ Error:</p>
          <pre>{JSON.stringify(error, null, 2)}</pre>
        </div>
      ) : (
        <div className="bg-green-100 text-green-800 p-4 rounded">
          <p className="font-bold">✅ Connected!</p>
          <p>Rows in campgrounds: {data?.length ?? 0}</p>
          <pre className="mt-2 text-sm">{JSON.stringify(data, null, 2)}</pre>
        </div>
      )}
    </main>
  );
}
