import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-ui" });

export const metadata: Metadata = {
  title: "DSS Planner",
  description: "Plan a deep-sky night: targets, altitude, framing, gear, and cloud cover.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
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
