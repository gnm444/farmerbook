export const outreachAutonomyReadinessCodes = [
  "OUTREACH_AUTONOMY_READY",
  "OUTREACH_FEATURE_DISABLED",
  "OUTREACH_SUPABASE_NOT_CONFIGURED",
  "OUTREACH_SERVICE_ROLE_NOT_CONFIGURED",
  "OUTREACH_PROCESSOR_SECRET_NOT_CONFIGURED",
  "OUTREACH_CONSENT_SIGNING_NOT_CONFIGURED",
  "OUTREACH_INVITATION_SIGNING_NOT_CONFIGURED",
  "OUTREACH_TURNSTILE_NOT_CONFIGURED",
  "OUTREACH_PROVIDER_KIND_NOT_CONFIGURED",
  "OUTREACH_BROADCAST_STREAM_NOT_CONFIGURED",
  "OUTREACH_PROVIDER_NOT_CONFIGURED",
] as const;

export type OutreachAutonomyReadinessCode =
  (typeof outreachAutonomyReadinessCodes)[number];

export type OutreachAutonomyReadiness = {
  ready: boolean;
  code: OutreachAutonomyReadinessCode;
  action: string;
};

type OutreachEnvironment = Record<string, string | undefined>;

const actions: Record<OutreachAutonomyReadinessCode, string> = {
  OUTREACH_AUTONOMY_READY:
    "All repository-verifiable consented-delivery prerequisites are present.",
  OUTREACH_FEATURE_DISABLED:
    "Enable the outreach application flag only after the database release and runtime controls are ready.",
  OUTREACH_SUPABASE_NOT_CONFIGURED:
    "Configure the Supabase project URL and publishable key for this deployment.",
  OUTREACH_SERVICE_ROLE_NOT_CONFIGURED:
    "Install the Supabase service-role credential in the encrypted deployment secret store.",
  OUTREACH_PROCESSOR_SECRET_NOT_CONFIGURED:
    "Install the selected private processor bearer with at least 32 random bytes.",
  OUTREACH_CONSENT_SIGNING_NOT_CONFIGURED:
    "Install the consent signing secret with at least 32 random bytes.",
  OUTREACH_INVITATION_SIGNING_NOT_CONFIGURED:
    "Install the invitation signing secret with at least 32 random bytes.",
  OUTREACH_TURNSTILE_NOT_CONFIGURED:
    "Configure the route-bound Turnstile site and secret keys before accepting consent requests.",
  OUTREACH_PROVIDER_KIND_NOT_CONFIGURED:
    "Set the reviewed provider kind to postmark; no other autonomous email adapter is approved.",
  OUTREACH_BROADCAST_STREAM_NOT_CONFIGURED:
    "Configure the separate Postmark Broadcast stream used only for separately consented follow-ups.",
  OUTREACH_PROVIDER_NOT_CONFIGURED:
    "Complete the FarmerBook sender, postal footer, HTTPS origin, Postmark streams, inbound address, action signing and authenticated webhook settings.",
};

function result(code: OutreachAutonomyReadinessCode): OutreachAutonomyReadiness {
  return {
    ready: code === "OUTREACH_AUTONOMY_READY",
    code,
    action: actions[code],
  };
}

function enabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

function configured(value: string | undefined, minimumLength: number) {
  return (value?.trim().length ?? 0) >= minimumLength;
}

export function evaluateOutreachAutonomyReadiness(input: {
  environment?: OutreachEnvironment;
  providerConfigured: boolean;
  processor: "managed_agent" | "dedicated_route";
}): OutreachAutonomyReadiness {
  const environment = input.environment ?? process.env;
  if (!enabled(environment.ENABLE_OUTREACH_AGENT)) {
    return result("OUTREACH_FEATURE_DISABLED");
  }
  if (
    !configured(environment.NEXT_PUBLIC_SUPABASE_URL, 12)
    || !configured(environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, 12)
  ) {
    return result("OUTREACH_SUPABASE_NOT_CONFIGURED");
  }
  if (!configured(environment.SUPABASE_SERVICE_ROLE_KEY, 20)) {
    return result("OUTREACH_SERVICE_ROLE_NOT_CONFIGURED");
  }
  const processorSecret = input.processor === "managed_agent"
    ? environment.MANAGED_AGENT_PROCESSOR_SECRET
    : environment.OUTREACH_PROCESSOR_SECRET;
  if (!configured(processorSecret, 32)) {
    return result("OUTREACH_PROCESSOR_SECRET_NOT_CONFIGURED");
  }
  if (!configured(environment.OUTREACH_CONSENT_SIGNING_SECRET, 32)) {
    return result("OUTREACH_CONSENT_SIGNING_NOT_CONFIGURED");
  }
  if (!configured(environment.OUTREACH_INVITATION_SIGNING_SECRET, 32)) {
    return result("OUTREACH_INVITATION_SIGNING_NOT_CONFIGURED");
  }
  if (
    !configured(environment.NEXT_PUBLIC_TURNSTILE_SITE_KEY, 3)
    || !configured(environment.TURNSTILE_SECRET_KEY, 8)
  ) {
    return result("OUTREACH_TURNSTILE_NOT_CONFIGURED");
  }
  if (environment.OUTREACH_PROVIDER_KIND?.trim().toLowerCase() !== "postmark") {
    return result("OUTREACH_PROVIDER_KIND_NOT_CONFIGURED");
  }
  if (!configured(environment.POSTMARK_BROADCAST_MESSAGE_STREAM, 2)) {
    return result("OUTREACH_BROADCAST_STREAM_NOT_CONFIGURED");
  }
  if (!input.providerConfigured) {
    return result("OUTREACH_PROVIDER_NOT_CONFIGURED");
  }
  return result("OUTREACH_AUTONOMY_READY");
}
