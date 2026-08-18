import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { websiteGreeterRequestSchema } from "@/features/website-greeter/contracts";
import { approvedGreeterAnswer } from "@/features/website-greeter/knowledge";
import { aiText } from "@/features/website-greeter/response";

describe("24/7 managed website greeting agent", () => {
  const agent = readFileSync("features/website-greeter/agent.ts", "utf8");
  const vite = readFileSync("vite.config.ts", "utf8");
  const worker = readFileSync("worker/index.ts", "utf8");

  it("runs as a named Cloudflare Agent Durable Object", () => {
    expect(vite).toContain('name: "WEBSITE_GREETING_AGENT"');
    expect(vite).toContain('class_name: "WebsiteGreetingAgent"');
    expect(vite).toContain('tag: "website-greeting-agent-v1"');
    expect(worker).toContain('"farmerbook-website-greeting"');
  });

  it("defaults to the cheapest allowlisted model and has layered hard stops", () => {
    expect(agent).toContain('@cf/ibm-granite/granite-4.0-h-micro');
    expect(agent).toContain("SUPPORTED_MODELS");
    expect(agent).toContain("DEFAULT_MONTHLY_AI_BUDGET_USD = 5");
    expect(agent).toContain("DEFAULT_MONTHLY_REPLY_LIMIT = 25_000");
    expect(agent).toContain("MAX_SESSION_REPLIES = 8");
    expect(agent).toContain("DEFAULT_DAILY_AI_REPLY_LIMIT = 1_000");
  });

  it("serves common questions without a model call", () => {
    expect(approvedGreeterAnswer("How do I contact you?")?.text).toContain("ceo@farmerbook.in");
    expect(approvedGreeterAnswer("What about organic certification?")?.text).toContain(
      "Non-certified organic farmer (paperwork not yet completed to prove certification).",
    );
  });

  it("accepts both Workers AI response shapes", () => {
    expect(aiText({ response: "Managed answer" })).toBe("Managed answer");
    expect(aiText({
      choices: [{ message: { content: "OpenAI-compatible answer" } }],
    })).toBe("OpenAI-compatible answer");
  });

  it("rejects oversized or malformed visitor messages", () => {
    expect(websiteGreeterRequestSchema.safeParse({
      sessionId: crypto.randomUUID(),
      message: "Hello",
      locale: "en-IN",
    }).success).toBe(true);
    expect(websiteGreeterRequestSchema.safeParse({
      sessionId: "not-a-session",
      message: "x".repeat(301),
      locale: "bad locale",
    }).success).toBe(false);
  });
});
