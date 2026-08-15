import { redirect } from "next/navigation";

export default async function KnownFarmersPage() {
  redirect("/admin/featured-farmers?superseded=known-farmer-intake");
}
