// src/lib/hooks/useGuestFeedback.ts
"use client";

import { useCallback, useEffect, useState } from "react";

import {
  FEEDBACK_DELAY_MS,
  FEEDBACK_THANKS_DURATION_MS,
} from "@/lib/constants";
import { submitGuestFeedback } from "@/lib/tracking";

export type FeedbackPhase = "hidden" | "ask" | "comment" | "done" | "dismissed";

interface UseGuestFeedbackParams {
  campgroundId: string;
  sessionId: string;
}

export function useGuestFeedback({
  campgroundId,
  sessionId,
}: UseGuestFeedbackParams) {
  const [phase, setPhase] = useState<FeedbackPhase>("hidden");
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);

  const storageKey = `fb_${campgroundId}`;

  // Show prompt after delay, unless already submitted
  useEffect(() => {
    if (localStorage.getItem(storageKey)) {
      setPhase("dismissed");
      return;
    }
    const t = setTimeout(() => setPhase("ask"), FEEDBACK_DELAY_MS);
    return () => clearTimeout(t);
  }, [storageKey]);

  const selectRating = useCallback((value: number) => {
    setRating(value);
    setPhase("comment");
  }, []);

  const doSubmit = useCallback(
    async (withComment: boolean) => {
      if (!rating) return;
      setSending(true);
      await submitGuestFeedback(
        campgroundId,
        sessionId,
        rating,
        withComment ? comment : undefined,
      );
      localStorage.setItem(storageKey, "1");
      setSending(false);
      setPhase("done");
      setTimeout(() => setPhase("dismissed"), FEEDBACK_THANKS_DURATION_MS);
    },
    [campgroundId, sessionId, rating, comment, storageKey],
  );

  const isVisible = phase !== "hidden" && phase !== "dismissed";

  return {
    phase,
    rating,
    comment,
    setComment,
    sending,
    isVisible,
    selectRating,
    doSubmit,
  };
}
