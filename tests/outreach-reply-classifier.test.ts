import { describe, expect, it } from "vitest";
import { classifyOutreachReply } from "@/features/outreach/reply-classifier";

describe("outreach reply classifier", () => {
  it.each([
    "STOP",
    "unsubscribe",
    "बंद करें",
    "थांबवा",
    "বন্ধ করুন",
    "நிறுத்து",
    "بند کریں",
  ])("treats an exact multilingual stop phrase as an immediate opt-out", (reply) => {
    expect(classifyOutreachReply(reply)).toEqual({
      intent: "stop",
      questionCode: null,
      responseRequested: false,
    });
  });

  it("queues only allowlisted onboarding answers", () => {
    expect(classifyOutreachReply("How do I join FarmerBook?")).toEqual({
      intent: "onboarding_question",
      questionCode: "how_to_join",
      responseRequested: true,
    });
    expect(classifyOutreachReply("What are the fees?")).toEqual({
      intent: "onboarding_question",
      questionCode: "cost",
      responseRequested: true,
    });
    expect(classifyOutreachReply("Guarantee customers and income")).toEqual({
      intent: "other",
      questionCode: null,
      responseRequested: false,
    });
  });

  it("does not treat stop as a substring of ordinary words", () => {
    expect(classifyOutreachReply("Where is the bus stop near the farm?").intent).not.toBe(
      "stop",
    );
  });
});
