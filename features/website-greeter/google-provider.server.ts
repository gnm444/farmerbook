import { z } from "zod";
import type { WebsiteGreeterProviderConfiguration } from "./provider-config";
import {
  buildGoogleAdkInvocation,
  buildGoogleWebsiteGreeterRequest,
  googleWebsiteGreeterResponseSchema,
  isGoogleResponseLocaleCompatible,
  type GoogleWebsiteGreeterResponse,
} from "./google-contract";
import type { WebsiteGreeterInferenceRequest } from "./provider.server";
import {
  WEBSITE_GREETER_CONTEXT_CONSENT_VERSION,
  isWebsiteGreeterMemoryScopeId,
  sanitizeWebsiteGreeterContextText,
} from "./conversation";

const GOOGLE_ACCESS_SCOPE = "https://www.googleapis.com/auth/cloud-platform";
const TOKEN_BROKER_URL = "https://google-identity-broker.internal/v1/token";
const MAX_JSON_RESPONSE_BYTES = 32_768;
const MAX_SSE_RESPONSE_BYTES = 262_144;
const MAX_RETRIEVED_MEMORY_FACTS = 3;
const MAX_RETRIEVED_MEMORY_CHARACTERS = 1_200;
const MAX_MEMORY_DELETE_PAGES = 4;

const accessTokenSchema = z.object({
  accessToken: z.string().min(20).max(4_096)
    .regex(/^[A-Za-z0-9._~+/\-]+$/),
  expiresAt: z.string().datetime({ offset: true }),
}).strict();

const sessionOutputSchema = z.object({
  id: z.string().trim().regex(/^[A-Za-z0-9._-]{1,128}$/).optional(),
  name: z.string().trim().max(512).optional(),
}).passthrough().refine((value) => Boolean(value.id || value.name), {
  message: "GOOGLE_GREETER_SESSION_ID_MISSING",
});

const retrievedMemoriesSchema = z.object({
  retrievedMemories: z.array(z.object({
    memory: z.object({
      name: z.string().trim().min(1).max(512),
      fact: z.string().optional(),
    }).passthrough(),
  }).passthrough()).default([]),
  nextPageToken: z.string().trim().max(2_048).optional(),
}).passthrough();

const memoryOperationSchema = z.object({
  name: z.string().trim().min(1).max(512),
  done: z.boolean().optional(),
  error: z.unknown().optional(),
}).passthrough();

export type GoogleIdentityBrokerBinding = {
  fetch(request: Request): Promise<Response>;
};

type GoogleProviderConfiguration = Extract<
  WebsiteGreeterProviderConfiguration,
  { provider: "google_vertex_agent_engine" }
>;

export type GoogleWebsiteGreeterTransportEnvironment = {
  GOOGLE_IDENTITY_BROKER?: GoogleIdentityBrokerBinding;
};

function boundedError(code: string, status?: number) {
  return new Error(status ? `${code}_${status}` : code);
}

async function readBoundedText(response: Response, limit: number) {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > limit) throw boundedError("AI_GOOGLE_RESPONSE_TOO_LARGE");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw boundedError("AI_GOOGLE_RESPONSE_TOO_LARGE");
    }
    text += decoder.decode(value, { stream: true });
  }
  return text + decoder.decode();
}

async function readBoundedJson(response: Response) {
  const text = await readBoundedText(response, MAX_JSON_RESPONSE_BYTES);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw boundedError("AI_GOOGLE_RESPONSE_INVALID");
  }
}

function withTimeout(milliseconds: number) {
  return AbortSignal.timeout(milliseconds);
}

async function accessToken(
  binding: GoogleIdentityBrokerBinding,
  configuration: GoogleProviderConfiguration,
) {
  let response: Response;
  try {
    response = await binding.fetch(new Request(TOKEN_BROKER_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        audience: configuration.workloadIdentityAudience,
        serviceAccountEmail: configuration.serviceAccountEmail,
        scope: GOOGLE_ACCESS_SCOPE,
      }),
      signal: withTimeout(5_000),
    }));
  } catch {
    throw boundedError("AI_GOOGLE_AUTH_UNAVAILABLE");
  }
  if (!response.ok) {
    throw boundedError("AI_GOOGLE_AUTH_UNAVAILABLE", response.status);
  }
  const parsed = accessTokenSchema.safeParse(await readBoundedJson(response));
  if (!parsed.success) throw boundedError("AI_GOOGLE_AUTH_RESPONSE_INVALID");
  const expiresAt = Date.parse(parsed.data.expiresAt);
  const remainingMs = expiresAt - Date.now();
  if (remainingMs < 30_000 || remainingMs > 3_900_000) {
    throw boundedError("AI_GOOGLE_AUTH_EXPIRY_INVALID");
  }
  return parsed.data.accessToken;
}

function vertexUrl(
  configuration: GoogleProviderConfiguration,
  operation: "query" | "streamQuery",
) {
  const url = new URL(
    `https://${configuration.serviceEndpoint}/v1/`
      + `${configuration.agentEngineResource}:${operation}`,
  );
  if (operation === "streamQuery") url.searchParams.set("alt", "sse");
  return url;
}

async function vertexRequest(options: {
  configuration: GoogleProviderConfiguration;
  accessToken: string;
  operation: "query" | "streamQuery";
  body: Record<string, unknown>;
  timeoutMs: number;
}) {
  let response: Response;
  try {
    response = await fetch(vertexUrl(options.configuration, options.operation), {
      method: "POST",
      headers: {
        authorization: `Bearer ${options.accessToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(options.body),
      signal: withTimeout(options.timeoutMs),
    });
  } catch {
    throw boundedError("AI_GOOGLE_TRANSPORT_UNAVAILABLE");
  }
  if (!response.ok) {
    throw boundedError("AI_GOOGLE_UPSTREAM_REJECTED", response.status);
  }
  return response;
}

function memoryUrl(
  configuration: GoogleProviderConfiguration,
  resourceOrSuffix: string,
) {
  const resource = resourceOrSuffix.startsWith("projects/")
    ? resourceOrSuffix
    : `${configuration.agentEngineResource}/${resourceOrSuffix}`;
  return new URL(
    `https://${configuration.serviceEndpoint}/v1beta1/${resource}`,
  );
}

async function memoryRequest(options: {
  configuration: GoogleProviderConfiguration;
  accessToken: string;
  method: "GET" | "POST" | "DELETE";
  resourceOrSuffix: string;
  body?: Record<string, unknown>;
  timeoutMs?: number;
  allowNotFound?: boolean;
}) {
  let response: Response;
  try {
    response = await fetch(
      memoryUrl(options.configuration, options.resourceOrSuffix),
      {
        method: options.method,
        headers: {
          authorization: `Bearer ${options.accessToken}`,
          ...(options.body ? { "content-type": "application/json" } : {}),
        },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: withTimeout(options.timeoutMs ?? 5_000),
      },
    );
  } catch {
    throw boundedError("AI_GOOGLE_MEMORY_TRANSPORT_UNAVAILABLE");
  }
  if (options.allowNotFound && response.status === 404) return null;
  if (!response.ok) {
    throw boundedError("AI_GOOGLE_MEMORY_UPSTREAM_REJECTED", response.status);
  }
  return readBoundedJson(response);
}

function consentedMemoryScopeId(request: WebsiteGreeterInferenceRequest) {
  const mapping = request.session?.providerSession;
  return request.session?.consentVersion === WEBSITE_GREETER_CONTEXT_CONSENT_VERSION
    && mapping?.providerId === "google_vertex_agent_engine"
    && isWebsiteGreeterMemoryScopeId(mapping.providerSessionId)
    ? mapping.providerSessionId
    : null;
}

function memoryScope(scopeId: string) {
  // The provider scope value is a random server-only consent identifier, not
  // a FarmerBook account or browser identity. The `user_id` key matches the
  // exact customization scope configured on the approved Memory Bank.
  return { user_id: scopeId };
}

function boundedMemoryFacts(value: unknown) {
  const parsed = retrievedMemoriesSchema.safeParse(value);
  if (!parsed.success) throw boundedError("AI_GOOGLE_MEMORY_RESPONSE_INVALID");
  const facts: string[] = [];
  let characters = 0;
  for (const item of parsed.data.retrievedMemories) {
    if (facts.length >= MAX_RETRIEVED_MEMORY_FACTS) break;
    const fact = sanitizeWebsiteGreeterContextText(item.memory.fact ?? "");
    if (!fact) continue;
    const remaining = MAX_RETRIEVED_MEMORY_CHARACTERS - characters;
    if (remaining <= 0) break;
    facts.push(fact.slice(0, remaining));
    characters += Math.min(fact.length, remaining);
  }
  return facts;
}

async function retrieveMemoryFacts(options: {
  configuration: GoogleProviderConfiguration;
  accessToken: string;
  scopeId: string;
  message: string;
}) {
  const searchQuery = sanitizeWebsiteGreeterContextText(options.message);
  if (!searchQuery) return [];
  const response = await memoryRequest({
    configuration: options.configuration,
    accessToken: options.accessToken,
    method: "POST",
    resourceOrSuffix: "memories:retrieve",
    body: {
      scope: memoryScope(options.scopeId),
      similaritySearchParams: {
        searchQuery,
        topK: MAX_RETRIEVED_MEMORY_FACTS,
      },
    },
  });
  return boundedMemoryFacts(response);
}

async function generateMemories(options: {
  configuration: GoogleProviderConfiguration;
  accessToken: string;
  scopeId: string;
  userMessage: string;
  assistantMessage: string;
}) {
  const userMessage = sanitizeWebsiteGreeterContextText(options.userMessage);
  const assistantMessage = sanitizeWebsiteGreeterContextText(
    options.assistantMessage,
  );
  if (!userMessage || !assistantMessage) return;
  const response = await memoryRequest({
    configuration: options.configuration,
    accessToken: options.accessToken,
    method: "POST",
    resourceOrSuffix: "memories:generate",
    body: {
      scope: memoryScope(options.scopeId),
      directContentsSource: {
        events: [
          { content: { role: "user", parts: [{ text: userMessage }] } },
          { content: { role: "model", parts: [{ text: assistantMessage }] } },
        ],
      },
    },
  });
  const parsed = memoryOperationSchema.safeParse(response);
  if (!parsed.success) throw boundedError("AI_GOOGLE_MEMORY_RESPONSE_INVALID");
}

function validatedMemoryName(
  configuration: GoogleProviderConfiguration,
  value: string,
) {
  const prefix = `${configuration.agentEngineResource}/memories/`;
  const memoryId = value.startsWith(prefix) ? value.slice(prefix.length) : "";
  if (!/^[A-Za-z0-9._-]{1,128}$/u.test(memoryId)) {
    throw boundedError("AI_GOOGLE_MEMORY_NAME_INVALID");
  }
  return value;
}

async function waitForMemoryOperation(options: {
  configuration: GoogleProviderConfiguration;
  accessToken: string;
  operation: unknown;
}) {
  let operation = memoryOperationSchema.parse(options.operation);
  for (let attempt = 0; attempt < 8; attempt += 1) {
    if (operation.error) throw boundedError("AI_GOOGLE_MEMORY_OPERATION_FAILED");
    if (operation.done === true) return;
    await new Promise((resolve) => setTimeout(resolve, 250));
    const next = await memoryRequest({
      configuration: options.configuration,
      accessToken: options.accessToken,
      method: "GET",
      resourceOrSuffix: operation.name,
    });
    operation = memoryOperationSchema.parse(next);
  }
  throw boundedError("AI_GOOGLE_MEMORY_OPERATION_TIMEOUT");
}

export async function deleteGoogleWebsiteGreeterMemories(options: {
  configuration: GoogleProviderConfiguration;
  identityBroker: GoogleIdentityBrokerBinding;
  scopeId: string;
}) {
  if (!isWebsiteGreeterMemoryScopeId(options.scopeId)) {
    throw boundedError("AI_GOOGLE_MEMORY_SCOPE_INVALID");
  }
  const token = await accessToken(options.identityBroker, options.configuration);
  const names = new Set<string>();
  let pageToken: string | undefined;
  for (let page = 0; page < MAX_MEMORY_DELETE_PAGES; page += 1) {
    const response = await memoryRequest({
      configuration: options.configuration,
      accessToken: token,
      method: "POST",
      resourceOrSuffix: "memories:retrieve",
      body: {
        scope: memoryScope(options.scopeId),
        simpleRetrievalParams: {
          pageSize: 100,
          ...(pageToken ? { pageToken } : {}),
        },
      },
    });
    const parsed = retrievedMemoriesSchema.safeParse(response);
    if (!parsed.success) throw boundedError("AI_GOOGLE_MEMORY_RESPONSE_INVALID");
    for (const item of parsed.data.retrievedMemories) {
      names.add(validatedMemoryName(options.configuration, item.memory.name));
    }
    pageToken = parsed.data.nextPageToken;
    if (!pageToken) break;
    if (page === MAX_MEMORY_DELETE_PAGES - 1) {
      throw boundedError("AI_GOOGLE_MEMORY_DELETE_SCOPE_TOO_LARGE");
    }
  }
  for (const name of names) {
    const operation = await memoryRequest({
      configuration: options.configuration,
      accessToken: token,
      method: "DELETE",
      resourceOrSuffix: name,
      allowNotFound: true,
    });
    if (operation) {
      await waitForMemoryOperation({
        configuration: options.configuration,
        accessToken: token,
        operation,
      });
    }
  }
  const verification = await memoryRequest({
    configuration: options.configuration,
    accessToken: token,
    method: "POST",
    resourceOrSuffix: "memories:retrieve",
    body: {
      scope: memoryScope(options.scopeId),
      simpleRetrievalParams: { pageSize: 1 },
    },
  });
  const verified = retrievedMemoriesSchema.safeParse(verification);
  if (!verified.success) throw boundedError("AI_GOOGLE_MEMORY_RESPONSE_INVALID");
  if (verified.data.retrievedMemories.length > 0
    || verified.data.nextPageToken) {
    throw boundedError("AI_GOOGLE_MEMORY_DELETE_NOT_CONFIRMED");
  }
  return { deleted: names.size };
}

function sessionIdFromQueryResponse(value: unknown) {
  const envelope = z.object({ output: z.unknown() }).passthrough().safeParse(value);
  if (!envelope.success) throw boundedError("AI_GOOGLE_SESSION_RESPONSE_INVALID");
  const parsed = sessionOutputSchema.safeParse(envelope.data.output);
  if (!parsed.success) throw boundedError("AI_GOOGLE_SESSION_RESPONSE_INVALID");
  const fromName = parsed.data.name?.split("/").at(-1);
  const sessionId = parsed.data.id ?? fromName;
  if (!sessionId || !/^[A-Za-z0-9._-]{1,128}$/.test(sessionId)) {
    throw boundedError("AI_GOOGLE_SESSION_RESPONSE_INVALID");
  }
  return sessionId;
}

function parseSseEvents(payload: string) {
  const events: unknown[] = [];
  for (const block of payload.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n")
      .trim();
    if (!data || data === "[DONE]") continue;
    try {
      events.push(JSON.parse(data));
    } catch {
      throw boundedError("AI_GOOGLE_SSE_INVALID");
    }
  }
  if (!events.length) throw boundedError("AI_GOOGLE_SSE_EMPTY");
  return events;
}

function eventRecord(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return record.output && typeof record.output === "object"
    ? record.output as Record<string, unknown>
    : record;
}

function responseFromEvents(
  requestId: string,
  locale: WebsiteGreeterInferenceRequest["locale"],
  events: readonly unknown[],
): GoogleWebsiteGreeterResponse {
  let finalText = "";
  let partialText = "";
  let inputTokens: number | null = null;
  let outputTokens: number | null = null;
  for (const rawEvent of events) {
    const event = eventRecord(rawEvent);
    if (!event) continue;
    const content = event.content;
    if (content && typeof content === "object") {
      const parts = (content as { parts?: unknown }).parts;
      if (Array.isArray(parts)) {
        const nextText = parts
          .map((part) => part && typeof part === "object"
            && (part as { thought?: unknown }).thought !== true
            ? (part as { text?: unknown }).text
            : null)
          .filter((part): part is string => typeof part === "string")
          .join(" ")
          .trim();
        if (nextText) {
          if (event.partial === true) partialText += nextText;
          else finalText = nextText;
        }
      }
    }
    const usage = event.usageMetadata ?? event.usage_metadata;
    if (usage && typeof usage === "object") {
      const record = usage as Record<string, unknown>;
      const nextInput = record.promptTokenCount ?? record.prompt_token_count;
      const nextOutput = record.candidatesTokenCount ?? record.candidates_token_count;
      if (Number.isInteger(nextInput) && Number.isInteger(nextOutput)) {
        inputTokens = nextInput as number;
        outputTokens = nextOutput as number;
      }
    }
  }
  const parsed = googleWebsiteGreeterResponseSchema.safeParse({
    contractVersion: "farmerbook.website-greeter.v1",
    requestId,
    text: finalText || partialText,
    providerSessionId: null,
    usage: inputTokens === null || outputTokens === null
      ? null
      : { inputTokens, outputTokens },
  });
  if (!parsed.success) throw boundedError("AI_GOOGLE_RESPONSE_INVALID");
  if (!isGoogleResponseLocaleCompatible(parsed.data.text, locale)) {
    throw boundedError("AI_GOOGLE_RESPONSE_LOCALE_INVALID");
  }
  return parsed.data;
}

export async function invokeGoogleWebsiteGreeter(options: {
  configuration: GoogleProviderConfiguration;
  inference: WebsiteGreeterInferenceRequest;
  identityBroker: GoogleIdentityBrokerBinding;
}) {
  const requestId = crypto.randomUUID();
  const contract = buildGoogleWebsiteGreeterRequest(requestId, options.inference);
  const token = await accessToken(options.identityBroker, options.configuration);
  const scopeId = consentedMemoryScopeId(options.inference);
  let retrievedMemoryFacts: string[] = [];
  if (scopeId) {
    try {
      retrievedMemoryFacts = await retrieveMemoryFacts({
        configuration: options.configuration,
        accessToken: token,
        scopeId,
        message: options.inference.message,
      });
    } catch {
      console.warn("WEBSITE_GREETER_MEMORY_RETRIEVAL_FAILED");
    }
  }
  const invocation = buildGoogleAdkInvocation(
    contract,
    options.inference.systemPrompt,
    retrievedMemoryFacts,
  );
  const sessionResponse = await vertexRequest({
    configuration: options.configuration,
    accessToken: token,
    operation: "query",
    body: {
      class_method: "async_create_session",
      input: { user_id: invocation.userId },
    },
    timeoutMs: 5_000,
  });
  const sessionId = sessionIdFromQueryResponse(
    await readBoundedJson(sessionResponse),
  );
  let deletionFailed = false;
  let result: GoogleWebsiteGreeterResponse;
  try {
    const streamResponse = await vertexRequest({
      configuration: options.configuration,
      accessToken: token,
      operation: "streamQuery",
      body: {
        class_method: "async_stream_query",
        input: {
          user_id: invocation.userId,
          session_id: sessionId,
          message: invocation.message,
        },
      },
      timeoutMs: 15_000,
    });
    const events = parseSseEvents(
      await readBoundedText(streamResponse, MAX_SSE_RESPONSE_BYTES),
    );
    result = responseFromEvents(requestId, options.inference.locale, events);
  } finally {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await vertexRequest({
          configuration: options.configuration,
          accessToken: token,
          operation: "query",
          body: {
            class_method: "async_delete_session",
            input: { user_id: invocation.userId, session_id: sessionId },
          },
          timeoutMs: 5_000,
        });
        deletionFailed = false;
        break;
      } catch {
        deletionFailed = true;
      }
    }
    if (deletionFailed) {
      throw boundedError("AI_GOOGLE_SESSION_DELETE_FAILED");
    }
  }
  if (scopeId) {
    try {
      await generateMemories({
        configuration: options.configuration,
        accessToken: token,
        scopeId,
        userMessage: options.inference.message,
        assistantMessage: result.text,
      });
    } catch {
      console.warn("WEBSITE_GREETER_MEMORY_GENERATION_FAILED");
    }
  }
  return result;
}
