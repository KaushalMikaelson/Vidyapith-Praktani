import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";
import "./App.css";

export const metadata: Metadata = {
  title: "Vidyapith Connect | Ramakrishna Mission Vidyapith, Deoghar Alumni Platform",
  description: "Reconnect with classmates, share jobs, offer mentorship, and support the legacy of Ramakrishna Mission Vidyapith, Deoghar. The official alumni networking platform.",
  keywords: ["Ramakrishna Mission Vidyapith", "RKMV Deoghar", "alumni network", "alumni platform", "Vidyapith Connect", "alumni directory", "mentorship", "alumni jobs"],
  authors: [{ name: "Vidyapith Connect Team" }],
  openGraph: {
    title: "Vidyapith Connect — RKMV Deoghar Alumni Network",
    description: "The official alumni networking platform for Ramakrishna Mission Vidyapith, Deoghar. Reconnect, mentor, grow.",
    type: "website",
    locale: "en_IN",
    siteName: "Vidyapith Connect",
  },
  twitter: {
    card: "summary_large_image",
    title: "Vidyapith Connect — RKMV Deoghar Alumni Network",
    description: "The official alumni networking platform for Ramakrishna Mission Vidyapith, Deoghar.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}

