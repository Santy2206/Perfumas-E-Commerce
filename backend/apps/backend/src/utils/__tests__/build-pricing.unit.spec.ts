import { resolve } from "path"
import {
  computeBuildServerPrice,
  resetBuildPricingCache,
} from "../build-pricing"

const CATALOG = resolve(__dirname, "../../../data/catalog-seed.json")

describe("computeBuildServerPrice", () => {
  beforeEach(() => {
    resetBuildPricingCache()
  })

  it("prices prepared replicas from catalog amount (ignores undercharge attempts)", () => {
    const priced = computeBuildServerPrice(
      {
        fragranceId: "ess-1-M",
        bottleId: "rep-1251-100",
        pheromoneIds: [],
        giftWrap: false,
      },
      CATALOG
    )
    expect(priced.ok).toBe(true)
    if (!priced.ok) return
    expect(priced.total).toBe(52000)
    expect(priced.total).not.toBe(1)
  })

  it("adds pheromones and gift wrap on prepared replicas", () => {
    const priced = computeBuildServerPrice(
      {
        fragranceId: "ess-1-M",
        bottleId: "rep-1251-100",
        pheromoneIds: ["ph-femenina"],
        giftWrap: true,
      },
      CATALOG
    )
    expect(priced.ok).toBe(true)
    if (!priced.ok) return
    // 52000 + 5000 + 3000
    expect(priced.total).toBe(60000)
  })

  it("prices DIY builds as pricePerGram × capacity + bottle + alcohol", () => {
    const priced = computeBuildServerPrice(
      {
        fragranceId: "ess-1-M",
        bottleId: "b-1251",
        alcoholId: "alc-30",
        pheromoneIds: [],
        giftWrap: false,
      },
      CATALOG
    )
    expect(priced.ok).toBe(true)
    if (!priced.ok) return
    // 410*100 + 22200 + 1600 = 64800
    expect(priced.total).toBe(64800)
  })

  it("rejects unknown bottle ids", () => {
    const priced = computeBuildServerPrice(
      {
        fragranceId: "ess-1-M",
        bottleId: "not-a-real-bottle",
      },
      CATALOG
    )
    expect(priced.ok).toBe(false)
  })
})
