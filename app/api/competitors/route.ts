import { createCrudHandler } from "@/lib/api-helpers";
import { seedCompetitors } from "@/lib/seed";
const h = createCrudHandler("competitors.json", seedCompetitors as any);
export const GET = h.GET;
export const POST = h.POST;
export const PUT = h.PUT;
export const DELETE = h.DELETE;
