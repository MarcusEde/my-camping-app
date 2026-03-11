"use client";

import { useCreateOwnerForm } from "@/lib/hooks/useCreateOwnerForm";
import React from "react";

export default function CreateOwnerForm() {
  const s = useCreateOwnerForm();

  return (
    <div
      className="overflow-hidden rounded-[20px] bg-white ring-1 ring-stone-200/60"
      style={{
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
      }}
    >
      {/* ── Result banner ── */}
      {s.result && (
        <div
          className={`border-b px-5 py-3 text-[12px] font-black ${
            s.result.ok
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-red-100 bg-red-50 text-red-700"
          }`}
        >
          {s.result.message}
        </div>
      )}

      {/* ── Header row ── */}
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-[11px] bg-stone-50 text-lg ring-1 ring-stone-200/60">
            ➕
          </div>
          <div>
            <p className="text-[14px] font-black tracking-tight text-stone-900">
              New owner & campground
            </p>
            <p className="text-[11px] font-medium text-stone-400">
              Invites user via email and creates a new campground row in one
              step
            </p>
          </div>
        </div>
        <button
          onClick={s.toggleOpen}
          className="rounded-full bg-stone-900 px-5 py-2 text-[11px] font-black uppercase tracking-[0.1em] text-white transition-all hover:bg-stone-700 active:scale-95"
        >
          {s.open ? "Cancel" : "Create new"}
        </button>
      </div>

      {/* ── Form ── */}
      {s.open && (
        <div className="border-t border-stone-100 px-5 pb-5 pt-4 space-y-5">
          {/* Owner account */}
          <Fieldset legend="👤 Owner account">
            <div className="grid grid-cols-1 gap-3">
              <Field
                label="Email *"
                hint="The owner will receive an invite link here"
              >
                <Input
                  type="email"
                  value={s.form.email}
                  onChange={s.setField("email")}
                  placeholder="owner@camping.se"
                />
              </Field>
            </div>
          </Fieldset>

          {/* Campground details */}
          <Fieldset legend="🏕️ Campground details">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Campground name *">
                <Input
                  value={s.form.campName}
                  onChange={s.handleNameChange}
                  placeholder="Åsa Camping"
                />
              </Field>
              <Field label="URL slug *" hint="Auto-generated — edit if needed">
                <div className="flex items-center overflow-hidden rounded-[10px] ring-1 ring-stone-200/60 focus-within:ring-2 focus-within:ring-stone-400/40">
                  <span className="select-none bg-stone-50 px-3 py-2.5 text-[12px] font-medium text-stone-400 border-r border-stone-200/60">
                    /camp/
                  </span>
                  <input
                    type="text"
                    value={s.form.slug}
                    onChange={s.setField("slug")}
                    placeholder="asa-camping"
                    className="flex-1 bg-white px-3 py-2.5 text-[12px] font-medium text-stone-800 outline-none"
                  />
                </div>
              </Field>
              <Field label="Latitude *" hint="e.g. 57.3701">
                <Input
                  type="number"
                  step="any"
                  value={s.form.latitude}
                  onChange={s.setField("latitude")}
                  placeholder="57.3701"
                />
              </Field>
              <Field label="Longitude *" hint="e.g. 12.1234">
                <Input
                  type="number"
                  step="any"
                  value={s.form.longitude}
                  onChange={s.setField("longitude")}
                  placeholder="12.1234"
                />
              </Field>
            </div>
          </Fieldset>

          {/* Subscription + branding */}
          <Fieldset legend="💳 Subscription & branding">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Subscription status">
                <select
                  value={s.form.subscriptionStatus}
                  onChange={s.setField("subscriptionStatus")}
                  className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2 focus:ring-stone-400/40"
                >
                  <option value="trial">Trial (7 days)</option>
                  <option value="active">Active</option>
                </select>
              </Field>
              <Field label="Brand colour" hint="Owner can change later">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={s.form.primaryColor}
                    onChange={s.setField("primaryColor")}
                    className="h-10 w-12 cursor-pointer rounded-[10px] border-0 bg-transparent p-0.5"
                  />
                  <Input
                    type="text"
                    value={s.form.primaryColor}
                    onChange={s.setField("primaryColor")}
                    placeholder="#2A3C34"
                  />
                </div>
              </Field>
            </div>
          </Fieldset>

          {/* Tip */}
          <div className="rounded-[12px] bg-stone-50 px-4 py-3 ring-1 ring-stone-200/60">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-stone-400 mb-1">
              What happens next
            </p>
            <p className="text-[11px] font-medium leading-relaxed text-stone-500">
              1. Supabase emails an invite link to the owner so they can set
              their own password securely.
              <br />
              2. A new{" "}
              <code className="font-mono text-stone-600">campgrounds</code> row
              is automatically inserted and linked to their account.
              <br />
              3. Run <strong>Sync</strong> on their card to populate Google
              places immediately!
            </p>
          </div>

          {/* Submit */}
          <button
            onClick={s.handleSubmit}
            disabled={s.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-stone-900 py-3 text-[12px] font-black uppercase tracking-[0.1em] text-white transition-all hover:bg-stone-700 active:scale-[0.99] disabled:opacity-50"
          >
            {s.isPending ? (
              <>
                <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />{" "}
                Creating…
              </>
            ) : (
              "Invite owner & create campground"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   Form Primitives
   ═══════════════════════════════════════════════════════ */

function Fieldset({
  legend,
  children,
}: {
  legend: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.2em] text-stone-400">
        {legend}
      </p>
      {children}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-black uppercase tracking-[0.18em] text-stone-500">
        {label}
        {hint && (
          <span className="ml-1.5 font-medium normal-case tracking-normal text-stone-300">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full rounded-[10px] bg-white px-3.5 py-2.5 text-[12px] font-medium text-stone-800 ring-1 ring-stone-200/60 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-stone-400/40"
    />
  );
}
