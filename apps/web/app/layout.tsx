import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const display = Fraunces({ subsets: ["latin"], variable: "--font-display" });
const sans = Outfit({ subsets: ["latin"], variable: "--font-ui" });

const title = "DeepSkyMate";
const description = "Astrophotography planner by DarkSkyscapes";

export const metadata: Metadata = {
  title,
  applicationName: title,
  description,
  openGraph: {
    title,
    description,
    siteName: title,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "DeepSkyMate" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
  appleWebApp: {
    title,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
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
