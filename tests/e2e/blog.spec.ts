import { expect, test } from "@playwright/test";

const slug = "calculated-transition-to-natural-farming";
const gheeSlug = "ghee-purity-five-evidence-checks";
const traceabilitySlug = "food-traceability-beyond-a-trust-badge";

test("public farming blog publishes the reviewed transition article", async ({ page }) => {
  const collection = await page.goto("/blog");
  expect(collection?.status()).toBe(200);
  await expect(
    page.getByRole("heading", { level: 1, name: "Evidence-aware ideas for the field" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /safe.*habit can carry the biggest risk/i }).first(),
  ).toHaveAttribute("href", `/blog/${slug}`);

  const article = await page.goto(`/blog/${slug}`);
  expect(article?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "measured field trial",
  );
  await expect(page.getByRole("heading", { name: "Sources and further reading" })).toBeVisible();
  await expect(page.getByText(
    "Non-certified organic farmer (paperwork not yet completed to prove certification)",
    { exact: false },
  )).toBeVisible();
  await expect(page.getByText(/does not guarantee a 30–50% premium/i)).toBeVisible();
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(hasHorizontalOverflow).toBe(false);
});

test("Telugu selection shows the editorially reviewed Telugu original", async ({ context, page }) => {
  await context.addCookies([{
    name: "fb_locale",
    value: "te-IN",
    domain: "localhost",
    path: "/",
  }]);
  await page.goto(`/blog/${slug}`);
  await expect(page.locator("html")).toHaveAttribute("lang", "te-IN");
  await expect(page.locator(".public-header select")).toHaveValue("te-IN");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "చిన్న పొలం ప్రయోగంతో మార్పు మొదలుపెట్టండి",
  );
  await expect(page.getByText("సంపాదకీయంగా సమీక్షించిన భాష").first()).toBeVisible();
});

test("community food posts become cited, language-aware articles", async ({ page }) => {
  await page.goto("/blog");
  await expect(page.getByRole("link", { name: /five checks that turn concern into evidence/i }))
    .toHaveAttribute("href", `/blog/${gheeSlug}`);
  await expect(page.getByRole("link", { name: /traceability is a chain/i }))
    .toHaveAttribute("href", `/blog/${traceabilitySlug}`);

  await page.goto(`/blog/${gheeSlug}`);
  await expect(page.getByRole("heading", { name: "What the shared Tirupati video says" }))
    .toBeVisible();
  await expect(page.getByText(/not evidence that 95% of all ghee/i)).toBeVisible();
  await expect(page.getByRole("link", { name: /check adulteration at home/i }))
    .toHaveAttribute("href", "https://fssai.gov.in/inspection/check-adulteration");
});

test("unknown blog articles stay unavailable", async ({ page }) => {
  const response = await page.goto("/blog/not-a-published-article");
  expect(response?.status()).toBe(404);
});
