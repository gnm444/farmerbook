import {
  ownedSocialConnectorRequestSchema,
  ownedSocialConnectorResponseSchema,
} from "../../features/social-publisher/contracts";

interface Env {
  CONNECTOR_RELEASE_ENABLED?: string;
  META_GRAPH_API_VERSION?: string;
  META_PAGE_ID?: string;
  META_PAGE_ACCESS_TOKEN?: string;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function configured(env: Env) {
  const version = env.META_GRAPH_API_VERSION?.trim() ?? "";
  const pageId = env.META_PAGE_ID?.trim() ?? "";
  const token = env.META_PAGE_ACCESS_TOKEN?.trim() ?? "";
  return env.CONNECTOR_RELEASE_ENABLED?.trim().toLowerCase() === "true"
    && /^v\d+\.\d+$/.test(version)
    && /^\d{4,40}$/.test(pageId)
    && token.length >= 40;
}

async function providerJson(response: Response) {
  return response.json().catch(() => null) as Promise<unknown>;
}

export function createOwnedSocialConnector(
  providerFetch: typeof fetch = fetch,
) {
  return {
    async fetch(request: Request, env: Env) {
      const url = new URL(request.url);
      if (url.pathname !== "/v1/publish" || request.method !== "POST") {
        return json({ code: "NOT_FOUND" }, 404);
      }
      if (!configured(env)) {
        return json({ code: "FAILED", failureCode: "META_CONNECTOR_NOT_READY" });
      }
      const parsed = ownedSocialConnectorRequestSchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success) {
        return json({ code: "FAILED", failureCode: "CONNECTOR_INPUT_INVALID" }, 400);
      }
      const input = parsed.data;
      if (input.channel === "instagram") {
        return json({ code: "FAILED", failureCode: "RIGHTS_CLEARED_MEDIA_REQUIRED" });
      }

      const version = env.META_GRAPH_API_VERSION!.trim();
      const pageId = env.META_PAGE_ID!.trim();
      const token = env.META_PAGE_ACCESS_TOKEN!.trim();
      let createResponse: Response;
      try {
        createResponse = await providerFetch(
          `https://graph.facebook.com/${version}/${pageId}/feed`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              message: input.text,
              link: input.canonicalUrl,
            }),
          },
        );
      } catch {
        return json({ code: "UNKNOWN", failureCode: "META_CREATE_OUTCOME_UNKNOWN" });
      }
      const created = await providerJson(createResponse);
      if (!createResponse.ok) {
        const code = createResponse.status >= 500 ? "UNKNOWN" : "FAILED";
        return json(ownedSocialConnectorResponseSchema.parse({
          code,
          failureCode: code === "UNKNOWN"
            ? "META_CREATE_OUTCOME_UNKNOWN"
            : "META_CREATE_REJECTED",
        }));
      }
      const providerReceiptId = created && typeof created === "object"
        && typeof (created as { id?: unknown }).id === "string"
        ? (created as { id: string }).id
        : null;
      if (!providerReceiptId) {
        return json({ code: "UNKNOWN", failureCode: "META_RECEIPT_MISSING" });
      }

      let verifyResponse: Response;
      try {
        const verifyUrl = new URL(
          `https://graph.facebook.com/${version}/${providerReceiptId}`,
        );
        verifyUrl.searchParams.set("fields", "id,message,permalink_url");
        verifyResponse = await providerFetch(verifyUrl, {
          headers: { authorization: `Bearer ${token}` },
        });
      } catch {
        return json({
          code: "UNKNOWN",
          providerReceiptId,
          failureCode: "META_VERIFY_OUTCOME_UNKNOWN",
        });
      }
      const verified = await providerJson(verifyResponse);
      const verifiedRecord = verified && typeof verified === "object"
        ? verified as { id?: unknown; message?: unknown; permalink_url?: unknown }
        : null;
      if (!verifyResponse.ok
        || verifiedRecord?.id !== providerReceiptId
        || verifiedRecord.message !== input.text
        || typeof verifiedRecord.permalink_url !== "string") {
        return json({
          code: "UNKNOWN",
          providerReceiptId,
          failureCode: "META_VERIFY_MISMATCH",
        });
      }
      return json(ownedSocialConnectorResponseSchema.parse({
        code: "VERIFIED",
        providerReceiptId,
      }));
    },
  };
}

export default createOwnedSocialConnector();
