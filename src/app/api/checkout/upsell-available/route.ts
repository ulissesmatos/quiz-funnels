import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { orders } from "@/server/db/schema";

export const runtime = "nodejs";

/**
 * Checagem leve pro bloco de Upsell decidir, antes de mostrar o botão de
 * 1-clique, se o pedido anterior tem cartão salvo. Não expõe o `mpCardId` nem
 * outro dado sensível — só um booleano.
 */
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ available: false });

  const [order] = await db
    .select({ status: orders.status, mpCustomerId: orders.mpCustomerId, mpCardId: orders.mpCardId })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);

  const available = Boolean(order && order.status === "approved" && order.mpCustomerId && order.mpCardId);
  return NextResponse.json({ available });
}
