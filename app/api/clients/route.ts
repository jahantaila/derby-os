import { createCrudHandler } from "@/lib/api-helpers";
import { seedClients, type Client } from "@/lib/mission-control";

const handler = createCrudHandler<Client>("clients.json", seedClients);

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
