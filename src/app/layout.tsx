import type { Metadata } from "next";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";
import "./App.css";

export const metadata: Metadata = {
  title: "Vidyapith Connect | Ramakrishna Mission Vidyapith, Deoghar Alumni Platform",
  description: "Reconnect with classmates, share jobs, offer mentorship, and support the legacy of Ramakrishna Mission Vidyapith, Deoghar.",
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

