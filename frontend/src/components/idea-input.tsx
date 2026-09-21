"use client";

import { useState } from "react";

interface IdeaInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

const PLACEHOLDER = `Describe your idea, invention, or technical concept in detail...

Example: "An autonomous robot for underground mines that navigates without GPS, detects environmental hazards like gas leaks and temperature spikes, monitors air quality using an array of chemical sensors, and transmits only semantically important information to a remote operator using a bandwidth-efficient communication protocol."

The more detail you provide, the better the analysis.`;

export function IdeaInput({ onSubmit, isLoading }: IdeaInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = () => {
    if (text.trim().length >= 50) {
      onSubmit(text.trim());
    }
  };

  const charCount = text.length;
  const isValid = charCount >= 50;

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="border border-border rounded-xl overflow-hidden bg-card shadow-sm">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={8}
          disabled={isLoading}
          className="w-full p-6 bg-transparent text-foreground placeholder:text-muted-foreground/50 
                     resize-none focus:outline-none text-base leading-relaxed disabled:opacity-50"
        />
        <div className="flex items-center justify-between px-6 py-3 bg-muted/30 border-t border-border">
          <div className="flex items-center gap-4">
            <span className={`text-xs font-mono ${isValid ? "text-emerald-500" : "text-muted-foreground"}`}>
              {charCount} / 50 min
            </span>
            {!isValid && charCount > 0 && (
              <span className="text-xs text-yellow-500">
                Need {50 - charCount} more characters
              </span>
            )}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!isValid || isLoading}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold 
                       rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>🔍 Analyze Idea</>
            )}
          </button>
        </div>
      </div>
      {isLoading && (
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground animate-pulse">
            Decomposing idea into features → Searching 250M+ papers, preprints &amp; patents → Extracting evidence...
          </p>
          <p className="text-xs text-muted-foreground mt-2">This takes 30-60 seconds</p>
        </div>
      )}
    </div>
  );
}
