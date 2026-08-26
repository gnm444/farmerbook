import { expect, test } from "@playwright/test";

test("Featured Farmers collection presents a sourced historical story", async ({
  page,
}) => {
  await page.goto("/featured-farmers");
  await expect(
    page.getByRole("heading", { level: 1, name: "Featured Farmers" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "L. Narayana Reddy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sandeep Dasari" })).toBeVisible();
  await expect(page.getByText("1 social account")).toBeVisible();
  await expect(page.getByText(/Historical profile · archival video/i)).toBeVisible();
  await expect(page.getByText(/verified member/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /message|buy|enquire/i })).toHaveCount(0);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("Sandeep profile is attributed, responsive and non-orderable", async ({
  page,
}) => {
  await page.goto("/featured-farmers/sandeep-dasari-avani-van-farms");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sandeep Dasari" }),
  ).toBeVisible();
  await expect(page.getByText("Bommalaramaram · Telangana")).toBeVisible();
  await expect(page.getByText("Published 25 Aug 2026")).toBeVisible();
  await expect(page.getByText("Fact-checked 25 Aug 2026")).toBeVisible();
  await expect(
    page.getByText(
      "Non-certified organic farmer (paperwork not yet completed to prove certification).",
    ),
  ).toBeVisible();

  const products = page.locator("#reported-products");
  await expect(
    products.getByRole("heading", { name: "Reported farm products" }),
  ).toBeVisible();
  await expect(products.getByRole("listitem")).toHaveCount(9);
  await expect(products.getByText(/not an order page/i)).toBeVisible();
  const story = page.locator(".featured-story");
  await expect(story.locator('a[href^="/store"]')).toHaveCount(0);
  await expect(story.locator('a[href*="marketplace"]')).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /buy|order|enquir|message/i }),
  ).toHaveCount(0);
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  await expect(
    page.getByRole("img", {
      name: "Sandeep Dasari seated beside a Gir cow at Avani Van Farms",
    }),
  ).toBeVisible();
  await expect(page.locator(".featured-story__hero-background img")).toHaveAttribute(
    "src",
    /PaJk_KSsD5I\/maxresdefault\.jpg/,
  );
  await expect(
    page.locator(".featured-story__coverage .featured-story__video-thumbnail img"),
  ).toHaveCount(3);
  await expect(page.getByText("Gir cows", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Ongole/i)).toHaveCount(0);

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
      name: /Watch the source video featuring L\. Narayana Reddy/i,
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
