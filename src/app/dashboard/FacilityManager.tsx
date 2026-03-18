"use client";

import { useFacilityManager } from "@/lib/hooks/useFacilityManager";
import type { InternalLocation } from "@/types/database";
import {
  Building2,
  Footprints,
  Loader2,
  MapPin,
  Plus,
  Trash2,
  X,
} from "lucide-react";

/* ── i18n labels ─────────────────────────────────────── */
type Lang = string;

const t = (map: Record<string, string>, lang: Lang) => map[lang] ?? map.en;

const FACILITY_TYPE_LABELS: Record<string, Record<string, string>> = {
  reception: { sv: "Reception", en: "Reception", de: "Rezeption", da: "Reception", nl: "Receptie", no: "Resepsjon" },
  toilet: { sv: "Toalett", en: "Toilet", de: "Toilette", da: "Toilet", nl: "Toilet", no: "Toalett" },
  shower: { sv: "Dusch", en: "Shower", de: "Dusche", da: "Bruser", nl: "Douche", no: "Dusj" },
  laundry: { sv: "Tvätt", en: "Laundry", de: "Wäscherei", da: "Vask", nl: "Wasserij", no: "Vask" },
  kitchen: { sv: "Kök", en: "Kitchen", de: "Küche", da: "Køkken", nl: "Keuken", no: "Kjøkken" },
  playground: { sv: "Lekplats", en: "Playground", de: "Spielplatz", da: "Legeplads", nl: "Speeltuin", no: "Lekeplass" },
  pool: { sv: "Pool", en: "Pool", de: "Pool", da: "Pool", nl: "Zwembad", no: "Basseng" },
  shop: { sv: "Butik", en: "Shop", de: "Laden", da: "Butik", nl: "Winkel", no: "Butikk" },
  recycling: { sv: "Återvinning", en: "Recycling", de: "Recycling", da: "Genbrug", nl: "Recycling", no: "Gjenvinning" },
  bbq: { sv: "Grillplats", en: "BBQ area", de: "Grillplatz", da: "Grillplads", nl: "BBQ-plek", no: "Grillplass" },
  electricity: { sv: "Eluttag", en: "Power outlet", de: "Stromanschluss", da: "Stikkontakt", nl: "Stopcontact", no: "Strømuttak" },
  water: { sv: "Vatten", en: "Water", de: "Wasser", da: "Vand", nl: "Water", no: "Vann" },
  wifi: { sv: "WiFi-punkt", en: "WiFi spot", de: "WLAN-Punkt", da: "WiFi-punkt", nl: "WiFi-punt", no: "WiFi-punkt" },
  parking: { sv: "Parkering", en: "Parking", de: "Parkplatz", da: "Parkering", nl: "Parkeren", no: "Parkering" },
  dog_area: { sv: "Hundrastgård", en: "Dog area", de: "Hundebereich", da: "Hundegård", nl: "Hondenuitlaatplaats", no: "Hundegård" },
  other: { sv: "Övrigt", en: "Other", de: "Sonstiges", da: "Andet", nl: "Overig", no: "Annet" },
};

const TYPES = [
  "reception", "toilet", "shower", "laundry", "kitchen", "playground",
  "pool", "shop", "recycling", "bbq", "electricity", "water",
  "wifi", "parking", "dog_area", "other",
] as const;

const TYPE_EMOJI: Record<string, string> = {
  reception: "🏕️", toilet: "🚻", shower: "🚿", laundry: "👕",
  kitchen: "🍳", playground: "🛝", pool: "🏊", shop: "🛒",
  recycling: "♻️", bbq: "🔥", electricity: "⚡", water: "🚰",
  wifi: "📶", parking: "🅿️", dog_area: "🐕", other: "📍",
};

const typeEmoji = (type: string) => TYPE_EMOJI[type] ?? "📍";
const typeLabel = (type: string, lang: Lang) =>
  FACILITY_TYPE_LABELS[type]?.[lang] ?? FACILITY_TYPE_LABELS[type]?.en ?? type;

/* ── UI string translations ──────────────────────────── */
const L = {
  sectionTitle: {
    sv: "Faciliteter på campingen", en: "Campsite facilities", de: "Einrichtungen auf dem Campingplatz",
    da: "Faciliteter på campingpladsen", nl: "Faciliteiten op de camping", no: "Fasiliteter på campingplassen",
  },
  countOne: {
    sv: "facilitet tillagd", en: "facility added", de: "Einrichtung hinzugefügt",
    da: "facilitet tilføjet", nl: "faciliteit toegevoegd", no: "fasilitet lagt til",
  },
  countMany: {
    sv: "faciliteter tillagda", en: "facilities added", de: "Einrichtungen hinzugefügt",
    da: "faciliteter tilføjet", nl: "faciliteiten toegevoegd", no: "fasiliteter lagt til",
  },
  noFacilities: {
    sv: "Inga faciliteter tillagda ännu", en: "No facilities added yet", de: "Noch keine Einrichtungen hinzugefügt",
    da: "Ingen faciliteter tilføjet endnu", nl: "Nog geen faciliteiten toegevoegd", no: "Ingen fasiliteter lagt til ennå",
  },
  addBtn: {
    sv: "Lägg till", en: "Add", de: "Hinzufügen",
    da: "Tilføj", nl: "Toevoegen", no: "Legg til",
  },
  emptyTitle: {
    sv: "Inga faciliteter tillagda", en: "No facilities added", de: "Keine Einrichtungen hinzugefügt",
    da: "Ingen faciliteter tilføjet", nl: "Geen faciliteiten toegevoegd", no: "Ingen fasiliteter lagt til",
  },
  emptyDesc: {
    sv: "Lägg till toaletter, duschar, lekplatser och annat så ser gästerna dem direkt i appen med gångavstånd.",
    en: "Add toilets, showers, playgrounds and more so guests can see them in the app with walking distances.",
    de: "Fügen Sie Toiletten, Duschen, Spielplätze und mehr hinzu, damit Gäste sie in der App mit Gehentfernungen sehen.",
    da: "Tilføj toiletter, brusere, legepladser og andet, så gæsterne kan se dem direkte i appen med gangafstand.",
    nl: "Voeg toiletten, douches, speeltuinen en meer toe zodat gasten ze in de app zien met loopafstanden.",
    no: "Legg til toaletter, dusjer, lekeplasser og annet slik at gjestene ser dem direkte i appen med gangavstand.",
  },
  addFirstBtn: {
    sv: "Lägg till din första facilitet", en: "Add your first facility", de: "Erste Einrichtung hinzufügen",
    da: "Tilføj din første facilitet", nl: "Voeg je eerste faciliteit toe", no: "Legg til din første fasilitet",
  },
  deleteTooltip: {
    sv: "Ta bort", en: "Delete", de: "Löschen",
    da: "Slet", nl: "Verwijderen", no: "Slett",
  },
  formTitle: {
    sv: "Lägg till ny facilitet", en: "Add new facility", de: "Neue Einrichtung hinzufügen",
    da: "Tilføj ny facilitet", nl: "Nieuwe faciliteit toevoegen", no: "Legg til ny fasilitet",
  },
  labelName: {
    sv: "Namn", en: "Name", de: "Name",
    da: "Navn", nl: "Naam", no: "Navn",
  },
  placeholderName: {
    sv: "T.ex. Servicehus A", en: "E.g. Service building A", de: "Z.B. Servicegebäude A",
    da: "F.eks. Servicebygning A", nl: "Bijv. Servicegebouw A", no: "F.eks. Servicehus A",
  },
  labelType: {
    sv: "Typ", en: "Type", de: "Typ",
    da: "Type", nl: "Type", no: "Type",
  },
  labelWalking: {
    sv: "Gångavstånd", en: "Walking distance", de: "Gehentfernung",
    da: "Gangafstand", nl: "Loopafstand", no: "Gangavstand",
  },
  cancelBtn: {
    sv: "Avbryt", en: "Cancel", de: "Abbrechen",
    da: "Annuller", nl: "Annuleren", no: "Avbryt",
  },
  saveBtn: {
    sv: "Spara facilitet", en: "Save facility", de: "Einrichtung speichern",
    da: "Gem facilitet", nl: "Faciliteit opslaan", no: "Lagre fasilitet",
  },
  min: {
    sv: "min", en: "min", de: "Min",
    da: "min", nl: "min", no: "min",
  },
  errorFallback: {
    sv: "Fel", en: "Error", de: "Fehler",
    da: "Fejl", nl: "Fout", no: "Feil",
  },
} as const;

/* ── Props ───────────────────────────────────────────── */
interface Props {
  campgroundId: string;
  facilities: InternalLocation[];
  brand: string;
  lang: string;
}

/* ── Main Component ──────────────────────────────────── */
export default function FacilityManager({
  campgroundId,
  facilities,
  brand,
  lang,
}: Props) {
  const s = useFacilityManager({ campgroundId, facilities, lang });

  return (
    <div className="rounded-2xl bg-white shadow-sm ring-1 ring-stone-200">
      {/* ── Section Header ── */}
      <div className="flex items-center justify-between border-b border-stone-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <Building2 size={18} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-stone-800">
              {t(L.sectionTitle, lang)}
            </h3>
            <p className="text-xs text-stone-500">
              {s.items.length > 0
                ? `${s.items.length} ${t(s.items.length === 1 ? L.countOne : L.countMany, lang)}`
                : t(L.noFacilities, lang)}
            </p>
          </div>
        </div>
        {!s.showAdd && (
          <button
            onClick={s.openAddForm}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98]"
          >
            <Plus size={14} />
            {t(L.addBtn, lang)}
          </button>
        )}
      </div>

      {/* ── Content Area ── */}
      <div className="p-5">
        {/* Empty State */}
        {s.items.length === 0 && !s.showAdd && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-200 bg-stone-50/50 px-6 py-12">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-stone-100">
              <MapPin size={20} className="text-stone-400" />
            </div>
            <p className="text-sm font-semibold text-stone-700">
              {t(L.emptyTitle, lang)}
            </p>
            <p className="mt-1 max-w-xs text-center text-xs leading-relaxed text-stone-500">
              {t(L.emptyDesc, lang)}
            </p>
            <button
              onClick={s.openAddForm}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98]"
            >
              <Plus size={14} />
              {t(L.addFirstBtn, lang)}
            </button>
          </div>
        )}

        {/* Facility List */}
        {s.items.length > 0 && (
          <div className="space-y-2">
            {s.items.map((f) => (
              <div
                key={f.id}
                className="group flex items-center gap-3.5 rounded-xl bg-stone-50/80 px-4 py-3 ring-1 ring-stone-100 transition-all hover:bg-stone-50 hover:ring-stone-200"
              >
                {/* Emoji Icon */}
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-lg shadow-sm ring-1 ring-stone-100">
                  {typeEmoji(f.type)}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-stone-800">
                    {(lang !== "sv" && f.name_translations?.[lang as "en" | "de" | "da" | "nl" | "no"]?.name) || f.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-2">
                    <span className="text-xs text-stone-500">
                      {typeLabel(f.type, lang)}
                    </span>
                    <span className="text-stone-300">·</span>
                    <span className="inline-flex items-center gap-1 text-xs text-stone-500">
                      <Footprints size={10} className="text-stone-400" />
                      {f.walking_minutes} {t(L.min, lang)}
                    </span>
                  </div>
                </div>

                {/* Delete Button */}
                <button
                  onClick={() => s.handleDelete(f.id)}
                  disabled={s.isPending}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-stone-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 disabled:opacity-50"
                  title={t(L.deleteTooltip, lang)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Add Form ── */}
        {s.showAdd && (
          <div
            className={`${s.items.length > 0 ? "mt-4 " : ""}rounded-xl border border-emerald-100 bg-emerald-50/30 p-4`}
          >
            {/* Form Header */}
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold text-stone-700">
                {t(L.formTitle, lang)}
              </p>
              <button
                onClick={s.closeAddForm}
                className="flex h-6 w-6 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-600"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {/* Name Input */}
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                  {t(L.labelName, lang)}
                </label>
                <input
                  type="text"
                  value={s.newName}
                  onChange={(e) => s.setNewName(e.target.value)}
                  placeholder={t(L.placeholderName, lang)}
                  className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Type + Minutes Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    {t(L.labelType, lang)}
                  </label>
                  <select
                    value={s.newType}
                    onChange={(e) => s.setNewType(e.target.value)}
                    className="w-full rounded-lg border-0 bg-white px-3 py-2.5 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {TYPES.map((type) => (
                      <option key={type} value={type}>
                        {TYPE_EMOJI[type]} {typeLabel(type, lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-stone-500">
                    {t(L.labelWalking, lang)}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      value={s.newMinutes}
                      onChange={(e) =>
                        s.setNewMinutes(parseInt(e.target.value) || 0)
                      }
                      className="w-full rounded-lg border-0 bg-white px-3.5 py-2.5 pr-12 text-sm text-stone-800 shadow-sm ring-1 ring-stone-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400">
                      {t(L.min, lang)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={s.closeAddForm}
                  className="flex-1 rounded-lg border border-stone-200 bg-white px-4 py-2.5 text-xs font-semibold text-stone-600 shadow-sm transition-all hover:bg-stone-50 hover:shadow-md active:scale-[0.98]"
                >
                  {t(L.cancelBtn, lang)}
                </button>
                <button
                  onClick={s.handleAdd}
                  disabled={s.isPending || !s.newName.trim()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {s.isPending ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Plus size={14} />
                      {t(L.saveBtn, lang)}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
