import { createClient } from "@/lib/supabase/server";
import {
  ArrowRight,
  Clock,
  QrCode,
  Sparkles,
  TreePine,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoggedIn = !!user;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-50 border-b border-stone-200/60 bg-stone-50/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <TreePine className="h-7 w-7 text-emerald-600" />
            <span className="text-xl font-bold tracking-tight text-stone-900">
              Camp Concierge
            </span>
          </Link>

          <nav className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 hover:shadow-md active:scale-[0.98]"
              >
                Gå till Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-5 py-2.5 text-sm font-semibold text-stone-700 shadow-sm transition-all hover:border-stone-400 hover:bg-stone-50 hover:shadow-md active:scale-[0.98]"
              >
                Logga in
              </Link>
            )}
          </nav>
        </div>
      </header>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2">
          <div className="h-[600px] w-[900px] rounded-full bg-gradient-to-br from-emerald-100/60 via-amber-50/40 to-transparent blur-3xl" />
        </div>
        <div className="pointer-events-none absolute -right-32 top-20">
          <div className="h-[400px] w-[400px] rounded-full bg-amber-100/40 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-4xl px-6 pb-24 pt-20 text-center sm:pt-28 lg:pt-36">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
            <Sparkles className="h-4 w-4" />
            <span>För campingägare i Sverige</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-stone-900 sm:text-5xl lg:text-6xl">
            Framtidens gästupplevelse
            <br />
            <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
              för din camping
            </span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-stone-600 sm:text-xl">
            Ersätt pärmar och receptionsköer med en smart digital gästguide.
            Dina gäster scannar en QR-kod och får svar direkt&nbsp;– du sparar
            tid och skapar nya intäkter.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/camp/demo-camp"
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-8 py-3.5 text-base font-bold text-white shadow-lg shadow-emerald-600/25 transition-all hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-600/30 active:scale-[0.97]"
            >
              Testa gästvyn
              <ArrowRight className="h-5 w-5" />
            </Link>

            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-8 py-3.5 text-base font-semibold text-stone-700 shadow-sm transition-all hover:border-stone-400 hover:shadow-md active:scale-[0.97]"
              >
                Gå till Dashboard
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-white px-8 py-3.5 text-base font-semibold text-stone-700 shadow-sm transition-all hover:border-stone-400 hover:shadow-md active:scale-[0.97]"
              >
                Logga in
              </Link>
            )}
          </div>

          {/* Trust note */}
          <p className="mt-8 text-sm text-stone-400">
            Ingen registrering krävs för att testa demot
          </p>
        </div>
      </section>

      {/* ─── Features Section ─── */}
      <section className="relative border-t border-stone-200/60 bg-white py-24">
        <div className="mx-auto max-w-6xl px-6">
          {/* Section Header */}
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
              Allt dina gäster behöver&nbsp;–
              <br className="hidden sm:block" /> i fickan
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-stone-500">
              Camp Concierge ger dig verktygen att modernisera gästupplevelsen,
              minska arbetsbelastningen och öka intäkterna.
            </p>
          </div>

          {/* 3-Column Grid */}
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group relative rounded-2xl border border-stone-200/80 bg-stone-50/50 p-8 transition-all hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-lg hover:shadow-emerald-600/5">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <Clock className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">
                Spara tid i receptionen
              </h3>
              <p className="mt-3 leading-relaxed text-stone-500">
                Automatisera svar på vanliga gästfrågor&nbsp;– utcheckning,
                sopsortering, WiFi-lösenord och mer. Låt personalen fokusera på
                det som verkligen spelar roll.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group relative rounded-2xl border border-stone-200/80 bg-stone-50/50 p-8 transition-all hover:border-amber-200 hover:bg-amber-50/30 hover:shadow-lg hover:shadow-amber-600/5">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 text-amber-600 transition-colors group-hover:bg-amber-600 group-hover:text-white">
                <QrCode className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">
                Digitalisera gästpärmen
              </h3>
              <p className="mt-3 leading-relaxed text-stone-500">
                Ersätt slitna plastfickor med en vacker, väderanpassad webbapp.
                Gästerna scannar en QR-kod och får all information direkt i
                mobilen.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group relative rounded-2xl border border-stone-200/80 bg-stone-50/50 p-8 transition-all hover:border-emerald-200 hover:bg-emerald-50/30 hover:shadow-lg hover:shadow-emerald-600/5 sm:col-span-2 lg:col-span-1">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 transition-colors group-hover:bg-emerald-600 group-hover:text-white">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-stone-900">
                Tjäna pengar på lokala tips
              </h3>
              <p className="mt-3 leading-relaxed text-stone-500">
                Skapa en ny intäktskälla genom att erbjuda lokala restauranger
                och aktiviteter premium-placering och spårbara rabattkoder i din
                app.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── How It Works (Bonus Section) ─── */}
      <section className="border-t border-stone-200/60 bg-stone-50 py-24">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-stone-900 sm:text-4xl">
            Så enkelt kommer du igång
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-stone-500">
            Från registrering till nöjda gäster på under en timme.
          </p>

          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Skapa ditt konto",
                desc: "Fyll i information om din camping, ladda upp bilder och anpassa utseendet.",
              },
              {
                step: "2",
                title: "Skriv ut QR-koden",
                desc: "Placera QR-koden vid receptionen, i stugor eller på informationstavlor.",
              },
              {
                step: "3",
                title: "Gästerna scannar",
                desc: "Dina gäster får omedelbar tillgång till all information, helt utan nedladdning.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white shadow-lg shadow-emerald-600/20">
                  {item.step}
                </div>
                <h3 className="mt-5 text-lg font-bold text-stone-900">
                  {item.title}
                </h3>
                <p className="mt-2 leading-relaxed text-stone-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA Section ─── */}
      <section className="border-t border-stone-200/60 bg-gradient-to-br from-emerald-600 to-emerald-700 py-20">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Redo att modernisera din camping?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-emerald-100">
            Se hur gästupplevelsen ser ut ur besökarens perspektiv. Testa vår
            interaktiva demo helt kostnadsfritt.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/camp/demo-camp"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-emerald-700 shadow-lg transition-all hover:bg-emerald-50 hover:shadow-xl active:scale-[0.97]"
            >
              Testa gästvyn
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-stone-200/60 bg-stone-50 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 text-sm text-stone-400 sm:flex-row">
          <div className="flex items-center gap-2">
            <TreePine className="h-5 w-5 text-emerald-500" />
            <span className="font-semibold text-stone-500">Camp Concierge</span>
          </div>
          <p>
            &copy; {new Date().getFullYear()} Camp Concierge. Alla rättigheter
            förbehållna.
          </p>
        </div>
      </footer>
    </div>
  );
}
