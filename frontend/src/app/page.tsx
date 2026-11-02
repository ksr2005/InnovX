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
import { GuardrailFeedbackCard } from "@/components/guardrail-feedback-card";
import { PriorArtRadar } from "@/components/prior-art-radar";
import { ArchitectureDiagram } from "@/components/architecture-diagram";
import { GrantMatcherCard } from "@/components/grant-matcher-card";
import { PatentComparatorModal } from "@/components/patent-comparator-modal";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { SAMPLE_INNOVATION_REPORT } from "@/data/sample-report";
import {
  FileText,
  Search,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  BarChart3,
  Compass,
  Cpu,
  Lock,
  ExternalLink,
} from "lucide-react";

type ResultTab = "evidence" | "radar" | "assessment" | "pathways" | "all";

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
  const [activeTab, setActiveTab] = useState<ResultTab>("evidence");

  const handleAnalyze = async (text: string) => {
    setLoading(true);
    setError(null);
    setGuardrailFeedback(null);
    setResult(null);
    setIsSampleTour(false);
    setRawText(text);
    setSavedSuccess(false);
    setSaveError(null);
    setActiveTab("evidence");

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
    setRawText(
      SAMPLE_INNOVATION_REPORT.structured_idea.problem_statement +
        " " +
        SAMPLE_INNOVATION_REPORT.structured_idea.proposed_solution
    );
    setError(null);
    setActiveTab("evidence");
    window.scrollTo({ top: 380, behavior: "smooth" });
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

      <main className="flex-1 mx-auto max-w-6xl px-4 sm:px-6 py-8 sm:py-12 w-full space-y-12">
        {/* ── MINIMAL HERO SECTION ── */}
        {!result && !loading && (
          <div className="text-center space-y-5 pt-4 sm:pt-6 animate-in fade-in duration-500">
            {/* Top Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs font-semibold shadow-sm">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI Innovation Discovery &amp; Commercialization Engine</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight max-w-3xl mx-auto leading-tight">
              Discover what exists.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400">
                Find what makes your idea different.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm text-muted-foreground max-w-xl mx-auto leading-relaxed">
              Deconstruct your technical concept into features, cross-reference <b>250M+ academic works &amp; patents</b> with
              zero hallucination, and get 4 post-validation execution paths: <b>Protect &bull; Share &bull; Connect &bull; Build</b>.
            </p>
          </div>
        )}

        {/* ── INPUT INTERFACE ── */}
        <div className="space-y-4">
          <IdeaInput
            onSubmit={handleAnalyze}
            isLoading={loading}
            onExploreSample={!result ? handleExploreSample : undefined}
            presetText={presetText}
          />

          {/* Guardrail Feedback Card */}
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

        {/* ── MINIMAL 3-CARD HIGHLIGHT BAR (Only when idle) ── */}
        {!result && !loading && (
          <div className="space-y-6 pt-2 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-card/60 border border-border/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Multi-Corpus Triangulation</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Searches OpenAlex, arXiv, and USPTO PatentsView simultaneously without walled gardens.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card/60 border border-border/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Zero-Hallucination Evidence</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Every finding is backed by verbatim quotes from authentic papers with clickable DOI links.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-card/60 border border-border/80 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-foreground">Private by Default</h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                    Cryptographic SHA-256 provenance chains. Your innovation is never made public without your explicit consent.
                  </p>
                </div>
              </div>
            </div>

            <div className="text-center pt-2">
              <Link
                href="/about"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-emerald-400 transition-colors font-medium"
              >
                <span>Read our full architecture, 6 ethical rules &amp; methodology on the <b>About Us</b> page</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* ── ANALYSIS / SAMPLE REPORT RESULTS ── */}
        {result && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Sample Tour Notification Banner */}
            {isSampleTour && (
              <div className="rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-card to-background p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
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
            <div className="border border-border/80 rounded-2xl p-5 sm:p-6 bg-card shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-muted-foreground font-mono">
                      Innovation #{result.innovation_id.slice(0, 8)}
                    </span>
                    {isSampleTour && (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.2 rounded uppercase">
                        Sample Preview
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {result.structured_idea.title}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-emerald-400 mt-0.5">
                    {result.structured_idea.domain}
                  </p>
                </div>

                {/* Header Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Button
                    onClick={handleSaveToPortfolio}
                    disabled={saving || savedSuccess}
                    variant={savedSuccess ? "outline" : "secondary"}
                    className={
                      savedSuccess
                        ? "border-emerald-500/40 text-emerald-400 bg-emerald-500/10 font-medium text-xs h-8 sm:h-9"
                        : "font-medium text-xs h-8 sm:h-9"
                    }
                  >
                    {saving ? (
                      <>
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                        Saving...
                      </>
                    ) : savedSuccess ? (
                      <>
                        <span className="mr-1.5 text-emerald-400 font-bold">✓</span>
                        Saved to Vault
                      </>
                    ) : (
                      <>
                        <span className="mr-1.5">🔒</span>
                        Save to Vault
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={() => setShowComparatorModal(true)}
                    variant="outline"
                    className="border-cyan-500/40 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 font-medium text-xs h-8 sm:h-9 cursor-pointer"
                  >
                    <span className="mr-1.5">⚖️</span>
                    Compare Patent
                  </Button>

                  <Button
                    onClick={() => handleDownloadPdf(result.innovation_id)}
                    disabled={downloadingPdf}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs h-8 sm:h-9 shadow-sm transition-all"
                  >
                    {downloadingPdf ? (
                      <>
                        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                        PDF...
                      </>
                    ) : (
                      <>
                        <span className="mr-1.5">📄</span>
                        Download PDF
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {saveError && (
                <p className="text-xs text-destructive font-medium">{saveError}</p>
              )}
              {savedSuccess && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center justify-between">
                  <span>✓ Stored in your private cryptographic vault.</span>
                  <Link href="/dashboard" className="font-semibold underline hover:text-emerald-300">
                    Open in Vault →
                  </Link>
                </div>
              )}
              {pdfError && (
                <p className="text-xs text-destructive font-medium">{pdfError}</p>
              )}

              {/* Problem / Solution Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-border/40 text-xs">
                <div className="space-y-1">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground">
                    Problem Statement
                  </h4>
                  <p className="text-foreground/90 leading-relaxed">
                    {result.structured_idea.problem_statement}
                  </p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold uppercase tracking-wider text-muted-foreground">
                    Proposed Solution
                  </h4>
                  <p className="text-foreground/90 leading-relaxed">
                    {result.structured_idea.proposed_solution}
                  </p>
                </div>
              </div>
            </div>

            {/* ── MODULAR TABBED CONTROLLER (Solves Endless Scrolling) ── */}
            <div className="flex items-center justify-between border-b border-border/60 pb-2 overflow-x-auto gap-2">
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-muted/60 border border-border/60 text-xs">
                <button
                  onClick={() => setActiveTab("evidence")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "evidence"
                      ? "bg-secondary text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Feature Matrix &amp; Evidence</span>
                </button>

                <button
                  onClick={() => setActiveTab("radar")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "radar"
                      ? "bg-secondary text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Compass className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Prior-Art Radar &amp; Architecture</span>
                </button>

                <button
                  onClick={() => setActiveTab("assessment")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "assessment"
                      ? "bg-secondary text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Scores &amp; Novelty</span>
                </button>

                <button
                  onClick={() => setActiveTab("pathways")}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === "pathways"
                      ? "bg-secondary text-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Next Steps (4 Pathways)</span>
                </button>

                <button
                  onClick={() => setActiveTab("all")}
                  className={`px-2.5 py-1.5 rounded-lg font-medium transition-all cursor-pointer text-[11px] ${
                    activeTab === "all"
                      ? "bg-secondary text-foreground font-semibold"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span>All in One</span>
                </button>
              </div>

              <div className="text-[11px] text-muted-foreground hidden lg:block">
                <span>Deterministic SHA-256 Provenance &bull; Cloud Grounding</span>
              </div>
            </div>

            {/* ── TAB 1: FEATURE MATRIX & EVIDENCE ── */}
            {(activeTab === "evidence" || activeTab === "all") && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <FeatureMatrix matrix={result.feature_matrix} />
              </div>
            )}

            {/* ── TAB 2: PRIOR ART RADAR & ARCHITECTURE ── */}
            {(activeTab === "radar" || activeTab === "all") && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <PriorArtRadar
                  featureMatrix={result.feature_matrix}
                  innovationTitle={result.structured_idea.title}
                />
                <ArchitectureDiagram structuredIdea={result.structured_idea} />
              </div>
            )}

            {/* ── TAB 3: SCORES, NOVELTY & LIMITATIONS ── */}
            {(activeTab === "assessment" || activeTab === "all") && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {result.scores && result.assessment_summary && (
                  <AssessmentView scores={result.scores} summary={result.assessment_summary} />
                )}

                {/* Search Limitations */}
                <div className="border border-border/60 rounded-xl p-4 bg-card/60 space-y-2 text-xs">
                  <h4 className="font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>Search Limitations &amp; Scope Transparency</span>
                  </h4>
                  <ul className="space-y-1 text-muted-foreground">
                    {result.feature_matrix.limitations.map((limitation, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-400 font-bold">&bull;</span>
                        <span>{limitation}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-[11px] text-muted-foreground/80 pt-1">
                    Read our complete 6 statutory ethics principles on the{" "}
                    <Link href="/about" className="text-emerald-400 underline">
                      About Us
                    </Link>{" "}
                    page.
                  </p>
                </div>
              </div>
            )}

            {/* ── TAB 4: COMMERCIALIZE, GRANTS & PROVENANCE ── */}
            {(activeTab === "pathways" || activeTab === "all") && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <div className="text-center space-y-1">
                    <span className="text-[10px] font-mono uppercase font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      Post-Report Decision Hub
                    </span>
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">
                      What Do You Want To Do With This Innovation?
                    </h3>
                    <p className="text-xs text-muted-foreground max-w-lg mx-auto">
                      Generate provisional patent applications, defensive publications, NDA marketplace listings, or crowdfunding campaigns.
                    </p>
                  </div>

                  <DecisionHub innovationId={result.innovation_id} />
                </div>

                <GrantMatcherCard structuredIdea={result.structured_idea} />
                <ProvenanceCard provenance={result.provenance} />
              </div>
            )}
          </div>
        )}

        {/* ── CLAIM-BY-CLAIM COMPETITOR PATENT COMPARATOR MODAL ── */}
        {result && (
          <PatentComparatorModal
            structuredIdea={result.structured_idea}
            isOpen={showComparatorModal}
            onClose={() => setShowComparatorModal(false)}
          />
        )}
      </main>

      {/* ── STREAMLINED FOOTER ── */}
      <footer className="border-t border-border/60 bg-card/40 py-6 text-center text-xs text-muted-foreground space-y-2">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/about" className="hover:text-foreground">About Us</Link>
          <Link href="/marketplace" className="hover:text-foreground">Marketplace</Link>
          <Link href="/dashboard" className="hover:text-foreground">Portfolio Vault</Link>
        </div>
        <p className="text-[11px] text-muted-foreground/80 max-w-lg mx-auto">
          InnovX &bull; Multi-corpus evidence grounding across OpenAlex, arXiv, and USPTO PatentsView.
          Private by default. SHA-256 cryptographic provenance.
        </p>
      </footer>
    </div>
  );
}
