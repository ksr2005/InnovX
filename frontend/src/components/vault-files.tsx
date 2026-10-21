"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  getVaultFiles,
  uploadVaultFile,
  deleteVaultFile,
  type InnovationFileItem,
} from "@/lib/api";
import { Button } from "@/components/ui/button";

interface VaultFilesProps {
  innovationId: string;
  token: string;
}

export function VaultFiles({ innovationId, token }: VaultFilesProps) {
  const [files, setFiles] = useState<InnovationFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getVaultFiles(innovationId, token);
      setFiles(res.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (innovationId && token) {
      fetchFiles();
    }
  }, [innovationId, token]);

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const file = fileList[0];

    // Max 10MB limit enforcement
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setError(`File "${file.name}" exceeds 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB)`);
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const uploaded = await uploadVaultFile(innovationId, file, token);
      setFiles((prev) => [uploaded, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "File upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}" from the vault?`)) {
      return;
    }
    setDeletingId(fileId);
    try {
      await deleteVaultFile(innovationId, fileId, token);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete file");
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const getFileIcon = (mime: string | null, name: string) => {
    if (mime?.includes("pdf") || name.endsWith(".pdf")) {
      return (
        <span className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center font-bold text-xs">
          PDF
        </span>
      );
    }
    if (mime?.startsWith("image/") || /\.(png|jpe?g|webp|svg)$/i.test(name)) {
      return (
        <span className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center font-bold text-xs">
          IMG
        </span>
      );
    }
    return (
      <span className="w-8 h-8 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-xs">
        DOC
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Vault Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          handleFileUpload(e.dataTransfer.files);
        }}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all ${
          dragActive
            ? "border-emerald-500 bg-emerald-500/10"
            : "border-border/80 hover:border-emerald-500/50 bg-card/60"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFileUpload(e.target.files)}
          accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.json,.csv,.dwg,.svg"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            {uploading ? (
              <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
            ) : (
              <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            )}
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground">
              {uploading ? "Encrypting & Uploading..." : "Upload Schematics, Research Papers & Notes"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drag &amp; drop or click to browse. Max 10MB per file (PDF, Images, Schematics, Docs).
            </p>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="mt-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium px-4 h-8"
          >
            Select Document
          </Button>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-bold ml-2">×</button>
        </div>
      )}

      {/* File List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Vault Documents ({files.length})
          </h4>
          <span className="text-[11px] text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Private &amp; Encrypted
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent mr-2" />
            Loading vault assets...
          </div>
        ) : files.length === 0 ? (
          <div className="p-8 text-center rounded-xl bg-background border border-border/40 text-muted-foreground">
            <p className="text-xs">No documents uploaded to this innovation vault yet.</p>
            <p className="text-[11px] text-muted-foreground/70 mt-1">
              Upload circuit diagrams, lab photos, patent drafts, or engineering schematics to archive them securely.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-3 rounded-xl bg-background border border-border/60 hover:border-border transition-all flex items-center justify-between gap-3 group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getFileIcon(file.mime_type, file.file_name)}
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate max-w-xs sm:max-w-md">
                      {file.file_name}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{file.created_at ? new Date(file.created_at).toLocaleDateString() : "Uploaded"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {file.download_url ? (
                    <a
                      href={file.download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 font-medium transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                  ) : (
                    <span className="text-[11px] text-muted-foreground">URL expired</span>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(file.id, file.file_name)}
                    disabled={deletingId === file.id}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    title="Delete file"
                  >
                    {deletingId === file.id ? (
                      <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
