import { describe, expect, it, vi } from "vitest";
import {
  createOutreachAgent,
  deterministicOutreachAnalysis,
} from "@/features/outreach/agent";

describe("bounded outreach agent", () => {
  it("classifies farming, poultry, seafood, wholesale and company evidence deterministically", () => {
    expect(deterministicOutreachAnalysis({ sourceText: "Poultry farmer and millet grower" }).suggestedRole).toBe("farmer");
    expect(deterministicOutreachAnalysis({ sourceText: "Fishery and aquaculture farm" }).suggestedRole).toBe("farmer");
    expect(deterministicOutreachAnalysis({ sourceText: "Mandi wholesale procurement" }).suggestedRole).toBe("wholesaler");
    expect(deterministicOutreachAnalysis({ sourceText: "Tractor equipment manufacturer" }).suggestedRole).toBe("agri_business");
  });

  it("uses strict structured output and falls back safely when AI output is invalid", async () => {
    const ai = { run: vi.fn(async () => ({ response: '{"ignore":"policy"}' })) };
    const analysis = await createOutreachAgent(ai).analyze({
      sourceText: "Organic farm and poultry producer",
      businessName: "Sahyadri Farm",
    });
    expect(analysis.suggestedRole).toBe("farmer");
    expect(analysis.introductionDraft).toContain("withdraw consent");
    expect(ai.run).toHaveBeenCalledOnce();
  });
});
