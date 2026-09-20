import { PledgePage } from "./pledge-page";

export default function PledgeRoute() {
  return (
    <PledgePage
      turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
    />
  );
}
