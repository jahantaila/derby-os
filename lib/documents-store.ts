import { readPersistentData, writePersistentData } from "@/lib/persistence";
import { DocumentRecord, INITIAL_DOCUMENTS } from "@/lib/documents-types";

const DOCUMENTS_FILE = "documents.json";
const VALID_CATEGORIES = new Set(["report", "ad-copy", "proposal", "campaign-plan", "analysis", "other"]);
const VALID_STATUSES = new Set(["draft", "final"]);

function isDocumentRecord(value: unknown): value is DocumentRecord {
  if (!value || typeof value !== "object") return false;
  const document = value as DocumentRecord;

  return (
    typeof document.id === "string" &&
    typeof document.title === "string" &&
    typeof document.content === "string" &&
    typeof document.category === "string" &&
    VALID_CATEGORIES.has(document.category) &&
    typeof document.createdBy === "string" &&
    typeof document.createdAt === "string" &&
    typeof document.updatedAt === "string" &&
    (typeof document.clientId === "string" || document.clientId === undefined) &&
    Array.isArray(document.tags) &&
    document.tags.every((tag) => typeof tag === "string") &&
    typeof document.status === "string" &&
    VALID_STATUSES.has(document.status)
  );
}

function isDocumentArray(value: unknown): value is DocumentRecord[] {
  return Array.isArray(value) && value.every(isDocumentRecord);
}

export async function getDocuments(): Promise<DocumentRecord[]> {
  const raw = await readPersistentData<unknown>(DOCUMENTS_FILE, INITIAL_DOCUMENTS);
  if (isDocumentArray(raw) && raw.length > 0) return raw;
  return INITIAL_DOCUMENTS;
}

export async function saveDocuments(documents: DocumentRecord[]) {
  await writePersistentData(DOCUMENTS_FILE, documents);
}
