import { redirect } from "next/navigation";

import { getSession } from "@/server/auth/session";

export default async function HomePage() {
  redirect((await getSession()) ? "/funis" : "/entrar");
}
