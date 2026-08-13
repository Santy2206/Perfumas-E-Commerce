import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { amountPesosFromOrder } from "./checkout-amount";

describe("amountPesosFromOrder", () => {
  it("uses the Medusa order total when present", () => {
    assert.equal(amountPesosFromOrder(100_000, 1_000), 100_000);
  });

  it("does not divide the order total when the client total is tiny", () => {
    // Former heuristic: orderTotal >= fallback * 50 → orderTotal / 100
    assert.equal(amountPesosFromOrder(180_000, 1_800), 180_000);
    assert.equal(amountPesosFromOrder(50_000, 500), 50_000);
  });

  it("falls back only when the order total is missing or invalid", () => {
    assert.equal(amountPesosFromOrder(null, 42_000), 42_000);
    assert.equal(amountPesosFromOrder(undefined, 42_000), 42_000);
    assert.equal(amountPesosFromOrder(0, 42_000), 42_000);
    assert.equal(amountPesosFromOrder(Number.NaN, 42_000), 42_000);
  });

  it("rounds fractional peso amounts", () => {
    assert.equal(amountPesosFromOrder(10000.4, 1), 10000);
    assert.equal(amountPesosFromOrder(null, 10000.6), 10001);
  });
});
