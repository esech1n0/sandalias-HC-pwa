import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HC Venta - Sandalias y Pantuflas HC",
  description: "Punto de Venta para Sandalias y Pantuflas HC",
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.ico",
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
