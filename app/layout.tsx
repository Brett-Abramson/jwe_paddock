import type { Metadata } from "next";
import { IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const ibmSans = IBM_Plex_Sans({
  variable: "--font-ibm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paddock Atlas — JWE3 park planner",
  description:
    "Plan Jurassic World Evolution 3 enclosures: live-scored candidates and a derived build order.",
  icons: {
    icon: "/favicon.svg",
  },
};

// Runs synchronously in <head> before first paint so the saved skin is applied
// with no flash. Falls back to the dark (production) skin.
const themeScript = `(function(){try{var t=localStorage.getItem("pa-theme");document.documentElement.setAttribute("data-theme",t==="light"?"light":"dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${ibmSans.variable} ${ibmMono.variable} h-full`}
    >
      <body className="min-h-full antialiased">
        <Script id="pa-theme" strategy="beforeInteractive">
          {themeScript}
        </Script>
        {children}
      </body>
    </html>
  );
}
