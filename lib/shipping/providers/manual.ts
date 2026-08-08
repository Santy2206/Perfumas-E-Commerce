import type { CreateShipmentInput, CreateShipmentResult } from "../types";

/**
 * Payment-time placeholder: no Picap call.
 * Ops creates the booking from /ops/envios ("Crear envío Picap") or pastes tracking.
 */
export async function createManualShipment(
  input: CreateShipmentInput
): Promise<CreateShipmentResult> {
  return {
    ok: true,
    provider: "manual_pibox",
    trackingNumber: null,
    labelUrl: null,
    externalId: null,
    status: "pending_dispatch",
    message: `Despacho asignado a hub ${input.hub}. Crear envío Picap desde Ops cuando esté listo.`,
  };
}
