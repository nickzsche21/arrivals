import { NextResponse } from "next/server";

/**
 * Licence validation for the print files.
 *
 * Polar is the merchant of record (4% + $0.40, licence keys built in, no
 * company needed). Set POLAR_API_KEY — and optionally POLAR_ORG_ID — and this
 * checks keys for real. Unconfigured, it says so rather than quietly letting
 * everyone in or quietly locking everyone out.
 */
export async function POST(req: Request) {
  let key = "";
  try {
    const body = (await req.json()) as { key?: unknown };
    key = String(body.key ?? "").trim().slice(0, 200);
  } catch {
    return NextResponse.json({ valid: false, error: "Malformed request." }, { status: 400 });
  }
  if (!key) return NextResponse.json({ valid: false, error: "No key supplied." }, { status: 400 });

  const token = process.env.POLAR_API_KEY;
  if (!token) {
    return NextResponse.json({ valid: false, unconfigured: true, error: "Payments are not switched on for this deployment yet." });
  }

  try {
    const r = await fetch("https://api.polar.sh/v1/customer-portal/license-keys/validate", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ key, ...(process.env.POLAR_ORG_ID ? { organization_id: process.env.POLAR_ORG_ID } : {}) }),
      cache: "no-store",
    });
    if (!r.ok) return NextResponse.json({ valid: false, error: "That key was not recognised." });
    const j = (await r.json()) as { status?: string };
    return NextResponse.json({ valid: j.status === "granted" });
  } catch {
    return NextResponse.json({ valid: false, error: "Could not reach the payment provider." }, { status: 502 });
  }
}
