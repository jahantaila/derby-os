import { createSingletonHandler } from "@/lib/api-helpers";
import { seedFinance } from "@/lib/seed";
const h = createSingletonHandler("finance.json", seedFinance);
export const GET = h.GET;
export const PUT = h.PUT;
