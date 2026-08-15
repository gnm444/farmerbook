import { redirect } from "next/navigation";

export default function FarmerInterestPage() {
  redirect("/join?campaign=farmer-interest");
}
