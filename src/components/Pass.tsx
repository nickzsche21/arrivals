"use client";

import { useEffect, useRef, useState } from "react";
import { renderPass, PASS_W, PASS_H, type PassData } from "@/lib/pass";
import { displayName } from "@/lib/light";

const CHECKOUT = process.env.NEXT_PUBLIC_CHECKOUT_URL ?? "";
const PRICE = process.env.NEXT_PUBLIC_PRICE ?? "$4.99";
const KEY_STORE = "arrivals-licence";

function download(d: PassData, scale: number, suffix: string) {
  const cv = document.createElement("canvas");
  cv.width = PASS_W * scale; cv.height = PASS_H * scale;
  renderPass(cv.getContext("2d")!, d, scale);
  cv.toBlob((b) => {
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = `arrivals-${displayName(d.arrival.star).toLowerCase().replace(/[^a-z0-9]+/g, "-")}${suffix}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }, "image/png");
}

export default function Pass({ data }: { data: PassData }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [key, setKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    try { if (localStorage.getItem(KEY_STORE)) setUnlocked(true); } catch { /* private mode */ }
  }, []);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = cv.clientWidth;
      const s = (w / PASS_W) * dpr;
      cv.width = Math.round(PASS_W * s); cv.height = Math.round(PASS_H * s);
      const c = cv.getContext("2d")!;
      c.clearRect(0, 0, cv.width, cv.height);
      renderPass(c, data, s);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(cv);
    return () => ro.disconnect();
  }, [data]);

  async function verify() {
    setMsg("Checking…");
    try {
      const r = await fetch("/api/license", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ key }) });
      const j = (await r.json()) as { valid?: boolean; error?: string };
      if (j.valid) {
        setUnlocked(true); setMsg(null);
        try { localStorage.setItem(KEY_STORE, key.slice(0, 8)); } catch { /* fine */ }
      } else setMsg(j.error ?? "That key did not work.");
    } catch { setMsg("Could not reach the server."); }
  }

  // Unconfigured, the print file is free and says so — a locked door with no
  // way to buy the key would be worse than an open one.
  const free = !CHECKOUT;

  return (
    <div>
      <canvas ref={ref} className="w-full rounded-[14px]" style={{ aspectRatio: `${PASS_W} / ${PASS_H}` }}
        role="img" aria-label={`Boarding pass: light from ${displayName(data.arrival.star)}`} />

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button onClick={() => download(data, 1, "")}
          className="rounded bg-sign px-4 py-2 text-[13px] font-extrabold tracking-wider text-black hover:brightness-110">
          DOWNLOAD PASS
        </button>

        {free || unlocked ? (
          <button onClick={() => download(data, 3, "-print")}
            className="rounded border border-sign px-4 py-2 text-[13px] font-extrabold tracking-wider text-sign hover:bg-sign hover:text-black">
            PRINT FILE · 4800 × 2040
          </button>
        ) : (
          <a href={CHECKOUT} target="_blank" rel="noopener noreferrer"
            className="rounded border border-sign px-4 py-2 text-[13px] font-extrabold tracking-wider text-sign hover:bg-sign hover:text-black">
            PRINT FILE · {PRICE}
          </a>
        )}

        <span className="text-[12px] text-dim">
          {free ? "print file free during launch" : unlocked ? "print files unlocked on this device" : "share size is free; the print file is 300 dpi at 16 × 6.8 in"}
        </span>
      </div>

      {!free && !unlocked && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={key} onChange={(e) => setKey(e.target.value)} placeholder="licence key from your receipt"
            className="mono w-[300px] max-w-full rounded border border-rule bg-hall-2 px-3 py-2 text-[12px] text-ink outline-none" />
          <button onClick={verify} disabled={!key.trim()}
            className="rounded border border-rule px-3 py-2 text-[12px] font-bold text-mid hover:text-ink disabled:opacity-40">
            UNLOCK
          </button>
          {msg && <span className="text-[12px] text-mid">{msg}</span>}
        </div>
      )}
    </div>
  );
}
