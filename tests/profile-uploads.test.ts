import { describe, expect, it } from "vitest";
import { uploadAvatar, uploadProfileCover } from "@/features/profiles/uploads";

describe("profile photo uploads", () => {
  it("rejects unsupported image types", async () => {
    const file = new File(["photo"], "profile.gif", { type: "image/gif" });

    await expect(uploadAvatar(file)).rejects.toThrow(
      "Choose a JPEG, PNG or WebP image.",
    );
  });

  it("rejects images larger than 5 MB", async () => {
    const file = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      "profile.webp",
      { type: "image/webp" },
    );

    await expect(uploadAvatar(file)).rejects.toThrow(
      "Avatar images must be 5 MB or smaller.",
    );
  });

  it("uses the same bounded validation for profile backgrounds", async () => {
    const unsupported = new File(["photo"], "cover.gif", { type: "image/gif" });
    await expect(uploadProfileCover(unsupported)).rejects.toThrow(
      "Choose a JPEG, PNG or WebP image.",
    );

    const oversized = new File(
      [new Uint8Array(5 * 1024 * 1024 + 1)],
      "cover.webp",
      { type: "image/webp" },
    );
    await expect(uploadProfileCover(oversized)).rejects.toThrow(
      "Background images must be 5 MB or smaller.",
    );
  });
});
