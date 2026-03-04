import { createCrudHandler } from "@/lib/api-helpers";
import { seedClients } from "@/lib/seed";
const h = createCrudHandler("clients.json", seedClients as any);
export const GET = h.GET;
export const POST = h.POST;
export const PUT = h.PUT;
export const DELETE = h.DELETE;
