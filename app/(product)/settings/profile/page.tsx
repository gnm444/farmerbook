import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { SettingsNav } from "@/components/settings-nav";
import { ProfileSettingsForm } from "@/features/profiles/profile-settings-form";
import { loadCurrentProfile } from "@/features/profiles/queries";

export const metadata: Metadata = { title: "Profile settings" };

export default async function ProfileSettingsPage() {
  const profile = await loadCurrentProfile();

  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Your preferences"
        title="Settings"
        description="Manage the information FarmerBook shows to the pilot community."
      />
      <div className="settings-layout">
        <SettingsNav current="profile" />
        <ProfileSettingsForm profile={profile} />
      </div>
    </div>
  );
}
