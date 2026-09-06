import { Agent, type AgentContext } from "agents";
import type { MarketplaceMatchResponse } from "./matching-contracts";
import { marketplaceMatch } from "./matching-engine";

type MarketplaceMatchingEnv = Cloudflare.Env;
type MarketplaceMatchingState = Record<string, never>;

export class MarketplaceMatchingAgent extends Agent<
  MarketplaceMatchingEnv,
  MarketplaceMatchingState
> {
  initialState: MarketplaceMatchingState = {};

  constructor(ctx: AgentContext, env: MarketplaceMatchingEnv) {
    super(ctx, env);
  }

  async match(rawInput: unknown): Promise<MarketplaceMatchResponse> {
    return marketplaceMatch(rawInput);
  }
}

export { marketplaceMatch } from "./matching-engine";
