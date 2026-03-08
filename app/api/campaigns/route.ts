import { createCrudHandler } from "@/lib/api-helpers";
import { seedCampaigns, type Campaign } from "@/lib/mission-control";

const handler = createCrudHandler<Campaign>("campaigns.json", seedCampaigns);

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
export const DELETE = handler.DELETE;
