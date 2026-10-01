import fs from "node:fs";
import path from "node:path";
import {
  unpack, arrival, statusOf, reach, board, current, next, parseBirth, plusMinus, boardDate,
  starColour, position, displayName, boardName, boardError, constellation, nakedEye,
  KM_PER_LY, YEAR_MS, DAY_MS, type Catalogue, type Star,
} from "./light";

let pass = 0;
const fails: string[] = [];
const ok = (n: string, c: boolean) => { if (c) pass++; else fails.push(n); };
const near = (n: string, a: number, b: number, tol: number) =>
  ok(`${n} (got ${a}, want ${b} ±${tol})`, Math.abs(a - b) <= tol);

const root = path.resolve(__dirname, "../..");
const full = unpack(JSON.parse(fs.readFileSync(path.join(root, "public/stars.json"), "utf8")) as Catalogue);
const byName = (n: string) => full.find((s) => s.name === n)!;

/* ── definitions ────────────────────────────────────────────────────────── */
near("a light-year in km is c × a Julian year", KM_PER_LY, 9_460_730_472_580.8, 0.01);
const one: Star = { hip: 1, name: "Test", designation: null, con: "Lyr", ra: 0, dec: 0, distLy: 1, sigmaLy: 0.01, vmag: 1, bv: 0.6, source: "test" };
near("one light-year away arrives one Julian year later", (arrival(one, 0).at) / DAY_MS, 365.25, 1e-9);
near("the error bar converts at the same rate", arrival(one, 0).sigma / DAY_MS, 3.6525, 1e-9);

/* ── the catalogue says what the textbooks say ──────────────────────────── */
{
  const known: [string, number, number][] = [
    ["Sirius", 8.6, 0.1], ["Procyon", 11.46, 0.1], ["Altair", 16.73, 0.15], ["Vega", 25.04, 0.2],
    ["Fomalhaut", 25.13, 0.2], ["Pollux", 33.78, 0.3], ["Arcturus", 36.7, 0.5], ["Capella", 42.9, 0.6],
  ];
  for (const [n, d, tol] of known) {
    const s = byName(n);
    ok(`${n} is in the catalogue`, Boolean(s));
    if (s) near(`${n} distance`, s.distLy, d, tol);
  }
  const acen = byName("Rigil Kentaurus");
  ok(`α Centauri is the nearest naked-eye star (got ${acen?.distLy})`, acen && acen.distLy > 4.2 && acen.distLy < 4.45);
  const firstNaked = full.filter(nakedEye).sort((a, b) => a.distLy - b.distLy)[0];
  ok(`and nothing naked-eye is nearer (got ${displayName(firstNaked)})`, firstNaked.hip === acen.hip || firstNaked.distLy >= acen.distLy - 0.1);
}

/* ── the cases Hipparcos alone gets wrong ───────────────────────────────── */
{
  const a = byName("Rigil Kentaurus"), b = byName("Toliman"), p = byName("Proxima Centauri");
  // A bound pair cannot be at two distances. Hipparcos had them 0.23 ly apart.
  near("α Centauri A and B are at the same distance", Math.abs(a.distLy - b.distLy), 0, 1e-9);
  ok(`Proxima is the nearest star of all (got ${displayName(full[0])})`, full[0].hip === p.hip);
  ok(`Proxima comes from Gaia (got ${p.source})`, p.source === "Gaia EDR3");
  near("Proxima's distance", p.distLy, 4.2465, 0.0005);
  ok(`and its arrival is good to under a day (${plusMinus(arrival(p, 0).sigma)})`, arrival(p, 0).sigma < DAY_MS);
  ok(`Vega is too bright for Gaia, so it stays on Hipparcos (got ${byName("Vega").source})`, byName("Vega").source === "Hipparcos 2007");
  const gaia = full.filter((s) => s.source.startsWith("Gaia")).length;
  ok(`most distances come from Gaia (${gaia} of ${full.length})`, gaia / full.length > 0.8);
  ok("every star says where its distance came from", full.every((s) => s.source && s.source !== "unknown"));
}

/* ── the catalogue's own integrity ──────────────────────────────────────── */
{
  ok(`thousands of stars (got ${full.length})`, full.length > 3000);
  ok("sorted by distance", full.every((s, i) => i === 0 || full[i - 1].distLy <= s.distLy));
  ok("no duplicate Hipparcos numbers", new Set(full.map((s) => s.hip)).size === full.length);
  const worst = full.reduce((m, s) => Math.max(m, s.sigmaLy / s.distLy), 0);
  ok(`every distance is good to 20% or better (worst ${(worst * 100).toFixed(1)}%)`, worst <= 0.2 + 1e-9);
  ok("every error bar is positive", full.every((s) => s.sigmaLy > 0));
  ok("everything is inside the cut", full.every((s) => s.distLy <= 125));
  for (const s of full.slice(0, 50)) {
    const p = position(s);
    near(`position has the right length (HIP ${s.hip})`, Math.hypot(...p), s.distLy, 1e-6);
  }
}

/* ── status ─────────────────────────────────────────────────────────────── */
{
  const a = { star: one, at: 1000 * DAY_MS, sigma: 10 * DAY_MS };
  ok("well before is en route", statusOf(a, 900 * DAY_MS) === "enroute");
  ok("inside the error bar is on approach", statusOf(a, 995 * DAY_MS) === "approach");
  ok("and on the other side of centre too", statusOf(a, 1008 * DAY_MS) === "approach");
  ok("well after has landed", statusOf(a, 1011 * DAY_MS) === "landed");
}

/* ── reach is the same as "everything nearer than your age" ─────────────── */
{
  const birth = Date.UTC(1998, 2, 12, 12);
  const now = Date.UTC(2026, 9, 1, 12);
  const age = (now - birth) / YEAR_MS;
  const r = reach(full, birth, now);
  ok("central reach equals the stars inside your age", r.central === full.filter((s) => s.distLy <= age).length);
  ok("certain ≤ central ≤ possible", r.certain <= r.central && r.central <= r.possible);
  ok(`the error bars matter here (certain ${r.certain}, possible ${r.possible})`, r.possible > r.certain);
  ok("nobody born a second ago has reached anything", reach(full, now, now + 1000).central === 0);
}

/* ── a worked example a person can check by hand ────────────────────────── */
{
  const birth = Date.UTC(2000, 0, 1, 12);
  const vega = arrival(byName("Vega"), birth);
  const d = new Date(vega.at);
  ok(`born 1 Jan 2000, Vega's light arrives in January 2025 (got ${boardDate(vega.at)})`,
    d.getUTCFullYear() === 2025 && d.getUTCMonth() === 0);
  ok(`with an error bar of weeks, not days (${plusMinus(vega.sigma)})`, vega.sigma / DAY_MS > 14 && vega.sigma / DAY_MS < 40);
  const prox = arrival(byName("Proxima Centauri"), birth);
  ok(`the nearest star is good to the day (${plusMinus(prox.sigma)})`, prox.sigma / DAY_MS < 1);
}

/* ── the board ──────────────────────────────────────────────────────────── */
{
  const birth = Date.UTC(1995, 5, 15, 12);
  const now = Date.UTC(2026, 9, 1, 12);
  const naked = full.filter(nakedEye);
  const rows = board(naked, birth, now, { landed: 4, upcoming: 8 });
  ok("rows are in arrival order", rows.every((r, i) => i === 0 || rows[i - 1].at <= r.at));
  ok("it shows some that have landed", rows.filter((r) => statusOf(r, now) === "landed").length === 4);
  ok("and the next ones due", rows.filter((r) => statusOf(r, now) === "enroute").length === 8);
  const c = current(naked, birth, now)!;
  ok("the current star is the one nearest to now", rows.some((r) => r.star.hip === c.star.hip));
  const n = next(naked, birth, now)!;
  ok("next is in the future", n.at > now);
  ok("and nothing else is sooner", naked.every((s) => { const a = arrival(s, birth); return a.at <= now || a.at >= n.at; }));
}

/* ── input ──────────────────────────────────────────────────────────────── */
{
  const now = Date.UTC(2026, 9, 1);
  ok("a normal date parses", parseBirth("1998-03-12", "", now).ok);
  const noon = parseBirth("1998-03-12", "", now);
  ok("no time means local noon", noon.ok && new Date(noon.ms).getHours() === 12);
  const t = parseBirth("1998-03-12", "03:42", now);
  ok("a time is honoured", t.ok && new Date(t.ms).getHours() === 3 && new Date(t.ms).getMinutes() === 42);
  ok("30 February does not exist", !parseBirth("2023-02-30", "", now).ok);
  ok("the future is refused", !parseBirth("2030-01-01", "", now).ok);
  ok("before 1900 is refused", !parseBirth("1850-01-01", "", now).ok);
  ok("garbage is refused", !parseBirth("yesterday", "", now).ok);
}

/* ── words ──────────────────────────────────────────────────────────────── */
ok("under a day", plusMinus(0.3 * DAY_MS) === "± <1 DAY");
ok("days", plusMinus(25 * DAY_MS) === "± 25 DAYS");
ok("one day is singular", plusMinus(1 * DAY_MS) === "± 1 DAY");
ok("months", plusMinus(120 * DAY_MS) === "± 3.9 MO");
ok("years", plusMinus(1000 * DAY_MS) === "± 2.7 YR");
ok("board error bars always fit seven flaps", [0.2, 1, 33, 160, 700, 4000].every((d) => boardError(d * DAY_MS).length <= 7));
ok("and keep their unit whole", boardError(158 * DAY_MS) === "±5.2MO");
ok("board dates read like a board", boardDate(Date.UTC(2025, 0, 17, 12)).endsWith("JAN 2025"));
ok("constellations get their names", constellation(byName("Vega")) === "Lyra");
{
  const g = (designation: string): Star => ({ ...one, name: null, designation });
  ok("μ is spelled out, not shown as an M", boardName(g("μ Her")) === "MU HER");
  ok("χ¹ keeps its index as a digit", boardName(g("χ¹ Ori")) === "CHI1 ORI");
  ok("proper names pass through", boardName(byName("Vega")) === "VEGA");
  ok("accents come off, as on a real board", boardName({ ...one, name: "Añañuca" }) === "ANANUCA");
  ok("every board name is drum-safe", full.every((s) => /^[ A-Z0-9.,:\-'()+]*$/.test(boardName(s))));
}

/* ── colour is measured ─────────────────────────────────────────────────── */
{
  const [r1, , b1] = starColour(-0.3);
  ok("a hot star is blue-white", b1 === 255 && r1 < 255);
  const [r2, g2, b2] = starColour(1.6);
  ok(`a cool star is warm, red over green over blue (got ${r2},${g2},${b2})`, r2 === 255 && r2 > g2 && g2 > b2);
  const [r3, g3, b3] = starColour(0.65);
  ok("the Sun's colour is near white", r3 === 255 && g3 > 220 && b3 > 190);
}

console.log(fails.length ? `✗ ${fails.length} failed of ${pass + fails.length}` : `✓ ${pass} assertions pass`);
for (const f of fails) console.log("  ✗", f);
process.exit(fails.length ? 1 : 0);
