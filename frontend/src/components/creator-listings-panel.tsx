"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getCreatorListingsSummary,
  type CreatorListingSummaryItem,
} from "@/lib/api";
import { ListingMessagingDrawer } from "@/components/listing-messaging-drawer";

interface CreatorListingsPanelProps {
  token: string;
  onNavigateToRequests: () => void;
}

export function CreatorListingsPanel({
  token,
  onNavigateToRequests,
}: CreatorListingsPanelProps) {
  const [listings, setListings] = useState<CreatorListingSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Messaging drawer state
  const [activeMessagingListing, setActiveMessagingListing] = useState<CreatorListingSummaryItem | null>(null);

  const fetchListings = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getCreatorListingsSummary(token);
      setListings(res.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load creator listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Marketplace Listings</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your AI-sanitized public teasers, monitor prospective licensee interest, and exchange confidential messages.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchListings}
            disabled={loading}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors text-xs flex items-center gap-1.5"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          <Link href="/marketplace">
            <Button variant="outline" size="sm" className="text-xs">
              View Public Catalog →
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-muted-foreground">Loading your marketplace listings...</p>
        </div>
      )}

      {!loading && listings.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/80 rounded-2xl bg-card/30 p-8">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xl mb-3">
            🏪
          </div>
          <h4 className="text-base font-semibold text-foreground mb-1">No Active Marketplace Listings</h4>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed mb-6">
            You haven&apos;t listed any innovations on the Connect marketplace yet. Go to your portfolio, select an innovation, and choose the <strong>Connect</strong> path to draft an AI-sanitized teaser.
          </p>
        </div>
      )}

      {!loading && listings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {listings.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/80 bg-card p-5 hover:border-emerald-500/40 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                    {item.domain || "Technology"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Listed {item.created_at ? new Date(item.created_at).toLocaleDateString() : ""}
                  </span>
                </div>

                <h4 className="font-semibold text-base text-foreground mb-1.5 leading-snug">
                  {item.public_title}
                </h4>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  <span className="capitalize text-[10px] bg-muted/60 text-foreground px-2 py-0.5 rounded font-medium">
                    Stage: {item.stage || "Concept"}
                  </span>
                  {item.available_for?.map((m) => (
                    <span
                      key={m}
                      className="capitalize text-[10px] bg-muted/40 text-muted-foreground px-2 py-0.5 rounded font-medium"
                    >
                      {m.replace("_", " ")}
                    </span>
                  ))}
                </div>

                {/* Metrics Stats */}
                <div className="grid grid-cols-3 gap-2 p-3 rounded-lg bg-background/80 border border-border/60 text-center mb-4">
                  <div>
                    <div className="text-base font-bold text-amber-400">
                      {item.pending_requests_count}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Pending</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-emerald-400">
                      {item.approved_requests_count}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Approved</div>
                  </div>
                  <div>
                    <div className="text-base font-bold text-foreground">
                      {item.messages_count}
                    </div>
                    <div className="text-[10px] text-muted-foreground">Messages</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-2 border-t border-border/60">
                {item.pending_requests_count > 0 ? (
                  <Button
                    size="sm"
                    onClick={onNavigateToRequests}
                    className="flex-1 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-black shadow-sm"
                  >
                    ⚡ Review {item.pending_requests_count} Request{item.pending_requests_count > 1 ? "s" : ""}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onNavigateToRequests}
                    className="flex-1 text-xs"
                  >
                    View Access
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveMessagingListing(item)}
                  className="text-xs flex items-center gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <span>💬 Messages</span>
                  {item.messages_count > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500 text-black text-[10px] font-bold flex items-center justify-center">
                      {item.messages_count}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messaging Drawer */}
      {activeMessagingListing && (
        <ListingMessagingDrawer
          isOpen={!!activeMessagingListing}
          onClose={() => setActiveMessagingListing(null)}
          listingId={activeMessagingListing.id}
          listingTitle={activeMessagingListing.public_title}
          token={token}
          isCreator={true}
        />
      )}
    </div>
  );
}
