import { createManualShipment } from "./providers/manual";
import {
  createEnviaShipment,
  isEnviaConfigured,
} from "./providers/envia";
import { createPiboxShipment, isPiboxConfigured } from "./providers/pibox";
import type { CreateShipmentInput, CreateShipmentResult } from "./types";

/**
 * Payment-time dispatch: never calls Picap/Envia.
 * Ops creates bookings manually when the hub is ready.
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

/** Ops-only: create Envia national label (Fontibón → Colombia). */
export async function createEnviaBooking(
  input: CreateShipmentInput
): Promise<CreateShipmentResult> {
  if (!isEnviaConfigured()) {
    return {
      ok: false,
      provider: "envia",
      status: "pending_dispatch",
      message: "Envia no configurada (ENVIA_TOKEN)",
    };
  }
  return createEnviaShipment(input);
}
