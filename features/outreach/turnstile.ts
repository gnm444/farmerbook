import { z } from "zod";

const responseSchema = z.object({
  success: z.boolean(),
  hostname: z.string().optional(),
  action: z.string().optional(),
});

export async function verifyTurnstileToken(
  token: string,
  options: {
    secret?: string;
    remoteIp?: string;
    expectedHostname?: string;
    fetcher?: typeof fetch;
  } = {},
) {
  const secret = options.secret ?? process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (options.remoteIp) body.set("remoteip", options.remoteIp);
  try {
    const response = await (options.fetcher ?? fetch)(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, signal: AbortSignal.timeout(5_000) },
    );
    if (!response.ok) return false;
    const result = responseSchema.safeParse(await response.json());
    if (!result.success || !result.data.success) return false;
    if (
      options.expectedHostname &&
      result.data.hostname &&
      result.data.hostname !== options.expectedHostname
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
