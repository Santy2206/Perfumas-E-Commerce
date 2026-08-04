import type { CreateShipmentInput, CreateShipmentResult } from "../types";

/**
 * Phase-1 provider: no external API. Ops creates the Pibox guide manually
 * and pastes tracking into the shipping admin panel.
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
    message: `Despacho asignado a hub ${input.hub}. Crear guía en Pibox manualmente.`,
  };
}
