"use client";

import { useCallback, useEffect, useState } from "react";

interface ShareLinkView {
  id: string;
  createdAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  viewCount: number;
  maxViews: number | null;
  status: "active" | "revoked" | "expired" | "exhausted";
}

/**
 * Operator panel for customer share links: create (with expiry), copy the
 * one-time URL, inspect view counts, and revoke. Lives on the internal
 * preview route only.
 */
export function ShareLinksPanel({ slug }: { slug: string }) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<ShareLinkView[]>([]);
  const [expiresInDays, setExpiresInDays] = useState("30");
  const [createdUrl, setCreatedUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/internal/share-links?slug=${slug}`);
    if (response.ok) {
      const data = (await response.json()) as { links: ShareLinkView[] };
      setLinks(data.links);
    }
  }, [slug]);

  useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  async function createLink() {
    setBusy(true);
    setError(null);
    setCreatedUrl(null);
    setCopied(false);
    try {
      const response = await fetch("/api/internal/share-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          expiresInDays: expiresInDays ? Number(expiresInDays) : null,
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | { url?: string; error?: string }
        | null;
      if (!response.ok || !data?.url) {
        setError(data?.error ?? "Could not create the link.");
        return;
      }
      setCreatedUrl(data.url);
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/internal/share-links/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!createdUrl) return;
    try {
      await navigator.clipboard.writeText(createdUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="border-b border-zinc-800 bg-zinc-950/95">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="w-full px-4 py-2 text-left font-mono text-[11px] uppercase tracking-[0.18em] text-zinc-400 hover:text-zinc-100"
      >
        Share links {links.filter((link) => link.status === "active").length > 0 ? `(${links.filter((link) => link.status === "active").length} active)` : ""} {open ? "▲" : "▼"}
      </button>
      {open ? (
        <div className="space-y-4 px-4 pb-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-zinc-400">
              Expires in (days)
              <input
                type="number"
                min={1}
                max={365}
                value={expiresInDays}
                onChange={(event) => setExpiresInDays(event.target.value)}
                className="ml-2 w-20 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-200"
              />
            </label>
            <button
              type="button"
              onClick={createLink}
              disabled={busy}
              className="rounded bg-zinc-100 px-3 py-1.5 text-xs font-semibold text-zinc-900 disabled:opacity-60"
            >
              Create customer link
            </button>
            {error ? <span className="text-xs text-red-400">{error}</span> : null}
          </div>

          {createdUrl ? (
            <div className="rounded border border-emerald-800/60 bg-emerald-950/30 p-3">
              <p className="mb-2 text-[11px] uppercase tracking-[0.14em] text-emerald-300">
                New link (shown once)
              </p>
              <div className="flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded bg-zinc-900 px-2 py-1.5 text-xs text-emerald-200">
                  {createdUrl}
                </code>
                <button
                  type="button"
                  onClick={copy}
                  className="rounded border border-emerald-700 px-2.5 py-1.5 text-xs text-emerald-200 hover:bg-emerald-900/40"
                >
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          ) : null}

          {links.length === 0 ? (
            <p className="text-xs text-zinc-500">No links yet for this record.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <caption className="sr-only">Share links for this record</caption>
              <thead>
                <tr className="text-zinc-500">
                  <th scope="col" className="py-1.5 pr-3 font-medium">Created</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Status</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Views</th>
                  <th scope="col" className="py-1.5 pr-3 font-medium">Expires</th>
                  <th scope="col" className="py-1.5 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {links.map((link) => (
                  <tr key={link.id} className="text-zinc-300">
                    <td className="py-2 pr-3">{new Date(link.createdAt).toLocaleDateString()}</td>
                    <td className="py-2 pr-3">
                      <span
                        className={
                          link.status === "active"
                            ? "text-emerald-400"
                            : link.status === "revoked"
                              ? "text-red-400"
                              : "text-zinc-500"
                        }
                      >
                        {link.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {link.viewCount}
                      {link.maxViews !== null ? ` / ${link.maxViews}` : ""}
                    </td>
                    <td className="py-2 pr-3">
                      {link.expiresAt
                        ? new Date(link.expiresAt).toLocaleDateString()
                        : "never"}
                    </td>
                    <td className="py-2 text-right">
                      {link.status === "active" ? (
                        <button
                          type="button"
                          onClick={() => revoke(link.id)}
                          disabled={busy}
                          className="rounded border border-zinc-700 px-2 py-1 text-zinc-400 hover:border-red-700 hover:text-red-300 disabled:opacity-60"
                        >
                          Revoke
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}
