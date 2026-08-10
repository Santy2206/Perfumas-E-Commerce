/**
 * Bulk-upload product images from a folder.
 * Filename (without extension) must match the Medusa product handle.
 *
 * From PERFUMAS-E-COMMERCE/:
 *   npm run catalog:images -- --dir "C:\...\Imagenes_perfumas"
 *   npm run catalog:images -- --dir "..." --dry-run
 *   npm run catalog:images -- --dir "..." --also-prepared
 */

import { existsSync, readdirSync, readFileSync, statSync } from "fs"
import { basename, extname, resolve } from "path"
import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  updateProductsWorkflow,
  uploadFilesWorkflow,
} from "@medusajs/medusa/core-flows"

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"])

const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
}

function argValue(argv: string[], name: string): string | undefined {
  const idx = argv.indexOf(name)
  if (idx >= 0 && argv[idx + 1]) return argv[idx + 1]
  const prefix = `${name}=`
  const hit = argv.find((a) => a.startsWith(prefix))
  return hit ? hit.slice(prefix.length) : undefined
}

function hasFlag(argv: string[], name: string): boolean {
  return argv.includes(name)
}

type ProductRow = {
  id: string
  handle: string
  thumbnail?: string | null
  images?: { id?: string; url?: string }[]
}

export default async function uploadProductImages({
  container,
  args = [],
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const argv = args.length ? args : process.argv.slice(2)

  const dirArg =
    argValue(argv, "--dir") ||
    process.env.PERFUMAS_IMAGES_DIR ||
    resolve(
      process.cwd(),
      "..",
      "..",
      "..",
      "..",
      "Archivosperfumas",
      "Imagenes_perfumas"
    )
  const dir = resolve(dirArg)
  const dryRun = hasFlag(argv, "--dry-run")
  const alsoPrepared = hasFlag(argv, "--also-prepared")
  const force = hasFlag(argv, "--force")

  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    throw new Error(`Images directory not found: ${dir}`)
  }

  const files = readdirSync(dir)
    .filter((name) => IMAGE_EXT.has(extname(name).toLowerCase()))
    .sort()

  if (!files.length) {
    logger.info(`No images in ${dir}`)
    return
  }

  logger.info(`Scanning ${files.length} images in ${dir}`)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "thumbnail", "images.id", "images.url"],
    pagination: { take: 10000, skip: 0 },
  })

  const byHandle = new Map(
    (products as ProductRow[]).map((p) => [p.handle, p])
  )

  let uploaded = 0
  let skipped = 0
  let missing = 0
  let failed = 0

  for (const file of files) {
    const ext = extname(file).toLowerCase()
    const handle = basename(file, ext)
    const targets: ProductRow[] = []
    const primary = byHandle.get(handle)
    if (primary) targets.push(primary)
    if (alsoPrepared) {
      const prepared = byHandle.get(`${handle}-2`)
      if (prepared && prepared.id !== primary?.id) targets.push(prepared)
    }

    if (!targets.length) {
      logger.warn(`No product for handle "${handle}" (${file})`)
      missing++
      continue
    }

    const abs = resolve(dir, file)
    const mime = MIME[ext] || "application/octet-stream"

    for (const product of targets) {
      if (!force && product.thumbnail) {
        logger.info(`Skip ${product.handle} (already has thumbnail)`)
        skipped++
        continue
      }

      if (dryRun) {
        logger.info(`[dry-run] would upload ${file} → ${product.handle}`)
        uploaded++
        continue
      }

      try {
        const content = readFileSync(abs).toString("binary")
        const { result: uploadedFiles } = await uploadFilesWorkflow(
          container
        ).run({
          input: {
            files: [
              {
                filename: file,
                mimeType: mime,
                content,
                access: "public",
              },
            ],
          },
        })

        const url = uploadedFiles?.[0]?.url
        if (!url) {
          throw new Error("Upload returned no URL")
        }

        await updateProductsWorkflow(container).run({
          input: {
            products: [
              {
                id: product.id,
                thumbnail: url,
                images: [{ url }],
              },
            ],
          },
        })

        product.thumbnail = url
        product.images = [{ url }]
        logger.info(`OK ${file} → ${product.handle}`)
        uploaded++
      } catch (err) {
        failed++
        logger.error(
          `FAIL ${file} → ${product.handle}: ${
            err instanceof Error ? err.message : String(err)
          }`
        )
      }
    }
  }

  logger.info(
    `Done. uploaded=${uploaded} skipped=${skipped} missing=${missing} failed=${failed} dryRun=${dryRun}`
  )
}
