import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";
import { getServerTranslations } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { InquiryForm } from "./inquiry-form";

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

export async function ProduceInquiryGate({
  listingId,
  sellerName,
}: {
  listingId: string;
  sellerName: string;
}) {
  const [{ t }, authenticated] = await Promise.all([
    getServerTranslations("market"),
    hasAuthenticatedUser(),
  ]);
  if (authenticated) {
    return <InquiryForm listingId={listingId} sellerName={sellerName} />;
  }

  return (
    <div>
      <p>{t("enquirySignInGate")}</p>
      <Link className="button button--full" href="/login">
        {t("signInToEnquire")}
      </Link>
    </div>
  );
}
