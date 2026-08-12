import { oauthSignInAction } from "./actions";
import { getServerTranslations } from "@/lib/i18n";

export async function OAuthButtons({ mode }: { mode: "login" | "signup" }) {
  const { t } = await getServerTranslations("auth");
  return (
    <div className="oauth-stack">
      <form action={oauthSignInAction}>
        <input name="mode" type="hidden" value={mode} />
        <button
          className="button button--secondary button--full oauth-button"
          name="provider"
          type="submit"
          value="google"
        >
          <span className="oauth-mark oauth-mark--google" aria-hidden="true">
            G
          </span>
          {t("google")}
        </button>
      </form>
      <form action={oauthSignInAction}>
        <input name="mode" type="hidden" value={mode} />
        <button
          className="button button--secondary button--full oauth-button"
          name="provider"
          type="submit"
          value="facebook"
        >
          <span className="oauth-mark oauth-mark--facebook" aria-hidden="true">
            f
          </span>
          {t("facebook")}
        </button>
      </form>
      <div className="auth-divider" aria-hidden="true">
        <span>{t("emailDivider")}</span>
      </div>
    </div>
  );
}
