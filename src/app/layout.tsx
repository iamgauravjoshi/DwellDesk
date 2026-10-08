import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import Providers from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const grotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-grotesk" });

export const metadata: Metadata = {
  title: "PG·OS — PG & Hostel Management Suite",
  description:
    "Manage properties, rooms, residents, billing and operations for PGs and hostels.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${grotesk.variable}`}>
      <body className="min-h-screen bg-paper font-sans text-ink-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
