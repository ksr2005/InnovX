"use client";

import { useState, useEffect } from "react";
import { SAMPLE_PROMPT_SUGGESTIONS } from "@/data/sample-report";
import { Mic, MicOff, Sparkles, ArrowRight, ShieldCheck, CornerDownLeft, Eye } from "lucide-react";

interface IdeaInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
  onExploreSample?: () => void;
  presetText?: string;
}

const PLACEHOLDER = `Describe your invention, technical system, or hardware concept in plain engineering language...

Example: "An autonomous solar-assisted quadruped robotic inspection platform for subterranean pipeline fault detection. The system navigates unmapped pipe networks without GPS, utilizes an acoustic-visual sensor array to localize micro-fissures, features adaptive magnetic gaited climbing, and transmits low-bandwidth semantic delta telemetry to an external SCADA monitoring hub."`;

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

  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        try {
          recognitionInstance.stop();
        } catch {
          // ignore
        }
      }
    };
  }, [recognitionInstance]);

  const toggleVoiceRecording = async () => {
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

    // 1. Explicitly check / request native browser microphone permissions first
    if (typeof navigator !== "undefined" && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach((track) => track.stop());
      } catch (micErr: unknown) {
        const errName = micErr instanceof Error ? micErr.name : "";
        if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
          setSpeechError("Microphone permission blocked. Click the lock/settings icon in your browser URL bar, allow Microphone access, and try again.");
          return;
        } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
          setSpeechError("No microphone hardware detected. Please connect an audio input device.");
          return;
        }
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError("Speech recognition is not natively supported in this browser. Please use Google Chrome, Microsoft Edge, or Safari.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
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
          setSpeechError("Microphone permission was denied. Please allow microphone access in your browser settings.");
        } else if (event.error === "network") {
          setSpeechError("Speech recognition network error. Please check your connection.");
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
      setSpeechError("Unable to start speech recognition. Please verify microphone permissions.");
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

  const charCount = text.length;
  const isValid = charCount >= 50;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Speech Error Banner if any */}
      {speechError && (
        <div className="flex items-center justify-between gap-3 p-4 text-xs rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-amber-400 hover:text-white text-xs px-2.5 py-1 rounded-lg border border-amber-500/30 transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Glassmorphic Input Box */}
      <div className={`group relative rounded-3xl overflow-hidden bg-card/60 backdrop-blur-xl border transition-all duration-300 shadow-2xl ${
        isListening
          ? "border-rose-500/60 ring-4 ring-rose-500/10 shadow-rose-500/10"
          : "border-border/60 hover:border-border focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10"
      }`}>
        <div className="p-6 sm:p-8">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={PLACEHOLDER}
            rows={6}
            disabled={isLoading}
            className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/45 
                       resize-none focus:outline-none text-base sm:text-lg leading-relaxed disabled:opacity-50 font-normal"
          />
        </div>

        {/* Live Speech Recognition Waveform & Transcript Bar */}
        {isListening && (
          <div className="px-6 sm:px-8 py-3 bg-rose-950/20 border-t border-rose-500/20 flex items-center justify-between gap-4 text-xs animate-in fade-in">
            <div className="flex items-center gap-3 overflow-hidden">
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1 h-4 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1 h-3 bg-rose-400 rounded-full animate-bounce"></span>
                <span className="w-1 h-2 bg-rose-400 rounded-full animate-bounce [animation-delay:-0.4s]"></span>
              </div>
              <span className="font-medium text-rose-300 shrink-0 text-xs">
                Listening:
              </span>
              <span className="text-foreground/90 italic truncate">
                {interimText || "Speak clearly to dictate your idea..."}
              </span>
            </div>
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className="text-xs font-semibold text-rose-300 hover:text-white px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 shrink-0 transition-colors cursor-pointer"
            >
              Done Dictating
            </button>
          </div>
        )}

        {/* Input Footer Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 sm:px-8 py-4 bg-muted/20 border-t border-border/40">
          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-mono transition-colors ${isValid ? "text-emerald-400 font-semibold" : "text-muted-foreground"}`}>
                {charCount} / 50 characters min
              </span>
              {!isValid && charCount > 0 && (
                <span className="text-[11px] text-amber-400/90 font-medium">
                  ({50 - charCount} more needed)
                </span>
              )}
            </div>

            {text.length > 0 && (
              <button
                type="button"
                onClick={() => setText("")}
                disabled={isLoading}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {/* Voice Dictate Button */}
            <button
              type="button"
              onClick={toggleVoiceRecording}
              disabled={isLoading}
              title={isListening ? "Stop live speech dictation" : "Dictate your invention using speech recognition"}
              className={`px-3.5 py-2.5 text-xs font-medium rounded-xl border transition-all flex items-center gap-2 cursor-pointer ${
                isListening
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30 animate-pulse"
                  : "border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {isListening ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{isListening ? "Listening..." : "Dictate"}</span>
            </button>

            {/* Tour Sample Button */}
            {onExploreSample && (
              <button
                type="button"
                onClick={onExploreSample}
                disabled={isLoading}
                className="px-3.5 py-2.5 text-xs font-medium rounded-xl border border-border/60 hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all flex items-center gap-2 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>Tour Sample Report</span>
              </button>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!isValid || isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs sm:text-sm font-semibold 
                         rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed
                         flex items-center gap-2 shrink-0 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>Triangulating...</span>
                </>
              ) : (
                <>
                  <span>Analyze Innovation</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Sleek, Minimal Prompt Chips (Eliminates the giant 4-box wall of text) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 text-xs text-muted-foreground">
        <div className="flex items-center gap-2 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-medium text-foreground/80">Try an example:</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {SAMPLE_PROMPT_SUGGESTIONS.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setText(item.prompt)}
              disabled={isLoading}
              className="px-3 py-1.5 rounded-full bg-card/60 hover:bg-secondary border border-border/60 hover:border-emerald-500/40 text-muted-foreground hover:text-foreground text-xs transition-all duration-150 cursor-pointer truncate max-w-[200px] sm:max-w-[220px]"
              title={item.prompt}
            >
              {item.title}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Progress State */}
      {isLoading && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-3 animate-in fade-in duration-300">
          <div className="flex items-center justify-center gap-2.5 text-sm font-semibold text-emerald-400">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span>Deep Multi-Repository Triangulation in Progress</span>
          </div>
          <p className="text-xs text-muted-foreground max-w-lg mx-auto leading-relaxed">
            Deconstructing technical features &bull; Cross-referencing 250M+ OpenAlex research works, arXiv preprints &amp; USPTO patents &bull; Computing 3072-dim semantic concept embeddings &bull; Extracting verbatim evidence sentences.
          </p>
        </div>
      )}
    </div>
  );
}
