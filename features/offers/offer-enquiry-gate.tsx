import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { OfferEnquiryForm } from "./offer-enquiry-form";
import { getServerTranslations } from "@/lib/i18n";

async function hasAuthenticatedUser() {
  if (!isSupabaseConfigured()) return false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    return !error && Boolean(user);
  } catch {
    return false;
  }
}

export async function OfferEnquiryGate({ offerId }: { offerId: string }) {
  const { t } = await getServerTranslations("offers");
  if (await hasAuthenticatedUser()) {
    return <OfferEnquiryForm offerId={offerId} />;
  }

  return (
    <section className="card">
      <p className="eyebrow">{t("privateEnquiry")}</p>
      <h2>{t("signInTitle")}</h2>
      <p>{t("signInHelp")}</p>
      <Link className="button" href="/login">
        {t("signIn")}
      </Link>
    </section>
  );
}
