"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  getIncomingAccessRequests,
  reviewAccessRequest,
  type AccessRequestItem,
} from "@/lib/api";
import { ListingMessagingDrawer } from "@/components/listing-messaging-drawer";

interface InboundAccessRequestsProps {
  token: string;
  onRequestCountChange?: (count: number) => void;
}

export function InboundAccessRequests({
  token,
  onRequestCountChange,
}: InboundAccessRequestsProps) {
  const [requests, setRequests] = useState<AccessRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [messagingRequest, setMessagingRequest] = useState<AccessRequestItem | null>(null);


  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getIncomingAccessRequests(token);
      setRequests(res.requests || []);
      const pendingCount = (res.requests || []).filter((r) => r.status === "pending").length;
      if (onRequestCountChange) onRequestCountChange(pendingCount);
    } catch (err: any) {
      setError(err.message || "Failed to load inbound access requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [token]);

  const handleReview = async (requestId: string, action: "approve" | "reject") => {
    try {
      setActionInProgress(requestId);
      setError(null);
      const updated = await reviewAccessRequest(requestId, action, token);
      setRequests((prev) => prev.map((r) => (r.id === requestId ? updated : r)));
      const pendingCount = requests
        .map((r) => (r.id === requestId ? updated : r))
        .filter((r) => r.status === "pending").length;
      if (onRequestCountChange) onRequestCountChange(pendingCount);
    } catch (err: any) {
      setError(err.message || "Failed to update access request");
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between border-b border-border/60 pb-3">
        <div>
          <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
            <span>📬</span>
            <span>Inbound NDA Access Requests</span>
          </h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Review prospective buyers and corporate licensees requesting full technical disclosure under signed Mutual NDA.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={loadRequests}
          disabled={loading}
          className="text-xs h-7"
        >
          {loading ? "Refreshing..." : "↻ Refresh"}
        </Button>
      </div>

      {error && (
        <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          Loading inbound requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 p-8 text-center bg-card/20 text-xs text-muted-foreground">
          <span className="text-2xl block mb-2">🤝</span>
          No inbound access requests yet. When buyers on the marketplace sign a Mutual NDA for your listings, their requests will appear here for your approval.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const isPending = req.status === "pending";
            const isApproved = req.status === "approved";
            const isRejected = req.status === "rejected";

            return (
              <div
                key={req.id}
                className="rounded-xl border border-border/80 bg-card p-4 space-y-3 shadow-sm hover:border-emerald-500/30 transition-all text-xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2.5">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide block">
                      Requested Listing:
                    </span>
                    <span className="font-bold text-foreground text-sm">
                      {req.listing_title || "Marketplace Listing"}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                      isPending
                        ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                        : isApproved
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        : "bg-destructive/10 text-destructive border border-destructive/30"
                    }`}
                  >
                    {isPending ? "⏳ Pending Review" : isApproved ? "✅ Access Granted" : "❌ Request Declined"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Requestor:</span>
                    <span className="font-medium text-foreground">{req.requestor_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">NDA Status:</span>
                    <span className="text-emerald-400 font-medium">✓ Digitally Executed</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Signed At:</span>
                    <span className="text-foreground">
                      {req.nda_accepted_at
                        ? new Date(req.nda_accepted_at).toLocaleDateString()
                        : new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {isPending && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleReview(req.id, "reject")}
                      disabled={actionInProgress === req.id}
                      className="text-xs h-7 text-destructive hover:bg-destructive/10"
                    >
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleReview(req.id, "approve")}
                      disabled={actionInProgress === req.id}
                      className="text-xs h-7 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                    >
                      {actionInProgress === req.id ? "Updating..." : "✅ Authorize Uncensored Access"}
                    </Button>
                  </div>
                )}

                {!isPending && req.status === "approved" && (
                  <div className="pt-2 flex items-center justify-end gap-2 border-t border-border/40">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setMessagingRequest(req)}
                      className="text-xs h-7 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 flex items-center gap-1.5"
                    >
                      <span>💬 Message {req.requestor_name || "Requestor"}</span>
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Messaging Drawer */}
      {messagingRequest && (
        <ListingMessagingDrawer
          isOpen={!!messagingRequest}
          onClose={() => setMessagingRequest(null)}
          listingId={messagingRequest.listing_id}
          listingTitle={messagingRequest.listing_title || "Marketplace Listing"}
          partnerId={messagingRequest.requestor_id}
          partnerName={messagingRequest.requestor_name || "Prospective Licensee"}
          token={token}
          isCreator={true}
        />
      )}
    </div>
  );
}

