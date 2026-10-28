"use client";

import { useState } from "react";
import type { StructuredIdea } from "@/lib/api";

interface ArchitectureDiagramProps {
  structuredIdea: StructuredIdea;
}

export function ArchitectureDiagram({ structuredIdea }: ArchitectureDiagramProps) {
  const [viewMode, setViewMode] = useState<"visual" | "code">("visual");
  const [copied, setCopied] = useState(false);

  const mermaidCode =
    structuredIdea.architecture_diagram_mermaid ||
    `graph TD
  Inputs[${structuredIdea.technical_components.hardware[0] || "Sensor Ingestion Array"}] --> Engine[${structuredIdea.technical_components.software[0] || "Core Algorithmic Pipeline"}]
  Engine --> Method[${structuredIdea.technical_components.methods[0] || "Processing & Inference Logic"}]
  Method --> Outputs[Actuation & Telemetry Transmission]`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hw = structuredIdea.technical_components.hardware;
  const sw = structuredIdea.technical_components.software;
  const methods = structuredIdea.technical_components.methods;

  return (
    <div className="w-full rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-5 sm:p-6 shadow-xl space-y-5">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">📐</span>
            <h3 className="text-base sm:text-lg font-bold text-foreground">
              Automated System Architecture &amp; Dataflow Schematic
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              USPTO § 113 Ready
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Structural decomposition modeling physical sensors, compute engines, and data flow pipelines.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center rounded-xl border border-border/80 bg-muted/30 p-1">
            <button
              type="button"
              onClick={() => setViewMode("visual")}
              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === "visual"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              📊 Visual Flow
            </button>
            <button
              type="button"
              onClick={() => setViewMode("code")}
              className={`text-xs font-semibold px-3 py-1 rounded-lg transition-all cursor-pointer ${
                viewMode === "code"
                  ? "bg-cyan-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              💻 Mermaid Code
            </button>
          </div>

          {/* Copy Button */}
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl border border-border/80 hover:bg-muted text-xs font-semibold text-foreground flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <span>{copied ? "✓" : "📋"}</span>
            <span>{copied ? "Copied" : "Copy Mermaid"}</span>
          </button>
        </div>
      </div>

      {/* Main Canvas / Schematic View */}
      {viewMode === "visual" ? (
        <div className="space-y-4">
          {/* Visual Architecture Pipeline Blocks */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Tier 1: Ingestion & Physical Layer */}
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-gradient-to-b from-cyan-950/20 via-card to-background space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                  Layer 1: Ingestion
                </span>
                <span className="text-lg">📡</span>
              </div>
              <h4 className="text-xs font-bold text-foreground">Sensors &amp; Hardware Inputs</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {hw && hw.length > 0 ? (
                  hw.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-cyan-400 font-bold shrink-0">&bull;</span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground italic">Input transducers &amp; environmental receivers</li>
                )}
              </ul>
            </div>

            {/* Tier 2: Compute Core & Algorithms */}
            <div className="p-4 rounded-xl border border-purple-500/30 bg-gradient-to-b from-purple-950/20 via-card to-background space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                  Layer 2: Compute Engine
                </span>
                <span className="text-lg">🧠</span>
              </div>
              <h4 className="text-xs font-bold text-foreground">Algorithms &amp; Edge Processing</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {sw && sw.length > 0 ? (
                  sw.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-purple-400 font-bold shrink-0">&bull;</span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground italic">Edge neural model &amp; signal transformation pipeline</li>
                )}
              </ul>
            </div>

            {/* Tier 3: Outputs, Control & Telemetry */}
            <div className="p-4 rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-950/20 via-card to-background space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  Layer 3: Outputs &amp; Hub
                </span>
                <span className="text-lg">⚡</span>
              </div>
              <h4 className="text-xs font-bold text-foreground">Actuation, Telemetry &amp; Vault</h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                {methods && methods.length > 0 ? (
                  methods.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-emerald-400 font-bold shrink-0">&bull;</span>
                      <span className="leading-snug">{item}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-muted-foreground italic">Closed-loop controller &amp; SCADA telemetry broadcast</li>
                )}
              </ul>
            </div>
          </div>

          {/* Connective Dataflow Pipe Banner */}
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl border border-border/60 bg-muted/20 text-xs font-mono text-muted-foreground">
            <span className="text-cyan-400 font-semibold">Inputs / Environmental Telemetry</span>
            <span>&rarr;</span>
            <span className="text-purple-400 font-semibold">Real-Time Algorithmic Core</span>
            <span>&rarr;</span>
            <span className="text-emerald-400 font-semibold">Actuation &amp; Secure Cloud Vault</span>
          </div>
        </div>
      ) : (
        /* Mermaid Code Display */
        <div className="rounded-xl border border-border/80 bg-black/60 p-4 overflow-x-auto">
          <pre className="text-xs font-mono text-emerald-400 leading-relaxed">
            {mermaidCode}
          </pre>
        </div>
      )}

      {/* Patent Drawing Statutory Footer */}
      <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground pt-1 border-t border-border/40">
        <span className="flex items-center gap-1.5">
          <span className="text-emerald-400">✓</span>
          <span>Mermaid.js vector definition compatible with USPTO patent figures &amp; IEEE papers</span>
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="text-cyan-400 hover:text-cyan-300 font-semibold hover:underline cursor-pointer"
        >
          Copy to Clipboard →
        </button>
      </div>
    </div>
  );
}
