import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientProvider from "@/lib/providers/ClientProvider";
import LoadingBarProvider from "@/components/providers/LoadingBarProvider";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PyLinks",
  description: "PyLinks - The Future of Link Management using PyUSD",
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
        <LoadingBarProvider>
          <ClientProvider>{children}</ClientProvider>
          <Toaster />
        </LoadingBarProvider>
      </body>
    </html>
  );
}
