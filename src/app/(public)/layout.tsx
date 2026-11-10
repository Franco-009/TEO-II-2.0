import React from "react";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { PublicFooter } from "@/components/layout/PublicFooter";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-[#0B0F19]">
      <PublicHeader />
      <main id="main-content" className="flex-1 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}
