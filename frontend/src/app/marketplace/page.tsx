"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth-context";
import { AuthModal } from "@/components/auth-modal";
import {
  getPublicMarketplaceListings,
  getMyAccessRequests,
  type MarketplaceListingItem,
  type AccessRequestItem,
} from "@/lib/api";
import { MutualNdaModal } from "@/components/mutual-nda-modal";
import { ConfidentialDisclosureView } from "@/components/confidential-disclosure-view";
import { ListingMessagingDrawer } from "@/components/listing-messaging-drawer";

const DOMAINS = ["All", "Robotics", "Cryptography", "Healthcare", "Artificial Intelligence", "CleanTech", "IoT / Hardware"];

const STAGES = [
  { id: "all", label: "All Stages" },
  { id: "concept", label: "Concept" },
  { id: "detailed_design", label: "Detailed Design" },
  { id: "prototype", label: "Prototype" },
  { id: "mvp", label: "MVP" },
];

export default function MarketplacePage() {
  const { user, token, openAuthModal } = useAuth();
  const [listings, setListings] = useState<MarketplaceListingItem[]>([]);
  const [myRequests, setMyRequests] = useState<AccessRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("All");
  const [selectedStage, setSelectedStage] = useState("all");
  const [selectedModel, setSelectedModel] = useState("all");

  // Modals
  const [signingListing, setSigningListing] = useState<MarketplaceListingItem | null>(null);
  const [viewingListingId, setViewingListingId] = useState<string | null>(null);
  const [messagingListing, setMessagingListing] = useState<MarketplaceListingItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getPublicMarketplaceListings();
      setListings(res.listings || []);

      if (token) {
        const reqs = await getMyAccessRequests(token);
        setMyRequests(reqs.requests || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load marketplace listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  // Map access statuses by listing ID for quick button resolution
  const accessStatusByListing = useMemo(() => {
    const map: Record<string, "pending" | "approved" | "rejected"> = {};
    for (const r of myRequests) {
      map[r.listing_id] = r.status;
    }
    return map;
  }, [myRequests]);

  // Filter listings
  const filteredListings = useMemo(() => {
    return listings.filter((item) => {
      // Domain filter
      if (selectedDomain !== "All") {
        if (!item.domain?.toLowerCase().includes(selectedDomain.toLowerCase())) {
          return false;
        }
      }

      // Stage filter
      if (selectedStage !== "all" && item.stage !== selectedStage) {
        return false;
      }

      // Commercial model filter
      if (selectedModel !== "all" && !item.available_for?.includes(selectedModel)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const inTitle = item.public_title.toLowerCase().includes(q);
        const inDesc = item.public_description.toLowerCase().includes(q);
        const inDomain = item.domain?.toLowerCase().includes(q) ?? false;
        if (!inTitle && !inDesc && !inDomain) return false;
      }

      return true;
    });
  }, [listings, selectedDomain, selectedStage, selectedModel, searchQuery]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Navbar />
      <AuthModal />

      <main className="flex-1 pb-16">
        {/* Hero Section */}
        <div className="relative border-b border-border/60 bg-gradient-to-b from-card/80 to-background/50 py-12 px-6">
          <div className="max-w-6xl mx-auto space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full flex items-center gap-1.5">
                <span>🤝</span>
                Connect Pathway &bull; Rule 6 NDA Protected
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Confidential Technology Marketplace
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl leading-relaxed">
              Discover verified technical innovations available for patent licensing, corporate acquisition, and joint development. Detailed claim boundaries, schematics, and source data remain shielded behind a digital Mutual NDA.
            </p>
          </div>
        </div>

        {/* Catalog Body */}
        <div className="max-w-6xl mx-auto px-6 pt-8 space-y-6">
          {/* Toast Notification */}
          {toastMessage && (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400 flex items-center justify-between">
              <span>{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-muted-foreground hover:text-foreground font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search & Filters */}
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative max-w-xl">
              <svg
                className="absolute left-3.5 top-3 w-4 h-4 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search innovations by keyword, domain, or technology area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Domain Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {DOMAINS.map((dom) => (
                <button
                  key={dom}
                  type="button"
                  onClick={() => setSelectedDomain(dom)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-all font-medium ${
                    selectedDomain === dom
                      ? "bg-emerald-600 text-white font-semibold shadow-sm"
                      : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {dom}
                </button>
              ))}
            </div>

            {/* Secondary Filters: Stage & Commercial Model */}
            <div className="flex flex-wrap items-center gap-3 text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">Stage:</span>
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {STAGES.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground font-medium">Collaboration Model:</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="all">All Models</option>
                  <option value="license">Patent License</option>
                  <option value="sale">Outright Sale</option>
                  <option value="co_development">Co-Development</option>
                  <option value="investment">Strategic Investment</option>
                </select>
              </div>

              <span className="text-xs text-muted-foreground ml-auto">
                Showing {filteredListings.length} {filteredListings.length === 1 ? "listing" : "listings"}
              </span>
            </div>
          </div>

          {/* Listings Grid */}
          {loading ? (
            <div className="py-20 text-center text-xs text-muted-foreground space-y-2">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p>Loading confidential technology marketplace...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center text-xs text-destructive">
              <p>Failed to load listings: {error}</p>
              <Button size="sm" variant="outline" onClick={loadData} className="mt-3 text-xs">
                Retry
              </Button>
            </div>
          ) : filteredListings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card/20 space-y-3">
              <div className="text-3xl">🤝</div>
              <h3 className="text-base font-semibold text-foreground">
                No matching marketplace listings
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No active listings match your current search and filter criteria. Have a validated invention to showcase?
              </p>
              <Link href="/dashboard">
                <Button className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold mt-2">
                  List an Innovation from Vault
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredListings.map((item) => {
                const isCreator = user && item.creator_id === user.id;
                const status = accessStatusByListing[item.id];
                const isApproved = isCreator || status === "approved";
                const isPending = status === "pending";

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/80 hover:border-emerald-500/40 bg-card p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          {item.domain || "Technology"}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] uppercase font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            Stage: {item.stage?.replace("_", " ") || "Concept"}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-lg font-bold text-foreground leading-snug">
                        {item.public_title}
                      </h3>

                      {/* Sanitized Teaser Description */}
                      <p className="text-xs text-muted-foreground leading-relaxed mt-2 line-clamp-3">
                        {item.public_description}
                      </p>

                      {/* Rule 6 Gating Callout */}
                      <div className="mt-3.5 flex items-center gap-2 p-2.5 rounded-lg bg-background border border-border/60 text-[11px]">
                        <span className="text-emerald-400 text-sm">🔒</span>
                        <span className="text-muted-foreground">
                          <strong className="text-foreground">Confidentiality Shield:</strong> Full claim boundaries and
                          underlying code are protected under mutual NDA.
                        </span>
                      </div>
                    </div>

                    {/* Bottom Meta & Action */}
                    <div className="pt-3 border-t border-border/60 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex flex-wrap gap-1">
                          {item.available_for?.map((model) => (
                            <span
                              key={model}
                              className="capitalize text-[10px] bg-muted/60 text-foreground px-2 py-0.5 rounded font-medium"
                            >
                              {model.replace("_", " ")}
                            </span>
                          ))}
                        </div>

                        {item.preferred_terms && (
                          <span className="text-[11px] text-muted-foreground truncate max-w-[200px]" title={item.preferred_terms}>
                            Terms: <span className="text-foreground">{item.preferred_terms}</span>
                          </span>
                        )}
                      </div>

                      {/* Action Button */}
                      <div>
                        {isCreator ? (
                          <Link href="/dashboard" className="w-full block">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full text-xs font-medium border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            >
                              ✏️ You Own This Listing (Manage in Vault)
                            </Button>
                          </Link>
                        ) : isApproved ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => setViewingListingId(item.id)}
                              className="flex-1 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center justify-center gap-1.5"
                            >
                              🔓 Full Report
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setMessagingListing(item)}
                              className="text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1 shrink-0"
                            >
                              💬 Message
                            </Button>
                          </div>
                        ) : isPending ? (
                          <Button
                            disabled
                            size="sm"
                            variant="secondary"
                            className="w-full text-xs font-medium text-muted-foreground cursor-not-allowed"
                          >
                            ⏳ Access Request Pending Creator Approval
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => {
                              if (!token) {
                                openAuthModal();
                              } else {
                                setSigningListing(item);
                              }
                            }}
                            className="w-full text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center justify-center gap-1.5"
                          >
                            🤝 Request Confidential Access (Sign NDA)
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Mutual NDA Signing Modal */}
      {signingListing && token && (
        <MutualNdaModal
          listing={signingListing}
          token={token}
          onClose={() => setSigningListing(null)}
          onRequestSubmitted={async () => {
            setSigningListing(null);
            setToastMessage(`NDA signed! Access request sent to creator for "${signingListing.public_title}".`);
            await loadData();
          }}
        />
      )}

      {/* Full Confidential Disclosure Modal (NDA Approved) */}
      {viewingListingId && token && (
        <ConfidentialDisclosureView
          listingId={viewingListingId}
          token={token}
          onClose={() => setViewingListingId(null)}
        />
      )}

      {/* Messaging Drawer */}
      {messagingListing && token && (
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

