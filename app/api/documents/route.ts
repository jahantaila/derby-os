import { NextResponse } from "next/server";
import { getDocuments, saveDocuments } from "@/lib/documents-store";
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUSES, DocumentCategory, DocumentRecord, DocumentStatus } from "@/lib/documents-types";

type CreateDocumentInput = Partial<Omit<DocumentRecord, "id" | "createdAt" | "updatedAt">>;

const VALID_CATEGORIES = new Set<DocumentCategory>(DOCUMENT_CATEGORIES);
const VALID_STATUSES = new Set<DocumentStatus>(DOCUMENT_STATUSES);

function buildDocumentId() {
  return `doc-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeCategory(value: unknown): DocumentCategory {
  return typeof value === "string" && VALID_CATEGORIES.has(value as DocumentCategory) ? (value as DocumentCategory) : "other";
}

function normalizeStatus(value: unknown): DocumentStatus {
  return typeof value === "string" && VALID_STATUSES.has(value as DocumentStatus) ? (value as DocumentStatus) : "draft";
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agentId")?.trim();
  const clientId = searchParams.get("clientId")?.trim();

  const documents = await getDocuments();
  const filtered = documents.filter((document) => {
    if (agentId && document.createdBy !== agentId) return false;
    if (clientId && document.clientId !== clientId) return false;
    return true;
  });

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateDocumentInput;
    const title = body.title?.trim();
    const content = body.content?.trim();
    const createdBy = body.createdBy?.trim().toLowerCase();

    if (!title || !content || !createdBy) {
      return NextResponse.json({ error: "Title, content, and createdBy are required." }, { status: 400 });
    }

    const now = new Date().toISOString();
    const document: DocumentRecord = {
      id: buildDocumentId(),
      title,
      content,
      category: normalizeCategory(body.category),
      createdBy,
      createdAt: now,
      updatedAt: now,
      clientId: body.clientId?.trim() || undefined,
      tags: normalizeTags(body.tags),
      status: normalizeStatus(body.status),
    };

    const documents = await getDocuments();
    documents.unshift(document);
    await saveDocuments(documents);

    return NextResponse.json(document, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Unable to create document." }, { status: 500 });
  }
}
