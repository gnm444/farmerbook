import { NextResponse } from "next/server";
import { verifyTurnstileToken } from "@/features/outreach/turnstile";
import { isDemoMode } from "@/lib/env";
import {
  isHoneypotFilled,
  normalizeIndianPhone,
  pledgeInputSchema,
  publicPledge,
} from "@/lib/pledges";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_REQUEST_BYTES = 16_384;
const PUBLIC_PLEDGE_LIMIT = 100;

type JsonBodyResult =
  | { ok: true; body: unknown }
  | { ok: false; response: NextResponse };

function jsonResponse(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function unavailableResponse() {
  return jsonResponse(
    {
      code: "PLEDGE_STORAGE_UNAVAILABLE",
      message: "Pledge storage is not configured or is temporarily unavailable.",
    },
    503,
  );
}

function isSameOriginRequest(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const origin = request.headers.get("origin");
  if (!origin) return true;

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function pledgeProtectionConfigured() {
  return Boolean(
    (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").length >= 3
      && (process.env.TURNSTILE_SECRET_KEY ?? "").length >= 8,
  );
}

async function readJsonBody(request: Request): Promise<JsonBodyResult> {
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    ?.trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    return {
      ok: false,
      response: jsonResponse(
        { code: "UNSUPPORTED_MEDIA_TYPE", message: "Send the pledge as JSON." },
        415,
      ),
    };
  }

  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader && /^\d+$/u.test(contentLengthHeader)) {
    const contentLength = Number(contentLengthHeader);
    if (contentLength > MAX_REQUEST_BYTES) {
      return {
        ok: false,
        response: jsonResponse(
          { code: "REQUEST_TOO_LARGE", message: "The pledge request is too large." },
          413,
        ),
      };
    }
  }

  if (!request.body) {
    return {
      ok: false,
      response: jsonResponse(
        { code: "INVALID_JSON", message: "The pledge request is empty." },
        400,
      ),
    };
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_REQUEST_BYTES) {
        await reader.cancel().catch(() => undefined);
        return {
          ok: false,
          response: jsonResponse(
            { code: "REQUEST_TOO_LARGE", message: "The pledge request is too large." },
            413,
          ),
        };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return { ok: true, body: JSON.parse(text) as unknown };
  } catch {
    return {
      ok: false,
      response: jsonResponse(
        { code: "INVALID_JSON", message: "The pledge request is not valid JSON." },
        400,
      ),
    };
  } finally {
    reader.releaseLock();
  }
}

function adminClientOrNull() {
  if (isDemoMode()) return null;

  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return jsonResponse(
      { code: "CROSS_ORIGIN_REQUEST", message: "The request could not be verified." },
      403,
    );
  }

  const bodyResult = await readJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;

  const parsed = pledgeInputSchema.safeParse(bodyResult.body);
  if (!parsed.success) {
    return jsonResponse(
      {
        code: "INVALID_INPUT",
        message: parsed.error.issues[0]?.message ?? "Check the pledge details.",
      },
      400,
    );
  }

  if (isHoneypotFilled(parsed.data)) {
    return jsonResponse({ code: "IGNORED" }, 202);
  }

  const phone = normalizeIndianPhone(parsed.data.phone);
  if (!phone) {
    return jsonResponse(
      { code: "INVALID_INPUT", message: "Enter a valid Indian mobile number." },
      400,
    );
  }

  if (!pledgeProtectionConfigured()) {
    return jsonResponse(
      {
        code: "PLEDGE_PROTECTION_UNAVAILABLE",
        message: "Pledge protection is temporarily unavailable. Please try again later.",
      },
      503,
    );
  }

  const requestHostname = new URL(request.url).hostname;
  const turnstileValid = await verifyTurnstileToken(
    parsed.data.turnstileToken,
    {
      remoteIp: request.headers.get("cf-connecting-ip") ?? undefined,
      expectedHostname:
        requestHostname === "localhost" || requestHostname === "127.0.0.1"
          ? undefined
          : requestHostname,
      expectedAction: "plate_pledge",
    },
  );
  if (!turnstileValid) {
    return jsonResponse(
      {
        code: "TURNSTILE_FAILED",
        message: "Complete the spam-protection check and try again.",
      },
      403,
    );
  }

  const supabase = adminClientOrNull();
  if (!supabase) return unavailableResponse();

  try {
    const { error } = await supabase.rpc("submit_plate_pledge", {
      display_name_input: parsed.data.name,
      phone_number_input: phone,
      locality_input: parsed.data.locality ?? null,
      organization_input: parsed.data.organization ?? null,
      show_public_name_input: parsed.data.show_public_name,
    });

    if (error) {
      if (error.code === "23505") {
        return jsonResponse(
          {
            code: "PLEDGE_ALREADY_RECORDED",
            message: "A pledge is already recorded for this phone number.",
          },
          409,
        );
      }
      return unavailableResponse();
    }
  } catch {
    return unavailableResponse();
  }

  // Deliberately do not return the inserted row or any contact data.
  return jsonResponse({ code: "PLEDGE_RECORDED" }, 201);
}

export async function GET() {
  const supabase = adminClientOrNull();
  if (!supabase) return unavailableResponse();

  try {
    const { data, error } = await supabase.rpc("list_plate_pledge_names", {
      limit_input: PUBLIC_PLEDGE_LIMIT,
    });

    if (error) return unavailableResponse();

    const pledges = (Array.isArray(data) ? data : [])
        .map((row) =>
          row && typeof row === "object" && "display_name" in row && "created_at" in row
            ? publicPledge({
                display_name: String(row.display_name),
                created_at: String(row.created_at),
              })
            : null,
        )
        .filter((pledge): pledge is NonNullable<typeof pledge> => pledge !== null);

    return jsonResponse({ pledges, count: pledges.length });
  } catch {
    return unavailableResponse();
  }
}
