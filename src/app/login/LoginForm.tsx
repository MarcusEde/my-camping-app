"use client";

import { useLoginForm } from "@/lib/hooks/useLoginForm";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const s = useLoginForm();

  return (
    <form onSubmit={s.handleLogin} className="space-y-4">
      {/* ── Email ── */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-700">
          E-postadress
        </label>
        <input
          type="email"
          value={s.email}
          onChange={(e) => s.setEmail(e.target.value)}
          required
          placeholder="din@email.se"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-green-500 focus:bg-white focus:outline-none"
        />
      </div>

      {/* ── Password ── */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold text-gray-700">
          Lösenord
        </label>
        <input
          type="password"
          value={s.password}
          onChange={(e) => s.setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:border-green-500 focus:bg-white focus:outline-none"
        />
      </div>

      {/* ── Error ── */}
      {s.error && (
        <p className="flex items-center justify-center rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-600">
          {s.error}
        </p>
      )}

      {/* ── Submit — matches landing page "Testa gästvyn" pill CTA ── */}
      <button
        type="submit"
        disabled={s.loading}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-green-600 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-green-700 hover:shadow-md active:scale-[0.97] disabled:opacity-60"
      >
        {s.loading && <Loader2 size={16} className="animate-spin" />}
        {s.loading ? "Loggar in…" : "Logga in"}
      </button>
    </form>
  );
}
