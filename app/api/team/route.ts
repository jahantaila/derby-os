import { createCrudHandler } from "@/lib/api-helpers";
import { seedTeam } from "@/lib/seed";
const h = createCrudHandler("team.json", seedTeam as any);
export const GET = h.GET;
export const POST = h.POST;
export const PUT = h.PUT;
export const DELETE = h.DELETE;
