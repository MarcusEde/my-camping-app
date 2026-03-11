"use client";

import { useLoginForm } from "@/lib/hooks/useLoginForm";
import { Loader2 } from "lucide-react";

export function LoginForm() {
  const s = useLoginForm();

  return (
    <form onSubmit={s.handleLogin} className="space-y-4">
      <div>
        <label className="mb-1 block text-xs font-bold text-gray-700">
          E-postadress
        </label>
        <input
          type="email"
          value={s.email}
          onChange={(e) => s.setEmail(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none"
          placeholder="din@email.se"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-bold text-gray-700">
          Lösenord
        </label>
        <input
          type="password"
          value={s.password}
          onChange={(e) => s.setPassword(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-gray-400 focus:outline-none"
          placeholder="••••••••"
        />
      </div>
      {s.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
          {s.error}
        </p>
      )}
      <button
        type="submit"
        disabled={s.loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-bold text-white transition-all hover:bg-gray-800 active:scale-[0.97] disabled:opacity-60"
      >
        {s.loading && <Loader2 size={16} className="animate-spin" />}
        {s.loading ? "Loggar in..." : "Logga in"}
      </button>
    </form>
  );
}
