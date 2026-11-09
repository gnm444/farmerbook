import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWorkshopCopy } from "@/features/workshops/workshop-copy";

vi.mock("next/script", () => {
  function MockScript({ onReady }: { onReady?: () => void }) {
    React.useEffect(() => { onReady?.(); }, [onReady]);
    return null;
  }
  return { default: MockScript };
});

import {
  normalizeWorkshopPhone,
  WorkshopRegistrationForm,
} from "@/features/workshops/workshop-registration-form";

const firstProof = {
  submissionId: "74000000-0000-4000-8000-000000000001",
  nonce: "first-signed-nonce",
};
const secondProof = {
  submissionId: "74000000-0000-4000-8000-000000000002",
  nonce: "second-signed-nonce",
};
const expiredError = "The registration session expired. Reload the form and try again.";
const copy = getWorkshopCopy("en-IN").copy;
let turnstileCallback: ((token: string) => void) | undefined;

beforeEach(() => {
  turnstileCallback = undefined;
  vi.stubGlobal("turnstile", {
    render: vi.fn((_container: HTMLElement, options: { callback: (token: string) => void }) => {
      turnstileCallback = options.callback;
      return "widget-1";
    }),
    remove: vi.fn(),
    reset: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(copy.farmerName), { target: { value: "Ananya Rao" } });
  fireEvent.change(screen.getByLabelText(copy.phone), { target: { value: "98765 43210" } });
  fireEvent.change(screen.getByLabelText(copy.district), { target: { value: "Hyderabad" } });
  fireEvent.change(screen.getByLabelText(copy.state), { target: { value: "Telangana" } });
  fireEvent.change(screen.getByLabelText(copy.attendanceInterest), { target: { value: "interested" } });
  fireEvent.click(screen.getByRole("checkbox", { name: copy.consent }));
}

describe("workshop registration form", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["91 98765-43210", "+919876543210"],
    ["+91 98765 43210", "+919876543210"],
    ["09876543210", null],
  ])("normalizes Indian mobile input %s", (input, expected) => {
    expect(normalizeWorkshopPhone(input)).toBe(expected);
  });

  it("keeps entered fields while an expired nonce is refreshed and succeeds on retry", async () => {
    let getCount = 0;
    let postCount = 0;
    const fetchMock = vi.fn(async (_url: string, init: RequestInit) => {
      if (init.method === "GET") {
        getCount += 1;
        return Response.json(getCount === 1 ? firstProof : secondProof);
      }
      postCount += 1;
      return postCount === 1
        ? Response.json({ error: expiredError }, { status: 403 })
        : Response.json({ status: "registered" }, { status: 201 });
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkshopRegistrationForm copy={copy} turnstileSiteKey="site-key" />);

    await waitFor(() => expect(getCount).toBe(1));
    await waitFor(() => expect(turnstileCallback).toBeDefined());
    fillRequiredFields();
    act(() => turnstileCallback?.("token-1"));
    fireEvent.submit(screen.getByRole("form", { name: copy.registrationTitle }));

    await waitFor(() => expect(getCount).toBe(2));
    await waitFor(() => expect(screen.getByText(copy.sessionRefreshed)).toBeVisible());
    expect(screen.getByLabelText(copy.farmerName)).toHaveValue("Ananya Rao");
    expect(screen.getByLabelText(copy.phone)).toHaveValue("98765 43210");
    const firstPost = JSON.parse(String(fetchMock.mock.calls.find(([, init]) => init.method === "POST")?.[1].body));
    expect(firstPost).toMatchObject({
      submissionId: firstProof.submissionId,
      nonce: firstProof.nonce,
      phone: "+919876543210",
    });

    act(() => turnstileCallback?.("token-2"));
    fireEvent.submit(screen.getByRole("form", { name: copy.registrationTitle }));
    await waitFor(() => expect(screen.getByRole("heading", { name: copy.successTitle })).toBeVisible());
    const postBodies = fetchMock.mock.calls
      .filter(([, init]) => init.method === "POST")
      .map(([, init]) => JSON.parse(String(init.body)));
    expect(postBodies).toHaveLength(2);
    expect(postBodies[1]).toMatchObject({
      submissionId: secondProof.submissionId,
      nonce: secondProof.nonce,
      phone: "+919876543210",
    });
  });

  it("never submits if fetching the signed proof fails", async () => {
    const fetchMock = vi.fn(async () => Response.json({ error: "unavailable" }, { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<WorkshopRegistrationForm copy={copy} turnstileSiteKey="site-key" />);
    await waitFor(() => expect(screen.getByText(copy.formUnavailable)).toBeVisible());
    expect(screen.getByRole("button", { name: copy.submit })).toBeDisabled();
    expect(fetchMock.mock.calls).toHaveLength(1);
  });
});
