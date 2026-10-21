"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const pathname = usePathname();
  const { user, signOut, openAuthModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const userInitial = user?.user_metadata?.full_name
    ? user.user_metadata.full_name[0].toUpperCase()
    : user?.email
    ? user.email[0].toUpperCase()
    : "C";

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/95 backdrop-blur">
      <div className="mx-auto max-w-6xl flex h-16 items-center justify-between px-6">
        {/* Brand & Nav Links */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-primary">Innov</span>
              <span className="text-emerald-500">X</span>
            </span>
            <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2 py-0.5">
              Engine
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                pathname === "/"
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              Discovery Engine
            </Link>
            <Link
              href="/marketplace"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                pathname === "/marketplace"
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>🤝</span>
              Marketplace
            </Link>
            <Link
              href="/dashboard"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
                pathname === "/dashboard"
                  ? "bg-secondary text-foreground font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              My Portfolio
            </Link>
          </nav>
        </div>

        {/* Right Auth Section */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-muted/60 hover:bg-muted transition-colors border border-border/60 text-xs"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                  {userInitial}
                </div>
                <span className="hidden sm:inline font-medium text-foreground max-w-[140px] truncate">
                  {user.user_metadata?.full_name || user.email}
                </span>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="text-xs text-muted-foreground hover:text-foreground hidden sm:inline-flex"
              >
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openAuthModal}
                className="text-xs font-semibold"
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={openAuthModal}
                className="text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white"
              >
                Get Started
              </Button>
            </div>
          )}

          {/* Mobile menu hamburger button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/60 bg-background/98 px-6 py-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <Link
            href="/"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === "/"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Discovery Engine
          </Link>
          <Link
            href="/marketplace"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === "/marketplace"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>🤝</span>
            Marketplace
          </Link>
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
              pathname === "/dashboard"
                ? "bg-secondary text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            My Portfolio (Vault)
          </Link>
          {user && (
            <div className="pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  signOut();
                }}
                className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg font-medium"
              >
                Sign Out ({user.email})
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
