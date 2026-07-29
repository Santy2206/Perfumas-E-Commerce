/**
 * After `medusa build`, install prod deps inside the standalone server
 * and ensure `public/` resolves for platforms that start from the app root.
 */
import { cpSync, existsSync, mkdirSync, rmSync, symlinkSync } from "fs"
import { join } from "path"

const root = process.cwd()
const serverDir = join(root, ".medusa", "server")
const publicSrc = join(serverDir, "public")
const publicDest = join(root, "public")
const adminSrc = join(publicSrc, "admin")
const adminDest = join(root, ".medusa", "admin")

if (!existsSync(serverDir)) {
  console.error("post-medusa-build: missing .medusa/server — did medusa build run?")
  process.exit(1)
}

if (existsSync(publicDest)) {
  rmSync(publicDest, { recursive: true, force: true })
}
try {
  symlinkSync(publicSrc, publicDest, "junction")
} catch {
  cpSync(publicSrc, publicDest, { recursive: true })
}

if (existsSync(adminSrc)) {
  if (existsSync(adminDest)) {
    rmSync(adminDest, { recursive: true, force: true })
  }
  mkdirSync(join(root, ".medusa"), { recursive: true })
  cpSync(adminSrc, adminDest, { recursive: true })
}

console.log("post-medusa-build: linked public/ and synced .medusa/admin")
