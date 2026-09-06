import { marketplaceMatchRequestSchema } from "@/features/marketplace/matching-contracts";
import { marketplaceMatchingAgentStub } from "@/features/marketplace/matching-runtime";
import { loadPublicMarketplaceMatchDocuments } from "@/features/marketplace/matching-retrieval";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ code: "INVALID_INPUT" }, { status: 400 });
  }
  const raw = body as { question?: unknown; deliveryLocation?: unknown };
  const question = typeof raw.question === "string" ? raw.question : "";
  const deliveryLocation = typeof raw.deliveryLocation === "string"
    ? raw.deliveryLocation
    : "";
  let documents;
  try {
    documents = await loadPublicMarketplaceMatchDocuments();
  } catch {
    return Response.json({ code: "MARKETPLACE_DATA_UNAVAILABLE" }, { status: 503 });
  }
  const parsed = marketplaceMatchRequestSchema.safeParse({
    question,
    deliveryLocation,
    documents,
  });
  if (!parsed.success) {
    return Response.json({ code: "INVALID_INPUT" }, { status: 400 });
  }
  const agent = await marketplaceMatchingAgentStub();
  if (!agent) {
    return Response.json({ code: "MATCHING_AGENT_UNAVAILABLE" }, { status: 503 });
  }
  try {
    return Response.json(await agent.match(parsed.data));
  } catch {
    return Response.json({ code: "MATCHING_AGENT_UNAVAILABLE" }, { status: 503 });
  }
}
