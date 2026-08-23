import { LandingPage } from "@/marketing/landing-page";
import { getSession } from "@/server/auth/session";

export default async function HomePage() {
  const session = await getSession();
  return <LandingPage isLoggedIn={!!session} />;
}
