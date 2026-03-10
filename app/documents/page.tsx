"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { FilePlus2, FileText, Search, Tag, UserRound, X } from "lucide-react";
import { documentContentToHtml, formatDocumentCategory, formatDocumentDateTime } from "@/lib/documents-helpers";
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES, DocumentCategory, DocumentRecord, DocumentStatus } from "@/lib/documents-types";

type AgentOption = {
  id: string;
  name: string;
};

type DocumentForm = {
  title: string;
  content: string;
  category: DocumentCategory;
  createdBy: string;
  clientId: string;
  tags: string;
  status: DocumentStatus;
};

const AUTHOR_FALLBACK: Record<string, string> = {
  alex: "Alex",
  sabri: "Sabri",
  kimberly: "Kimberly",
  kevin: "Kevin",
  jahan: "Jahan",
};

const CATEGORY_STYLES: Record<DocumentCategory, string> = {
  report: "border-white/15 bg-white/8 text-slate-100",
  "ad-copy": "border-blue-400/35 bg-blue-500/12 text-blue-100",
  proposal: "border-cyan-400/35 bg-cyan-500/12 text-cyan-100",
  "campaign-plan": "border-indigo-400/35 bg-indigo-500/12 text-indigo-100",
  analysis: "border-sky-400/35 bg-sky-500/12 text-sky-100",
  other: "border-white/15 bg-white/8 text-slate-100",
};

const STATUS_STYLES: Record<DocumentStatus, string> = {
  draft: "border-amber-400/35 bg-amber-500/12 text-amber-100",
  final: "border-emerald-400/35 bg-emerald-500/12 text-emerald-100",
};

const EMPTY_FORM: DocumentForm = {
  title: "",
  content: "",
  category: "other",
  createdBy: "kimberly",
  clientId: "",
  tags: "",
  status: "draft",
};

function authorName(createdBy: string, authors: AgentOption[]) {
  return authors.find((author) => author.id === createdBy)?.name ?? AUTHOR_FALLBACK[createdBy] ?? createdBy;
}

function normalizedTagList(tags: string) {
  return tags
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [authors, setAuthors] = useState<AgentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | DocumentCategory>("all");
  const [authorFilter, setAuthorFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | DocumentStatus>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<DocumentForm>(EMPTY_FORM);
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);

  const selectedDocument = useMemo(
    () => (selectedDocumentId ? documents.find((document) => document.id === selectedDocumentId) ?? null : null),
    [documents, selectedDocumentId],
  );

  const filteredDocuments = useMemo(() => {
    const term = search.trim().toLowerCase();
    return documents.filter((document) => {
      if (term && !document.title.toLowerCase().includes(term)) return false;
      if (categoryFilter !== "all" && document.category !== categoryFilter) return false;
      if (authorFilter !== "all" && document.createdBy !== authorFilter) return false;
      if (statusFilter !== "all" && document.status !== statusFilter) return false;
      return true;
    });
  }, [documents, search, categoryFilter, authorFilter, statusFilter]);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        const [documentsRes, agentsRes] = await Promise.all([
          fetch("/api/documents", { cache: "no-store" }),
          fetch("/api/agents?type=agent", { cache: "no-store" }),
        ]);

        if (!active) return;

        if (!documentsRes.ok) throw new Error("documents");
        const documentData = (await documentsRes.json()) as DocumentRecord[];
        setDocuments(documentData);

        if (agentsRes.ok) {
          const agentData = (await agentsRes.json()) as Array<{ id: string; name: string }>;
          setAuthors(agentData.map((agent) => ({ id: agent.id, name: agent.name })));
        }

        setError(null);
      } catch {
        if (!active) return;
        setError("Could not load documents.");
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  function openCreate() {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  }

  function closeCreate() {
    setCreateOpen(false);
    setForm(EMPTY_FORM);
  }

  function closeDetail() {
    setSelectedDocumentId(null);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim() || !form.content.trim() || !form.createdBy.trim()) {
      setError("Title, content, and author are required.");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          content: form.content,
          category: form.category,
          createdBy: form.createdBy,
          clientId: form.clientId || undefined,
          tags: normalizedTagList(form.tags),
          status: form.status,
        }),
      });

      if (!response.ok) throw new Error("create");
      const created = (await response.json()) as DocumentRecord;
      setDocuments((prev) => [created, ...prev]);
      setError(null);
      closeCreate();
      setSelectedDocumentId(created.id);
    } catch {
      setError("Could not create document.");
    } finally {
      setSaving(false);
    }
  }

  const authorOptions = [
    ...authors,
    ...Object.entries(AUTHOR_FALLBACK)
      .filter(([id]) => !authors.some((author) => author.id === id))
      .map(([id, name]) => ({ id, name })),
  ];

  return (
    <section className="animate-enter space-y-6" style={{ animationDelay: "80ms" }}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="mt-2 text-sm text-slate-300">Store agent outputs, briefs, analysis, and campaign documents in one place.</p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 py-2 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60 hover:shadow-[0_0_24px_rgba(32,147,255,0.24)]"
        >
          <FilePlus2 size={16} />
          Create Document
        </button>
      </div>

      {error ? <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">{error}</div> : null}

      <div className="glass-panel p-4 sm:p-5">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(180px,0.6fr))]">
          <label className="relative block">
            <span className="sr-only">Search documents</span>
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by title"
              className="min-h-11 w-full rounded-xl border border-white/14 bg-[#101625] pl-10 pr-3 text-sm text-white outline-none transition focus:border-blue-400/60"
            />
          </label>

          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value as "all" | DocumentCategory)}
            className="min-h-11 rounded-xl border border-white/14 bg-[#101625] px-3 text-sm text-white outline-none transition focus:border-blue-400/60"
          >
            <option value="all">All categories</option>
            {DOCUMENT_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {formatDocumentCategory(category)}
              </option>
            ))}
          </select>

          <select
            value={authorFilter}
            onChange={(event) => setAuthorFilter(event.target.value)}
            className="min-h-11 rounded-xl border border-white/14 bg-[#101625] px-3 text-sm text-white outline-none transition focus:border-blue-400/60"
          >
            <option value="all">All authors</option>
            {authorOptions.map((author) => (
              <option key={author.id} value={author.id}>
                {author.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "all" | DocumentStatus)}
            className="min-h-11 rounded-xl border border-white/14 bg-[#101625] px-3 text-sm text-white outline-none transition focus:border-blue-400/60"
          >
            <option value="all">All statuses</option>
            {DOCUMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel p-6 text-sm text-slate-300">Loading documents...</div>
      ) : filteredDocuments.length === 0 ? (
        <div className="glass-panel flex min-h-[320px] flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-white/12 bg-[linear-gradient(135deg,rgba(32,147,255,0.18),rgba(0,38,255,0.14))] text-blue-100">
            <FileText size={24} />
          </div>
          <h2 className="heading-font text-2xl font-normal uppercase tracking-[0.04em] text-white">No documents found</h2>
          <p className="max-w-md text-sm text-slate-400">Adjust the search or filters, or create a new document to start storing agent output.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
          {filteredDocuments.map((document) => (
            <button
              key={document.id}
              type="button"
              onClick={() => setSelectedDocumentId(document.id)}
              className="glass-card w-full cursor-pointer p-5 text-left transition hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(32,147,255,0.18)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-semibold tracking-[-0.02em] text-white">{document.title}</h2>
                  <p className="mt-2 text-sm text-slate-400">{formatDocumentDateTime(document.updatedAt)} ET</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[document.status]}`}>
                  {document.status}
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${CATEGORY_STYLES[document.category]}`}>
                  {formatDocumentCategory(document.category)}
                </span>
                {document.clientId ? (
                  <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                    {document.clientId}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 grid gap-3 text-sm text-slate-300 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                    <UserRound size={12} />
                    Author
                  </div>
                  <p className="text-slate-100">{authorName(document.createdBy, authors)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
                  <div className="mb-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-slate-400">
                    <Tag size={12} />
                    Tags
                  </div>
                  <p className="truncate text-slate-100">{document.tags.join(", ") || "No tags"}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {createOpen ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button type="button" onClick={closeCreate} className="absolute inset-0 bg-black/60 backdrop-blur-sm" aria-label="Close form" />
          <div className="absolute left-1/2 top-1/2 w-[min(92vw,840px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/15 bg-[#0b0d15]/95 p-5 shadow-2xl backdrop-blur-xl">
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-blue-200">New Document</p>
                <h2 className="heading-font mt-2 text-3xl font-normal uppercase tracking-[0.04em] text-white">Create Document</h2>
              </div>
              <button
                type="button"
                onClick={closeCreate}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 px-3 text-slate-200 transition hover:border-blue-300/40 hover:bg-blue-500/10"
              >
                <X size={16} />
              </button>
            </div>

            <form className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]" onSubmit={handleCreate}>
              <div className="glass-panel space-y-4 p-4 sm:p-5">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Title</label>
                  <input
                    required
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="min-h-11 w-full rounded-xl border border-white/14 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Category</span>
                    <select
                      value={form.category}
                      onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value as DocumentCategory }))}
                      className="min-h-11 w-full rounded-xl border border-white/14 bg-slate-950/75 px-3 text-sm text-white outline-none transition focus:border-blue-400/60"
                    >
                      {DOCUMENT_CATEGORIES.map((category) => (
                        <option key={category} value={category}>
                          {formatDocumentCategory(category)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Status</span>
                    <select
                      value={form.status}
                      onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value as DocumentStatus }))}
                      className="min-h-11 w-full rounded-xl border border-white/14 bg-slate-950/75 px-3 text-sm text-white outline-none transition focus:border-blue-400/60"
                    >
                      {DOCUMENT_STATUSES.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Author</span>
                    <select
                      value={form.createdBy}
                      onChange={(event) => setForm((prev) => ({ ...prev, createdBy: event.target.value }))}
                      className="min-h-11 w-full rounded-xl border border-white/14 bg-slate-950/75 px-3 text-sm text-white outline-none transition focus:border-blue-400/60"
                    >
                      {authorOptions.map((author) => (
                        <option key={author.id} value={author.id}>
                          {author.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Client Tag</span>
                    <input
                      value={form.clientId}
                      onChange={(event) => setForm((prev) => ({ ...prev, clientId: event.target.value }))}
                      placeholder="bluegrass-garage-door"
                      className="min-h-11 w-full rounded-xl border border-white/14 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                    />
                  </label>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Tags</label>
                  <input
                    value={form.tags}
                    onChange={(event) => setForm((prev) => ({ ...prev, tags: event.target.value }))}
                    placeholder="meta ads, audit, performance"
                    className="min-h-11 w-full rounded-xl border border-white/14 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                  />
                </div>
              </div>

              <div className="glass-panel space-y-4 p-4 sm:p-5">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">Content</label>
                  <textarea
                    required
                    rows={16}
                    value={form.content}
                    onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                    placeholder="<h2>Summary</h2><p>Use HTML here, or paste simple markdown.</p>"
                    className="w-full rounded-xl border border-white/14 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition focus:border-blue-400/60"
                  />
                  <p className="mt-2 text-xs text-slate-500">HTML renders directly. Plain markdown-style headings and bullets are converted into simple HTML in the viewer.</p>
                </div>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={closeCreate}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 px-4 text-sm font-semibold text-slate-200 transition hover:bg-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-blue-300/30 bg-[linear-gradient(135deg,rgba(32,147,255,0.2),rgba(0,38,255,0.18))] px-4 text-sm font-semibold text-blue-50 transition hover:border-blue-300/60 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Creating..." : "Create Document"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {selectedDocument ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
          <button type="button" onClick={closeDetail} className="absolute inset-0 bg-black/65 backdrop-blur-sm" aria-label="Close details" />
          <div className="absolute right-0 top-0 h-full w-full overflow-y-auto border-l border-white/12 bg-[linear-gradient(180deg,rgba(7,10,18,0.97),rgba(10,10,15,0.98))] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl sm:max-w-2xl sm:p-6">
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-blue-200">{formatDocumentCategory(selectedDocument.category)}</p>
                <h2 className="heading-font mt-1 text-3xl font-normal uppercase tracking-[0.04em] text-white">{selectedDocument.title}</h2>
                <p className="mt-2 text-sm text-slate-400">
                  {authorName(selectedDocument.createdBy, authors)} · {formatDocumentDateTime(selectedDocument.updatedAt)} ET
                </p>
              </div>
              <button
                type="button"
                onClick={closeDetail}
                className="inline-flex min-h-11 items-center justify-center rounded-xl border border-white/12 bg-white/5 px-3 text-slate-200 transition hover:border-blue-300/40 hover:bg-blue-500/10"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${CATEGORY_STYLES[selectedDocument.category]}`}>
                {formatDocumentCategory(selectedDocument.category)}
              </span>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${STATUS_STYLES[selectedDocument.status]}`}>
                {selectedDocument.status}
              </span>
              {selectedDocument.clientId ? (
                <span className="rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] font-semibold text-slate-200">
                  {selectedDocument.clientId}
                </span>
              ) : null}
            </div>

            <div className="glass-panel p-4 sm:p-5">
              <div className="document-content" dangerouslySetInnerHTML={{ __html: documentContentToHtml(selectedDocument.content) }} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
