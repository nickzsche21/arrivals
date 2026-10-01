/**
 * Builds public/stars.json from three public sources.
 *
 *   Distances  The parallax SIMBAD adopts for each Hipparcos star — Gaia EDR3
 *              for most, Hipparcos (van Leeuwen 2007) for stars too bright for
 *              Gaia, and dedicated solutions for awkward binaries. Falls back to
 *              Hipparcos 2007 (VizieR I/311) where SIMBAD has nothing. Every
 *              value carries its error, because an arrival date without its
 *              uncertainty is the precise-looking number this refuses to show.
 *   Names      HYG database v4.1 (astronexus), CC BY-SA 4.0 — proper names,
 *              Bayer and Flamsteed designations, constellations, V magnitudes.
 *
 * Why not Hipparcos alone: it puts α Centauri B 0.23 ly nearer than α
 * Centauri A, which is impossible for a bound pair, and it has Proxima's
 * error bar fifty times wider than Gaia's. The tests pin both.
 *
 * Kept: parallax above 21 mas (inside ~155 light-years) and a relative error
 * under 20%. Past that the distance is too soft to date an arrival to the
 * year, never mind the day.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// fileURLToPath, not URL.pathname: the latter keeps %20 and writes to a directory that does not exist.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cache = path.join(root, ".cache");
fs.mkdirSync(cache, { recursive: true });

const SOURCES = {
  hip2: "https://vizier.cds.unistra.fr/viz-bin/asu-tsv?-source=I/311/hip2&-out=HIP,RArad,DErad,Plx,e_Plx,Hpmag,B-V&-out.max=20000&Plx=%3E21",
  hyg: "https://raw.githubusercontent.com/astronexus/HYG-Database/main/hyg/CURRENT/hygdata_v41.csv",
  simbad:
    "https://simbad.cds.unistra.fr/simbad/sim-tap/sync?request=doQuery&lang=adql&format=json&maxrec=50000&query=" +
    encodeURIComponent(
      "SELECT i.id, b.plx_value, b.plx_err, b.plx_bibcode FROM ident AS i JOIN basic AS b ON b.oid = i.oidref " +
        "WHERE i.id LIKE 'HIP %' AND b.plx_value > 25"
    ),
};

const SOURCE_LABEL = {
  "2020yCat.1350....0G": "Gaia EDR3",
  "2018yCat.1345....0G": "Gaia DR2",
  "2007A&A...474..653V": "Hipparcos 2007",
  "1997A&A...323L..49P": "binary orbit, A&A 323 L49",
};

async function cached(name, url) {
  const f = path.join(cache, name);
  if (!fs.existsSync(f)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${name}: HTTP ${r.status}`);
    fs.writeFileSync(f, Buffer.from(await r.arrayBuffer()));
  }
  return fs.readFileSync(f, "utf8");
}

/** Minimal CSV for HYG: quoted fields, no embedded newlines. */
function parseCSV(text) {
  const lines = text.split("\n").filter(Boolean);
  const split = (l) => {
    const out = []; let cur = ""; let q = false;
    for (const ch of l) {
      if (ch === '"') q = !q;
      else if (ch === "," && !q) { out.push(cur); cur = ""; }
      else cur += ch;
    }
    out.push(cur);
    return out;
  };
  const head = split(lines[0]);
  return lines.slice(1).map((l) => Object.fromEntries(split(l).map((v, i) => [head[i], v])));
}

const GREEK = {
  Alp: "α", Bet: "β", Gam: "γ", Del: "δ", Eps: "ε", Zet: "ζ", Eta: "η", The: "θ", Iot: "ι", Kap: "κ",
  Lam: "λ", Mu: "μ", Nu: "ν", Xi: "ξ", Omi: "ο", Pi: "π", Rho: "ρ", Sig: "σ", Tau: "τ", Ups: "υ",
  Phi: "φ", Chi: "χ", Psi: "ψ", Ome: "ω",
};
const SUP = { 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵" };

function designation(h) {
  if (h.bayer) {
    const [g, n] = h.bayer.split("-");
    if (GREEK[g]) return `${GREEK[g]}${n ? SUP[n] ?? n : ""} ${h.con}`;
  }
  if (h.flam) return `${h.flam} ${h.con}`;
  if (h.gl) return h.gl.replace(/^Gl\s*/, "Gl ");
  return null;
}

const hipText = await cached("hip2.tsv", SOURCES.hip2);
const hygText = await cached("hyg.csv", SOURCES.hyg);
const simbad = JSON.parse(await cached("simbad.json", SOURCES.simbad));

const hyg = new Map();
for (const r of parseCSV(hygText)) if (r.hip) hyg.set(Number(r.hip), r);

/* Hipparcos 2007: positions, and the fallback parallax. */
const hip2 = new Map();
for (const line of hipText.split("\n")) {
  if (!/^\s*\d/.test(line)) continue;
  const [hip, ra, dec, plx, ePlx, hp, bv] = line.split("\t").map((x) => x.trim());
  hip2.set(Number(hip), { ra: Number(ra), dec: Number(dec), plx: Number(plx), e: Number(ePlx), hp: Number(hp), bv });
}

/* SIMBAD's adopted parallax, keyed by HIP number. */
const adopted = new Map();
for (const [id, plx, err, bib] of simbad.data) {
  const hip = Number(String(id).replace(/^HIP\s+/, ""));
  if (hip && plx > 0 && err > 0) adopted.set(hip, { plx, e: err, bib });
}

const sources = [];
const sourceIndex = (label) => {
  let i = sources.indexOf(label);
  if (i < 0) { sources.push(label); i = sources.length - 1; }
  return i;
};

const LY_PER_PC = 3.261563777;
const stars = [];
let considered = 0, soft = 0, fromSimbad = 0;

for (const hip of new Set([...hip2.keys(), ...adopted.keys()])) {
  const h = hyg.get(hip);
  const base = hip2.get(hip);
  const a = adopted.get(hip);
  const ra = base ? base.ra : h ? Number(h.ra) * 15 : NaN;
  const dec = base ? base.dec : h ? Number(h.dec) : NaN;
  if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue;

  const p = a ? a.plx : base?.plx;
  const e = a ? a.e : base?.e;
  const label = a ? SOURCE_LABEL[a.bib] ?? a.bib : "Hipparcos 2007";
  if (!(p > 21) || !(e > 0)) continue;
  considered++;
  if (e / p > 0.2) { soft++; continue; }
  if (a) fromSimbad++;

  const distLy = (1000 / p) * LY_PER_PC;
  // First-order propagation: d = 1/p, so σd/d = σp/p.
  const sigmaLy = distLy * (e / p);
  const vmag = h && h.mag !== "" ? Number(h.mag) : base ? base.hp : NaN;
  if (!Number.isFinite(vmag)) continue;
  const bv = h && h.ci !== "" ? Number(h.ci) : base && base.bv !== "" ? Number(base.bv) : null;

  stars.push([
    hip,
    h?.proper || null,
    h ? designation(h) : null,
    h?.con || null,
    +ra.toFixed(5),
    +dec.toFixed(5),
    +distLy.toFixed(5),
    +sigmaLy.toFixed(5),
    +vmag.toFixed(2),
    bv === null || !Number.isFinite(bv) ? null : +bv.toFixed(3),
    sourceIndex(label),
  ]);
}

stars.sort((a, b) => a[6] - b[6]);
// Nobody's light has travelled further than a long life; past that a star can
// only ever be "en route", so it is weight without information.
const MAX_LY = 125;
const kept = stars.filter((s) => s[6] <= MAX_LY);
const out = {
  source: "Parallaxes as adopted by SIMBAD (mostly Gaia EDR3), else Hipparcos 2007 (VizieR I/311); names from HYG v4.1 (CC BY-SA 4.0)",
  fields: ["hip", "name", "designation", "con", "ra", "dec", "distLy", "sigmaLy", "vmag", "bv", "source"],
  sources,
  maxLy: MAX_LY,
  stars: kept,
};
// Served as a static file, not bundled: it is fetched once and cached, and the
// page renders its check-in desk before it arrives.
fs.writeFileSync(path.join(root, "public/stars.json"), JSON.stringify(out));
fs.mkdirSync(path.join(root, "src/data"), { recursive: true });
// A small fixture for the tests, so they check the real catalogue's numbers.
fs.writeFileSync(path.join(root, "src/data/fixture.json"), JSON.stringify({ ...out, stars: kept.filter((s) => s[1]) }));
console.log(`considered ${considered}, dropped ${soft} with >20% parallax error, kept ${kept.length} within ${MAX_LY} ly (${fromSimbad} from SIMBAD)`);
console.log("sources:", sources.map((l, i) => `${l}: ${kept.filter((s) => s[10] === i).length}`).join(", "));
console.log(`named: ${kept.filter((s) => s[1]).length}; naked-eye (V≤6): ${kept.filter((s) => s[8] <= 6).length}`);
for (const n of ["Proxima Centauri", "Rigil Kentaurus", "Toliman", "Sirius", "Procyon", "Altair", "Vega", "Fomalhaut", "Pollux", "Arcturus", "Capella"]) {
  const s = kept.find((x) => x[1] === n);
  if (s) console.log(`  ${n.padEnd(17)} ${s[6].toFixed(4)} ± ${s[7].toFixed(4)} ly   V=${s[8]}   ${sources[s[10]]}`);
}
