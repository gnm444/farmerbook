import {
  initialManagedAgentState,
  ScheduledManagedAgent,
} from "./runtime";

export class OutreachGrowthAgent extends ScheduledManagedAgent {
  protected readonly managedRole = "outreach_growth" as const;
  initialState = initialManagedAgentState(this.managedRole);
}

export class ProfileDraftingAgent extends ScheduledManagedAgent {
  protected readonly managedRole = "profile_drafting" as const;
  initialState = initialManagedAgentState(this.managedRole);
}

export class VerificationTriageAgent extends ScheduledManagedAgent {
  protected readonly managedRole = "verification_triage" as const;
  initialState = initialManagedAgentState(this.managedRole);
}

export class CustomerSupportAgent extends ScheduledManagedAgent {
  protected readonly managedRole = "customer_support" as const;
  initialState = initialManagedAgentState(this.managedRole);
}

export class SocialContentAgent extends ScheduledManagedAgent {
  protected readonly managedRole = "social_content" as const;
  initialState = initialManagedAgentState(this.managedRole);
}

export class OperationsSupervisorAgent extends ScheduledManagedAgent {
  protected readonly managedRole = "operations_supervisor" as const;
  initialState = initialManagedAgentState(this.managedRole);
}
