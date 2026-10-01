"use client";

import { useEffect, useMemo, useRef } from "react";
import { position, starColour, displayName, nakedEye, type Star } from "@/lib/light";

type P3 = [number, number, number];
type Body = { s: Star; p: P3; rgb: [number, number, number] };

export type Frame = { yaw: number; pitch: number; radius: number; extent: number };

/**
 * One frame, as a pure function of its inputs. The animation loop only decides
 * *which* frame; this decides what it looks like — so a frame can be drawn and
 * checked without a running loop, which the in-app browser does not provide.
 */
export function drawBubble(c: CanvasRenderingContext2D, w: number, h: number, bodies: Body[], f: Frame) {
  c.clearRect(0, 0, w, h);
  const cy = Math.cos(f.yaw), sy = Math.sin(f.yaw), cp = Math.cos(f.pitch), sp = Math.sin(f.pitch);
  const scale = (Math.min(w, h) * 0.46) / f.extent;
  const cam = f.extent * 3.2;

  const project = ([x, y, z]: P3) => {
    const x1 = x * cy - y * sy, y1 = x * sy + y * cy;      // yaw about the celestial pole
    const y2 = y1 * cp - z * sp, z2 = y1 * sp + z * cp;    // pitch towards the viewer
    const k = cam / (cam + y2);
    return { x: w / 2 + x1 * scale * k, y: h / 2 - z2 * scale * k, k, depth: y2 };
  };

  // The wavefront: the light of the day you were born, radius = your age.
  const centre = project([0, 0, 0]);
  const rr = f.radius * scale * (cam / cam);
  if (f.radius > 0) {
    const g = c.createRadialGradient(centre.x, centre.y, rr * 0.7, centre.x, centre.y, rr);
    g.addColorStop(0, "rgba(255,199,0,0)");
    g.addColorStop(0.92, "rgba(255,199,0,0.06)");
    g.addColorStop(1, "rgba(255,199,0,0.22)");
    c.fillStyle = g;
    c.beginPath(); c.arc(centre.x, centre.y, rr, 0, Math.PI * 2); c.fill();

    // Three great circles so the sphere reads as a sphere when it turns.
    c.lineWidth = 1;
    c.strokeStyle = "rgba(255,199,0,0.28)";
    for (const axis of [0, 1, 2]) {
      c.beginPath();
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const u = Math.cos(a) * f.radius, v = Math.sin(a) * f.radius;
        const pt: P3 = axis === 0 ? [u, v, 0] : axis === 1 ? [u, 0, v] : [0, u, v];
        const q = project(pt);
        if (i === 0) c.moveTo(q.x, q.y); else c.lineTo(q.x, q.y);
      }
      c.stroke();
    }
  }

  // Far stars first so near ones paint over them.
  const drawn = bodies
    .map((b) => ({ b, q: project(b.p), inside: b.s.distLy <= f.radius }))
    .sort((a, z) => z.q.depth - a.q.depth);

  for (const { b, q, inside } of drawn) {
    const bright = Math.max(0, 6.5 - b.s.vmag);
    const size = Math.max(0.6, (0.55 + bright * 0.42) * q.k);
    const [r, g, bl] = b.rgb;
    c.fillStyle = inside ? `rgba(${r},${g},${bl},${Math.min(1, 0.45 + bright * 0.12)})` : "rgba(140,140,150,0.28)";
    c.beginPath(); c.arc(q.x, q.y, inside ? size : Math.max(0.5, size * 0.6), 0, Math.PI * 2); c.fill();

    // The moment the wavefront passes a star you could see, ring it.
    const since = f.radius - b.s.distLy;
    if (nakedEye(b.s) && since >= 0 && since < 1.6 && b.s.distLy > 0.5) {
      const t = since / 1.6;
      c.strokeStyle = `rgba(255,199,0,${1 - t})`;
      c.lineWidth = 1.5;
      c.beginPath(); c.arc(q.x, q.y, 4 + t * 18, 0, Math.PI * 2); c.stroke();
      if (b.s.name) {
        c.fillStyle = `rgba(241,240,236,${1 - t * 0.7})`;
        c.font = "600 11px ui-monospace, Menlo, monospace";
        c.fillText(b.s.name.toUpperCase(), q.x + 8, q.y - 8);
      }
    }
  }

  // You.
  c.fillStyle = "#ffc700";
  c.beginPath(); c.arc(centre.x, centre.y, 3, 0, Math.PI * 2); c.fill();
  c.fillStyle = "rgba(255,199,0,0.9)";
  c.font = "700 10px ui-monospace, Menlo, monospace";
  c.fillText("EARTH", centre.x + 6, centre.y + 14);
}

export default function Bubble({
  stars, ageYears, startedAt,
}: { stars: Star[]; ageYears: number; startedAt: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drag = useRef({ yaw: 0, pitch: 0.42, down: false, x: 0, y: 0 });

  const extent = Math.max(12, Math.min(125, ageYears * 1.35 + 6));
  const bodies = useMemo<Body[]>(
    () => stars.filter((s) => s.distLy <= extent).map((s) => ({ s, p: position(s), rgb: starColour(s.bv) })),
    [stars, extent]
  );

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let raf = 0;
    const GROW_MS = 5200;
    const frame = (now: number) => {
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      const c = cv.getContext("2d")!;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const t = Math.min(1, (now - startedAt) / GROW_MS);
      const ease = 1 - Math.pow(1 - t, 3);
      const d = drag.current;
      if (!d.down) d.yaw += 0.0016;
      drawBubble(c, w, h, bodies, { yaw: d.yaw, pitch: d.pitch, radius: ageYears * ease, extent });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [bodies, ageYears, startedAt, extent]);

  return (
    <canvas
      ref={ref}
      className="h-full w-full touch-none select-none"
      onPointerDown={(e) => { drag.current.down = true; drag.current.x = e.clientX; drag.current.y = e.clientY; (e.target as Element).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d.down) return;
        d.yaw += (e.clientX - d.x) * 0.006;
        d.pitch = Math.max(-1.4, Math.min(1.4, d.pitch + (e.clientY - d.y) * 0.006));
        d.x = e.clientX; d.y = e.clientY;
      }}
      onPointerUp={() => { drag.current.down = false; }}
      aria-label={`A sphere ${ageYears.toFixed(1)} light-years across: every star inside it has already received the light of the day you were born.`}
      role="img"
    />
  );
}
