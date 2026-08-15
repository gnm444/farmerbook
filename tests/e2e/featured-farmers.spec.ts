import { expect, test } from "@playwright/test";

test("Featured Farmers collection presents a sourced historical story", async ({
  page,
}) => {
  await page.goto("/featured-farmers");
  await expect(
    page.getByRole("heading", { level: 1, name: "Featured Farmers" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "L. Narayana Reddy" })).toBeVisible();
  await expect(page.getByText(/Historical profile · archival video/i)).toBeVisible();
  await expect(page.getByText(/verified member/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /message|buy|enquire/i })).toHaveCount(0);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("Narayana Reddy story shows the credited source-hosted documentary portrait", async ({
  page,
}) => {
  await page.goto("/featured-farmers/narayana-reddy");
  const portrait = page.getByRole("img", {
    name: /L\. Narayana Reddy in the official Sarala Virala documentary preview/i,
  });
  await expect(portrait).toBeVisible();
  await expect(portrait).toHaveAttribute("src", /i\.ytimg\.com/);
  await expect(
    page.getByRole("link", {
      name: /Watch the source documentary: L\. Narayana Reddy/i,
    }),
  ).toHaveAttribute("href", "https://www.youtube.com/watch?v=tNY9jjvvtr0");
  await expect(
    page.getByRole("link", { name: /Naguvana Creations, via YouTube/i }),
  ).toBeVisible();
});

test("obsolete intake route opens the new significance newsroom", async ({ page }) => {
  await page.goto("/admin/known-farmers");
  await expect(page).toHaveURL(/\/admin\/featured-farmers/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Featured Farmer newsroom" }),
  ).toBeVisible();
  await expect(page.getByText(/personally known/i)).toHaveCount(0);
  await expect(page.getByLabel(/Why might this work be significant/i)).toBeVisible();
});

test("unknown Featured Farmer stories stay unavailable", async ({ page }) => {
  const response = await page.goto("/featured-farmers/not-a-published-story");
  expect(response?.status()).toBe(404);
});
