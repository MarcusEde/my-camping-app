// src/components/GuestFeedbackWidget.tsx
"use client";

import { FEEDBACK_RATINGS } from "@/lib/constants";
import { useGuestFeedback } from "@/lib/hooks/useGuestFeedback";
import { feedbackLabels } from "@/lib/translations";
import type { Lang } from "@/types/guest";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";

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
  const {
    phase,
    rating,
    comment,
    setComment,
    sending,
    isVisible,
    selectRating,
    doSubmit,
  } = useGuestFeedback({ campgroundId, sessionId });

  const l = feedbackLabels[lang];

  if (!isVisible) return null;

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
        {phase === "ask" && <AskPhase label={l.ask} onSelect={selectRating} />}
        {phase === "comment" && (
          <CommentPhase
            rating={rating}
            comment={comment}
            setComment={setComment}
            sending={sending}
            brand={brand}
            labels={l}
            onSubmit={doSubmit}
          />
        )}
        {phase === "done" && <DonePhase message={l.thanks} />}
      </motion.div>
    </AnimatePresence>
  );
}

/* ──────────────── Sub-components ──────────────── */

function AskPhase({
  label,
  onSelect,
}: {
  label: string;
  onSelect: (value: number) => void;
}) {
  return (
    <div className="text-center">
      <p className="mb-3 text-[13px] font-bold text-stone-700">{label}</p>
      <div className="flex justify-center gap-3">
        {FEEDBACK_RATINGS.map((r) => (
          <button
            key={r.value}
            onClick={() => onSelect(r.value)}
            className="text-[28px] transition-transform hover:scale-125 active:scale-95"
          >
            {r.emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

function CommentPhase({
  rating,
  comment,
  setComment,
  sending,
  brand,
  labels,
  onSubmit,
}: {
  rating: number | null;
  comment: string;
  setComment: (v: string) => void;
  sending: boolean;
  brand: string;
  labels: { more: string; send: string; skip: string };
  onSubmit: (withComment: boolean) => void;
}) {
  return (
    <div className="space-y-3 text-center">
      <p className="text-2xl">
        {FEEDBACK_RATINGS.find((r) => r.value === rating)?.emoji}
      </p>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={labels.more}
        rows={2}
        className="w-full resize-none rounded-[12px] bg-stone-50 px-3 py-2 text-[12px] text-stone-700 ring-1 ring-stone-200/60 focus:outline-none focus:ring-2"
        style={{ "--tw-ring-color": brand } as React.CSSProperties}
      />
      <div className="flex gap-2">
        <button
          onClick={() => onSubmit(false)}
          disabled={sending}
          className="flex-1 rounded-full bg-stone-100 py-2 text-[10px] font-black uppercase tracking-[0.1em] text-stone-500"
        >
          {labels.skip}
        </button>
        <button
          onClick={() => onSubmit(true)}
          disabled={sending}
          className="flex-1 rounded-full py-2 text-[10px] font-black uppercase tracking-[0.1em] text-white disabled:opacity-50"
          style={{ backgroundColor: brand }}
        >
          {sending ? "..." : labels.send}
        </button>
      </div>
    </div>
  );
}

function DonePhase({ message }: { message: string }) {
  return (
    <motion.p
      initial={{ scale: 0.9 }}
      animate={{ scale: 1 }}
      className="text-center text-[13px] font-medium text-stone-600"
    >
      {message}
    </motion.p>
  );
}
