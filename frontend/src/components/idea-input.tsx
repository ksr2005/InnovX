"use client";

import { useState, useEffect } from "react";
import { SAMPLE_PROMPT_SUGGESTIONS } from "@/data/sample-report";

interface IdeaInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  onExploreSample?: () => void;
  presetText?: string;
}

const PLACEHOLDER = `Describe your invention, hardware design, or technical system in detail...

Example: "An autonomous solar-assisted quadruped robotic inspection platform for subterranean pipeline fault detection. The system navigates unmapped pipe networks without GPS, utilizes an acoustic-visual sensor array to localize micro-fissures, features adaptive magnetic gaited climbing for curved geometry, and transmits low-bandwidth semantic delta telemetry to an external SCADA monitoring hub."

The more technical specificity and mechanical details you provide, the deeper the prior-art triangulation.`;

export function IdeaInput({ onSubmit, isLoading, onExploreSample, presetText }: IdeaInputProps) {
  const [text, setText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [recognitionInstance, setRecognitionInstance] = useState<any>(null);

  useEffect(() => {
    if (presetText) {
      setText(presetText);
    }
  }, [presetText]);

  // Clean up speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch {
          // ignore cleanup errors
        }
      }
    };
  }, [recognitionInstance]);

  const toggleVoiceRecording = () => {
    if (isListening) {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch {
          // ignore
        }
      }
      setIsListening(false);
      setInterimText("");
      return;
    }

    setSpeechError(null);
    // Check for standard or webkit SpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        let currentInterim = "";
        let finalChunk = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += transcript + " ";
          } else {
            currentInterim += transcript;
          }
        }

        if (finalChunk) {
          setText((prev) => (prev ? prev.trim() + " " + finalChunk.trim() : finalChunk.trim()));
        }
        setInterimText(currentInterim);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          setSpeechError("Microphone access was denied. Please allow microphone permissions in your browser.");
        } else if (event.error !== "no-speech") {
          setSpeechError(`Voice input error: ${event.error}`);
        }
        setIsListening(false);
        setInterimText("");
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimText("");
      };

      recognition.start();
      setRecognitionInstance(recognition);
    } catch {
      setSpeechError("Failed to access microphone. Please ensure microphone permissions are granted.");
      setIsListening(false);
    }
  };

  const handleSubmit = () => {
    if (isListening && recognitionInstance) {
      try {
        recognitionInstance.stop();
      } catch {
        // ignore
      }
      setIsListening(false);
    }
    if (text.trim().length >= 10) {
      onSubmit(text.trim());
    }
  };

  const handleSelectSuggestion = (promptText: string) => {
    setText(promptText);
  };

  const charCount = text.length;
  const isValid = charCount >= 50;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* Speech Error Banner if any */}
      {speechError && (
        <div className="flex items-center justify-between gap-2 p-3 text-xs rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-amber-400 hover:text-white text-xs px-2 py-0.5 rounded border border-amber-500/30"
          >
            ✕ Dismiss
          </button>
        </div>
      )}

      {/* Main Glassmorphic Input Box */}
      <div className={`border rounded-2xl overflow-hidden bg-card/90 backdrop-blur-md shadow-xl transition-all ${
        isListening
          ? "border-rose-500/60 ring-2 ring-rose-500/30"
          : "border-border/80 focus-within:border-emerald-500/50 focus-within:ring-2 focus-within:ring-emerald-500/20"
      }`}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={7}
          disabled={isLoading}
          className="w-full p-5 sm:p-6 bg-transparent text-foreground placeholder:text-muted-foreground/50 
                     resize-none focus:outline-none text-sm sm:text-base leading-relaxed disabled:opacity-50"
        />

        {/* Live Speech Recognition Waveform & Transcript Bar */}
        {isListening && (
          <div className="px-5 sm:px-6 py-2.5 bg-rose-950/30 border-t border-rose-500/30 flex items-center justify-between gap-3 text-xs animate-in fade-in">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              {/* Soundwave Bars */}
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="w-1 h-2.5 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-4 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce"></span>
                <span className="w-1 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.4s]"></span>
              </div>
              <span className="font-semibold text-rose-300 shrink-0 font-mono text-[11px]">
                Listening live:
              </span>
              <span className="text-foreground/90 italic truncate">
                {interimText || "Speak now, transcribing technical description..."}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className="text-[11px] font-semibold text-rose-300 hover:text-white px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 shrink-0 transition-colors cursor-pointer"
            >
              Done Dictating ✓
            </button>
          </div>
        )}

        {/* Input Footer Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 sm:px-6 py-3.5 bg-muted/40 border-t border-border/60">
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono font-medium ${isValid ? "text-emerald-400" : "text-muted-foreground"}`}>
                {charCount} / 50 characters min
              </span>
              {!isValid && charCount > 0 && (
                <span className="text-[11px] text-amber-400 font-medium">
                  ({50 - charCount} more needed)
                </span>
              )}
            </div>

            {text.length > 0 && (
              <button
                type="button"
                onClick={() => setText("")}
                disabled={isLoading}
                className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Speech-to-Innovation Microphone Button */}
            <button
              type="button"
              onClick={toggleVoiceRecording}
              disabled={isLoading}
              title={isListening ? "Stop live speech dictation" : "Dictate your invention using speech recognition"}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                isListening
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 animate-pulse"
                  : "border-border/80 hover:bg-muted text-foreground hover:border-emerald-500/40"
              }`}
            >
              <span className="text-sm">{isListening ? "⏹️" : "🎙️"}</span>
              <span>{isListening ? "Recording..." : "Voice Dictate"}</span>
            </button>

            {onExploreSample && (
              <button
                type="button"
                onClick={onExploreSample}
                disabled={isLoading}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-border/80 hover:bg-muted text-foreground transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>👁️</span>
                <span className="hidden sm:inline">Tour Sample Report</span>
                <span className="sm:hidden">Sample</span>
              </button>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
              className="px-5 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs sm:text-sm font-semibold 
                         rounded-xl shadow-md hover:shadow-emerald-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed
                         flex items-center gap-2 shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Decomposing &amp; Searching...</span>
                </>
              ) : (
                <>
                  <span>⚡</span>
                  <span>Analyze Innovation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Enterprise Security Shield Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 rounded-xl border border-border/50 bg-muted/20 text-[11px] text-muted-foreground font-mono">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-foreground font-medium">Security Guard Active:</span>
          <span>Sliding-Window Rate Limiting</span>
          <span className="text-border hidden sm:inline">•</span>
          <span className="hidden sm:inline">Adversarial Prompt Shield</span>
          <span className="text-border hidden sm:inline">•</span>
          <span className="hidden sm:inline">OWASP CSP & HSTS</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
          <span>🛡️</span>
          <span>Resilient & Tamper-Proof</span>
        </div>
      </div>

      {/* Quick Prompt Suggestions Chips (Subtask 24-1) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-muted-foreground flex items-center gap-1.5">
            <span>💡</span>
            <span>Or test with a sample technical prompt:</span>
          </span>
          <span className="text-[10px] hidden sm:inline">Click to populate</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SAMPLE_PROMPT_SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelectSuggestion(item.prompt)}
              disabled={isLoading}
              className="text-left p-2.5 sm:p-3 rounded-xl border border-border/60 bg-card/60 hover:bg-card hover:border-emerald-500/40 transition-all group cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  {item.category}
                </span>
                <span className="text-[10px] text-muted-foreground group-hover:text-emerald-400 transition-colors">
                  Fill Prompt →
                </span>
              </div>
              <p className="text-xs font-medium text-foreground line-clamp-1 group-hover:text-emerald-300 transition-colors">
                {item.title}
              </p>
              <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                {item.prompt}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Loading Progress State */}
      {isLoading && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center space-y-2 animate-in fade-in">
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-400">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Multi-Agent Prior-Art Pipeline in Progress</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Structuring technical features &rarr; Querying 250M+ OpenAlex papers &bull; 2.4M+ arXiv preprints &bull; 10M+ USPTO patents &rarr; Embedding semantic similarity vectors &rarr; Extracting sentence-level evidence.
          </p>
          <span className="text-[11px] font-mono text-muted-foreground/80 block">
            Estimated duration: ~25-45 seconds
          </span>
        </div>
      )}
    </div>
  );
}
