import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARRIVALS — light from the day you were born",
  description:
    "Light that left a star on the day you were born is arriving at Earth right now, on a schedule. An arrivals board for your starlight, timed to the day from Gaia parallaxes, with the error bar on every date.",
  openGraph: {
    title: "ARRIVALS — light from the day you were born",
    description: "Every star whose light left the day you were born, and the day it lands. Timed from Gaia.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
