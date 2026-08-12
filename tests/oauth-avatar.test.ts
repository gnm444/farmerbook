import { describe, expect, it } from "vitest";
import {
  isTrustedOAuthAvatarUrl,
  trustedOAuthAvatarForUser,
} from "@/features/profiles/oauth-avatar";

describe("OAuth avatar selection", () => {
  it("accepts provider-owned HTTPS avatar hosts", () => {
    expect(
      isTrustedOAuthAvatarUrl(
        "google",
        "https://lh3.googleusercontent.com/a/photo.jpg",
      ),
    ).toBe(true);
    expect(
      isTrustedOAuthAvatarUrl(
        "linkedin_oidc",
        "https://media.licdn.com/dms/image/avatar.jpg",
      ),
    ).toBe(true);
  });

  it("rejects arbitrary, insecure and user-entered image URLs", () => {
    expect(
      isTrustedOAuthAvatarUrl("google", "https://attacker.example/photo.jpg"),
    ).toBe(false);
    expect(
      isTrustedOAuthAvatarUrl(
        "google",
        "http://lh3.googleusercontent.com/photo.jpg",
      ),
    ).toBe(false);
    expect(isTrustedOAuthAvatarUrl("email", "https://example.com/me.jpg")).toBe(
      false,
    );
  });

  it("prefers identity metadata from an actual social provider", () => {
    expect(
      trustedOAuthAvatarForUser({
        app_metadata: { provider: "email" },
        user_metadata: { avatar_url: "https://attacker.example/photo.jpg" },
        identities: [
          {
            id: "identity-1",
            user_id: "user-1",
            identity_id: "identity-1",
            provider: "google",
            created_at: "2026-08-06T00:00:00.000Z",
            updated_at: "2026-08-06T00:00:00.000Z",
            identity_data: {
              picture: "https://lh3.googleusercontent.com/a/photo.jpg",
            },
            last_sign_in_at: "2026-08-06T00:00:00.000Z",
          },
        ],
      })?.provider,
    ).toBe("google");
  });
});
