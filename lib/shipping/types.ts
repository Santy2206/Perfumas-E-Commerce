import type { DispatchHub } from "./hub-routing";

export type ShippingStatus =
  | "pending_dispatch"
  | "label_created"
  | "dispatched"
  | "in_transit"
  | "delivered"
  | "failed"
  | "pickup_ready";

export type ShippingProviderId = "manual_pibox" | "pibox" | "none";

export type OrderShippingMetadata = {
  shipping_method_id?: string;
  shipping_locality?: string | null;
  shipping_department?: string | null;
  shipping_postal_code?: string | null;
  shipping_hub?: DispatchHub | null;
  shipping_hub_label?: string | null;
  shipping_hub_address?: string | null;
  shipping_hub_reason?: string | null;
  shipping_status?: ShippingStatus | null;
  shipping_provider?: ShippingProviderId | null;
  tracking_number?: string | null;
  label_url?: string | null;
  pibox_shipment_id?: string | null;
  pibox_package_id?: string | null;
  pickup_validation_code?: string | null;
  estimated_weight_kg?: number;
  shipping_updated_at?: string | null;
  shipping_dispatched_at?: string | null;
};

export type CreateShipmentInput = {
  orderId: string;
  reference: string;
  hub: DispatchHub;
  customer: {
    name: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    locality?: string | null;
    department?: string | null;
    postalCode?: string | null;
  };
  weightKg?: number;
  /** Declared value in COP centavos for Picap insurance */
  declaredValueCents?: number;
  indications?: string;
};

export type CreateShipmentResult = {
  ok: boolean;
  provider: ShippingProviderId;
  trackingNumber?: string | null;
  labelUrl?: string | null;
  externalId?: string | null;
  status: ShippingStatus;
  message?: string;
  pickupValidationCode?: string | null;
  packageId?: string | null;
};
