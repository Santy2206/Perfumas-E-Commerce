/**
 * Lightweight assertions for hub routing (run: npx tsx lib/shipping/hub-routing.selftest.ts)
 */
import { resolveDispatchHub } from "./hub-routing";

function assert(cond: unknown, msg: string) {
  if (!cond) throw new Error(msg);
}

assert(
  resolveDispatchHub({
    shippingMethodId: "delivery-bogota",
    city: "Bogotá",
    locality: "Suba",
  }).hub === "bonanza",
  "Suba → Bonanza"
);

assert(
  resolveDispatchHub({
    shippingMethodId: "delivery-bogota",
    city: "Bogotá",
    locality: "Kennedy",
  }).hub === "fontibon",
  "Kennedy → Fontibón"
);

assert(
  resolveDispatchHub({
    shippingMethodId: "delivery-nacional",
    city: "Medellín",
  }).hub === "fontibon",
  "Medellín → Fontibón"
);

assert(
  resolveDispatchHub({
    shippingMethodId: "pickup-bonanza",
    city: "Bogotá",
  }).hub === "bonanza",
  "Pickup Bonanza"
);

console.log("hub-routing.selftest: ok");
