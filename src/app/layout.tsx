import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Prediction Market Arbitrage Scanner",
  description:
    "Find arbitrage opportunities between Kalshi and Polymarket using AI-powered event matching",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${inter.className} bg-gray-950 text-gray-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
