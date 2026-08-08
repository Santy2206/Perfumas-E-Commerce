import { createManualShipment } from "./providers/manual";
import { createPiboxShipment, isPiboxConfigured } from "./providers/pibox";
import type { CreateShipmentInput, CreateShipmentResult } from "./types";

/**
 * Payment-time dispatch: never calls Picap.
 * Ops creates the Picap booking manually via createPiboxBooking().
 */
export async function createShipment(
  input: CreateShipmentInput
): Promise<CreateShipmentResult> {
  return createManualShipment(input);
}

/** Ops-only: create a real Picap booking when the hub is ready. */
export async function createPiboxBooking(
  input: CreateShipmentInput
): Promise<CreateShipmentResult> {
  if (!isPiboxConfigured()) {
    return {
      ok: false,
      provider: "pibox",
      status: "pending_dispatch",
      message: "Pibox API no configurada",
    };
  }
  return createPiboxShipment(input);
}
