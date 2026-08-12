import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const protectedActionFiles = [
  "features/auth/actions.ts",
  "features/marketplace/actions.ts",
  "features/messages/actions.ts",
  "features/moderation/actions.ts",
  "features/network/actions.ts",
  "features/offers/actions.ts",
  "features/organizations/actions.ts",
  "features/posts/actions.ts",
  "features/profiles/account-actions.ts",
  "features/profiles/actions.ts",
  "features/reviews/actions.ts",
];

const protectedClientMutationFiles = [
  "features/posts/uploads.ts",
  "features/profiles/uploads.ts",
];

describe("server-action error boundary", () => {
  it.each(protectedActionFiles)(
    "does not return raw database messages from %s",
    (file) => {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");

      expect(source).not.toMatch(
        /message:\s*(?:[A-Za-z_$][\w$]*Error|error)\.message\b/,
      );
    },
  );

  it.each(protectedClientMutationFiles)(
    "does not throw raw storage messages from %s",
    (file) => {
      const source = readFileSync(resolve(process.cwd(), file), "utf8");

      expect(source).not.toMatch(/throw new Error\(error\.message\)/);
    },
  );
});
