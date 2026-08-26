import type { CompanyAgentRole } from "@/features/managed-agents/contracts";
import {
  companyProposalDraftSchema,
  type CompanyMetrics,
  type CompanyObjective,
  type CompanyObjectiveMetric,
  type CompanyProposalDraft,
} from "./contracts";

export const COMPANY_POLICY_VERSION = "company-policy-v1";

function metricValue(
  metric: CompanyObjectiveMetric,
  metrics: CompanyMetrics,
) {
  if (metric === "registered_users") return metrics.registeredUsers;
  if (metric === "activated_users") return metrics.activatedUsers;
  return metrics.monthlyActiveUsers;
}

function objective(
  metric: CompanyObjectiveMetric,
  objectives: CompanyObjective[],
  metrics: CompanyMetrics,
) {
  const found = objectives.find((candidate) => candidate.metricKey === metric);
  if (!found) throw new Error(`COMPANY_OBJECTIVE_MISSING_${metric.toUpperCase()}`);
  const current = metricValue(metric, metrics);
  return { ...found, current, remaining: Math.max(0, found.targetValue - current) };
}

function daysRemaining(deadlineAt: string, now: Date) {
  return Math.max(
    0,
    Math.ceil((new Date(deadlineAt).getTime() - now.getTime()) / 86_400_000),
  );
}

function rate(numerator: number, denominator: number) {
  return denominator > 0 ? Math.round((numerator / denominator) * 1_000) / 10 : 0;
}

function priorityForGap(current: number, target: number, deadlineAt: string, now: Date) {
  if (current >= target) return "low" as const;
  const days = daysRemaining(deadlineAt, now);
  if (days === 0 || current < target * 0.1) return "critical" as const;
  if (days <= 30 || current < target * 0.4) return "high" as const;
  return "medium" as const;
}

export function buildCompanyProposal(input: {
  role: CompanyAgentRole;
  metrics: CompanyMetrics;
  objectives: CompanyObjective[];
  now: Date;
}): CompanyProposalDraft {
  const { role, metrics, objectives, now } = input;
  const registered = objective("registered_users", objectives, metrics);
  const activated = objective("activated_users", objectives, metrics);
  const monthlyActive = objective("monthly_active_users", objectives, metrics);
  const activationRate = rate(metrics.activatedUsers, metrics.registeredUsers);
  const listingGapRate = rate(
    metrics.activeListingsWithoutEnquiries,
    metrics.activeListings,
  );
  let draft: CompanyProposalDraft;

  if (role === "executive_strategy") {
    const days = daysRemaining(registered.deadlineAt, now);
    const dailyNeeded = days > 0 ? Math.ceil(registered.remaining / days) : registered.remaining;
    draft = {
      title: "Set the next company-wide growth focus",
      summary:
        `${metrics.registeredUsers.toLocaleString("en-IN")} of ${registered.targetValue.toLocaleString("en-IN")} registered users are recorded. ` +
        `${registered.remaining.toLocaleString("en-IN")} remain, requiring about ${dailyNeeded.toLocaleString("en-IN")} registrations per remaining day. Prioritize activation quality alongside acquisition.`,
      actionKind: "strategic_focus",
      priority: priorityForGap(metrics.registeredUsers, registered.targetValue, registered.deadlineAt, now),
      riskLevel: "medium",
      evidence: {
        registeredUsers: metrics.registeredUsers,
        activatedUsers: metrics.activatedUsers,
        monthlyActiveUsers: metrics.monthlyActiveUsers,
      },
    };
  } else if (role === "operations_coordinator") {
    draft = {
      title: "Clear operating and review bottlenecks",
      summary:
        `The fleet has ${metrics.managedRunFailures24h} unsuccessful runs in 24 hours and ${metrics.pendingCompanyProposals} pending company proposals. Review unhealthy roles first, then clear the oldest pending decisions without bypassing gates.`,
      actionKind: "resolve_blocker",
      priority: metrics.managedRunFailures24h > 0 ? "high" : "medium",
      riskLevel: "medium",
      evidence: {
        managedRunFailures24h: metrics.managedRunFailures24h,
        pendingCompanyProposals: metrics.pendingCompanyProposals,
        pendingActionProposals: metrics.pendingActionProposals,
      },
    };
  } else if (role === "data_experimentation") {
    draft = {
      title: "Strengthen activation and activity measurement",
      summary:
        `Activation is ${activationRate}% using onboarding completion, while the 30-day activity proxy counts ${metrics.monthlyActiveUsers.toLocaleString("en-IN")} users. Validate event coverage before treating this proxy as session-level MAU or running growth experiments.`,
      actionKind: "improve_measurement",
      priority: metrics.registeredUsers > 0 && metrics.monthlyActiveUsers === 0 ? "high" : "medium",
      riskLevel: "low",
      evidence: {
        registeredUsers: metrics.registeredUsers,
        activatedUsers: metrics.activatedUsers,
        monthlyActiveUsers: metrics.monthlyActiveUsers,
      },
    };
  } else if (role === "governance_risk") {
    draft = {
      title: "Review outstanding trust and risk work",
      summary:
        `${metrics.pendingReports} moderation reports and ${metrics.pendingActionProposals} supervised action proposals are pending. Assign accountable human review, starting with high-risk items; do not automate legal, verification or suspension decisions.`,
      actionKind: "review_risk",
      priority: metrics.pendingReports >= 25 ? "critical" : metrics.pendingReports > 0 ? "high" : "low",
      riskLevel: "high",
      evidence: {
        pendingReports: metrics.pendingReports,
        pendingActionProposals: metrics.pendingActionProposals,
        pendingCompanyProposals: metrics.pendingCompanyProposals,
      },
    };
  } else if (role === "independent_auditor") {
    draft = {
      title: "Audit fleet controls and unresolved risk",
      summary:
        `Independently inspect ${metrics.managedRunFailures24h} unsuccessful managed runs, ${metrics.pendingReports} pending reports and ${metrics.pendingCompanyProposals} unreviewed company proposals. Escalate control failures without approving this proposal yourself.`,
      actionKind: "audit_control",
      priority: metrics.managedRunFailures24h >= 3 ? "critical" : metrics.managedRunFailures24h > 0 ? "high" : "medium",
      riskLevel: "high",
      evidence: {
        managedRunFailures24h: metrics.managedRunFailures24h,
        pendingReports: metrics.pendingReports,
        pendingCompanyProposals: metrics.pendingCompanyProposals,
      },
    };
  } else if (role === "growth_strategy") {
    draft = {
      title: "Grow activated users, not registrations alone",
      summary:
        `${metrics.registeredUsers.toLocaleString("en-IN")} users are registered, ${metrics.activatedUsers.toLocaleString("en-IN")} are activated and ${metrics.monthlyActiveUsers.toLocaleString("en-IN")} appear in the 30-day event proxy. Focus the next experiment on the ${activated.remaining.toLocaleString("en-IN")} activated-user gap.`,
      actionKind: "grow_activation",
      priority: priorityForGap(metrics.activatedUsers, activated.targetValue, activated.deadlineAt, now),
      riskLevel: "medium",
      evidence: {
        registeredUsers: metrics.registeredUsers,
        activatedUsers: metrics.activatedUsers,
        monthlyActiveUsers: metrics.monthlyActiveUsers,
      },
    };
  } else if (role === "farmer_acquisition") {
    draft = {
      title: "Build a permission-based Farmer acquisition cohort",
      summary:
        `${metrics.registeredFarmers.toLocaleString("en-IN")} active Farmer accounts are recorded. Design one state, language or crop-specific inbound or partner cohort and measure onboarding completion; do not scrape or send without consent.`,
      actionKind: "acquire_farmers",
      priority: registered.remaining > 0 ? "high" : "low",
      riskLevel: "medium",
      evidence: {
        registeredFarmers: metrics.registeredFarmers,
        registeredUsers: metrics.registeredUsers,
        activatedUsers: metrics.activatedUsers,
      },
    };
  } else if (role === "buyer_acquisition") {
    draft = {
      title: "Increase qualified marketplace demand",
      summary:
        `${metrics.registeredBuyers} customers and ${metrics.registeredWholesalers} wholesalers have generated ${metrics.marketEnquiries} marketplace enquiries. Develop one permission-based buyer cohort tied to active supply and measure enquiry quality rather than contact volume.`,
      actionKind: "acquire_buyers",
      priority: metrics.activeListings > 0 && metrics.marketEnquiries === 0 ? "critical" : "high",
      riskLevel: "medium",
      evidence: {
        registeredBuyers: metrics.registeredBuyers,
        registeredWholesalers: metrics.registeredWholesalers,
        marketEnquiries: metrics.marketEnquiries,
        activeListings: metrics.activeListings,
      },
    };
  } else if (role === "farmer_onboarding") {
    draft = {
      title: "Reduce the onboarding completion gap",
      summary:
        `${metrics.activatedUsers.toLocaleString("en-IN")} of ${metrics.registeredUsers.toLocaleString("en-IN")} registered users have completed onboarding, an activation rate of ${activationRate}%. Investigate the largest mobile or language drop-off before adding reminders.`,
      actionKind: "improve_onboarding",
      priority: activationRate < 40 ? "high" : "medium",
      riskLevel: "low",
      evidence: {
        registeredUsers: metrics.registeredUsers,
        activatedUsers: metrics.activatedUsers,
        registeredFarmers: metrics.registeredFarmers,
      },
    };
  } else if (role === "marketplace_matching") {
    draft = {
      title: "Reduce active listings without enquiries",
      summary:
        `${metrics.activeListingsWithoutEnquiries} of ${metrics.activeListings} active listings have no enquiry (${listingGapRate}%). Investigate aggregate supply-demand gaps and propose a non-binding matching improvement without revealing buyer details.`,
      actionKind: "improve_liquidity",
      priority: listingGapRate >= 75 ? "critical" : listingGapRate >= 40 ? "high" : "medium",
      riskLevel: "medium",
      evidence: {
        activeListings: metrics.activeListings,
        activeListingsWithoutEnquiries: metrics.activeListingsWithoutEnquiries,
        marketEnquiries: metrics.marketEnquiries,
        wonMarketEnquiries: metrics.wonMarketEnquiries,
      },
    };
  } else if (role === "seo_editorial") {
    draft = {
      title: "Plan one evidence-bounded discoverability priority",
      summary:
        `FarmerBook currently has ${metrics.activePosts} active community posts and ${metrics.activeListings} active marketplace listings. Select one source-reviewed agriculture topic or regional landing-page opportunity; keep publication behind editorial approval.`,
      actionKind: "plan_editorial",
      priority: metrics.activePosts < Math.max(1, metrics.activeListings) ? "high" : "medium",
      riskLevel: "medium",
      evidence: {
        activePosts: metrics.activePosts,
        activeListings: metrics.activeListings,
        registeredFarmers: metrics.registeredFarmers,
      },
    };
  } else if (role === "product_management") {
    draft = {
      title: "Investigate the largest product funnel constraint",
      summary:
        `Activation is ${activationRate}%, ${metrics.activeListingsWithoutEnquiries} active listings lack enquiries and ${metrics.openSupportCases} support cases are open. Frame one measurable product outcome around the largest validated gap before scheduling implementation.`,
      actionKind: "investigate_product",
      priority: activationRate < 40 || listingGapRate >= 50 ? "high" : "medium",
      riskLevel: "medium",
      evidence: {
        registeredUsers: metrics.registeredUsers,
        activatedUsers: metrics.activatedUsers,
        activeListingsWithoutEnquiries: metrics.activeListingsWithoutEnquiries,
        openSupportCases: metrics.openSupportCases,
      },
    };
  } else if (role === "engineering_planning") {
    draft = {
      title: "Plan a bounded reliability investigation",
      summary:
        `${metrics.technicalSupportCases} technical support cases are open and ${metrics.managedRunFailures24h} managed runs were unsuccessful in 24 hours. Convert the higher-confidence signal into a reviewed engineering investigation; do not deploy automatically.`,
      actionKind: "investigate_engineering",
      priority: metrics.managedRunFailures24h > 0 ? "high" : "medium",
      riskLevel: "medium",
      evidence: {
        technicalSupportCases: metrics.technicalSupportCases,
        managedRunFailures24h: metrics.managedRunFailures24h,
        openSupportCases: metrics.openSupportCases,
      },
    };
  } else if (role === "qa_reliability") {
    draft = {
      title: "Expand tests around observed reliability pressure",
      summary:
        `${metrics.managedRunFailures24h} managed runs failed or partially failed in 24 hours and ${metrics.technicalSupportCases} technical cases remain open. Reproduce the dominant issue and add a focused regression before declaring a release safe.`,
      actionKind: "expand_qa",
      priority: metrics.managedRunFailures24h >= 3 ? "critical" : metrics.managedRunFailures24h > 0 ? "high" : "medium",
      riskLevel: "medium",
      evidence: {
        managedRunFailures24h: metrics.managedRunFailures24h,
        technicalSupportCases: metrics.technicalSupportCases,
      },
    };
  } else {
    draft = {
      title: "Prioritize support and trust review",
      summary:
        `${metrics.openSupportCases} support cases, ${metrics.pendingReports} moderation reports and ${metrics.pendingActionProposals} supervised actions need attention. Route the oldest high-risk work to a person without reading or exposing it in this proposal.`,
      actionKind: "review_support_trust",
      priority: metrics.pendingReports >= 25 ? "critical" : metrics.pendingReports > 0 || metrics.openSupportCases > 0 ? "high" : "low",
      riskLevel: "high",
      evidence: {
        openSupportCases: metrics.openSupportCases,
        pendingReports: metrics.pendingReports,
        pendingActionProposals: metrics.pendingActionProposals,
      },
    };
  }

  if (
    monthlyActive.current >= monthlyActive.targetValue &&
    role === "growth_strategy"
  ) {
    draft.priority = "low";
  }
  return companyProposalDraftSchema.parse(draft);
}
