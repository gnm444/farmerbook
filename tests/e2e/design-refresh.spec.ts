import { expect, test } from "@playwright/test";

test("public home uses the recovered Deccan editorial design without overflow", async ({
  page,
}, testInfo) => {
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Grow what matters. Reach the people who need it.",
    }),
  ).toBeVisible();
  await expect(page.locator(".farm-hero-image")).toBeVisible();
  await expect(page.locator(".ecosystem-tile")).toHaveCount(4);

  for (const image of await page.locator(".ecosystem-tile img").all()) {
    await image.scrollIntoViewIfNeeded();
    await expect
      .poll(() => image.evaluate((element) => (element as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }

  const designTokens = await page.locator("html").evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      forest: styles.getPropertyValue("--forest-900").trim(),
      terracotta: styles.getPropertyValue("--amber-600").trim(),
      cream: styles.getPropertyValue("--cream").trim(),
    };
  });
  expect(designTokens).toEqual({
    forest: "#2d5016",
    terracotta: "#c4622d",
    cream: "#f5f0e8",
  });

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.evaluate(() => window.scrollTo(0, 0));

  await page.screenshot({
    path: `/tmp/farmerbook-home-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("marketplace inherits the visual system and preserves real-data boundaries", async ({
  page,
}, testInfo) => {
  await page.goto("/marketplace");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Know your farmer. Source better produce.",
    }),
  ).toBeVisible();
  await expect(page.locator(".marketplace-hero__image")).toBeVisible();
  await expect(page.getByText("Illustrative buyer enquiry")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.screenshot({
    path: `/tmp/farmerbook-market-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("authentication carries the same warm farm identity", async ({ page }, testInfo) => {
  await page.goto("/login");

  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "Welcome back" })).toBeVisible();

  const asideBackground = await page
    .locator(".auth-aside")
    .evaluate((element) => getComputedStyle(element).backgroundImage);
  expect(asideBackground).toContain("/images/deccan/farmer-and-poultry.webp");

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.screenshot({
    path: `/tmp/farmerbook-login-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("consent-first acquisition fails closed without external providers", async ({
  page,
}, testInfo) => {
  await page.goto("/join");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Useful farming connections, only when you ask for them.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "The consent service is being prepared.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Record my request" })).toHaveCount(0);
  await expect(page.locator(".consent-hero__image")).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.screenshot({
    path: `/tmp/farmerbook-consent-${testInfo.project.name}.png`,
    fullPage: true,
  });

  await page.goto("/partner-interest");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Build useful farming collaborations across borders.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "The consent service is being prepared.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Record my request" })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    ),
  ).toBe(false);
});

test("outreach administration is visibly paused without configured delivery", async ({
  page,
}, testInfo) => {
  await page.goto("/admin/outreach");

  await expect(
    page.getByRole("heading", { level: 1, name: "FarmerBook acquisition agent" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Delivery paused" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Resume consented delivery" }),
  ).toBeDisabled();
  await expect(page.getByText(/force send/i)).toHaveCount(0);

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);

  await page.screenshot({
    path: `/tmp/farmerbook-outreach-admin-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("email consent actions are public and fail closed without signed tokens", async ({
  page,
}) => {
  await page.goto("/confirm-email");
  await expect(
    page.getByRole("heading", { level: 2, name: "Confirm your email request" }),
  ).toBeVisible();
  await expect(
    page.getByText("This confirmation is invalid or expired."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Confirm my request" })).toHaveCount(0);

  await page.goto("/unsubscribe");
  await expect(
    page.getByRole("heading", { level: 2, name: "Stop FarmerBook emails" }),
  ).toBeVisible();
  await expect(
    page.getByText("This unsubscribe link is invalid or expired."),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Unsubscribe me" })).toHaveCount(0);
});
