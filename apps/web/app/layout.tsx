import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const themes = new Set(["a", "b", "c", "d", "e"]);

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-ui" });

export const metadata: Metadata = {
  title: "DSS Planner",
  description: "Plan a deep-sky night: targets, altitude, framing, gear, and cloud cover.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const requested = (await headers()).get("x-dss-theme");
  const theme = requested && themes.has(requested) ? requested : undefined;
  return (
    <html lang="en" data-theme={theme} className={`${display.variable} ${sans.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var raw=localStorage.getItem("dss-planner.session.v1");if(!raw)return;var data=JSON.parse(raw);if(data&&data.vision==="red")document.documentElement.dataset.vision="red";}catch(e){}})();',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
