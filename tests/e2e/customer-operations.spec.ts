import { expect, test } from "@playwright/test";

test("participant support stays visibly disabled without pilot configuration", async ({
  page,
}) => {
  await page.goto("/support");

  await expect(
    page.getByRole("heading", { name: "FarmerBook support" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "support pilot is not open" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Submit question" }),
  ).toBeDisabled();
  await expect(page.getByText(/draft content is never shown/i)).toHaveCount(0);
});

test("administrator review has no send or publish control", async ({ page }) => {
  await page.goto("/admin/operations");

  await expect(
    page.getByRole("heading", { name: "Support and social review" }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "pilot is disabled" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Create brief" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /send|post|publish/i }),
  ).toHaveCount(0);
  await expect(page.getByText(/^Published$/i)).toHaveCount(0);
});
