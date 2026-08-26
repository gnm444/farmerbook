import {
  ownedSocialConnectorRequestSchema,
  ownedSocialConnectorResponseSchema,
} from "../../features/social-publisher/contracts";

interface Env {
  CONNECTOR_RELEASE_ENABLED?: string;
  META_GRAPH_API_VERSION?: string;
  META_INSTAGRAM_ACCOUNT_ID?: string;
  META_PAGE_ID?: string;
  META_PAGE_ACCESS_TOKEN?: string;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function configured(env: Env, channel: "facebook" | "instagram") {
  const version = env.META_GRAPH_API_VERSION?.trim() ?? "";
  const pageId = env.META_PAGE_ID?.trim() ?? "";
  const instagramAccountId = env.META_INSTAGRAM_ACCOUNT_ID?.trim() ?? "";
  const token = env.META_PAGE_ACCESS_TOKEN?.trim() ?? "";
  return env.CONNECTOR_RELEASE_ENABLED?.trim().toLowerCase() === "true"
    && /^v\d+\.\d+$/.test(version)
    && /^\d{4,40}$/.test(pageId)
    && (channel === "facebook" || /^\d{4,40}$/.test(instagramAccountId))
    && token.length >= 40;
}

async function providerJson(response: Response) {
  return response.json().catch(() => null) as Promise<unknown>;
}

async function resolveFacebookPageToken(
  providerFetch: typeof fetch,
  version: string,
  pageId: string,
  bootstrapToken: string,
) {
  let response: Response;
  try {
    const url = new URL(`https://graph.facebook.com/${version}/${pageId}`);
    url.searchParams.set("fields", "id,access_token");
    response = await providerFetch(url, {
      headers: { authorization: `Bearer ${bootstrapToken}` },
    });
  } catch {
    return {
      code: "UNKNOWN" as const,
      failureCode: "META_PAGE_TOKEN_OUTCOME_UNKNOWN",
    };
  }
  const body = await providerJson(response);
  if (!response.ok) {
    return providerFailure(response.status, "META_PAGE_TOKEN_REJECTED", body);
  }
  const record = body && typeof body === "object"
    ? body as { id?: unknown; access_token?: unknown }
    : null;
  if (record?.id !== pageId) {
    return { code: "FAILED" as const, failureCode: "META_PAGE_ID_MISMATCH" };
  }
  if (typeof record.access_token !== "string" || record.access_token.length < 40) {
    return { code: "FAILED" as const, failureCode: "META_PAGE_TOKEN_MISSING" };
  }
  return { code: "VERIFIED" as const, token: record.access_token };
}

function sanitizedProviderFailureCode(fallback: string, body: unknown) {
  if (!body || typeof body !== "object") return fallback;
  const error = (body as { error?: unknown }).error;
  if (!error || typeof error !== "object") return fallback;
  const code = (error as { code?: unknown }).code;
  const subcode = (error as { error_subcode?: unknown }).error_subcode;
  const safeCode = typeof code === "number" && Number.isInteger(code)
    && code >= 0 && code <= 99_999 ? code : null;
  const safeSubcode = typeof subcode === "number" && Number.isInteger(subcode)
    && subcode >= 0 && subcode <= 99_999_999 ? subcode : null;
  return safeCode === null
    ? fallback
    : [fallback, safeCode, safeSubcode].filter((value) => value !== null).join("_");
}

function providerFailure(status: number, failureCode: string, body: unknown) {
  const code = status >= 500 ? "UNKNOWN" as const : "FAILED" as const;
  return {
    code,
    failureCode: code === "UNKNOWN"
      ? "META_CREATE_OUTCOME_UNKNOWN"
      : sanitizedProviderFailureCode(failureCode, body),
  };
}

async function waitForInstagramContainer(
  providerFetch: typeof fetch,
  version: string,
  creationId: string,
  token: string,
) {
  for (let check = 0; check < 4; check += 1) {
    let response: Response;
    try {
      const url = new URL(
        `https://graph.facebook.com/${version}/${creationId}`,
      );
      url.searchParams.set("fields", "id,status_code,status");
      response = await providerFetch(url, {
        headers: { authorization: `Bearer ${token}` },
      });
    } catch {
      return { code: "UNKNOWN" as const };
    }
    const body = await providerJson(response);
    if (!response.ok || !body || typeof body !== "object") {
      return { code: "UNKNOWN" as const };
    }
    const statusCode = (body as { status_code?: unknown }).status_code;
    if (statusCode === "FINISHED") return { code: "FINISHED" as const };
    if (statusCode === "ERROR" || statusCode === "EXPIRED") {
      return { code: "FAILED" as const };
    }
    if (check < 3) {
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  return { code: "UNKNOWN" as const };
}

async function publishInstagram(
  providerFetch: typeof fetch,
  env: Env,
  input: { text: string; mediaUrl?: string },
) {
  if (!input.mediaUrl) {
    return { code: "FAILED" as const, failureCode: "RIGHTS_CLEARED_MEDIA_REQUIRED" };
  }
  const version = env.META_GRAPH_API_VERSION!.trim();
  const instagramAccountId = env.META_INSTAGRAM_ACCOUNT_ID!.trim();
  const token = env.META_PAGE_ACCESS_TOKEN!.trim();
  let createResponse: Response;
  try {
    createResponse = await providerFetch(
      `https://graph.facebook.com/${version}/${instagramAccountId}/media`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          image_url: input.mediaUrl,
          caption: input.text,
        }),
      },
    );
  } catch {
    return { code: "UNKNOWN" as const, failureCode: "META_CREATE_OUTCOME_UNKNOWN" };
  }
  const created = await providerJson(createResponse);
  if (!createResponse.ok) {
    return providerFailure(
      createResponse.status,
      "META_INSTAGRAM_MEDIA_REJECTED",
      created,
    );
  }
  const creationId = created && typeof created === "object"
    && typeof (created as { id?: unknown }).id === "string"
    ? (created as { id: string }).id
    : null;
  if (!creationId) {
    return { code: "UNKNOWN" as const, failureCode: "META_RECEIPT_MISSING" };
  }

  const container = await waitForInstagramContainer(
    providerFetch,
    version,
    creationId,
    token,
  );
  if (container.code === "FAILED") {
    return { code: "FAILED" as const, failureCode: "META_INSTAGRAM_MEDIA_REJECTED" };
  }
  if (container.code !== "FINISHED") {
    return { code: "UNKNOWN" as const, failureCode: "META_INSTAGRAM_MEDIA_OUTCOME_UNKNOWN" };
  }

  let publishResponse: Response;
  try {
    publishResponse = await providerFetch(
      `https://graph.facebook.com/${version}/${instagramAccountId}/media_publish`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ creation_id: creationId }),
      },
    );
  } catch {
    return { code: "UNKNOWN" as const, failureCode: "META_INSTAGRAM_PUBLISH_OUTCOME_UNKNOWN" };
  }
  const published = await providerJson(publishResponse);
  if (!publishResponse.ok) {
    const failure = providerFailure(
      publishResponse.status,
      "META_INSTAGRAM_PUBLISH_REJECTED",
      published,
    );
    return failure.code === "UNKNOWN"
      ? { ...failure, failureCode: "META_INSTAGRAM_PUBLISH_OUTCOME_UNKNOWN" }
      : failure;
  }
  const providerReceiptId = published && typeof published === "object"
    && typeof (published as { id?: unknown }).id === "string"
    ? (published as { id: string }).id
    : null;
  if (!providerReceiptId) {
    return { code: "UNKNOWN" as const, failureCode: "META_RECEIPT_MISSING" };
  }

  let verifyResponse: Response;
  try {
    const verifyUrl = new URL(
      `https://graph.facebook.com/${version}/${providerReceiptId}`,
    );
    verifyUrl.searchParams.set("fields", "id,caption,permalink");
    verifyResponse = await providerFetch(verifyUrl, {
      headers: { authorization: `Bearer ${token}` },
    });
  } catch {
    return {
      code: "UNKNOWN" as const,
      providerReceiptId,
      failureCode: "META_VERIFY_OUTCOME_UNKNOWN",
    };
  }
  const verified = await providerJson(verifyResponse);
  const verifiedRecord = verified && typeof verified === "object"
    ? verified as { id?: unknown; caption?: unknown; permalink?: unknown }
    : null;
  if (!verifyResponse.ok
    || verifiedRecord?.id !== providerReceiptId
    || verifiedRecord.caption !== input.text
    || typeof verifiedRecord.permalink !== "string") {
    return {
      code: "UNKNOWN" as const,
      providerReceiptId,
      failureCode: "META_VERIFY_MISMATCH",
    };
  }
  return { code: "VERIFIED" as const, providerReceiptId };
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
      const parsed = ownedSocialConnectorRequestSchema.safeParse(
        await request.json().catch(() => null),
      );
      if (!parsed.success) {
        return json({ code: "FAILED", failureCode: "CONNECTOR_INPUT_INVALID" }, 400);
      }
      const input = parsed.data;
      if (!configured(env, input.channel)) {
        return json({ code: "FAILED", failureCode: "META_CONNECTOR_NOT_READY" });
      }
      if (input.channel === "instagram") {
        return json(ownedSocialConnectorResponseSchema.parse(
          await publishInstagram(providerFetch, env, input),
        ));
      }

      const version = env.META_GRAPH_API_VERSION!.trim();
      const pageId = env.META_PAGE_ID!.trim();
      const bootstrapToken = env.META_PAGE_ACCESS_TOKEN!.trim();
      const resolvedToken = await resolveFacebookPageToken(
        providerFetch,
        version,
        pageId,
        bootstrapToken,
      );
      if (resolvedToken.code !== "VERIFIED") {
        return json(ownedSocialConnectorResponseSchema.parse(resolvedToken));
      }
      const token = resolvedToken.token;
      let createResponse: Response;
      try {
        createResponse = await providerFetch(
          `https://graph.facebook.com/${version}/${pageId}/feed`,
          {
            method: "POST",
            headers: {
              authorization: `Bearer ${token}`,
              "content-type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
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
        return json(ownedSocialConnectorResponseSchema.parse(code === "UNKNOWN"
          ? { code, failureCode: "META_CREATE_OUTCOME_UNKNOWN" }
          : {
              code,
              failureCode: sanitizedProviderFailureCode(
                "META_CREATE_REJECTED",
                created,
              ),
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
