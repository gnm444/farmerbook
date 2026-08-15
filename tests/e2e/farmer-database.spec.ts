import { expect, test } from "@playwright/test";

test("private Farmer database fails closed in the demo environment", async ({
  page,
}) => {
  const response = await page.goto("/admin/farmer-database");
  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText(
    "Private to your administrator account",
  );
  await expect(page.locator('input[type="email"]')).toHaveCount(0);
  await expect(page.getByRole("button", { name: /whatsapp/i })).toHaveCount(0);
});
