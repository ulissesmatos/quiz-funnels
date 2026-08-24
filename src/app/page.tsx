import { LandingPage } from "@/marketing/landing-page";
import { getSession } from "@/server/auth/session";
import { listActivePlans } from "@/server/billing/plans";

export default async function HomePage() {
  const [session, planos] = await Promise.all([getSession(), listActivePlans()]);
  return <LandingPage isLoggedIn={!!session} planos={planos} />;
}
