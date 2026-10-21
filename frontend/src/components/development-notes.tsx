"use client";

import React, { useState, useEffect } from "react";
import {
  getDevelopmentNotes,
  addDevelopmentNote,
  deleteDevelopmentNote,
  type DevelopmentNoteItem,
} from "@/lib/api";
import { Button } from "@/components/ui/button";

interface DevelopmentNotesProps {
  innovationId: string;
  token: string;
}

export function DevelopmentNotes({ innovationId, token }: DevelopmentNotesProps) {
  const [notes, setNotes] = useState<DevelopmentNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDevelopmentNotes(innovationId, token);
      setNotes(res.notes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (innovationId && token) {
      fetchNotes();
    }
  }, [innovationId, token]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    setError(null);
    try {
      const newNote = await addDevelopmentNote(
        innovationId,
        {
          title: title.trim() || "Lab Note",
          content: content.trim(),
        },
        token
      );
      setNotes((prev) => [newNote, ...prev]);
      setTitle("");
      setContent("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this development note?")) return;
    setDeletingId(noteId);
    try {
      await deleteDevelopmentNote(innovationId, noteId, token);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Note Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Development &amp; Mentor Notes ({notes.length})
          </h4>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Running log of lab experiments, mentor remarks, and prototyping milestones.
          </p>
        </div>

        {!showForm && (
          <Button
            size="sm"
            onClick={() => setShowForm(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3 font-medium flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Note
          </Button>
        )}
      </div>

      {/* Add Note Form */}
      {showForm && (
        <form onSubmit={handleAddNote} className="p-4 rounded-xl bg-card border border-emerald-500/30 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground">New Lab / Mentor Note</span>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          <div>
            <input
              type="text"
              placeholder="Title (e.g. Mentor Discussion, Battery Test v2, Patent Prior Art Review)..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-1.5 text-xs rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div>
            <textarea
              rows={4}
              required
              placeholder="Record technical observations, changes made to prototype, mentor feedback, or next steps..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-background border border-border text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-emerald-500 leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowForm(false)}
              className="text-xs h-7 px-3"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !content.trim()}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-4 font-medium"
            >
              {submitting ? "Saving Note..." : "Save Note"}
            </Button>
          </div>
        </form>
      )}

      {/* Error alert */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* Notes Timeline List */}
      {loading ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent mr-2" />
          Loading development notes...
        </div>
      ) : notes.length === 0 && !showForm ? (
        <div className="p-8 text-center rounded-xl bg-background border border-border/40 text-muted-foreground">
          <p className="text-xs">No development notes recorded yet.</p>
          <p className="text-[11px] text-muted-foreground/70 mt-1">
            Click &ldquo;Add Note&rdquo; to keep a running journal of test findings, engineering decisions, and mentor reviews.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="p-4 rounded-xl bg-background border border-border/60 hover:border-border transition-all space-y-2 relative group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <h5 className="text-xs font-bold text-foreground">{note.title}</h5>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {note.created_at ? new Date(note.created_at).toLocaleString() : ""}
                  </span>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(note.id)}
                    disabled={deletingId === note.id}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete note"
                  >
                    {deletingId === note.id ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed pl-4">
                {note.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
