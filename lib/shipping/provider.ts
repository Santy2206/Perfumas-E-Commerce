import { createManualShipment } from "./providers/manual";
import { createPiboxShipment, isPiboxConfigured } from "./providers/pibox";
import type { CreateShipmentInput, CreateShipmentResult } from "./types";

/**
 * Prefer Pibox when configured; otherwise phase-1 manual pack.
 */
export async function createShipment(
  input: CreateShipmentInput
): Promise<CreateShipmentResult> {
  if (isPiboxConfigured()) {
    const pibox = await createPiboxShipment(input);
    if (pibox.ok) return pibox;
    const manual = await createManualShipment(input);
    return {
      ...manual,
      message: `Pibox falló (${pibox.message}). Fallback manual.`,
    };
  }
  return createManualShipment(input);
}
