import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: "#cfd500",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "HC Venta - Sandalias y Pantuflas HC",
  description: "Punto de Venta para Sandalias y Pantuflas HC",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/app.png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/app.png" },
    ],
    shortcut: "/app.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "HC Venta",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
