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
  icons: {
    icon: [
      { url: "/favicon.png?v=2", sizes: "48x48", type: "image/png" },
      { url: "/favicon-32.png?v=2", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png?v=2", sizes: "16x16", type: "image/png" },
      { url: "/icon.svg?v=2", type: "image/svg+xml" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
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
    capable: true,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              '(function(){try{var raw=localStorage.getItem("dss-planner.session.v1");if(!raw)return;var data=JSON.parse(raw);var theme=data&&data.theme;if(theme==="night"||data&&data.vision==="red")theme="night";else theme="dark";document.documentElement.dataset.theme=theme;}catch(e){}})();',
          }}
        />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
