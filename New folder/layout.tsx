import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Technica Portal",
  description: "Internal portal for Technica International",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
