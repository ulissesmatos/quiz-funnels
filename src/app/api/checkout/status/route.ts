import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/server/db";
import { orders } from "@/server/db/schema";

export const runtime = "nodejs";

/**
 * Consultado pelo bloco de Checkout enquanto espera confirmação de PIX/boleto
 * — nunca chama a Mercado Pago de novo, só lê `orders.status`, que o webhook
 * já mantém atualizado. Barato o bastante pra fazer polling de verdade.
 */
export async function GET(request: Request) {
  const orderId = new URL(request.url).searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId ausente." }, { status: 400 });

  const [order] = await db.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });

  return NextResponse.json({ status: order.status });
}
