import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MVP Design — Suite Montemagno",
  description: "App 4 — MVP Design + Architettura Agenti AI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}
