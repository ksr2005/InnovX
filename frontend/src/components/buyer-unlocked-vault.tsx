"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getBuyerUnlockedListings,
  type MarketplaceListingItem,
} from "@/lib/api";
import { ConfidentialDisclosureView } from "@/components/confidential-disclosure-view";
import { ListingMessagingDrawer } from "@/components/listing-messaging-drawer";

interface BuyerUnlockedVaultProps {
  token: string;
}

export function BuyerUnlockedVault({ token }: BuyerUnlockedVaultProps) {
  const [unlockedListings, setUnlockedListings] = useState<MarketplaceListingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Drawer state
  const [viewingListingId, setViewingListingId] = useState<string | null>(null);
  const [messagingListing, setMessagingListing] = useState<MarketplaceListingItem | null>(null);

  const fetchUnlocked = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getBuyerUnlockedListings(token);
      setUnlockedListings(res.listings || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load unlocked innovations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnlocked();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Interested Party / Buyer Vault</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Innovations you have unlocked under digitally executed Mutual Non-Disclosure Agreements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchUnlocked}
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
              Explore More Innovations →
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
          <p className="text-xs text-muted-foreground">Loading your unlocked confidential portfolio...</p>
        </div>
      )}

      {!loading && unlockedListings.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/80 rounded-2xl bg-card/30 p-8">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-center text-xl mb-3">
            🔓
          </div>
          <h4 className="text-base font-semibold text-foreground mb-1">No Unlocked Innovations</h4>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed mb-6">
            You haven&apos;t executed NDAs or been authorized for any marketplace innovations yet. Visit the Connect Marketplace to discover emerging deep-tech and request access.
          </p>
          <Link href="/marketplace">
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs px-4 py-2">
              Browse Connect Marketplace
            </Button>
          </Link>
        </div>
      )}

      {!loading && unlockedListings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {unlockedListings.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-emerald-500/30 bg-card p-5 hover:border-emerald-500/60 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] font-mono uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold">
                    {item.domain || "Technology"}
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <span>🔒</span> Mutual NDA Active
                  </span>
                </div>

                <h4 className="font-semibold text-base text-foreground mb-1 leading-snug">
                  {item.public_title}
                </h4>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {item.public_description}
                </p>

                <div className="text-[11px] text-muted-foreground mb-4">
                  Creator: <span className="text-foreground font-medium">{item.creator_name || "InnovX Creator"}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 border-t border-border/60">
                <Button
                  size="sm"
                  onClick={() => setViewingListingId(item.id)}
                  className="flex-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center justify-center gap-1.5"
                >
                  <span>🔓 View Full Report</span>
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMessagingListing(item)}
                  className="text-xs flex items-center gap-1.5 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <span>💬 Message Creator</span>
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confidential Full Disclosure Modal */}
      {viewingListingId && (
        <ConfidentialDisclosureView
          listingId={viewingListingId}
          token={token}
          onClose={() => setViewingListingId(null)}
        />
      )}

      {/* Messaging Drawer */}
      {messagingListing && (
        <ListingMessagingDrawer
          isOpen={!!messagingListing}
          onClose={() => setMessagingListing(null)}
          listingId={messagingListing.id}
          listingTitle={messagingListing.public_title}
          partnerName={messagingListing.creator_name || "Innovation Creator"}
          token={token}
          isCreator={false}
        />
      )}
    </div>
  );
}
