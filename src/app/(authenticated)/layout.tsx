import React from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppTopbar } from "@/components/layout/AppTopbar";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#0B0F19]">
      <AppSidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <AppTopbar />
        <main
          id="main-content"
          className="flex-1 mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
