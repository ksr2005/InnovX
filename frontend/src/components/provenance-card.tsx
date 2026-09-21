"use client";

import type { ProvenanceRecord } from "@/lib/api";

interface ProvenanceCardProps {
  provenance: ProvenanceRecord;
}

export function ProvenanceCard({ provenance }: ProvenanceCardProps) {
  return (
    <div className="border border-border rounded-lg p-6 bg-card">
      <h3 className="text-sm font-semibold text-muted-foreground mb-4">
        🔐 Cryptographic Proof of Existence
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Innovation ID</p>
          <p className="text-sm font-mono">{provenance.innovation_id}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Version</p>
          <p className="text-sm font-mono">v{provenance.version}</p>
        </div>
        <div className="md:col-span-2">
          <p className="text-xs text-muted-foreground mb-1">SHA-256 Document Hash</p>
          <p className="text-sm font-mono break-all text-emerald-500">
            {provenance.document_hash}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Timestamp</p>
          <p className="text-sm font-mono">
            {new Date(provenance.created_at).toISOString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Previous Hash</p>
          <p className="text-sm font-mono text-muted-foreground">
            {provenance.previous_hash || "None (Genesis Record)"}
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-4 border-t border-border pt-3">
        This cryptographic fingerprint proves this exact version of your innovation document 
        existed at the recorded timestamp. It is not a patent and does not confer legal ownership.
      </p>
    </div>
  );
}
