import { expect, test, type Page } from "@playwright/test";
import { providerUnavailableMessage } from "@/features/auth/providers";

async function gotoInteractive(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator("html")).toHaveAttribute("data-interactive", "true");
}

test("visitor can understand all three FarmerBook segments", async ({ page }) => {
  await gotoInteractive(page, "/");
  await expect(
    page.getByRole("heading", {
      name: "Grow what matters. Reach the people who need it.",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Farmers", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Customers", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Wholesalers", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("img", {
      name: "Editorial photograph of an Indian farmer feeding free-range poultry on a rural farm",
    }),
  ).toBeVisible();
});

test("visitor sees an honest live market and a read-only fictional demo", async ({
  page,
}) => {
  await gotoInteractive(page, "/marketplace");
  await expect(
    page.getByRole("img", {
      name: "Farmers and a buyer inspecting fresh produce at a Maharashtra collection point",
    }),
  ).toBeVisible();
  await expect(page.getByText("0 live harvest lots")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No listings match yet" }),
  ).toBeVisible();

  await gotoInteractive(page, "/marketplace/demo");
  await expect(page.getByText(/Nothing here is a live offer/i)).toBeVisible();
  await page.getByLabel("Seller type").selectOption("wholesaler");
  await expect(page.getByText("FPO aggregated onion supply")).toBeVisible();
  const onionImage = page
    .getByRole("img", {
      name: "Maharashtra red onions beside ventilated market sacks",
    })
    .first();
  await onionImage.scrollIntoViewIfNeeded();
  await expect(onionImage).toBeVisible();
  await expect
    .poll(() => onionImage.evaluate((image: HTMLImageElement) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect(
    page.getByRole("link", { name: "FPO aggregated onion supply" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /Save FPO aggregated/i }),
  ).toHaveCount(0);
});

test("visitor can open and share a public Farmer profile homepage", async ({
  page,
}, testInfo) => {
  await gotoInteractive(page, "/profile/meera_kulkarni");
  await expect(
    page.getByRole("heading", { name: /Meera Kulkarni/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByText(/Natural farmer growing Tomato, Onion(?:,)? and Okra in Nashik/),
  ).toBeVisible();
  await expect(page.getByText("128 followers · 74 following").first()).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "FarmerBook professional profile" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Connect" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Farm story" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Public farm activity" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Farming journey" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Share profile" })).toBeVisible();
  await expect(
    page.getByText("No active produce listings today"),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    ),
  ).toBe(false);
  await page.screenshot({
    path: `/tmp/farmerbook-professional-profile-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("supported sign-in options are visible", async ({ page }) => {
  await gotoInteractive(page, "/login");
  await expect(
    page.getByRole("button", { name: "Continue with Google" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Continue with Facebook" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /LinkedIn|Instagram|passkey/i }),
  ).toHaveCount(0);
});

test("social sign-in errors appear before the provider controls", async ({
  page,
}) => {
  const providerError = providerUnavailableMessage("facebook");
  await gotoInteractive(
    page,
    `/login?error=${encodeURIComponent(providerError)}`,
  );

  const error = page.getByRole("alert");
  const facebookButton = page.getByRole("button", {
    name: "Continue with Facebook",
  });
  await expect(error).toHaveText(providerError);
  await expect(facebookButton).toBeVisible();
  await expect(page.locator(".notice[role='alert'] + .oauth-stack")).toHaveCount(
    1,
  );
});

test("customer purchase tracking has an honest empty state", async ({ page }) => {
  await gotoInteractive(page, "/purchases");
  await expect(
    page.getByRole("heading", { name: "My purchases" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "No purchase connections yet" }),
  ).toBeVisible();
});

test("onboarding shows farming method only for Farmers", async ({ page }) => {
  await gotoInteractive(page, "/onboarding");
  await page.getByRole("button", { name: /Customer/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(
    page.getByRole("group", { name: "Profile photo (optional)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByText("How do you farm?")).not.toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: /Wholesaler/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(
    page.getByRole("group", { name: "Profile photo (optional)" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("button", { name: /Farmer/ }).click();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(
    page.getByRole("group", { name: "Farmer profile photo" }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Continue/ }).click();
  await expect(page.getByText("How do you farm?")).toBeVisible();
});

test("farmer can publish, find a peer, and send a message", async ({
  page,
}) => {
  await gotoInteractive(page, "/feed");
  await page
    .getByLabel("What are you learning on the farm?")
    .fill("Testing a lower-water irrigation schedule this week.");
  await page.getByRole("button", { name: "Share update" }).click();
  await expect(
    page.getByText("Testing a lower-water irrigation schedule this week."),
  ).toBeVisible();

  await gotoInteractive(page, "/discover");
  await page.getByLabel("Search by name or handle").fill("Ramesh");
  await expect(page.getByText("1 person found")).toBeVisible();
  await page.getByRole("link", { name: /Ramesh Patil/ }).click();
  await page.getByRole("link", { name: "Message", exact: true }).click();

  await page
    .getByLabel(/Message Ramesh Patil/)
    .fill("Could we compare irrigation notes?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.locator(".message-bubble--own").filter({
      hasText: "Could we compare irrigation notes?",
    }),
  ).toBeVisible();
});

test("farmer can report content and moderator can action the queue", async ({
  page,
}) => {
  await gotoInteractive(page, "/feed");
  const reportedPost = page
    .locator("article")
    .filter({ hasText: "White spots started appearing" });
  await reportedPost.getByRole("button", { name: "Report" }).click();
  await expect(
    reportedPost.getByRole("button", { name: "Report sent" }),
  ).toBeVisible();

  await gotoInteractive(page, "/admin/reports");
  await expect(
    page.getByRole("heading", { name: "Safety report queue" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide target" }).first().click();
  const responseTarget = page
    .locator(".context-card")
    .filter({ hasText: "Moderator response target" });
  await expect(responseTarget.locator(".network-stat strong").first()).toHaveText(
    "1",
  );
  await expect(
    responseTarget.getByText("reports awaiting a decision"),
  ).toBeVisible();
});
