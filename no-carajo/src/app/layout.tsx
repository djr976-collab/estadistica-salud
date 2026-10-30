import type { Metadata, Viewport } from "next";
import { Bungee } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

const display = Bungee({ weight: "400", subsets: ["latin"], variable: "--font-display", display: "swap" });

export const metadata: Metadata = {
  title: "¡NO, CARAJO! — Academia de Enfermería",
  description: "Juego educativo de enfermería con un instructor virtual que pregunta, escucha, corrige y explica.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icons/icon.svg", apple: "/icons/icon-192.png" },
  appleWebApp: { capable: true, title: "¡NO, CARAJO!", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#050a1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className={display.variable}>
      <body className="font-sans antialiased">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
