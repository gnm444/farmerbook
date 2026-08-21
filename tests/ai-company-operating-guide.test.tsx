import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  COMPANY_AGENT_OPERATOR_GUIDANCE,
  CompanyAgentOperatorGuide,
} from "@/features/company-agents/operator-guide";
import {
  COMPANY_AGENT_ROLES,
  managedAgentDefinition,
} from "@/features/managed-agents/contracts";

describe("AI company operator guide", () => {
  it("covers every company role and preserves the review-only boundary", () => {
    expect(Object.keys(COMPANY_AGENT_OPERATOR_GUIDANCE)).toEqual(
      [...COMPANY_AGENT_ROLES],
    );
    render(<CompanyAgentOperatorGuide />);
    for (const role of COMPANY_AGENT_ROLES) {
      expect(screen.getByRole("heading", {
        name: managedAgentDefinition(role).displayName,
      })).toBeInTheDocument();
    }
    expect(screen.getByText(/Approve for backlog never sends/i)).toBeInTheDocument();
    expect(screen.getByText(/person submits and confirms their own email consent/i)).toBeInTheDocument();
    expect(screen.getByText(/at most one separately consented follow-up/i)).toBeInTheDocument();
  });
});
