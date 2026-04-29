import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GlobalBottomNav } from "@/components/GlobalBottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "WorkMesh Deep Mode",
  description: "Encrypted local labor marketplace investor demo UI"
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <GlobalBottomNav />
      </body>
    </html>
  );
}
