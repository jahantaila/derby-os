import { createCrudHandler } from "@/lib/api-helpers";
import { seedCosts, type CostEntry } from "@/lib/mission-control";

const handler = createCrudHandler<CostEntry>("costs.json", seedCosts);

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
