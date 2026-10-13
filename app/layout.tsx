import type { Metadata } from "next";
import "@fontsource-variable/inter";
import "@fontsource-variable/source-serif-4";
import "@fontsource/press-start-2p";
import "./globals.css";
import { DemoBanner, Footer } from "@/components/Footer";
import { TopBar } from "@/components/TopBar";
import { usingDummyPrices } from "@/lib/prices";

export const metadata: Metadata = {
  title: { default: "WDP Fund", template: "%s · WDP Fund" },
  description: "Conviction backed by fundamentals. A $100 practice portfolio, tracked against SPY, with the analysis behind every position.",
};

const themeInit = `try{var t=localStorage.getItem('theme');if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        {usingDummyPrices() && <DemoBanner />}
        <TopBar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
