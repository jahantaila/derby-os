import { NextResponse } from "next/server";
import { getDocuments, saveDocuments } from "@/lib/documents-store";
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES, DocumentCategory, DocumentRecord, DocumentStatus } from "@/lib/documents-types";

type UpdateDocumentInput = Partial<Omit<DocumentRecord, "id" | "createdAt" | "updatedAt">>;

const VALID_CATEGORIES = new Set<DocumentCategory>(DOCUMENT_CATEGORIES);
const VALID_STATUSES = new Set<DocumentStatus>(DOCUMENT_STATUSES);

function normalizeCategory(value: unknown): DocumentCategory | undefined {
  return typeof value === "string" && VALID_CATEGORIES.has(value as DocumentCategory) ? (value as DocumentCategory) : undefined;
}

function normalizeStatus(value: unknown): DocumentStatus | undefined {
  return typeof value === "string" && VALID_STATUSES.has(value as DocumentStatus) ? (value as DocumentStatus) : undefined;
}

function normalizeTags(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const documents = await getDocuments();
  const document = documents.find((entry) => entry.id === params.id);

  if (!document) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json(document);
}

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const patch = (await request.json()) as UpdateDocumentInput;
    const documents = await getDocuments();
    const index = documents.findIndex((entry) => entry.id === params.id);

    if (index < 0) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    const current = documents[index];
    const updated: DocumentRecord = {
      ...current,
      title: patch.title?.trim() || current.title,
      content: patch.content?.trim() ?? current.content,
      category: normalizeCategory(patch.category) ?? current.category,
      createdBy: patch.createdBy?.trim().toLowerCase() || current.createdBy,
      clientId: patch.clientId === undefined ? current.clientId : patch.clientId?.trim() || undefined,
      tags: normalizeTags(patch.tags) ?? current.tags,
      status: normalizeStatus(patch.status) ?? current.status,
      updatedAt: new Date().toISOString(),
    };

    documents[index] = updated;
    await saveDocuments(documents);
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: "Unable to update document." }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    const documents = await getDocuments();
    const next = documents.filter((entry) => entry.id !== params.id);

    if (next.length === documents.length) {
      return NextResponse.json({ error: "Document not found." }, { status: 404 });
    }

    await saveDocuments(next);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to delete document." }, { status: 500 });
  }
}
