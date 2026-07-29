import { describe, expect, it } from "vitest";
import { signupSchema } from "@/features/auth/schemas";
import { relationshipSchema } from "@/features/network/schemas";
import { postSchema } from "@/features/posts/schemas";
import { profileSchema } from "@/features/profiles/schemas";

describe("FarmerBook validation", () => {
  it("accepts a bounded farmer profile", () => {
    expect(
      profileSchema.safeParse({
        fullName: "Meera Kulkarni",
        handle: "meera_kulkarni",
        participantType: "farmer",
        district: "Nashik",
        state: "Maharashtra",
        crops: ["Tomato"],
        bio: "Second-generation farmer.",
        preferredLanguage: "en",
        experienceYears: 8,
      }).success,
    ).toBe(true);
  });

  it("rejects unsafe handles and empty crop lists", () => {
    expect(
      profileSchema.safeParse({
        fullName: "Meera Kulkarni",
        handle: "Meera Kulkarni",
        participantType: "farmer",
        district: "Nashik",
        state: "Maharashtra",
        crops: [],
        bio: "",
        preferredLanguage: "en",
      }).success,
    ).toBe(false);
  });

  it("enforces the post body limit", () => {
    expect(
      postSchema.safeParse({
        body: "x".repeat(2001),
        category: "question",
      }).success,
    ).toBe(false);
  });

  it("requires terms acceptance during signup", () => {
    expect(
      signupSchema.safeParse({
        email: "farmer@example.com",
        password: "strong-password",
        acceptedTerms: false,
      }).success,
    ).toBe(false);
  });

  it("models follow state explicitly", () => {
    expect(
      relationshipSchema.parse({ profileId: "another-user", active: true }),
    ).toEqual({ profileId: "another-user", active: true });
  });
});
