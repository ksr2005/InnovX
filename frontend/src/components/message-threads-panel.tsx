"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getUserMessageThreads,
  type MessageThreadItem,
} from "@/lib/api";
import { ListingMessagingDrawer } from "@/components/listing-messaging-drawer";

interface MessageThreadsPanelProps {
  token: string;
}

export function MessageThreadsPanel({ token }: MessageThreadsPanelProps) {
  const [threads, setThreads] = useState<MessageThreadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeThread, setActiveThread] = useState<MessageThreadItem | null>(null);

  const fetchThreads = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getUserMessageThreads(token);
      setThreads(res.threads || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load message threads");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreads();
  }, [token]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/40 pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground">Confidential Message Threads</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Encrypted negotiation threads with verified partners, protected under executed Mutual NDAs.
          </p>
        </div>
        <button
          onClick={fetchThreads}
          disabled={loading}
          className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors text-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Threads
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
          {error}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs text-muted-foreground">Loading your confidential conversations...</p>
        </div>
      )}

      {!loading && threads.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-border/80 rounded-2xl bg-card/30 p-8">
          <div className="w-12 h-12 rounded-2xl bg-muted/40 border border-border/80 flex items-center justify-center text-xl mb-3">
            💬
          </div>
          <h4 className="text-base font-semibold text-foreground mb-1">No Active Message Threads</h4>
          <p className="text-xs text-muted-foreground max-w-md leading-relaxed mb-6">
            You do not have any active message threads yet. When prospective licensees request access or creators approve your NDA requests, conversations will appear here.
          </p>
          <Link href="/marketplace">
            <Button variant="outline" size="sm" className="text-xs">
              Explore Connect Marketplace →
            </Button>
          </Link>
        </div>
      )}

      {!loading && threads.length > 0 && (
        <div className="divide-y divide-border/60 border border-border/80 rounded-xl overflow-hidden bg-card">
          {threads.map((t) => (
            <div
              key={`${t.listing_id}-${t.partner_id}`}
              onClick={() => setActiveThread(t)}
              className="p-4 sm:p-5 hover:bg-muted/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0 flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 font-bold text-sm">
                  {t.partner_name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {t.partner_name}
                    </span>
                    <span className="text-[10px] bg-muted/80 text-foreground px-2 py-0.5 rounded-full font-medium shrink-0 capitalize">
                      {t.partner_role}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-emerald-400/90 truncate mb-1">
                    Re: {t.listing_title}
                  </p>
                  <p className="text-xs text-muted-foreground truncate max-w-md sm:max-w-lg">
                    {t.last_message}
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  {t.last_message_at ? new Date(t.last_message_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}
                </span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
                  {t.message_count} message{t.message_count > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Messaging Drawer */}
      {activeThread && (
        <ListingMessagingDrawer
          isOpen={!!activeThread}
          onClose={() => setActiveThread(null)}
          listingId={activeThread.listing_id}
          listingTitle={activeThread.listing_title}
          partnerId={activeThread.partner_id}
          partnerName={activeThread.partner_name}
          token={token}
          isCreator={activeThread.partner_role === "buyer"}
        />
      )}
    </div>
  );
}
