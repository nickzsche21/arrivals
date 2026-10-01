/**
 * When the light gets there.
 *
 * A light-year is *defined* as the distance light travels in one Julian year of
 * 365.25 days (IAU). So a star d light-years away is exactly d Julian years of
 * light-travel from us, and light that left it at the moment you were born
 * reaches Earth d Julian years later. Run the other way, the light of the day
 * you were born reaches that star on the same date.
 *
 * The arithmetic is trivial. The part that matters is the error bar: the
 * distance comes from a measured parallax, the parallax has an uncertainty, and
 * that uncertainty becomes days or months on the arrival date. Every date this
 * page shows carries it.
 */

export const DAY_MS = 86_400_000;
export const JULIAN_YEAR_DAYS = 365.25;
export const YEAR_MS = JULIAN_YEAR_DAYS * DAY_MS;
/** c × one Julian year, exactly: 299 792.458 km/s × 31 557 600 s. */
export const KM_PER_LY = 299_792.458 * JULIAN_YEAR_DAYS * 86_400;

export type Star = {
  hip: number;
  name: string | null;
  designation: string | null;
  con: string | null;
  ra: number;
  dec: number;
  distLy: number;
  sigmaLy: number;
  vmag: number;
  bv: number | null;
  /** Which measurement the distance comes from: Gaia EDR3, Hipparcos 2007, … */
  source: string;
};

export type Catalogue = { source: string; fields: string[]; sources: string[]; maxLy: number; stars: unknown[][] };

export function unpack(c: Catalogue): Star[] {
  return c.stars.map((r) => ({
    hip: r[0] as number,
    name: r[1] as string | null,
    designation: r[2] as string | null,
    con: r[3] as string | null,
    ra: r[4] as number,
    dec: r[5] as number,
    distLy: r[6] as number,
    sigmaLy: r[7] as number,
    vmag: r[8] as number,
    bv: r[9] as number | null,
    source: c.sources[r[10] as number] ?? "unknown",
  }));
}

/** Bright enough to see from a dark site with nothing but your eyes. */
export const NAKED_EYE = 6;
export const nakedEye = (s: Star) => s.vmag <= NAKED_EYE;

export const displayName = (s: Star) => s.name ?? s.designation ?? `HIP ${s.hip}`;

const GREEK_NAMES: Record<string, string> = {
  α: "ALPHA", β: "BETA", γ: "GAMMA", δ: "DELTA", ε: "EPSILON", ζ: "ZETA", η: "ETA", θ: "THETA",
  ι: "IOTA", κ: "KAPPA", λ: "LAMBDA", μ: "MU", ν: "NU", ξ: "XI", ο: "OMICRON", π: "PI", ρ: "RHO",
  σ: "SIGMA", τ: "TAU", υ: "UPSILON", φ: "PHI", χ: "CHI", ψ: "PSI", ω: "OMEGA",
};
const SUPERSCRIPT: Record<string, string> = { "¹": "1", "²": "2", "³": "3", "⁴": "4", "⁵": "5" };

/**
 * The name as a split-flap board can show it. A board's drum has no Greek, and
 * an uppercase μ is indistinguishable from M — so "μ Her" would read as
 * "M HER". Spell the letter out, the way an announcer would read it.
 */
export function boardName(s: Star): string {
  return displayName(s)
    .replace(/[α-ω]/g, (g) => GREEK_NAMES[g] ?? g)
    .replace(/[¹²³⁴⁵]/g, (d) => SUPERSCRIPT[d])
    // Añañuca, Mönch, Lusitânia: IAU names with accents a drum does not carry.
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
}

/* ── arrivals ─────────────────────────────────────────────────────────────── */

export type Arrival = {
  star: Star;
  /** Central estimate, ms since epoch. */
  at: number;
  /** One standard deviation, in ms, from the parallax error alone. */
  sigma: number;
};

export function arrival(star: Star, birthMs: number): Arrival {
  return { star, at: birthMs + star.distLy * YEAR_MS, sigma: star.sigmaLy * YEAR_MS };
}

/**
 * Landed, en route, or on approach — where "on approach" means today falls
 * inside the one-sigma window, so the honest answer to "has it arrived?" is
 * "we cannot tell yet".
 */
export type Status = "landed" | "approach" | "enroute";

export function statusOf(a: Arrival, nowMs: number): Status {
  if (nowMs < a.at - a.sigma) return "enroute";
  if (nowMs > a.at + a.sigma) return "landed";
  return "approach";
}

export type Reach = {
  /** Arrived even at the far end of the error bar. */
  certain: number;
  /** Arrived on the central estimate. */
  central: number;
  /** Arrived if the distance is at the near end of its error bar. */
  possible: number;
};

export function reach(stars: Star[], birthMs: number, nowMs: number): Reach {
  let certain = 0, central = 0, possible = 0;
  for (const s of stars) {
    const a = arrival(s, birthMs);
    if (a.at + a.sigma <= nowMs) certain++;
    if (a.at <= nowMs) central++;
    if (a.at - a.sigma <= nowMs) possible++;
  }
  return { certain, central, possible };
}

/**
 * The board: the last few that landed, anything on approach, then the next
 * ones due — in arrival order, like a real one.
 */
export function board(
  stars: Star[],
  birthMs: number,
  nowMs: number,
  { landed = 4, upcoming = 8 }: { landed?: number; upcoming?: number } = {}
): Arrival[] {
  const all = stars.map((s) => arrival(s, birthMs)).sort((a, b) => a.at - b.at);
  const past = all.filter((a) => statusOf(a, nowMs) === "landed");
  const now = all.filter((a) => statusOf(a, nowMs) === "approach");
  const next = all.filter((a) => statusOf(a, nowMs) === "enroute");
  return [...past.slice(-landed), ...now, ...next.slice(0, upcoming)];
}

/** The arrival nearest to now, either side — the star you are "on" today. */
export function current(stars: Star[], birthMs: number, nowMs: number): Arrival | null {
  let best: Arrival | null = null;
  for (const s of stars) {
    const a = arrival(s, birthMs);
    if (!best || Math.abs(a.at - nowMs) < Math.abs(best.at - nowMs)) best = a;
  }
  return best;
}

/** The next one strictly in the future, on the central estimate. */
export function next(stars: Star[], birthMs: number, nowMs: number): Arrival | null {
  let best: Arrival | null = null;
  for (const s of stars) {
    const a = arrival(s, birthMs);
    if (a.at > nowMs && (!best || a.at < best.at)) best = a;
  }
  return best;
}

/* ── input ────────────────────────────────────────────────────────────────── */

export type Birth = { ok: true; ms: number } | { ok: false; reason: string };

/**
 * A date from <input type="date">, and optionally a time. Without a time it is
 * taken as local noon: every error bar here is days wide at the very least, so
 * the hour cannot move a date that is honestly stated.
 */
export function parseBirth(date: string, time = "", nowMs = Date.now()): Birth {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  if (!m) return { ok: false, reason: "Pick a date." };
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  const dt = new Date(y, mo - 1, d, t ? Number(t[1]) : 12, t ? Number(t[2]) : 0);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) {
    return { ok: false, reason: "That date does not exist." };
  }
  if (y < 1900) return { ok: false, reason: "Before 1900 the nearest stars run out of error bar to stand on." };
  if (dt.getTime() > nowMs) return { ok: false, reason: "That is in the future. Nothing has left yet." };
  return { ok: true, ms: dt.getTime() };
}

/* ── presentation ─────────────────────────────────────────────────────────── */

const MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

export function boardDate(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getDate()).padStart(2, "0")} ${MON[d.getMonth()]} ${d.getFullYear()}`;
}

/** The error bar in words, at a resolution it can honestly carry. */
export function plusMinus(sigmaMs: number): string {
  const days = sigmaMs / DAY_MS;
  if (days < 1) return "± <1 DAY";
  if (days < 61) return `± ${Math.round(days)} DAY${Math.round(days) === 1 ? "" : "S"}`;
  const months = days / 30.44;
  if (months < 24) return `± ${months.toFixed(1)} MO`;
  return `± ${(days / JULIAN_YEAR_DAYS).toFixed(1)} YR`;
}

/** The error bar squeezed into a board's seven flaps: ±33D, ±5.2MO, ±2.2YR. */
export function boardError(sigmaMs: number): string {
  const days = sigmaMs / DAY_MS;
  if (days < 1) return "±<1D";
  if (days < 61) return `±${Math.round(days)}D`;
  const months = days / 30.44;
  if (months < 24) return `±${months.toFixed(1)}MO`;
  return `±${(days / JULIAN_YEAR_DAYS).toFixed(1)}YR`;
}

/** Trillions of kilometres, which is the only unit that does not lie by omission. */
export function trillionKm(ly: number): string {
  return `${((ly * KM_PER_LY) / 1e12).toLocaleString("en-US", { maximumFractionDigits: 1 })} trillion km`;
}

/**
 * Star colour from B–V: Ballesteros (2012) for temperature, then a blackbody
 * fit to RGB. The colours on the page are measured, not chosen.
 */
export function starColour(bv: number | null): [number, number, number] {
  const b = bv === null ? 0.65 : Math.max(-0.4, Math.min(2.0, bv));
  const T = 4600 * (1 / (0.92 * b + 1.7) + 1 / (0.92 * b + 0.62));
  const t = T / 100;
  const r = t <= 66 ? 255 : 329.698727446 * Math.pow(t - 60, -0.1332047592);
  const g = t <= 66 ? 99.4708025861 * Math.log(t) - 161.1195681661 : 288.1221695283 * Math.pow(t - 60, -0.0755148492);
  const bl = t >= 66 ? 255 : t <= 19 ? 0 : 138.5177312231 * Math.log(t - 10) - 305.0447927307;
  const c = (x: number) => Math.round(Math.max(0, Math.min(255, x)));
  return [c(r), c(g), c(bl)];
}

/** Heliocentric position in light-years: x towards RA 0h, z towards the north celestial pole. */
export function position(s: Star): [number, number, number] {
  const ra = (s.ra * Math.PI) / 180, dec = (s.dec * Math.PI) / 180;
  return [s.distLy * Math.cos(dec) * Math.cos(ra), s.distLy * Math.cos(dec) * Math.sin(ra), s.distLy * Math.sin(dec)];
}

export const CONSTELLATIONS: Record<string, string> = {
  And: "Andromeda", Ant: "Antlia", Aps: "Apus", Aqr: "Aquarius", Aql: "Aquila", Ara: "Ara", Ari: "Aries",
  Aur: "Auriga", Boo: "Boötes", Cae: "Caelum", Cam: "Camelopardalis", Cnc: "Cancer", CVn: "Canes Venatici",
  CMa: "Canis Major", CMi: "Canis Minor", Cap: "Capricornus", Car: "Carina", Cas: "Cassiopeia",
  Cen: "Centaurus", Cep: "Cepheus", Cet: "Cetus", Cha: "Chamaeleon", Cir: "Circinus", Col: "Columba",
  Com: "Coma Berenices", CrA: "Corona Australis", CrB: "Corona Borealis", Crv: "Corvus", Crt: "Crater",
  Cru: "Crux", Cyg: "Cygnus", Del: "Delphinus", Dor: "Dorado", Dra: "Draco", Equ: "Equuleus",
  Eri: "Eridanus", For: "Fornax", Gem: "Gemini", Gru: "Grus", Her: "Hercules", Hor: "Horologium",
  Hya: "Hydra", Hyi: "Hydrus", Ind: "Indus", Lac: "Lacerta", Leo: "Leo", LMi: "Leo Minor", Lep: "Lepus",
  Lib: "Libra", Lup: "Lupus", Lyn: "Lynx", Lyr: "Lyra", Men: "Mensa", Mic: "Microscopium",
  Mon: "Monoceros", Mus: "Musca", Nor: "Norma", Oct: "Octans", Oph: "Ophiuchus", Ori: "Orion",
  Pav: "Pavo", Peg: "Pegasus", Per: "Perseus", Phe: "Phoenix", Pic: "Pictor", Psc: "Pisces",
  PsA: "Piscis Austrinus", Pup: "Puppis", Pyx: "Pyxis", Ret: "Reticulum", Sge: "Sagitta",
  Sgr: "Sagittarius", Sco: "Scorpius", Scl: "Sculptor", Sct: "Scutum", Ser: "Serpens", Sex: "Sextans",
  Tau: "Taurus", Tel: "Telescopium", Tri: "Triangulum", TrA: "Triangulum Australe", Tuc: "Tucana",
  UMa: "Ursa Major", UMi: "Ursa Minor", Vel: "Vela", Vir: "Virgo", Vol: "Volans", Vul: "Vulpecula",
};

export const constellation = (s: Star) => (s.con ? CONSTELLATIONS[s.con] ?? s.con : "—");
