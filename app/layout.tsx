import type { Metadata } from "next";
import { Cormorant_Garamond, Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const cormorant = Cormorant_Garamond({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Scanify",
  description: "Scan anything. Know its value.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="bg-[#0a0a0a] flex justify-center">
        <div className="w-full max-w-md min-h-screen bg-[#111111] border-x border-[#1e1e1e] relative pb-24">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
