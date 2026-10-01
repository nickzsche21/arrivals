"use client";

import { useEffect, useRef, useState } from "react";

/* The drum every flap turns through, in order. Real boards have a fixed drum
   and the turning time depends on how far round the next character is — which
   is why they ripple instead of changing all at once. */
const DRUM = " ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,:-±/'()+";

const step = (c: string) => {
  const i = DRUM.indexOf(c);
  return DRUM[(i < 0 ? 0 : i + 1) % DRUM.length];
};

/** Shared clatter, synthesised: no audio files, and silent until a click. */
let ctx: AudioContext | null = null;
let muted = true;
let last = 0;
export function setFlapSound(on: boolean) {
  muted = !on;
  if (on && !ctx && typeof window !== "undefined") {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = AC ? new AC() : null;
  }
}
function clack() {
  if (muted || !ctx) return;
  const now = ctx.currentTime;
  if (now - last < 0.012) return; // a board is many flaps, not many speakers
  last = now;
  const len = Math.floor(ctx.sampleRate * 0.012);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass"; f.frequency.value = 2200 + Math.random() * 900; f.Q.value = 1.2;
  const g = ctx.createGain();
  g.gain.value = 0.05;
  src.connect(f).connect(g).connect(ctx.destination);
  src.start(now);
}

/**
 * A field on the board. Each character turns through the drum until it reaches
 * its target, one step per tick, so a long way round takes visibly longer.
 */
export default function Flap({
  text, width, color, delay = 0, className = "",
}: { text: string; width: number; color?: string; delay?: number; className?: string }) {
  const target = text.toUpperCase().padEnd(width).slice(0, width);
  const [shown, setShown] = useState(() => " ".repeat(width));
  const [turning, setTurning] = useState<boolean[]>(() => Array(width).fill(false));
  const cur = useRef(shown);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const start = setTimeout(function tick() {
      const now = cur.current.split("");
      const moved: boolean[] = Array(width).fill(false);
      let changed = false;
      for (let i = 0; i < width; i++) {
        const want = target[i];
        // Characters not on the drum snap straight to place.
        if (now[i] !== want) {
          now[i] = DRUM.includes(want) ? step(now[i]) : want;
          moved[i] = true;
          changed = true;
        }
      }
      if (!changed) return;
      cur.current = now.join("");
      setShown(cur.current);
      setTurning(moved);
      clack();
      timer = setTimeout(tick, 34);
    }, delay);
    return () => { clearTimeout(start); clearTimeout(timer); };
  }, [target, width, delay]);

  return (
    <span className={`flaps ${className}`} aria-label={text.trim()}>
      {shown.split("").map((c, i) => (
        <span key={i} className={`flap ${turning[i] ? "turning" : ""}`} style={color ? { color } : undefined} aria-hidden>
          {c}
        </span>
      ))}
    </span>
  );
}
