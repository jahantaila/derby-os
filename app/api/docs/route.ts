import { createCrudHandler } from "@/lib/api-helpers";
import { seedDocs } from "@/lib/seed";
const h = createCrudHandler("docs.json", seedDocs as any);
export const GET = h.GET;
export const POST = h.POST;
export const PUT = h.PUT;
export const DELETE = h.DELETE;
