import { z } from "zod";
import {
  actionExecutionReceiptSchema,
  sha256Schema,
  type ActionAuthorization,
  type ActionExecutionReceipt,
} from "./contracts";

const verificationEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("dispatch_recorded"),
      providerReceiptSha256: sha256Schema,
      at: z.iso.datetime({ offset: true }),
    })
    .strict(),
  z
    .object({
      type: z.literal("dispatch_failed"),
      failureCode: z.string().regex(/^[A-Z][A-Z0-9_]{2,80}$/),
      at: z.iso.datetime({ offset: true }),
    })
    .strict(),
  z
    .object({
      type: z.literal("dispatch_unknown"),
      failureCode: z.string().regex(/^[A-Z][A-Z0-9_]{2,80}$/),
      at: z.iso.datetime({ offset: true }),
    })
    .strict(),
  z
    .object({
      type: z.enum([
        "verification_confirmed",
        "verification_failed",
        "verification_unknown",
        "reconciliation_confirmed",
        "reconciliation_failed",
      ]),
      verifierActorId: z.uuid(),
      evidenceSha256: sha256Schema,
      failureCode: z
        .string()
        .regex(/^[A-Z][A-Z0-9_]{2,80}$/)
        .optional(),
      at: z.iso.datetime({ offset: true }),
    })
    .strict(),
  z
    .object({
      type: z.literal("compensation_confirmed"),
      verifierActorId: z.uuid(),
      evidenceSha256: sha256Schema,
      at: z.iso.datetime({ offset: true }),
    })
    .strict(),
]);

export type VerificationEvent = z.infer<typeof verificationEventSchema>;

export function createPreparedReceipt(input: {
  attemptId: string;
  authorization: ActionAuthorization;
  executorActorId: string;
  at: string;
}): ActionExecutionReceipt {
  return actionExecutionReceiptSchema.parse({
    attemptId: input.attemptId,
    authorizationId: input.authorization.authorizationId,
    executor: input.authorization.executor,
    actionType: input.authorization.actionType,
    payloadSha256: input.authorization.payloadSha256,
    state: "prepared",
    executorActorId: input.executorActorId,
    providerReceiptSha256: null,
    verifierActorId: null,
    verificationEvidenceSha256: null,
    failureCode: null,
    pauseRequired: false,
    updatedAt: input.at,
  });
}

function assertIndependentVerifier(
  receipt: ActionExecutionReceipt,
  verifierActorId: string,
  disallowedActorIds: readonly string[],
) {
  if (
    verifierActorId === receipt.executorActorId ||
    disallowedActorIds.includes(verifierActorId)
  ) {
    throw new Error("VERIFIER_ACTOR_CONFLICT");
  }
}

export function transitionExecutionReceipt(
  rawReceipt: unknown,
  rawEvent: unknown,
  options: {
    reversible: boolean;
    disallowedVerifierActorIds?: readonly string[];
  },
): ActionExecutionReceipt {
  const receipt = actionExecutionReceiptSchema.parse(rawReceipt);
  const event = verificationEventSchema.parse(rawEvent);
  const disallowedActorIds = options.disallowedVerifierActorIds ?? [];
  if (Date.parse(event.at) < Date.parse(receipt.updatedAt)) {
    throw new Error("ATTEMPT_EVENT_OUT_OF_ORDER");
  }

  if (event.type === "dispatch_recorded") {
    if (receipt.state !== "prepared") throw new Error("ATTEMPT_TRANSITION_DENIED");
    return {
      ...receipt,
      state: "dispatched",
      providerReceiptSha256: event.providerReceiptSha256,
      updatedAt: event.at,
    };
  }
  if (event.type === "dispatch_failed") {
    if (receipt.state !== "prepared" && receipt.state !== "dispatched") {
      throw new Error("ATTEMPT_TRANSITION_DENIED");
    }
    return {
      ...receipt,
      state: "failed",
      failureCode: event.failureCode,
      pauseRequired: receipt.state === "dispatched",
      updatedAt: event.at,
    };
  }
  if (event.type === "dispatch_unknown") {
    if (receipt.state !== "prepared" && receipt.state !== "dispatched") {
      throw new Error("ATTEMPT_TRANSITION_DENIED");
    }
    return {
      ...receipt,
      state: "unknown",
      failureCode: event.failureCode,
      pauseRequired: true,
      updatedAt: event.at,
    };
  }

  assertIndependentVerifier(
    receipt,
    event.verifierActorId,
    disallowedActorIds,
  );
  if (event.type === "compensation_confirmed") {
    if (
      !options.reversible ||
      (receipt.state !== "failed" && receipt.state !== "unknown")
    ) {
      throw new Error("ATTEMPT_COMPENSATION_DENIED");
    }
    return {
      ...receipt,
      state: "compensated",
      verifierActorId: event.verifierActorId,
      verificationEvidenceSha256: event.evidenceSha256,
      pauseRequired: false,
      updatedAt: event.at,
    };
  }
  if (
    event.type === "verification_confirmed" ||
    event.type === "verification_failed" ||
    event.type === "verification_unknown"
  ) {
    if (receipt.state !== "dispatched") {
      throw new Error("ATTEMPT_TRANSITION_DENIED");
    }
  } else if (receipt.state !== "unknown") {
    throw new Error("ATTEMPT_RECONCILIATION_DENIED");
  }

  if (
    event.type === "verification_confirmed" ||
    event.type === "reconciliation_confirmed"
  ) {
    return {
      ...receipt,
      state: "verified",
      verifierActorId: event.verifierActorId,
      verificationEvidenceSha256: event.evidenceSha256,
      failureCode: null,
      pauseRequired: false,
      updatedAt: event.at,
    };
  }
  if (
    event.type === "verification_failed" ||
    event.type === "reconciliation_failed"
  ) {
    return {
      ...receipt,
      state: "failed",
      verifierActorId: event.verifierActorId,
      verificationEvidenceSha256: event.evidenceSha256,
      failureCode: event.failureCode ?? "POSTCONDITION_FAILED",
      pauseRequired: true,
      updatedAt: event.at,
    };
  }
  return {
    ...receipt,
    state: "unknown",
    verifierActorId: event.verifierActorId,
    verificationEvidenceSha256: event.evidenceSha256,
    failureCode: event.failureCode ?? "VERIFICATION_UNKNOWN",
    pauseRequired: true,
    updatedAt: event.at,
  };
}

export function mayRetryDispatch(receipt: ActionExecutionReceipt) {
  const parsed = actionExecutionReceiptSchema.parse(receipt);
  return parsed.state === "prepared" && parsed.providerReceiptSha256 === null;
}
