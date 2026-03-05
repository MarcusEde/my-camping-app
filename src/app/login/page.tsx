import { login } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  // This grabs ?message=xxx from the URL if there's an error
  searchParams: Promise<{ message: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto mt-20">
      <h1 className="text-2xl font-bold mb-4">Campground Owner Login</h1>

      {/*
        This is a standard HTML form.
        Instead of an 'action="/post-route"', we pass our Server Actions!
      */}
      <form className="flex-1 flex flex-col w-full justify-center gap-4 text-foreground">
        <label className="text-md font-bold" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-2"
          name="email"
          placeholder="owner@solvikcamping.se"
          required
        />

        <label className="text-md font-bold" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border mb-2"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />

        {/*
          Notice formAction={login}?
          When clicked, this button sends the form data to our login() function on the server.
        */}
        <button
          formAction={login}
          className="bg-blue-600 text-white rounded-md px-4 py-2 font-bold mb-2 hover:bg-blue-700"
        >
          Sign In
        </button>

        {/* Show error messages if they exist in the URL */}
        {params?.message && (
          <p className="mt-4 p-4 bg-red-100 text-red-800 text-center rounded">
            {params.message}
          </p>
        )}
      </form>
    </div>
  );
}
