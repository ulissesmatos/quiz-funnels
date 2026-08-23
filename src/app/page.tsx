import { redirect } from "next/navigation";

import { LandingPage } from "@/marketing/landing-page";
import { getSession } from "@/server/auth/session";

export default async function HomePage() {
  if (await getSession()) redirect("/funis");
  return <LandingPage />;
}
