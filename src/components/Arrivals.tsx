"use client";

import { useEffect, useMemo, useState } from "react";
import Board from "./Board";
import Bubble from "./Bubble";
import Pass from "./Pass";
import { setFlapSound } from "./Flap";
import {
  unpack, parseBirth, board, reach, current, next, nakedEye, displayName, boardName, boardDate, plusMinus,
  arrival, constellation, KM_PER_LY, YEAR_MS, DAY_MS, type Star, type Catalogue,
} from "@/lib/light";

const WELCOME = [
  "WELCOME TO TERMINAL EARTH",
  "",
  "LIGHT THAT LEFT THE STARS ON THE DAY",
  "YOU WERE BORN IS LANDING ON A SCHEDULE",
  "",
  "CHECK IN TO SEE YOUR ARRIVALS",
];

function until(ms: number): string {
  const days = ms / DAY_MS;
  if (days < 1) return "TODAY";
  if (days < 60) return `IN ${Math.round(days)} DAYS`;
  const y = Math.floor(days / 365.25), m = Math.floor((days - y * 365.25) / 30.44);
  return `IN ${y ? `${y} YR${y > 1 ? "S" : ""} ` : ""}${m} MO`.trim();
}

function Clock({ now }: { now: number }) {
  const d = new Date(now);
  return (
    <span className="mono text-[13px] text-ink">
      {String(d.getHours()).padStart(2, "0")}:{String(d.getMinutes()).padStart(2, "0")}
      <span className="ml-2 text-dim">{boardDate(now)}</span>
    </span>
  );
}

export default function Arrivals() {
  const [stars, setStars] = useState<Star[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [birth, setBirth] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nakedOnly, setNakedOnly] = useState(true);
  const [picked, setPicked] = useState<number | null>(null);
  const [sound, setSound] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    fetch("/stars.json").then((r) => r.json() as Promise<Catalogue>).then((c) => setStars(unpack(c))).catch(() => setFailed(true));
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);

  const pool = useMemo(() => (stars ? (nakedOnly ? stars.filter(nakedEye) : stars) : []), [stars, nakedOnly]);
  const rows = useMemo(() => (birth === null ? [] : board(pool, birth, now, { landed: 4, upcoming: 8 })), [pool, birth, now]);
  const reachAll = useMemo(() => (birth !== null && stars ? reach(stars, birth, now) : null), [stars, birth, now]);
  const reachNaked = useMemo(() => (birth !== null && stars ? reach(stars.filter(nakedEye), birth, now) : null), [stars, birth, now]);
  const upcoming = useMemo(() => (birth !== null ? next(pool, birth, now) : null), [pool, birth, now]);
  const nearest = useMemo(() => (birth !== null ? current(pool, birth, now) : null), [pool, birth, now]);

  const pickedStar = stars?.find((s) => s.hip === picked) ?? nearest?.star ?? null;
  const ageYears = birth === null ? 0 : (now - birth) / YEAR_MS;

  function checkIn(d = date, t = time) {
    const b = parseBirth(d, t);
    if (!b.ok) { setError(b.reason); return; }
    setError(null);
    setBirth(b.ms);
    setPicked(null);
    setStartedAt(performance.now());
    setFlapSound(sound);
  }

  return (
    <div className="min-h-screen">
      {/* ── signage ───────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-rule bg-board px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded bg-sign text-[18px] font-black text-black">↓</span>
          <div>
            <div className="sign text-[18px] leading-none">Arrivals</div>
            <div className="tag mt-1">terminal earth · light from the day you were born</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => { const v = !sound; setSound(v); setFlapSound(v); }}
            className="tag hover:text-ink" aria-pressed={sound}>
            sound {sound ? "on" : "off"}
          </button>
          <Clock now={now} />
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
        {/* ── check-in ─────────────────────────────────────────────────── */}
        <section className="mb-6 rounded-md border border-rule bg-hall-2 p-4 sm:p-5">
          <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); checkIn(); }}>
            <label className="flex flex-col gap-1">
              <span className="tag">passenger (optional)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={28} placeholder="NAME ON THE PASS"
                className="mono w-[220px] rounded border border-rule bg-board px-3 py-2 text-[14px] uppercase text-ink outline-none placeholder:text-dim" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="tag">date of birth</span>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required
                className="mono rounded border border-rule bg-board px-3 py-2 text-[14px] text-ink outline-none [color-scheme:dark]" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="tag">time (optional)</span>
              <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
                className="mono rounded border border-rule bg-board px-3 py-2 text-[14px] text-ink outline-none [color-scheme:dark]" />
            </label>
            <button type="submit" disabled={!stars}
              className="rounded bg-sign px-5 py-2.5 text-[14px] font-black tracking-[0.14em] text-black hover:brightness-110 disabled:opacity-50">
              {stars ? "CHECK IN" : "LOADING STARS…"}
            </button>
            <button type="button" disabled={!stars}
              onClick={() => { setDate("2000-01-01"); setTime(""); checkIn("2000-01-01", ""); }}
              className="tag self-center hover:text-ink">
              or try 1 jan 2000
            </button>
          </form>
          {error && <p className="mt-3 text-[13px] text-approach">{error}</p>}
          {failed && <p className="mt-3 text-[13px] text-approach">The star catalogue did not load. Refresh to try again.</p>}
        </section>

        {/* ── the numbers ──────────────────────────────────────────────── */}
        {birth !== null && reachAll && reachNaked && (
          <section className="mb-6 grid gap-px overflow-hidden rounded-md border border-rule bg-rule sm:grid-cols-3">
            <div className="bg-hall-2 p-4">
              <div className="tag">your light has reached</div>
              <div className="mono mt-1 text-[clamp(30px,5vw,48px)] font-bold leading-none text-ink">
                {reachAll.central.toLocaleString()} <span className="text-[0.4em] text-mid">stars</span>
              </div>
              <div className="mt-2 text-[12px] leading-relaxed text-mid">
                {reachNaked.central} you could see with your eyes. Within the error bars it is somewhere
                between {reachAll.certain.toLocaleString()} and {reachAll.possible.toLocaleString()}.
              </div>
            </div>
            <div className="bg-hall-2 p-4">
              <div className="tag">next arrival</div>
              {upcoming ? (
                <>
                  <div className="mono mt-1 text-[clamp(22px,3.4vw,34px)] font-bold leading-tight text-ink">
                    {displayName(upcoming.star)} <span className="text-[0.5em] font-normal text-mid">in {constellation(upcoming.star)}</span>
                  </div>
                  <div className="mt-2 text-[12px] leading-relaxed text-mid">
                    {boardDate(upcoming.at)} {plusMinus(upcoming.sigma).toLowerCase()} · {until(upcoming.at - now).toLowerCase()}
                  </div>
                </>
              ) : <div className="mt-2 text-[13px] text-mid">Nothing left inside 125 light-years.</div>}
            </div>
            <div className="bg-hall-2 p-4">
              <div className="tag">the day you were born is now</div>
              <div className="mono mt-1 text-[clamp(22px,3.4vw,34px)] font-bold leading-tight text-ink">
                {((ageYears * KM_PER_LY) / 1e12).toLocaleString("en-US", { maximumFractionDigits: 0 })} trillion km
              </div>
              <div className="mt-2 text-[12px] leading-relaxed text-mid">
                away from Earth, still travelling outward at the speed of light, {ageYears.toFixed(2)} light-years out.
              </div>
            </div>
          </section>
        )}

        {/* ── the board, full width: it is the page ─────────────────────── */}
        <section>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="sign text-[13px]">arrivals · {nakedOnly ? "visible to the naked eye" : "every star"}</span>
            {birth !== null && (
              <div className="flex gap-1">
                {[true, false].map((v) => (
                  <button key={String(v)} onClick={() => setNakedOnly(v)}
                    className="rounded border px-2 py-1 text-[11px] font-bold tracking-wider"
                    style={{ borderColor: nakedOnly === v ? "var(--sign)" : "var(--rule)", color: nakedOnly === v ? "var(--sign)" : "var(--ink-mid)" }}>
                    {v ? "NAKED EYE" : "ALL STARS"}
                  </button>
                ))}
              </div>
            )}
          </div>
          <Board rows={rows} nowMs={now} picked={pickedStar?.hip ?? null} onPick={setPicked}
            message={birth === null ? WELCOME : undefined} />
          {birth !== null && <p className="mt-2 text-[12px] text-dim">Tap any row to issue a boarding pass for it.</p>}
        </section>

        {/* ── the map beside the pass ───────────────────────────────────── */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <div className="flex min-h-[380px] flex-col rounded-md border border-rule bg-board">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-rule px-3 py-2">
              <span className="sign text-[12px]">flight map</span>
              <span className="tag">{birth === null ? "awaiting passenger" : `radius ${ageYears.toFixed(1)} ly · drag to turn`}</span>
            </div>
            <div className="relative flex-1">
              {stars && birth !== null ? (
                <Bubble stars={stars} ageYears={ageYears} startedAt={startedAt} />
              ) : (
                <div className="absolute inset-0 grid place-items-center px-6 text-center text-[13px] leading-relaxed text-dim">
                  Every star inside the sphere has already received the light of the day you were born.
                </div>
              )}
            </div>
            <p className="border-t border-rule px-3 py-2 text-[11.5px] leading-relaxed text-dim">
              The gold sphere is the light of your first day, still expanding. Lit stars have received it;
              grey ones are still waiting.
            </p>
          </div>

          {birth !== null && pickedStar ? (
            <div>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <span className="sign text-[13px]">boarding pass · {boardName(pickedStar)}</span>
                <span className="text-[12px] text-dim">for a gift, check in with their birthday — or the day you met</span>
              </div>
              <Pass data={{ passenger: name, birthMs: birth, arrival: arrival(pickedStar, birth), nowMs: now }} />
            </div>
          ) : (
            <div className="grid place-items-center rounded-md border border-dashed border-rule p-8 text-center text-[13px] leading-relaxed text-dim">
              Check in and your boarding pass is issued here — one for any star on the board.
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
