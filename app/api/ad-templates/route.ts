import { createCrudHandler } from "@/lib/api-helpers";
import { seedAdTemplates } from "@/lib/seed";
const h = createCrudHandler("ad-templates.json", seedAdTemplates as any);
export const GET = h.GET;
export const POST = h.POST;
export const PUT = h.PUT;
export const DELETE = h.DELETE;
