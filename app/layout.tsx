import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";
const inter = Inter({ variable: "--font-sans", subsets: ["latin", "cyrillic"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
export const metadata: Metadata = { title: "kzproject — CRM", description: "Управление недвижимостью" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${inter.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="h-full bg-gray-100"><TooltipProvider>{children}</TooltipProvider></body>
    </html>
  );
}
