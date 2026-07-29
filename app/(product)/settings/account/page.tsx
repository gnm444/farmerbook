import type { Metadata } from "next";
import { ProductHeader } from "@/components/product-header";
import { SettingsNav } from "@/components/settings-nav";
import { AccountSettings } from "@/features/profiles/account-settings";

export const metadata: Metadata = { title: "Account settings" };

export default function AccountSettingsPage() {
  return (
    <div className="product-page">
      <ProductHeader
        eyebrow="Privacy and access"
        title="Account settings"
        description="Manage access to FarmerBook or remove your pilot account."
      />
      <div className="settings-layout">
        <SettingsNav current="account" />
        <AccountSettings />
      </div>
    </div>
  );
}
