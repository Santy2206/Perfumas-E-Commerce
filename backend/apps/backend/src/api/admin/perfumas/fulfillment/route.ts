import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /admin/perfumas/fulfillment
 * Returns guidance + expected metadata shape for custom build pick lists.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  return res.status(200).json({
    description:
      "Custom perfume builds store a pick list in line item metadata.build_components",
    example_metadata: {
      type: "custom_build",
      fragrance_id: "f-eros",
      bottle_id: "b-eros-std",
      alcohol_id: "alc-30",
      pheromone_ids: ["ph-masculina"],
      label_text: "Para Ana",
      gift_wrap: true,
      build_components: [
        { variant_id: "f-eros", qty: 100, name: "Eros (100 g)" },
        { variant_id: "b-eros-std", qty: 1, name: "Eros Réplica 100 ml" },
        { variant_id: "alc-30", qty: 1, name: "Alcohol Desodorizado 30 ml" },
        { variant_id: "ph-masculina", qty: 1, name: "Feromona Masculina" },
        { variant_id: "gift-wrap", qty: 1, name: "Caja para regalo" },
      ],
    },
    customer_groups: {
      emprendedores: "B2B wholesale — use price lists + variant metadata.min_qty",
    },
    sales_channels: ["retail", "wholesale"],
  })
}
