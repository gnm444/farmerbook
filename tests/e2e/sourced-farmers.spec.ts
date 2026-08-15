import { expect, test } from "@playwright/test";

test("sourced Farmer research fails closed in the demo environment", async ({
  page,
}) => {
  const response = await page.goto("/admin/sourced-farmers");

  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText(
    "Private research · not a FarmerBook member",
  );
  await expect(page.getByLabel(/approved youtube channel seed/i)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /run one bounded batch/i }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", {
      name: /contact|send|invite|verify|connect|publish/i,
    }),
  ).toHaveCount(0);
});

test("sourced Farmer detail fails closed in the demo environment", async ({
  page,
}) => {
  const response = await page.goto(
    "/admin/sourced-farmers/11111111-1111-4111-8111-111111111111",
  );

  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).not.toContainText("Professional facts");
});

test("sourced Farmer routes declare private crawler metadata", async ({
  request,
}) => {
  for (const path of [
    "/admin/sourced-farmers",
    "/admin/sourced-farmers/11111111-1111-4111-8111-111111111111",
  ]) {
    const response = await request.get(path);
    expect(response.status()).toBe(404);
    expect(await response.text()).toContain("noindex");
  }
});
