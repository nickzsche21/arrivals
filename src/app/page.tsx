import Arrivals from "@/components/Arrivals";

export default function Page() {
  return (
    <>
      <Arrivals />
      <footer className="mx-auto mt-10 max-w-[1400px] border-t border-rule px-4 py-8 sm:px-6">
        <div className="grid gap-x-10 gap-y-7 text-[12.5px] leading-relaxed text-mid md:grid-cols-3">
          <section>
            <h2 className="sign mb-2 text-[12px]">how it works</h2>
            <p>
              A light-year is <em>defined</em> as the distance light covers in one Julian year. So a star
              25.04 light-years away is 25.04 years of travel from here: light that left it on the day you
              were born reaches Earth 25.04 years later — and the light of the day you were born reaches it
              on the same date, going the other way.
            </p>
            <p className="mt-2">
              The sphere on the flight map is that second idea drawn literally. Its radius is your age.
              Every star inside it has already received the light of your first day.
            </p>
          </section>
          <section>
            <h2 className="sign mb-2 text-[12px]">why every date has an error bar</h2>
            <p>
              Distances are measured by parallax, and parallax has an uncertainty. It turns directly into
              days on the arrival date. Most distances here come from <span className="text-ink">Gaia EDR3</span>,
              which puts Proxima Centauri’s arrival inside a few hours. The brightest stars saturate Gaia’s
              detectors, so they fall back to <span className="text-ink">Hipparcos</span> and carry error bars
              of weeks — Vega’s is about 25 days. A date shown without that would look more precise than
              anyone actually knows it.
            </p>
            <p className="mt-2">
              Hipparcos alone also puts α Centauri B 0.23 light-years nearer than α Centauri A, which a bound
              pair cannot be. Both use the system parallax SIMBAD adopts instead.
            </p>
          </section>
          <section>
            <h2 className="sign mb-2 text-[12px]">sources</h2>
            <p>
              Parallaxes as adopted by the SIMBAD database, operated at CDS, Strasbourg — mostly from the ESA
              mission <em>Gaia</em> (processed by the Gaia DPAC), otherwise Hipparcos, new reduction (van
              Leeuwen 2007). Names and magnitudes from the{" "}
              <a className="underline decoration-rule underline-offset-4 hover:text-ink" href="https://github.com/astronexus/HYG-Database">HYG database</a>{" "}
              (CC BY-SA 4.0); the derived star file is shared under the same licence.
            </p>
            <p className="mt-2">
              <a className="underline decoration-rule underline-offset-4 hover:text-ink" href="https://github.com/nickzsche21/arrivals">source</a>{" "}
              · 3,932 stars within 125 light-years · your birthday never leaves this page
            </p>
          </section>
        </div>
      </footer>
    </>
  );
}
