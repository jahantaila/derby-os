import { createCrudHandler } from "@/lib/api-helpers";
import { seedCalendar } from "@/lib/seed";
const h = createCrudHandler("calendar.json", seedCalendar as any);
export const GET = h.GET;
export const POST = h.POST;
export const PUT = h.PUT;
export const DELETE = h.DELETE;
