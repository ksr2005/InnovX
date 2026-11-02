import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-context";

export const metadata: Metadata = {
  title: "InnovX — AI-Powered Innovation Discovery & Validation",
  description: "Decompose technical ideas, search 250M+ research papers and USPTO patents, and compute verified novelty assessments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased dark font-sans"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
