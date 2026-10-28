"use client";

import { useState } from "react";
import Link from "next/link";
import {
  analyzeIdea,
  downloadReportPdf,
  saveInnovation,
  GuardrailError,
  type AnalysisResponse,
  type GuardrailValidationResponse,
} from "@/lib/api";
import { IdeaInput } from "@/components/idea-input";
import { FeatureMatrix } from "@/components/feature-matrix";
import { AssessmentView } from "@/components/assessment-view";
import { ProvenanceCard } from "@/components/provenance-card";
import { DecisionHub } from "@/components/decision-hub";
import { Navbar } from "@/components/navbar";
import { AuthModal } from "@/components/auth-modal";
import { HowItWorks } from "@/components/how-it-works";
import { LegalTransparency } from "@/components/legal-transparency";
import { GuardrailFeedbackCard } from "@/components/guardrail-feedback-card";
import { PriorArtRadar } from "@/components/prior-art-radar";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { GrantMatcherCard } from "@/components/grant-matcher-card";
import { PatentComparatorModal } from "@/components/patent-comparator-modal";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { SAMPLE_INNOVATION_REPORT } from "@/data/sample-report";

export default function Home() {
  const { user, token, openAuthModal } = useAuth();
  const [result, setResult] = useState<AnalysisResponse | null>(null);
  const [rawText, setRawText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isSampleTour, setIsSampleTour] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guardrailFeedback, setGuardrailFeedback] = useState<GuardrailValidationResponse | null>(null);
  const [presetText, setPresetText] = useState<string>("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [showComparatorModal, setShowComparatorModal] = useState(false);

  const handleAnalyze = async (text: string) => {
    setLoading(true);
    setError(null);
    setGuardrailFeedback(null);
    setResult(null);
    setIsSampleTour(false);
    setRawText(text);
    setSavedSuccess(false);
    setSaveError(null);

    try {
      const response = await analyzeIdea(text);
      setResult(response);
      if (response.guardrail_result && !response.guardrail_result.is_valid) {
        setGuardrailFeedback(response.guardrail_result);
      }
    } catch (err) {
      if (err instanceof GuardrailError) {
        setGuardrailFeedback(err.guardrail);
      } else {
        setError(err instanceof Error ? err.message : "Analysis failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };


  const handleExploreSample = () => {
    setIsSampleTour(true);
    setResult(SAMPLE_INNOVATION_REPORT);
    setRawText(SAMPLE_INNOVATION_REPORT.structured_idea.problem_statement + " " + SAMPLE_INNOVATION_REPORT.structured_idea.proposed_solution);
    setError(null);
    window.scrollTo({ top: 400, behavior: "smooth" });
  };

  const handleCloseSample = () => {
    setIsSampleTour(false);
    setResult(null);
    setRawText("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDownloadPdf = async (innovationId: string) => {
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      await downloadReportPdf(innovationId);
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : "Failed to download PDF report");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleSaveToPortfolio = async () => {
    if (!user || !token) {
      openAuthModal();
      return;
    }
    if (!result) return;

    setSaving(true);
    setSaveError(null);
    try {
      await saveInnovation(
        {
          id: result.innovation_id,
          title: result.structured_idea.title,
          raw_input: rawText,
          structured_data: result.structured_idea,
          scores: result.scores || undefined,
          assessment_summary: result.assessment_summary || undefined,
          report: result.report || undefined,
          provenance: result.provenance,
          feature_matrix: result.feature_matrix,
        },
        token
      );
      setSavedSuccess(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save innovation to vault");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-emerald-500/30">
      <Navbar />
      <AuthModal />

      <main className="flex-1 mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 w-full space-y-16">
        {/* ── HERO SECTION (Subtask 24-1) ── */}
        {!result && !loading && (
          <div className="text-center space-y-6 pt-4 sm:pt-8 animate-in fade-in duration-500">
            {/* Top Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Next-Generation AI Innovation Engine &bull; Week 4 Live</span>
            </div>

            {/* Bold Headline */}
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
              Discover what exists.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Find what makes your idea different.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Decompose your technical concept into features, triangulate across <b>250M+ academic papers</b>, 
              <b>arXiv preprints</b>, and <b>USPTO patents</b> with zero hallucination, and get 4 execution pathways: 
              <b>Protect</b> &bull; <b>Share</b> &bull; <b>Connect</b> &bull; <b>Build</b>.
            </p>
          </div>
        )}

        {/* ── IDEA INPUT OR SAMPLE TOUR TRIGGER ── */}
        <div className="space-y-4">
          <IdeaInput
            onSubmit={handleAnalyze}
            isLoading={loading}
            onExploreSample={!result ? handleExploreSample : undefined}
            presetText={presetText}
          />

          {/* Edge-Case & Guardrail Feedback Card (Subtask 25-2) */}
          {guardrailFeedback && (
            <GuardrailFeedbackCard
              feedback={guardrailFeedback}
              onApplyTemplate={(template) => {
                setPresetText(template);
                setGuardrailFeedback(null);
              }}
              onDismiss={() => setGuardrailFeedback(null)}
            />
          )}

          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-center text-xs font-medium animate-in fade-in">
              {error}
            </div>
          )}
        </div>


        {/* ── HOW IT WORKS SECTION (Subtask 24-2) ── */}
        {!result && !loading && <HowItWorks />}

        {/* ── ANALYSIS / SAMPLE REPORT RESULTS ── */}
        {result && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Sample Tour Notification Banner (Subtask 24-3) */}
            {isSampleTour && (
              <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-card to-background p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                    🧪
                  </span>
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
                      <span>Interactive Sample Report Tour Active</span>
                      <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-semibold">
                        Demo Mode
                      </span>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Explore the live Feature Matrix, verified evidence excerpts, 6 assessment metrics, and post-report commercialization pathways.
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCloseSample}
                  className="h-8 text-xs border-amber-500/40 text-amber-300 hover:bg-amber-500/15 shrink-0"
                >
                  ✕ Close Tour &amp; Analyze My Idea
                </Button>
              </div>
            )}

            {/* Innovation Header Card */}
            <div className="border border-border/80 rounded-2xl p-6 sm:p-7 bg-card shadow-sm space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs text-muted-foreground font-mono">
                      Innovation #{result.innovation_id.slice(0, 8)}
                    </span>
                    {isSampleTour && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 rounded uppercase">
                        Sample Preview
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                    {result.structured_idea.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-emerald-400 mt-1">
                    {result.structured_idea.domain}
                  </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {/* Save to Portfolio */}
                  <Button
                    onClick={handleSaveToPortfolio}
                    disabled={saving || savedSuccess}
                    variant={savedSuccess ? "outline" : "secondary"}
                    className={
                      savedSuccess
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-medium text-xs h-9"
                        : "font-medium text-xs h-9"
                    }
                  >
                    {saving ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Saving to Vault...
                      </>
                    ) : savedSuccess ? (
                      <>
                        <span className="mr-1.5 text-emerald-400 font-bold">✓</span>
                        Saved to Vault
                      </>
                    ) : (
                      <>
                        <span className="mr-1.5">🔒</span>
                        Save to Private Vault
                      </>
                    )}
                  </Button>

                  {/* Compare Against Competitor Patent Button (Day 35) */}
                  <Button
                    onClick={() => setShowComparatorModal(true)}
                    variant="outline"
                    className="border-cyan-500/40 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-medium text-xs h-9 cursor-pointer"
                  >
                    <span className="mr-1.5">⚖️</span>
                    Compare Competitor Patent
                  </Button>

                  {/* Download PDF */}
                  <Button
                    onClick={() => handleDownloadPdf(result.innovation_id)}
                    disabled={downloadingPdf}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-9 shadow-sm transition-all"
                  >
                    {downloadingPdf ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <span className="mr-1.5">📄</span>
                        Download PDF Report
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {saveError && (
                <p className="text-xs text-destructive font-medium">{saveError}</p>
              )}
              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center justify-between">
                  <span>✓ Stored in your private cryptographic vault.</span>
                  <Link href="/dashboard" className="font-semibold underline hover:text-emerald-300">
                    Open in Creator Dashboard →
                  </Link>
                </div>
              )}
              {pdfError && (
                <p className="text-xs text-destructive font-medium">{pdfError}</p>
              )}

              {/* Problem / Solution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-border/40">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Problem Statement
                  </h4>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {result.structured_idea.problem_statement}
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Proposed Technical Solution
                  </h4>
                  <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                    {result.structured_idea.proposed_solution}
                  </p>
                </div>
              </div>
            </div>

            {/* Feature Matrix Breakdown */}
            <FeatureMatrix matrix={result.feature_matrix} />

            {/* Automated System Architecture Diagram (Day 33) */}
            <ArchitectureDiagram structuredIdea={result.structured_idea} />

            {/* Interactive Prior-Art Proximity Landscape & Novelty Opportunity Radar (Day 32) */}
            <PriorArtRadar
              featureMatrix={result.feature_matrix}
              innovationTitle={result.structured_idea.title}
            />

            {/* Assessment Scores */}
            {result.scores && result.assessment_summary && (
              <AssessmentView scores={result.scores} summary={result.assessment_summary} />
            )}

            {/* Cryptographic Provenance Record */}
            <ProvenanceCard provenance={result.provenance} />

            {/* Post-Report Decision Hub (The 4 Pathways) */}
            <div className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                  Post-Report Decision Hub
                </span>
                <h3 className="text-xl font-bold text-foreground">
                  What Do You Want To Do With This Innovation?
                </h3>
                <p className="text-xs text-muted-foreground max-w-xl mx-auto">
                  Select your commercialization strategy below to generate provisional patent drafts, defensive publications, NDA marketplace listings, or crowdfunding campaigns.
                </p>
              </div>

              <DecisionHub innovationId={result.innovation_id} />
            </div>

            {/* US SBIR/STTR Federal Grant & Venture Capital Matcher (Day 34) */}
            <GrantMatcherCard structuredIdea={result.structured_idea} />

            {/* Search Limitations */}
            <div className="border border-border/60 rounded-xl p-5 bg-card/60 space-y-2 text-xs">
              <h4 className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️</span>
                <span>Search Confidence &amp; Limitations Notice</span>
              </h4>
              <ul className="space-y-1 text-muted-foreground">
                {result.feature_matrix.limitations.map((limitation, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-amber-400 font-bold">&bull;</span>
                    <span>{limitation}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ── LEGAL TRANSPARENCY & STATUTORY DISCLAIMERS (Subtask 24-4) ── */}
        <LegalTransparency />

        {/* ── CLAIM-BY-CLAIM COMPETITOR PATENT COMPARATOR MODAL (Day 35) ── */}
        {result && (
          <PatentComparatorModal
            structuredIdea={result.structured_idea}
            isOpen={showComparatorModal}
            onClose={() => setShowComparatorModal(false)}
          />
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/60 bg-card/40 py-8 text-center text-xs text-muted-foreground space-y-2">
        <p className="font-medium text-foreground/80">
          InnovX &bull; AI-Powered Innovation Discovery, Validation &amp; Commercialization Engine
        </p>
        <p className="max-w-xl mx-auto text-[11px] leading-relaxed">
          Evidence-based prior-art triangulation across OpenAlex, arXiv, and USPTO PatentsView. 
          Private by default. SHA-256 cryptographic provenance.
        </p>
      </footer>
    </div>
  );
}
