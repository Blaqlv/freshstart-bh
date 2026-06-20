"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

/**
 * Client-side companion to the server's sliding session: after `minutes` of no
 * user activity, redirect to the login page. The middleware enforces the same
 * timeout server-side (the cookie expires); this just gives immediate UX so a
 * walk-away session doesn't sit on screen.
 */
export function IdleTimeout({ minutes = 15 }: { minutes?: number }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const ms = minutes * 60 * 1000;
    const reset = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        router.push("/patient-portal/login?timeout=1");
      }, ms);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      events.forEach((e) => window.removeEventListener(e, reset));
    };
  }, [minutes, router]);

  return null;
}
