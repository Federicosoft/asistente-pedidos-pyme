import type { Metadata } from "next";
import "./globals.css";
import "./business.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://pedidos-pyme.fede1360.chatgpt.site"),
  title: "Nexo · Gestión de pedidos",
  description: "Asistente comercial para PyMEs: interpreta consultas, valida productos, consulta precio y stock y prepara respuestas con revisión humana.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "/",
    siteName: "Nexo",
    title: "Nexo · Gestión de pedidos",
    description: "Asistente comercial para PyMEs. La IA asiste. La persona decide.",
    images: [{
      url: "/og.png",
      width: 1200,
      height: 630,
      alt: "Nexo, asistente comercial para PyMEs",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nexo · Gestión de pedidos",
    description: "Asistente comercial para PyMEs. La IA asiste. La persona decide.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
