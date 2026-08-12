import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG_PRODUCTS } from "../catalog";
import {
  FREE_SHIPPING_BOGOTA_MIN,
  getShippingQuote,
  isPerfumeriaEligibleLine,
} from "./pricing";

const insumos = CATALOG_PRODUCTS.find((p) => p.department === "insumos");
const perfume = CATALOG_PRODUCTS.find((p) => p.department === "perfumeria");

describe("free shipping composition trust", () => {
  it("rejects client productKind spoof on insumos SKUs", () => {
    assert.ok(insumos, "catalog has insumos");
    const line = {
      kind: "sku" as const,
      productId: insumos!.id,
      productKind: "prepared_replica",
      amount: FREE_SHIPPING_BOGOTA_MIN,
    };
    assert.equal(isPerfumeriaEligibleLine(line), false);
    const quote = getShippingQuote({
      methodId: "delivery-bogota",
      lines: [line],
      subtotal: FREE_SHIPPING_BOGOTA_MIN,
    });
    assert.equal(quote.free, false);
    assert.equal(quote.price, 8000);
    assert.equal(quote.disqualifyReason, "no_perfume");
  });

  it("rejects kind=build spoof when productId is a non-perfume catalog SKU", () => {
    assert.ok(insumos, "catalog has insumos");
    const line = {
      kind: "build" as const,
      productId: insumos!.id,
      amount: FREE_SHIPPING_BOGOTA_MIN,
    };
    assert.equal(isPerfumeriaEligibleLine(line), false);
    const quote = getShippingQuote({
      methodId: "delivery-bogota",
      lines: [line],
      subtotal: FREE_SHIPPING_BOGOTA_MIN,
    });
    assert.equal(quote.free, false);
    assert.equal(quote.price, 8000);
  });

  it("still grants free shipping for real perfumería over the threshold", () => {
    assert.ok(perfume, "catalog has perfumeria");
    const qty = Math.ceil(FREE_SHIPPING_BOGOTA_MIN / perfume!.price);
    const amount = perfume!.price * qty;
    const line = {
      kind: "sku" as const,
      productId: perfume!.id,
      amount,
    };
    assert.equal(isPerfumeriaEligibleLine(line), true);
    const quote = getShippingQuote({
      methodId: "delivery-bogota",
      lines: [line],
      subtotal: amount,
    });
    assert.equal(quote.free, true);
    assert.equal(quote.price, 0);
  });

  it("still treats custom builds without productId as perfume", () => {
    const line = {
      kind: "build" as const,
      amount: FREE_SHIPPING_BOGOTA_MIN,
    };
    assert.equal(isPerfumeriaEligibleLine(line), true);
  });

  it("does not let client department reclassify insumos as companion", () => {
    assert.ok(insumos && perfume, "catalog samples");
    const perfumeAmount = Math.max(perfume!.price, 40_000);
    const insumosAmount = perfumeAmount + 10_000;
    const quote = getShippingQuote({
      methodId: "delivery-bogota",
      lines: [
        {
          kind: "sku",
          productId: perfume!.id,
          amount: perfumeAmount,
        },
        {
          kind: "sku",
          productId: insumos!.id,
          department: "hogar",
          productKind: "home_care",
          amount: insumosAmount,
        },
      ],
      subtotal: perfumeAmount + insumosAmount,
    });
    assert.equal(quote.qualifiesCart, false);
    assert.equal(quote.disqualifyReason, "insumos_exceed");
    assert.equal(quote.free, false);
  });
});
