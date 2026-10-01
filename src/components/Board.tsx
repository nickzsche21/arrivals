"use client";

import { useSyncExternalStore } from "react";
import Flap from "./Flap";
import {
  boardDate, boardError, displayName, boardName, constellation, statusOf, type Arrival,
} from "@/lib/light";

/* A column as wide as n flaps, in the board's own em — headers are set in a
   smaller font, so their widths cannot be measured in theirs. */
const col = (n: number) => `calc(${n} * 0.92em + ${n - 1} * 2px)`;

function Head({ n, children, className = "" }: { n?: number; children: string; className?: string }) {
  return (
    <span className={className} style={n ? { width: col(n), flex: "0 0 auto" } : undefined}>
      <span className="sign text-[0.72em]">{children}</span>
    </span>
  );
}

const STATUS: Record<string, { text: string; short: string; color: string }> = {
  landed: { text: "LANDED", short: "LANDED", color: "var(--landed)" },
  approach: { text: "ON APPROACH", short: "APPROACH", color: "var(--approach)" },
  enroute: { text: "EN ROUTE", short: "EN ROUTE", color: "var(--enroute)" },
};

/* A phone cannot fit five columns of flaps, and REMARKS — the answer — is the
   last one. So the narrow board is a different board, not a scrolled one:
   two-digit years, ten-character names, eight-character remarks. */
const NARROW = "(max-width: 639px)";
function useNarrow() {
  return useSyncExternalStore(
    (cb) => { const m = window.matchMedia(NARROW); m.addEventListener("change", cb); return () => m.removeEventListener("change", cb); },
    () => window.matchMedia(NARROW).matches,
    () => false
  );
}
/** Re-wrap the welcome message to a 27-flap board, on word boundaries. */
function WRAP(lines: string[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    if (!l) { out.push(""); continue; }
    let cur = "";
    for (const w of l.split(" ")) {
      if ((cur + " " + w).trim().length > 27) { out.push(cur); cur = w; } else cur = (cur + " " + w).trim();
    }
    out.push(cur);
  }
  return out;
}
const shortDate = (s: string) => s.slice(0, 7) + s.slice(9); // "15 FEB 2025" → "15 FEB 25"

export default function Board({
  rows, nowMs, picked, onPick, message,
}: {
  rows: Arrival[];
  nowMs: number;
  picked: number | null;
  onPick: (hip: number) => void;
  message?: string[];
}) {
  const narrow = useNarrow();
  const W = narrow ? { date: 9, star: 10, status: 8 } : { date: 11, star: 13, status: 11 };
  return (
    /* Sized so all five columns fit the full width at every breakpoint from sm
       up. Below that, FROM and ERROR drop out rather than letting REMARKS — the
       one coloured column, and the answer — scroll off the right edge. */
    <div className="overflow-x-auto rounded-md bg-board p-3 sm:p-4" style={{ fontSize: "clamp(9.5px, 1.32vw, 17px)" }}>
      <div className="mb-2 flex gap-[0.9em] whitespace-nowrap sm:gap-[1.6em]">
        <Head n={W.date}>arrives</Head>
        <Head n={10} className="hidden sm:inline">from</Head>
        <Head n={W.star}>star</Head>
        <Head n={7} className="hidden sm:inline">error</Head>
        <Head>remarks</Head>
      </div>

      {message ? (
        <div className="flex flex-col gap-1.5">
          {(narrow ? WRAP(message) : message).map((m, i) => (
            <div key={i}><Flap text={m} width={narrow ? 27 : 52} delay={i * 120} /></div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {rows.map((a, i) => {
            const st = STATUS[statusOf(a, nowMs)];
            const isPicked = picked === a.star.hip;
            return (
              <button
                key={a.star.hip}
                onClick={() => onPick(a.star.hip)}
                className={`row-hit flex gap-[0.9em] whitespace-nowrap text-left sm:gap-[1.6em] ${isPicked ? "row-picked" : ""}`}
                aria-label={`${displayName(a.star)}, arrives ${boardDate(a.at)}, ${st.text}. Issue a boarding pass.`}
              >
                <Flap text={narrow ? shortDate(boardDate(a.at)) : boardDate(a.at)} width={W.date} delay={i * 45} />
                {!narrow && <Flap text={constellation(a.star)} width={10} delay={i * 45 + 20} />}
                <Flap text={boardName(a.star)} width={W.star} delay={i * 45 + 40} />
                {!narrow && <Flap text={boardError(a.sigma)} width={7} delay={i * 45 + 60} />}
                <span className={statusOf(a, nowMs) === "approach" ? "blink" : ""}>
                  <Flap text={narrow ? st.short : st.text} width={W.status} color={st.color} delay={i * 45 + 80} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
