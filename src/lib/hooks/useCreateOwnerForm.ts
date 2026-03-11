import { adminCreateOwnerAndCampground } from "@/app/admin/actions";
import { useState, useTransition } from "react";

interface FormState {
  email: string;
  campName: string;
  slug: string;
  latitude: string;
  longitude: string;
  primaryColor: string;
  subscriptionStatus: "trial" | "active";
}

const INITIAL_FORM: FormState = {
  email: "",
  campName: "",
  slug: "",
  latitude: "",
  longitude: "",
  primaryColor: "#2A3C34",
  subscriptionStatus: "trial",
};

/** Generate a URL-safe slug from a campground name. */
function nameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/å/g, "a")
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function useCreateOwnerForm() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // ── Field helpers ──
  const setField =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setForm((f) => ({ ...f, campName: name, slug: nameToSlug(name) }));
  };

  // ── Toggle ──
  const toggleOpen = () => setOpen((v) => !v);

  // ── Submit ──
  const handleSubmit = () => {
    if (
      !form.email ||
      !form.campName ||
      !form.slug ||
      !form.latitude ||
      !form.longitude
    ) {
      setResult({ ok: false, message: "All fields marked * are required." });
      return;
    }

    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);
    if (isNaN(lat) || isNaN(lon)) {
      setResult({
        ok: false,
        message: "Latitude and longitude must be valid numbers.",
      });
      return;
    }

    setResult(null);
    startTransition(async () => {
      try {
        const r = await adminCreateOwnerAndCampground({
          email: form.email,
          campName: form.campName,
          slug: form.slug,
          latitude: lat,
          longitude: lon,
          primaryColor: form.primaryColor,
          subscriptionStatus: form.subscriptionStatus,
        });
        setResult({
          ok: true,
          message: `✓ Invited! Owner: ${r.ownerEmail} · Camp: ${r.campName} (/${r.slug})`,
        });
        setForm(INITIAL_FORM);
        setOpen(false);
      } catch (e: unknown) {
        setResult({
          ok: false,
          message: `✗ ${e instanceof Error ? e.message : "Unknown error"}`,
        });
      }
    });
  };

  return {
    // UI state
    open,
    toggleOpen,
    isPending,
    result,

    // Form
    form,
    setField,
    handleNameChange,

    // Submit
    handleSubmit,
  };
}
