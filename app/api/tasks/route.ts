import { createCrudHandler } from "@/lib/api-helpers";
import { seedTasks, type Task } from "@/lib/mission-control";

const handler = createCrudHandler<Task>("tasks.json", seedTasks);

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
