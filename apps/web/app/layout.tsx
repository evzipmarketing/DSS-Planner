import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-ui" });

const title = "DSS Astro Planner";
const description = "Plan a deep-sky night: targets, altitude, framing, gear, and cloud cover.";

export const metadata: Metadata = {
  title,
  applicationName: title,
  description,
  openGraph: {
    title,
    description,
    siteName: title,
    type: "website",
  },
  twitter: {
    title,
    description,
  },
  appleWebApp: {
    title,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var raw=localStorage.getItem("dss-planner.session.v1");if(!raw)return;var data=JSON.parse(raw);var theme=data&&data.theme;if(theme!=="light"&&theme!=="dark"&&theme!=="night")theme=data&&data.vision==="red"?"night":"dark";document.documentElement.dataset.theme=theme;}catch(e){}})();',
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
