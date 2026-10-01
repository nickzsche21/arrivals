# ARRIVALS

**Light that left the stars on the day you were born is landing on a schedule.**

A light-year is *defined* as the distance light covers in one Julian year. So a star 25.04
light-years away is 25.04 years of travel from here: light that left it on the day you were born
reaches Earth 25.04 years later — and the light of the day you were born reaches *it* on the same
date, going the other way.

ARRIVALS is an airport arrivals board for that light. Check in with a birthday and every star whose
light left that day is on the board — **LANDED**, **EN ROUTE**, or **ON APPROACH** when today falls
inside its error bar. The flight map shows the light of your first day as a sphere, radius equal to
your age, with every star inside it already reached. Any row issues a boarding pass.

---

## What's different

“Birthday star” lookups already exist — a list of stars at roughly your age in light-years. This is
the same idea done to the day, with the uncertainty attached:

- **Distances are the best measurement available per star**, as SIMBAD adopts them: Gaia EDR3 for
  most (3,404 of 3,932), Hipparcos 2007 for the brightest, which saturate Gaia's detectors.
- **Every date carries its error bar.** Parallax error becomes days on the arrival date. Proxima
  Centauri's arrival is good to a few hours; Vega's to about ±25 days. A date shown without that
  would look more precise than anyone knows it.
- **Hipparcos alone gets α Centauri wrong**: it puts B 0.23 ly nearer than A, which a bound pair
  cannot be. Both use the system parallax SIMBAD adopts. A test pins it.

## The product

The boarding pass is free at share size. The **print file** (4800 × 2040, 300 dpi at 16 × 6.8 in)
is the paid product — a gift for a birthday, a new baby, or the day two people met.

Payments use **Polar** as merchant of record with licence keys, the same flow as WATERLINE. Set these
in Vercel and the print button becomes a checkout:

| variable | what |
| --- | --- |
| `NEXT_PUBLIC_CHECKOUT_URL` | the Polar checkout link for the product |
| `NEXT_PUBLIC_PRICE` | label on the button, default `$4.99` |
| `POLAR_API_KEY` | organisation token, used server-side to validate keys |
| `POLAR_ORG_ID` | optional |

Unset, the print file is free and labelled “free during launch” — a locked door with no way to buy
the key would be worse than an open one.

## Data

```bash
npm run data   # rebuilds public/stars.json from the sources below
npm test       # 126 assertions against the real catalogue
npm run dev
```

- Parallaxes: SIMBAD (CDS, Strasbourg), mostly from the ESA mission *Gaia* (Gaia DPAC); otherwise
  Hipparcos, new reduction (van Leeuwen 2007, VizieR I/311). Kept: inside 125 ly, parallax error
  under 20%.
- Names, Bayer/Flamsteed designations and magnitudes: [HYG database v4.1](https://github.com/astronexus/HYG-Database),
  CC BY-SA 4.0. **`public/stars.json` is a derivative and is shared under CC BY-SA 4.0.** The code
  is MIT.

This research has made use of the SIMBAD database, operated at CDS, Strasbourg, France. This work
has made use of data from the European Space Agency (ESA) mission *Gaia*, processed by the Gaia Data
Processing and Analysis Consortium (DPAC).

Your birthday never leaves the page.
