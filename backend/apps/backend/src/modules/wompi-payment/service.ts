import {
  AbstractPaymentProvider,
  PaymentActions,
  PaymentSessionStatus,
} from "@medusajs/framework/utils"
import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types"

type WompiOptions = {
  publicKey?: string
  privateKey?: string
}

/**
 * Wompi payment provider (Colombia).
 * Checkout initiates a session; the Next.js storefront can open the Wompi Widget
 * using data returned here. Cart completion authorizes immediately (like system)
 * so Admin orders are created; capture/webhook confirms paid status later.
 */
class WompiPaymentProviderService extends AbstractPaymentProvider<WompiOptions> {
  static identifier = "wompi"

  protected options_: WompiOptions

  constructor(container: Record<string, unknown>, options: WompiOptions) {
    super(container, options)
    this.options_ = options || {}
  }

  async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    const id = `wompi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    return {
      id,
      status: PaymentSessionStatus.PENDING,
      data: {
        id,
        provider: "wompi",
        amount: input.amount,
        currency_code: input.currency_code,
        public_key: this.options_.publicKey || process.env.WOMPI_PUBLIC_KEY || "",
        configured: Boolean(
          this.options_.privateKey || process.env.WOMPI_PRIVATE_KEY
        ),
      },
    }
  }

  async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return {
      data: {
        ...(input.data || {}),
        amount: input.amount,
        currency_code: input.currency_code,
      },
    }
  }

  async deletePayment(_input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return { data: {} }
  }

  async authorizePayment(
    input: AuthorizePaymentInput
  ): Promise<AuthorizePaymentOutput> {
    // Allow cart.complete without waiting for Wompi webhook (ops confirm later).
    return {
      status: PaymentSessionStatus.AUTHORIZED,
      data: {
        ...(input.data || {}),
        authorized_at: new Date().toISOString(),
      },
    }
  }

  async capturePayment(
    input: CapturePaymentInput
  ): Promise<CapturePaymentOutput> {
    return {
      data: {
        ...(input.data || {}),
        captured_at: new Date().toISOString(),
      },
    }
  }

  async cancelPayment(
    input: CancelPaymentInput
  ): Promise<CancelPaymentOutput> {
    return {
      data: {
        ...(input.data || {}),
        canceled_at: new Date().toISOString(),
      },
    }
  }

  async refundPayment(
    input: RefundPaymentInput
  ): Promise<RefundPaymentOutput> {
    return {
      data: {
        ...(input.data || {}),
        refunded_at: new Date().toISOString(),
        amount: input.amount,
      },
    }
  }

  async retrievePayment(
    input: RetrievePaymentInput
  ): Promise<RetrievePaymentOutput> {
    return { data: input.data || {} }
  }

  async getPaymentStatus(
    input: GetPaymentStatusInput
  ): Promise<GetPaymentStatusOutput> {
    const status = (input.data?.status as string) || PaymentSessionStatus.PENDING
    return { status: status as PaymentSessionStatus }
  }

  async getWebhookActionAndData(
    payload: ProviderWebhookPayload["payload"]
  ): Promise<WebhookActionResult> {
    const data = (payload.data || {}) as Record<string, unknown>
    const event = (data.event || data.type || "") as string
    const transaction = (data.data as Record<string, unknown>)?.transaction as
      | Record<string, unknown>
      | undefined
    const id = (transaction?.id || data.id || "unknown") as string
    const amount = Number(transaction?.amount_in_cents ?? data.amount ?? 0)

    if (
      event.includes("transaction.updated") ||
      transaction?.status === "APPROVED"
    ) {
      return {
        action: PaymentActions.SUCCESSFUL,
        data: {
          session_id: id,
          amount,
        },
      }
    }

    if (transaction?.status === "DECLINED" || transaction?.status === "ERROR") {
      return {
        action: PaymentActions.FAILED,
        data: { session_id: id, amount },
      }
    }

    return {
      action: PaymentActions.NOT_SUPPORTED,
      data: { session_id: id, amount },
    }
  }
}

export default WompiPaymentProviderService
