import PortfolioClient from "@/components/PortfolioClient";
import { getSyncedPortfolioData } from "@/lib/db";
import { maskPhoneNumber } from "@/lib/security";

export const dynamic = "force-dynamic";

export default function Home() {
  const fullData = getSyncedPortfolioData();

  // Never send the raw phone number in initial SSR HTML before Email OTP verification
  const publicInitialData = {
    ...fullData,
    profile: {
      ...fullData.profile,
      phone: maskPhoneNumber(fullData.profile.phone),
    },
  };

  return <PortfolioClient initialData={publicInitialData} />;
}
