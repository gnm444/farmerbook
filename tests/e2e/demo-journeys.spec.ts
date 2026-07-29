import { expect, test } from "@playwright/test";

test("visitor can enter the complete demonstration", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "Grow knowledge. Build trusted connections.",
    }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Explore the demo" }).click();
  await expect(page).toHaveURL(/\/feed$/);
  await expect(
    page.getByRole("heading", { name: "What farmers are sharing" }),
  ).toBeVisible();
});

test("farmer can publish, find a peer, and send a message", async ({
  page,
}) => {
  await page.goto("/feed");
  await page
    .getByLabel("What are you learning on the farm?")
    .fill("Testing a lower-water irrigation schedule this week.");
  await page.getByRole("button", { name: "Share update" }).click();
  await expect(
    page.getByText("Testing a lower-water irrigation schedule this week."),
  ).toBeVisible();

  await page.goto("/discover");
  await page.getByLabel("Search by name or handle").fill("Ramesh");
  await expect(page.getByText("1 person found")).toBeVisible();
  await page.getByRole("link", { name: /Ramesh Patil/ }).click();
  await page.getByRole("link", { name: "Message" }).click();

  await page
    .getByLabel(/Message Ramesh Patil/)
    .fill("Could we compare irrigation notes?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Could we compare irrigation notes?")).toBeVisible();
});

test("farmer can report content and moderator can action the queue", async ({
  page,
}) => {
  await page.goto("/feed");
  await page.getByRole("button", { name: "Report" }).first().click();
  await expect(page.getByRole("button", { name: "Report sent" })).toBeVisible();

  await page.goto("/admin/reports");
  await expect(
    page.getByRole("heading", { name: "Safety report queue" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Hide target" }).first().click();
  await expect(page.getByText("1 reports awaiting a decision")).toBeVisible();
});
