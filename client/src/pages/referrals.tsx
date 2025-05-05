import React from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { ReferralDashboard } from "@/components/referrals/referral-dashboard";

export default function Referrals() {
  return (
    <MainLayout pageTitle="Referral Program">
      <ReferralDashboard />
    </MainLayout>
  );
}
