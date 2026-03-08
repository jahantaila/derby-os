import { createCrudHandler } from "@/lib/api-helpers";
import { seedTasks } from "@/lib/seed";
const h = createCrudHandler("tasks.json", seedTasks as any);
export const GET = h.GET;
export const POST = h.POST;
export const PUT = h.PUT;
export const DELETE = h.DELETE;
