import { createCrudHandler } from "@/lib/api-helpers";
import { seedActivity, type ActivityItem } from "@/lib/mission-control";

const handler = createCrudHandler<ActivityItem>("activity.json", seedActivity);

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
