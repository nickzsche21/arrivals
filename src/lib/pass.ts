import {
  boardDate, plusMinus, displayName, boardName, constellation, trillionKm, statusOf, type Arrival,
} from "./light";

export type PassData = { passenger: string; birthMs: number; arrival: Arrival; nowMs: number };

/** Three letters, the way an airport would abbreviate it. */
export function code(name: string): string {
  const letters = name.normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase();
  return (letters + "XXX").slice(0, 3);
}

/** Deterministic bars from the pass's own contents — it encodes nothing, but it is not random either. */
function bars(seed: string, n: number): number[] {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    h ^= h << 13; h ^= h >>> 17; h ^= h << 5;
    out.push(1 + ((h >>> 0) % 3));
  }
  return out;
}

export const PASS_W = 1600;
export const PASS_H = 680;

/**
 * Draws the pass at any size: everything is laid out in a 1600×680 frame and
 * scaled, so the share image and the print file are the same drawing.
 */
export function renderPass(c: CanvasRenderingContext2D, d: PassData, scale = 1) {
  const W = PASS_W, H = PASS_H;
  c.save();
  c.scale(scale, scale);

  const paper = "#f6f3ea", ink = "#17160f", mid = "#6b675a", rule = "#d8d2c2", sign = "#ffc700";
  const star = d.arrival.star;
  const name = displayName(star);
  const status = statusOf(d.arrival, d.nowMs);
  const stub = 1180;

  // Paper, with notched corners at the perforation like a real pass.
  c.fillStyle = paper;
  c.beginPath();
  c.roundRect(0, 0, W, H, 28);
  c.fill();
  c.globalCompositeOperation = "destination-out";
  for (const y of [0, H]) { c.beginPath(); c.arc(stub, y, 22, 0, Math.PI * 2); c.fill(); }
  c.globalCompositeOperation = "source-over";

  // Header band.
  c.fillStyle = "#0b0b0c";
  c.beginPath(); c.roundRect(0, 0, W, 96, [28, 28, 0, 0]); c.fill();
  c.fillStyle = sign;
  c.font = "800 30px -apple-system, Inter, system-ui, sans-serif";
  c.fillText("BOARDING PASS", 48, 60);
  c.fillStyle = "#f1f0ec";
  c.font = "600 20px ui-monospace, Menlo, monospace";
  c.fillText("CARRIER: LIGHT  ·  CLASS: PHOTON  ·  SPEED: 299 792 KM/S", 330, 58);
  c.textAlign = "right";
  c.fillStyle = sign;
  c.font = "800 22px -apple-system, Inter, system-ui, sans-serif";
  c.fillText("ARRIVALS", W - 48, 60);
  c.textAlign = "left";

  // Perforation.
  c.strokeStyle = rule; c.lineWidth = 3; c.setLineDash([2, 12]);
  c.beginPath(); c.moveTo(stub, 110); c.lineTo(stub, H - 26); c.stroke();
  c.setLineDash([]);

  const label = (t: string, x: number, y: number) => {
    c.fillStyle = mid; c.font = "700 15px -apple-system, Inter, system-ui, sans-serif";
    c.fillText(t.toUpperCase(), x, y);
  };
  const value = (t: string, x: number, y: number, size = 30) => {
    c.fillStyle = ink; c.font = `700 ${size}px ui-monospace, Menlo, monospace`;
    c.fillText(t, x, y);
  };
  const fit = (t: string, max: number) => (t.length > max ? t.slice(0, max - 1) + "…" : t);

  // Passenger.
  label("passenger", 48, 150);
  value(fit((d.passenger || "A PERSON ON EARTH").toUpperCase(), 30), 48, 190, 34);

  // From → to, as airport codes.
  c.fillStyle = ink;
  c.font = "800 120px -apple-system, Inter, system-ui, sans-serif";
  c.fillText("EAR", 44, 340);
  c.fillText(code(boardName(star)), 640, 340);
  c.strokeStyle = ink; c.lineWidth = 5;
  c.beginPath(); c.moveTo(330, 296); c.lineTo(590, 296); c.stroke();
  c.beginPath(); c.moveTo(574, 280); c.lineTo(594, 296); c.lineTo(574, 312); c.stroke();
  label("earth · sol iii", 48, 372);
  // label() uppercases, and an uppercase μ is an M — so use the spelled-out name.
  label(fit(`${boardName(star)} · ${constellation(star)}`, 34), 644, 372);

  // The facts.
  const cols = [48, 330, 640, 900];
  label("departed", cols[0], 440); value(boardDate(d.birthMs), cols[0], 478, 28);
  label("arrives", cols[1], 440); value(boardDate(d.arrival.at), cols[1], 478, 28);
  label("error bar", cols[2], 440); value(plusMinus(d.arrival.sigma), cols[2], 478, 28);
  label("flight time", cols[3], 440); value(`${star.distLy.toFixed(2)} YRS`, cols[3], 478, 28);

  label("distance", cols[0], 540); value(trillionKm(star.distLy).toUpperCase(), cols[0], 576, 24);
  label("gate", cols[2], 540); value(fit(constellation(star).toUpperCase(), 16), cols[2], 576, 24);
  label("measured by", cols[3], 540); value(fit(star.source.toUpperCase(), 16), cols[3], 576, 24);

  /* Status stamp — the one coloured thing, and it is the answer. It sits in
     the empty band above the codes and is sized to fit there, because "ON
     APPROACH" is half as long again as "EN ROUTE" and must not land on the
     destination it is describing. */
  const stamp = status === "landed" ? ["LANDED", "#1f8a52"] : status === "approach" ? ["ON APPROACH", "#b86b00"] : ["EN ROUTE", "#3b5bdb"];
  c.save();
  c.translate(1012, 172); c.rotate(-0.1);
  c.strokeStyle = stamp[1]; c.fillStyle = stamp[1]; c.lineWidth = 5;
  let fs = 40;
  c.font = `900 ${fs}px -apple-system, Inter, system-ui, sans-serif`;
  while (c.measureText(stamp[0]).width > 240 && fs > 22) {
    fs -= 2;
    c.font = `900 ${fs}px -apple-system, Inter, system-ui, sans-serif`;
  }
  const tw = c.measureText(stamp[0]).width;
  c.globalAlpha = 0.85;
  c.strokeRect(-tw / 2 - 18, -fs * 0.95, tw + 36, fs * 1.45);
  c.textAlign = "center"; c.fillText(stamp[0], 0, fs * 0.22);
  c.restore();

  // Stub.
  label("passenger", stub + 40, 150); value(fit((d.passenger || "EARTH").toUpperCase(), 14), stub + 40, 186, 26);
  label("to", stub + 40, 236); value(fit(boardName(star), 14), stub + 40, 272, 26);
  label("arrives", stub + 40, 322); value(boardDate(d.arrival.at), stub + 40, 358, 26);
  c.fillStyle = mid; c.font = "600 18px ui-monospace, Menlo, monospace";
  c.fillText(plusMinus(d.arrival.sigma), stub + 40, 388);

  // Barcode.
  const seq = bars(`${name}|${d.birthMs}|${d.passenger}`, 46);
  let x = stub + 40;
  c.fillStyle = ink;
  for (let i = 0; i < seq.length && x < W - 40; i++) {
    if (i % 2 === 0) c.fillRect(x, 440, seq[i] * 3, 150);
    x += seq[i] * 3 + 2;
  }

  // Footer line: the claim, plainly.
  c.fillStyle = mid; c.font = "600 15px ui-monospace, Menlo, monospace";
  c.fillText(
    fit(`Light that left ${name} on the day you were born reaches Earth on this date. The return trip lands the same day.`, 120),
    48, H - 34
  );

  c.restore();
}
