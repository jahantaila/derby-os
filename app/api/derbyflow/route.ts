import { createSingletonHandler } from "@/lib/api-helpers";
import { seedDerbyflow } from "@/lib/seed";
const h = createSingletonHandler("derbyflow.json", seedDerbyflow);
export const GET = h.GET;
export const PUT = h.PUT;
