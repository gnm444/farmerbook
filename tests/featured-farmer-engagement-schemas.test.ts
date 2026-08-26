import { describe, expect, it } from "vitest";
import {
  featuredFarmerQuestionSchema,
  featuredFarmerRecommendationSchema,
} from "@/features/featured-farmers/engagement-schemas";

const question = {
  slug: "sandeep-dasari-avani-van-farms",
  name: "Avani Customer",
  email: "customer@example.com",
  kind: "question",
  message: "Can you tell me when Gir-cow milk is normally available?",
  consent: true,
  idempotencyKey: "81000000-0000-4000-8000-000000000001",
  turnstileToken: "turnstile-token",
  website: "",
};

describe("Featured Farmer engagement schemas", () => {
  it("accepts a bounded private question and recommendation", () => {
    expect(featuredFarmerQuestionSchema.parse(question)).toMatchObject({
      email: "customer@example.com",
      kind: "question",
    });
    expect(featuredFarmerRecommendationSchema.parse({
      slug: question.slug,
      relationshipContext: "Regular Gir-cow milk customer",
      body: "Sandeep has been clear about availability and careful in explaining how the cows are looked after at the farm.",
      consent: true,
      idempotencyKey: "81000000-0000-4000-8000-000000000002",
    })).toMatchObject({ consent: true });
  });

  it("rejects control characters, short public claims and missing consent", () => {
    expect(featuredFarmerQuestionSchema.safeParse({
      ...question,
      message: "unsafe\u0000message that should never be sent",
    }).success).toBe(false);
    expect(featuredFarmerQuestionSchema.safeParse({
      ...question,
      consent: false,
    }).success).toBe(false);
    expect(featuredFarmerRecommendationSchema.safeParse({
      slug: question.slug,
      relationshipContext: "Milk",
      body: "Too short",
      consent: true,
      idempotencyKey: "81000000-0000-4000-8000-000000000002",
    }).success).toBe(false);
  });

  it("keeps the honeypot strict and rejects recipient injection", () => {
    expect(featuredFarmerQuestionSchema.safeParse({
      ...question,
      website: "spam.example",
    }).success).toBe(false);
    expect(featuredFarmerQuestionSchema.safeParse({
      ...question,
      recipientEmail: "attacker@example.com",
    }).success).toBe(false);
  });
});
