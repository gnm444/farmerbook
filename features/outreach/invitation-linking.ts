import { createAdminClient } from "@/lib/supabase/admin";
import { sha256, uuidFromText } from "./crypto";
import { verifyOutreachInvitationToken } from "./invitation-token";

type InvitationLinkResult =
  | { status: "active"; expiresAt: number }
  | { status: "linked"; prospectStatus: string }
  | { status: "invalid" }
  | { status: "unavailable" };

function invitationSecret() {
  return process.env.OUTREACH_INVITATION_SIGNING_SECRET ?? "";
}

function firstRow(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

export async function validateOutreachInvitationToken(
  token: string,
): Promise<InvitationLinkResult> {
  const payload = await verifyOutreachInvitationToken(token, invitationSecret());
  if (!payload) return { status: "invalid" };
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc(
      "validate_outreach_invitation",
      { token_hash_input: await sha256(token) },
    );
    if (error) return { status: "unavailable" };
    const row = firstRow(data) as
      | { code?: unknown; invitation_expires_at?: unknown }
      | null;
    if (row?.code !== "ACTIVE") return { status: "invalid" };
    const databaseExpiry = new Date(String(row.invitation_expires_at)).getTime();
    if (!Number.isFinite(databaseExpiry) || databaseExpiry !== payload.expiresAt) {
      return { status: "invalid" };
    }
    return { status: "active", expiresAt: payload.expiresAt };
  } catch {
    return { status: "unavailable" };
  }
}

export async function redeemOutreachInvitationToken(input: {
  token: string;
  profileId: string;
}): Promise<InvitationLinkResult> {
  const payload = await verifyOutreachInvitationToken(
    input.token,
    invitationSecret(),
  );
  if (!payload) return { status: "invalid" };
  try {
    const tokenHash = await sha256(input.token);
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("redeem_outreach_invitation", {
      token_hash_input: tokenHash,
      profile_id_input: input.profileId,
      idempotency_key_input: await uuidFromText(
        `outreach-invitation-redemption:${tokenHash}:${input.profileId}`,
      ),
    });
    if (error) {
      const detail = String(error.details ?? error.message ?? "");
      return /INVITATION_(?:UNAVAILABLE|ALREADY_USED)|ACCOUNT_LINK_CONFLICT/.test(
        detail,
      )
        ? { status: "invalid" }
        : { status: "unavailable" };
    }
    const row = firstRow(data) as
      | { code?: unknown; prospect_status?: unknown }
      | null;
    if (
      row?.code !== "INVITATION_REDEEMED" &&
      row?.code !== "IDEMPOTENT_REPLAY"
    ) {
      return { status: "unavailable" };
    }
    return {
      status: "linked",
      prospectStatus: String(row.prospect_status ?? "onboarding"),
    };
  } catch {
    return { status: "unavailable" };
  }
}

export function readOutreachInvitationCookie(cookieHeader: string | null) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(
    /(?:^|;\s*)farmerbook_outreach_invite=([^;]+)/,
  );
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}
