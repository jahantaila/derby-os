import { createSingletonHandler } from "@/lib/api-helpers";
import { seedRevenue } from "@/lib/seed";
const h = createSingletonHandler("revenue.json", seedRevenue);
export const GET = h.GET;
export const PUT = h.PUT;
