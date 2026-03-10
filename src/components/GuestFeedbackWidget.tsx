// components/GuestFeedbackWidget.tsx
"use client";

import { submitGuestFeedback } from "@/lib/tracking";
import { AnimatePresence, motion } from "framer-motion";
import React, { useEffect, useState } from "react";
import type { Lang } from "./GuestAppUI";

const RATINGS = [
  { emoji: "😞", value: 1 },
  { emoji: "😐", value: 2 },
  { emoji: "🙂", value: 3 },
  { emoji: "😊", value: 4 },
  { emoji: "🤩", value: 5 },
];

const L: Record<
  string,
  { ask: string; more: string; send: string; skip: string; thanks: string }
> = {
  sv: {
    ask: "Hur är din vistelse?",
    more: "Berätta mer (valfritt)",
    send: "Skicka",
    skip: "Hoppa över",
    thanks: "Tack för din feedback! 🏕️",
  },
  en: {
    ask: "How's your stay?",
    more: "Tell us more (optional)",
    send: "Submit",
    skip: "Skip",
    thanks: "Thanks for your feedback! 🏕️",
  },
  de: {
    ask: "Wie ist Ihr Aufenthalt?",
    more: "Mehr erzählen (optional)",
    send: "Senden",
    skip: "Überspringen",
    thanks: "Danke für Ihr Feedback! 🏕️",
  },
  da: {
    ask: "Hvordan er dit ophold?",
    more: "Fortæl mere (valgfrit)",
    send: "Send",
    skip: "Spring over",
    thanks: "Tak for din feedback! 🏕️",
  },
  nl: {
    ask: "Hoe is uw verblijf?",
    more: "Vertel meer (optioneel)",
    send: "Verstuur",
    skip: "Overslaan",
    thanks: "Bedankt voor uw feedback! 🏕️",
  },
  no: {
    ask: "Hvordan er oppholdet?",
    more: "Fortell mer (valgfritt)",
    send: "Send",
    skip: "Hopp over",
    thanks: "Takk for tilbakemeldingen! 🏕️",
  },
};

interface Props {
  campgroundId: string;
  sessionId: string;
  brand: string;
  lang: Lang;
}

export default function GuestFeedbackWidget({
  campgroundId,
  sessionId,
  brand,
  lang,
}: Props) {
  const [phase, setPhase] = useState<
    "hidden" | "ask" | "comment" | "done" | "dismissed"
  >("hidden");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const l = L[lang] ?? L.sv;

  useEffect(() => {
    if (sessionStorage.getItem(`fb_${campgroundId}`)) {
      setPhase("dismissed");
      return;
    }
    const t = setTimeout(() => setPhase("ask"), 60000);
    return () => clearTimeout(t);
  }, [campgroundId]);

  const doSubmit = async (withComment: boolean) => {
    if (!rating) return;
    setSending(true);
    await submitGuestFeedback(
      campgroundId,
      sessionId,
      rating,
      withComment ? comment : undefined,
    );
    sessionStorage.setItem(`fb_${campgroundId}`, "1");
    setSending(false);
    setPhase("done");
    setTimeout(() => setPhase("dismissed"), 3000);
  };

  if (phase === "hidden" || phase === "dismissed") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 16 }}
        className="mt-5 overflow-hidden rounded-[18px] bg-white p-4 ring-1 ring-stone-200/60"
        style={{
          boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03)",
        }}
      >
        {phase === "ask" && (
          <div className="text-center">
            <p className="mb-3 text-[13px] font-bold text-stone-700">{l.ask}</p>
            <div className="flex justify-center gap-3">
              {RATINGS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => {
                    setRating(r.value);
                    setPhase("comment");
                  }}
                  className="text-[28px] transition-transform hover:scale-125 active:scale-95"
                >
                  {r.emoji}
                </button>
              ))}
            </div>
          </div>
        )}
        {phase === "comment" && (
          <div className="space-y-3 text-center">
            <p className="text-2xl">
              {RATINGS.find((r) => r.value === rating)?.emoji}
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={l.more}
              rows={2}
              className="w-full resize-none rounded-[12px] bg-stone-50 px-3 py-2 text-[12px] text-stone-700 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": brand } as React.CSSProperties}
            />
            <div className="flex gap-2">
              <button
                onClick={() => doSubmit(false)}
                disabled={sending}
                className="flex-1 rounded-full bg-stone-100 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-stone-500"
              >
                {l.skip}
              </button>
              <button
                onClick={() => doSubmit(true)}
                disabled={sending}
                className="flex-1 rounded-full py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white disabled:opacity-50"
                style={{ backgroundColor: brand }}
              >
                {sending ? "..." : l.send}
              </button>
            </div>
          </div>
        )}
        {phase === "done" && (
          <motion.p
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            className="text-center text-[13px] font-medium text-stone-600"
          >
            {l.thanks}
          </motion.p>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
