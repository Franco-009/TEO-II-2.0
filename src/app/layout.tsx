import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "StudyPlay — Plataforma de Estudio y Cuestionarios Deterministas",
    template: "%s | StudyPlay",
  },
  description:
    "Organiza materias, temas y apuntes PDF, practica con cuestionarios autocorregibles, recibe correcciones explicadas y sigue tu progreso.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className="min-h-screen bg-[#0B0F19] text-slate-50 antialiased selection:bg-blue-500/30 selection:text-blue-200">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:shadow-lg"
        >
          Saltar al contenido principal
        </a>
        {children}
      </body>
    </html>
  );
}
