import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { business } from "@/lib/config";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/**
 * Keeps the half-built site out of Google while we work through the layers.
 * Set NEXT_PUBLIC_ALLOW_INDEXING=true in Vercel only when you're ready to launch.
 */
const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true";

export const metadata: Metadata = {
  title: `${business.name} — Free Personal Training Session`,
  description:
    "Book a free 60-minute onboarding session with Charles. No commitment, no pressure — just one hour to see if we're a good fit.",
  robots: allowIndexing
    ? { index: true, follow: true }
    : { index: false, follow: false, nocache: true },
  openGraph: {
    title: `${business.name} — Free Personal Training Session`,
    description:
      "Book a free 60-minute onboarding session. No commitment, no pressure.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07041A",
  width: "device-width",
  initialScale: 1,
  // Do NOT disable user scaling — it breaks accessibility
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
