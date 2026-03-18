import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Camp Concierge",
  description: "Digital gästpärm och AI-planerare för din camping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning förhindrar att webbläsartillägg kraschar Next.js
    <html lang="sv" suppressHydrationWarning>
      <head>
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1, 
          maximum-scale=1, user-scalable=no" 
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}