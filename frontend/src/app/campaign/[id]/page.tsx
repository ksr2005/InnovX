"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Navbar } from "@/components/navbar";
import { AuthModal } from "@/components/auth-modal";
import { CampaignGeneratorView } from "@/components/campaign-generator-view";

export default function CampaignDetailPage() {
  const params = useParams();
  const innovationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { user, token, loading: authLoading, openAuthModal } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <AuthModal />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
          >
            <span>←</span>
            <span>Back to Creator Vault &amp; Dashboard</span>
          </Link>

          <span className="text-[11px] font-mono text-muted-foreground bg-card border border-border/60 px-3 py-1 rounded-full">
            Project ID: {innovationId}
          </span>
        </div>

        {/* Unauthenticated View */}
        {!authLoading && !user && (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto space-y-4">
            <span className="text-4xl">🔐</span>
            <h2 className="text-xl font-bold text-foreground">Sign In to View Campaign</h2>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Crowdfunding campaigns are confidential to the innovation creator until publicly published.
            </p>
            <button
              onClick={openAuthModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
            >
              Sign In to Access Campaign
            </button>
          </div>
        )}

        {/* Active Campaign Builder View */}
        {user && token && innovationId && (
          <CampaignGeneratorView
            innovationId={innovationId}
            token={token}
          />
        )}
      </main>
    </div>
  );
}
