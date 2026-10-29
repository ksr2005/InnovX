"use client";

import React, { useState } from "react";
import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";

export function AuthModal() {
  const { isAuthModalOpen, closeAuthModal, signInWithEmail, signUpWithEmail } = useAuth();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (tab === "signin") {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setError(error.message);
        }
      } else {
        const { error, user } = await signUpWithEmail(email, password, fullName);
        if (error) {
          setError(error.message);
        } else if (user && !user.confirmed_at) {
          setSuccessMessage("Account created! If email confirmation is enabled in your Supabase project, check your inbox.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card p-6 shadow-2xl transition-all sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl font-bold tracking-tight">
              <span className="text-primary">Innov</span>
              <span className="text-emerald-500">X</span>
            </span>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-2 py-0.5 font-medium">
              Creator Vault
            </span>
          </div>
          <h2 className="text-xl font-bold text-foreground">
            {tab === "signin" ? "Welcome back, Creator" : "Create your Creator Account"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Access your private innovation portfolio, saved reports, and provenance chains.
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex rounded-xl bg-muted p-1 mb-6">
          <button
            type="button"
            onClick={() => { setTab("signin"); setError(null); }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              tab === "signin"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab("signup"); setError(null); }}
            className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
              tab === "signup"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 mb-4 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive text-center font-medium">
            {error}
          </div>
        )}

        {/* Success message */}
        {successMessage && (
          <div className="p-3 mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 text-center font-medium">
            {successMessage}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === "signup" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Dr. Elena Vance"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Email Address
            </label>
            <input
              type="email"
              required
              placeholder="creator@innovx.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg shadow-sm transition-all"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
            ) : null}
            {tab === "signin" ? "Sign In to Vault" : "Create Creator Account"}
          </Button>
        </form>

        {/* Security badge */}
        <div className="mt-6 pt-4 border-t border-border/60 text-center flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span>Private by default • Protected by SHA-256 provenance</span>
        </div>
      </div>
    </div>
  );
}
