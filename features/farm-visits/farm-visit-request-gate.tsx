import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { getServerTranslations } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { FarmVisitRequestForm } from "./farm-visit-request-form";

export async function FarmVisitRequestGate() {
  const { t } = await getServerTranslations("farmVisits");
  if (!isSupabaseConfigured()) {
    return <p className="notice">{t("temporarilyUnavailable")}</p>;
  }

  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return (
      <div className="farm-visits-gate">
        <h2>{t("requestHeading")}</h2>
        <p>{t("signInHelp")}</p>
        <div className="button-row">
          <Link className="button" href="/login?next=/farm-visits">{t("signInCustomer")}</Link>
          <Link className="button button--ghost" href="/signup">{t("createCustomer")}</Link>
        </div>
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, account_role, status, onboarding_complete")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (
    !profile ||
    profile.status !== "active" ||
    !profile.onboarding_complete ||
    profile.account_role !== "customer" ||
    !authData.user.email
  ) {
    return (
      <div className="farm-visits-gate">
        <h2>{t("requestHeading")}</h2>
        <p>{t("customerOnly")}</p>
      </div>
    );
  }

  return (
    <FarmVisitRequestForm
      requesterName={profile.full_name}
      requesterEmail={authData.user.email}
    />
  );
}
