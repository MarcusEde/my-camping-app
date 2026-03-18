import { LoginForm } from "./LoginForm";

export const metadata = { title: "Logga in – Camp Concierge" };

export default function LoginPage() {
  return (
    /*
     * Background matches the landing page hero — a soft radial gradient
     * blending warm cream, pale green, and off-white tones.
     */
    <div
      className="flex min-h-screen items-center justify-center px-4"
      style={{
        background:
          "radial-gradient(ellipse at 60% 0%, #d1fae5 0%, transparent 60%), " +
          "radial-gradient(ellipse at 10% 80%, #fef9c3 0%, transparent 55%), " +
          "#f5f5f0",
      }}
    >
      <div className="w-full max-w-sm space-y-8">
        {/* ── Wordmark ── */}
        <div className="text-center">
          <div className="mb-5 flex items-center justify-center gap-2">
            {/* Pine-tree mark — matches landing page nav logo */}
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#16a34a"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L8 8H4l8 5-3 3 3 1v5" />
              <path d="M12 2l4 6h4l-8 5 3 3-3 1v5" />
            </svg>
            <span className="text-xl font-black tracking-tight text-gray-900">
              Camp Concierge
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-gray-900">
            Logga in
          </h1>
          <p className="mt-1 text-sm text-gray-500">Hantera din camping</p>
        </div>

        {/* ── Card ── */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
