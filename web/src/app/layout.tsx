import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import HomeButton from "@/components/HomeButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Free UK School Research",
  description: "Browse and compare UK school data with interactive maps",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
            <a href="/" className="text-xl font-bold text-green-700">
              Free UK School Research
            </a>
            <nav className="flex items-center gap-4 text-sm">
              <a href="/" className="text-gray-600 hover:text-gray-900">
                Home
              </a>
              <a href="/map" className="text-gray-600 hover:text-gray-900">
                Map
              </a>
              <HomeButton />
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
