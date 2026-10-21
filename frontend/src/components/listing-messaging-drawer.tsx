"use client";

import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  getListingMessages,
  sendListingMessage,
  type MessageItem,
} from "@/lib/api";

interface ListingMessagingDrawerProps {
  listingId: string;
  listingTitle: string;
  partnerId?: string;
  partnerName?: string;
  isOpen: boolean;
  onClose: () => void;
  token: string;
  isCreator?: boolean;
}

export function ListingMessagingDrawer({
  listingId,
  listingTitle,
  partnerId,
  partnerName,
  isOpen,
  onClose,
  token,
  isCreator = false,
}: ListingMessagingDrawerProps) {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resolvedPartnerName, setResolvedPartnerName] = useState<string>(partnerName || "Partner");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadMessages = async () => {
    if (!listingId || !token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getListingMessages(listingId, token, partnerId);
      setMessages(res.messages || []);
      if (res.partner_name) {
        setResolvedPartnerName(res.partner_name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
    } else {
      setMessages([]);
      setInputText("");
      setError(null);
    }
  }, [isOpen, listingId, partnerId, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || sending || !token) return;

    const content = inputText.trim();
    setSending(true);
    setError(null);

    try {
      const newMsg = await sendListingMessage(listingId, content, token, partnerId);
      setMessages((prev) => [...prev, newMsg]);
      setInputText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message failed to send");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg h-full bg-card border-l border-border/80 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-border/80 bg-background/80 backdrop-blur flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <span className="text-lg">💬</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm truncate text-foreground">
                  {resolvedPartnerName}
                </h3>
                <span className="text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium shrink-0">
                  {isCreator ? "Prospective Licensee" : "Innovation Creator"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate" title={listingTitle}>
                Re: {listingTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadMessages}
              disabled={loading}
              title="Refresh conversation"
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
            >
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/50 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Legal & Zero IP Leakage Shield Banner */}
        <div className="px-6 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center gap-2.5 text-[11px] text-emerald-300">
          <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span>
            <strong>Confidential Channel:</strong> Bound by executed Mutual Non-Disclosure Agreement. Zero IP Leakage enforced.
          </span>
        </div>

        {/* Message Thread Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading && messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs text-muted-foreground">Loading secure conversation...</p>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs">
              {error}
            </div>
          )}

          {!loading && messages.length === 0 && !error && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16 px-4">
              <div className="w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center text-muted-foreground mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-foreground mb-1">No Messages Yet</h4>
              <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
                Initiate the negotiation thread regarding licensing terms, technical clarifications, or co-development opportunities under your NDA.
              </p>
            </div>
          )}

          {messages.map((m) => {
            const isMe = isCreator ? m.is_from_creator : !m.is_from_creator;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"} space-y-1`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground px-1">
                  <span className="font-medium text-foreground/80">
                    {isMe ? "You" : m.sender_name || "Partner"}
                  </span>
                  <span>•</span>
                  <span>
                    {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    isMe
                      ? "bg-emerald-600 text-white rounded-br-none shadow-sm"
                      : "bg-muted/70 text-foreground border border-border/80 rounded-bl-none"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{m.content}</p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-border/80 bg-background/80 backdrop-blur">
          <form onSubmit={handleSend} className="space-y-2">
            <div className="relative rounded-xl border border-border bg-card/80 focus-within:border-emerald-500/80 transition-colors">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a confidential message... (Press Enter to send, Shift+Enter for new line)"
                rows={3}
                disabled={sending}
                className="w-full bg-transparent p-3 text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
              />
              <div className="flex items-center justify-between px-3 pb-2 pt-1 border-t border-border/40">
                <span className="text-[10px] text-muted-foreground">
                  🔒 Encrypted in transit • NDA Protected
                </span>
                <Button
                  type="submit"
                  disabled={!inputText.trim() || sending}
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-1.5 h-auto flex items-center gap-1.5 rounded-lg"
                >
                  {sending ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Send</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
