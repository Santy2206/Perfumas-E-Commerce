import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows"
import { Modules } from "@medusajs/framework/utils"
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  type WompiEventPayload,
  verifyWompiEventSignature,
} from "../../../utils/wompi-events"

type OrderRow = {
  id: string
  metadata?: Record<string, unknown> | null
  payment_collections?: Array<{
    id: string
    status?: string
    payments?: Array<{
      id: string
      captured_at?: string | null
    }>
  }>
}

/**
 * POST /hooks/wompi
 * Wompi event URL (or forwarded from the Next.js storefront webhook).
 * Verifies checksum, then captures authorized Medusa payments for the order
 * referenced in transaction.reference (checkout uses Medusa order id).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const event = (req.body || {}) as WompiEventPayload
  const checksum =
    (req.headers["x-event-checksum"] as string | undefined) ||
    (req.headers["X-Event-Checksum"] as string | undefined)

  const verified = verifyWompiEventSignature(event, checksum)
  if (!verified.ok) {
    return res.status(401).json({ ok: false, message: verified.reason })
  }

  const transaction = event.data?.transaction
  if (!transaction?.reference) {
    return res.status(200).json({
      ok: true,
      ignored: true,
      reason: "No transaction.reference",
    })
  }

  const orderId = String(transaction.reference)
  const status = String(transaction.status || "").toUpperCase()

  const query = req.scope.resolve("query")
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "metadata",
      "payment_collections.id",
      "payment_collections.status",
      "payment_collections.payments.id",
      "payment_collections.payments.captured_at",
    ],
    filters: { id: orderId },
  })

  const order = (data as OrderRow[])?.[0]
  if (!order) {
    // Local-fallback checkout refs (PF-...) are not Medusa orders.
    return res.status(200).json({
      ok: true,
      ignored: true,
      reason: "Order not found in Medusa",
      reference: orderId,
      wompi_status: status,
    })
  }

  const orderModule = req.scope.resolve(Modules.ORDER)
  const nextMetadata = {
    ...(order.metadata || {}),
    payment_provider_local: "wompi",
    wompi_transaction_id: transaction.id || null,
    wompi_status: status,
    wompi_amount_in_cents: transaction.amount_in_cents ?? null,
    wompi_event: event.event || "transaction.updated",
    wompi_updated_at: new Date().toISOString(),
  }

  await orderModule.updateOrders([
    {
      id: order.id,
      metadata: nextMetadata,
    },
  ])

  if (status !== "APPROVED") {
    return res.status(200).json({
      ok: true,
      captured: false,
      order_id: order.id,
      wompi_status: status,
    })
  }

  const payments =
    order.payment_collections?.flatMap((pc) => pc.payments || []) || []
  const capturedIds: string[] = []

  try {
    for (const payment of payments) {
      if (!payment?.id || payment.captured_at) continue
      await capturePaymentWorkflow(req.scope).run({
        input: { payment_id: payment.id },
      })
      capturedIds.push(payment.id)
    }
  } catch (error) {
    return res.status(502).json({
      ok: false,
      order_id: order.id,
      wompi_status: status,
      message:
        error instanceof Error ? error.message : "Payment capture failed",
    })
  }

  return res.status(200).json({
    ok: true,
    captured: true,
    order_id: order.id,
    payment_ids: capturedIds,
    already_captured: payments.length > 0 && capturedIds.length === 0,
    wompi_status: status,
    wompi_transaction_id: transaction.id,
  })
}

export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  return res.status(200).json({
    ok: true,
    message:
      "POST Wompi transaction.updated events here (X-Event-Checksum verified).",
  })
}
