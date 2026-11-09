import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorkshopAdminRoster } from "@/features/workshops/workshop-admin-roster";

function registration(index: number) {
  return {
    submissionId: `74000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    createdAt: "2026-11-09T06:00:00.000Z",
    consentVersion: "hari-babu-2026-v1",
    farmerName: `Farmer ${index}`,
    phone: `+9198765432${String(index % 10)}`,
    district: "Hyderabad",
    state: "Telangana",
    farmName: "Example farm",
    yearsFarming: 0,
    attendanceInterest: index % 2 ? "attend" : "interested",
    challenges: `Water challenge ${index}`,
    proposedSolutions: `Water solution ${index}`,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("private workshop roster", () => {
  it("shows truthful counts, phone and submitted discussion topics", async () => {
    const fetchMock = vi.fn(async () => Response.json({
      count: 2,
      offset: 0,
      registrations: [registration(1), registration(2)],
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkshopAdminRoster />);
    await waitFor(() => expect(screen.getByText("Showing 1–2 of 2 registrations")).toBeVisible());
    expect(screen.getByText("Total registrations").parentElement).toHaveTextContent("2");
    expect(screen.getByText("Planning to attend on this page").parentElement).toHaveTextContent("1");
    expect(screen.getByText("Interested on this page").parentElement).toHaveTextContent("1");
    expect(screen.getByText("+91987654321")).toBeVisible();
    fireEvent.click(screen.getAllByText("View registration details and discussion topics")[0]);
    expect(screen.getByText("Water challenge 1")).toBeVisible();
    expect(screen.getByText("Water solution 1")).toBeVisible();
    expect(screen.getAllByText("Years farming")[0].parentElement).toHaveTextContent("0");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/workshops/hari-babu-2026/registrations?offset=0&limit=25",
      expect.objectContaining({ credentials: "same-origin", cache: "no-store" }),
    );
    expect(screen.queryByRole("button", { name: /send|email|whatsapp/i })).not.toBeInTheDocument();
  });

  it("pages through private records without keeping the previous page visible", async () => {
    const fetchMock = vi.fn(async (url: string) => Response.json({
      count: 26,
      offset: url.includes("offset=25") ? 25 : 0,
      registrations: url.includes("offset=25")
        ? [registration(26)]
        : Array.from({ length: 25 }, (_, index) => registration(index + 1)),
    }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkshopAdminRoster />);
    await waitFor(() => expect(screen.getByText("Showing 1–25 of 26 registrations")).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(screen.getByText("Showing 26–26 of 26 registrations")).toBeVisible());
    expect(screen.queryByRole("heading", { name: "Farmer 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Farmer 26" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/admin/workshops/hari-babu-2026/registrations?offset=25&limit=25",
      expect.anything(),
    );
  });

  it("shows an error and retry without exposing a failed response", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ error: "secret diagnostic" }, { status: 503 }))
      .mockResolvedValueOnce(Response.json({ count: 0, offset: 0, registrations: [] }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkshopAdminRoster />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Try again" })).toBeVisible());
    expect(screen.queryByText("secret diagnostic")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() => expect(screen.getByText("No workshop registrations have been received yet.")).toBeVisible());
  });

  it("requires inline confirmation, deletes by JSON ID, and refreshes count and list", async () => {
    let total = 2;
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (init.method === "DELETE") {
        total = 1;
        return Response.json({ status: "deleted" });
      }
      return Response.json({
        count: total,
        offset: 0,
        registrations: total === 2 ? [registration(1), registration(2)] : [registration(2)],
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkshopAdminRoster />);
    await waitFor(() => expect(screen.getByText("Showing 1–2 of 2 registrations")).toBeVisible());
    fireEvent.click(screen.getAllByRole("button", { name: "Remove registration" })[0]);
    expect(screen.getByRole("group", { name: "Confirm removal for Farmer 1" })).toBeVisible();
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === "DELETE")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "Keep registration" }));
    expect(fetchMock.mock.calls.filter(([, init]) => init.method === "DELETE")).toHaveLength(0);
    fireEvent.click(screen.getAllByRole("button", { name: "Remove registration" })[0]);
    fireEvent.click(screen.getByRole("button", { name: "Yes, remove registration" }));
    await waitFor(() => expect(screen.getByText("Showing 1–1 of 1 registrations")).toBeVisible());
    expect(screen.queryByRole("heading", { name: "Farmer 1" })).not.toBeInTheDocument();
    const deleteCall = fetchMock.mock.calls.find(([, init]) => init.method === "DELETE");
    expect(deleteCall?.[0]).toBe("/api/admin/workshops/hari-babu-2026/registrations");
    expect(deleteCall?.[1]).toMatchObject({
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json" },
    });
    expect(JSON.parse(String(deleteCall?.[1].body))).toEqual({ submissionId: registration(1).submissionId });
    expect(fetchMock.mock.calls.every(([url]) => !url.includes("Farmer") && !url.includes("+919"))).toBe(true);
  });

  it("keeps the confirmation visible when deletion is not confirmed", async () => {
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) =>
      init.method === "DELETE"
        ? Response.json({ error: "secret diagnostic" }, { status: 503 })
        : Response.json({ count: 1, offset: 0, registrations: [registration(1)] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkshopAdminRoster />);
    await waitFor(() => expect(screen.getByText("Showing 1–1 of 1 registrations")).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Remove registration" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, remove registration" }));
    await waitFor(() => expect(screen.getByText(/Removal could not be confirmed/)).toBeVisible());
    expect(screen.getByRole("heading", { name: "Farmer 1" })).toBeVisible();
    expect(screen.queryByText("secret diagnostic")).not.toBeInTheDocument();
  });

  it("returns to the preceding page after removing its only final record", async () => {
    let total = 26;
    const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
      if (init.method === "DELETE") {
        total = 25;
        return Response.json({ status: "deleted" });
      }
      const finalPage = url.includes("offset=25");
      return Response.json({
        count: total,
        offset: finalPage ? 25 : 0,
        registrations: finalPage
          ? total === 26 ? [registration(26)] : []
          : Array.from({ length: 25 }, (_, index) => registration(index + 1)),
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkshopAdminRoster />);
    await waitFor(() => expect(screen.getByText("Showing 1–25 of 26 registrations")).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(screen.getByText("Showing 26–26 of 26 registrations")).toBeVisible());
    fireEvent.click(screen.getByRole("button", { name: "Remove registration" }));
    fireEvent.click(screen.getByRole("button", { name: "Yes, remove registration" }));
    await waitFor(() => expect(screen.getByText("Showing 1–25 of 25 registrations")).toBeVisible());
    expect(screen.queryByRole("heading", { name: "Farmer 26" })).not.toBeInTheDocument();
  });
});
