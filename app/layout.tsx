import type { Metadata } from "next";
import "./globals.css";

// Page metadata — shown in browser tab and when sharing the link
export const metadata: Metadata = {
  title: "Ecom Photo Studio — JANVIER",
  description: "Professional fashion photography, powered by AI",
  // Prevent indexing since this is an internal team tool
  robots: "noindex, nofollow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-black antialiased">{children}</body>
    </html>
  );
}
