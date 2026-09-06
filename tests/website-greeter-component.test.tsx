import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebsiteGreetingAgent } from "@/components/website-greeting-agent";

vi.mock("@/components/locale-provider", () => ({
  useLocale: () => "en-IN",
}));

describe("website greeter language selector", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("offers only the three release languages and persists an override", async () => {
    const first = render(<WebsiteGreetingAgent />);
    await act(async () => undefined);
    fireEvent.click(screen.getByRole("button", { name: /Namaste/i }));

    const selector = screen.getByRole("combobox", { name: "Chat language" });
    const contextControl = screen.getByRole("checkbox", {
      name: "Use earlier messages in this chat",
    });
    expect(contextControl).not.toBeChecked();
    fireEvent.click(contextControl);
    expect(contextControl).toBeChecked();
    expect(window.sessionStorage.getItem("farmerbook-greeter-context-consent"))
      .toBe("true");
    expect(screen.getAllByRole("option").map((option) => option.textContent))
      .toEqual(["English", "తెలుగు", "हिन्दी"]);

    fireEvent.change(selector, { target: { value: "hi-IN" } });
    expect(window.localStorage.getItem("farmerbook-greeter-locale")).toBe("hi-IN");
    expect(screen.getByText("FarmerBook सहायक")).toBeInTheDocument();
    first.unmount();

    render(<WebsiteGreetingAgent />);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /नमस्ते/ })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /नमस्ते/ }));
    await waitFor(() => {
      expect(screen.getByRole("checkbox", {
        name: "इस चैट के पिछले संदेशों का उपयोग करें",
      })).toBeChecked();
    });
  });

  it("requests context deletion when a visitor opts out", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ cleared: true }),
      { status: 200 },
    ));
    vi.stubGlobal("fetch", fetchMock);
    render(<WebsiteGreetingAgent />);
    await act(async () => undefined);
    fireEvent.click(screen.getByRole("button", { name: /Namaste/i }));
    const contextControl = screen.getByRole("checkbox", {
      name: "Use earlier messages in this chat",
    });
    fireEvent.click(contextControl);
    fireEvent.click(contextControl);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/website-greeter",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
    expect(window.sessionStorage.getItem("farmerbook-greeter-context-consent"))
      .toBeNull();
  });

  it("renders an accessible embedded canary without a floating launcher", async () => {
    render(<WebsiteGreetingAgent mode="embedded" showCanaryStatus />);
    await act(async () => undefined);

    expect(screen.getByRole("region", { name: "FarmerBook greeter" }))
      .toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Namaste/i }))
      .not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Ask FarmerBook" }))
      .not.toHaveFocus();
    expect(screen.getByText("Protected Google canary")).toBeInTheDocument();
    expect(screen.getByText(/Off by default.*up to 24 hours.*request deletion/))
      .toBeInTheDocument();

    fireEvent.change(screen.getByRole("combobox", { name: "Chat language" }), {
      target: { value: "te-IN" },
    });
    expect(screen.getByText("రక్షిత Google కానరీ"))
      .toBeInTheDocument();
  });

  it("marks only the dedicated embedded page as a Google canary request", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      text: "Safe answer",
      actions: [],
      source: "workers_ai",
      remainingSessionReplies: 7,
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WebsiteGreetingAgent mode="embedded" surface="chat_canary" />);
    await act(async () => undefined);

    fireEvent.change(screen.getByRole("textbox", { name: "Ask FarmerBook" }), {
      target: { value: "A canary-only question" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    expect(fetchMock.mock.calls[0]?.[0]).toBe("/api/website-greeter/canary");
    const request = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      contextConsent: false,
    });
    expect(JSON.parse(String(request.body))).not.toHaveProperty("surface");
  });
});
