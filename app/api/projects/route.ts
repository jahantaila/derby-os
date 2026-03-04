import { createCrudHandler } from "@/lib/api-helpers";
import { seedProjects } from "@/lib/seed";
const h = createCrudHandler("projects.json", seedProjects as any);
export const GET = h.GET;
export const POST = h.POST;
export const PUT = h.PUT;
export const DELETE = h.DELETE;
