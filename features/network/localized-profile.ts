import type { AuthenticatedMessages } from "@/lib/i18n/authenticated-messages";
import type { AccountRole } from "@/lib/types";

export function localizedAccountRole(
  role: AccountRole,
  messages: AuthenticatedMessages["network"],
) {
  switch (role) {
    case "customer":
      return messages.customer;
    case "wholesaler":
      return messages.wholesaler;
    case "agri_business":
      return messages.agriBusiness;
    case "farmer":
    default:
      return messages.farmer;
  }
}
