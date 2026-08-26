import { createHmac } from "node:crypto";

export function hashFeaturedFarmerQuestionSender(
  normalizedEmail: string,
  secret = process.env.FEATURED_FARMER_ENGAGEMENT_HASH_SECRET ?? "",
) {
  if (secret.length < 32) throw new Error("ENGAGEMENT_HASH_NOT_CONFIGURED");
  return createHmac("sha256", secret)
    .update(normalizedEmail.trim().toLowerCase(), "utf8")
    .digest("hex");
}

export function isLikelyAutomatedProfileView(userAgent: string | null) {
  return /bot|crawler|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|monitor|uptime/i.test(
    userAgent ?? "",
  );
}
