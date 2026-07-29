import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { SettingsNav } from "@/components/settings-nav";
import { ProfileSettingsForm } from "@/features/profiles/profile-settings-form";

export const metadata: Metadata = { title: "Profile settings" };

export default function ProfileSettingsPage() {
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Your preferences"
        title="Settings"
        description="Manage the information FarmerBook shows to the pilot community."
      />
      <div className="settings-layout">
        <SettingsNav current="profile" />
        <ProfileSettingsForm />
      </div>
    </div>
  );
}
