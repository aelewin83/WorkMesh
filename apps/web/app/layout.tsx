import type { Metadata } from "next";
import type { ReactNode } from "react";
import { GlobalBottomNav } from "@/components/GlobalBottomNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relai - Secure hiring for trusted work",
  description: "A private coordination platform for trusted operational work."
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
