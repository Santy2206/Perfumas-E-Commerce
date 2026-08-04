import { existsSync } from "fs"
import { resolve } from "path"
import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

/** Vite fails on react-stately@3.49 exports pointing at missing index.mjs */
function reactStatelyAlias() {
  const candidates = [
    resolve(process.cwd(), "node_modules/react-stately/dist/exports/index.js"),
    resolve(process.cwd(), "../../node_modules/react-stately/dist/exports/index.js"),
  ]
  return candidates.find((p) => existsSync(p))
}

const adminDisabled =
  process.env.DISABLE_MEDUSA_ADMIN === "true" ||
  process.env.ADMIN_DISABLED === "true"

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      // Default includes Next.js storefront on :3000
      storeCors: process.env.STORE_CORS || "http://localhost:3000",
      adminCors: process.env.ADMIN_CORS || "http://localhost:5173,http://localhost:9000",
      authCors: process.env.AUTH_CORS || "http://localhost:3000,http://localhost:9000",
      jwtSecret: process.env.JWT_SECRET || "supersecret",
      cookieSecret: process.env.COOKIE_SECRET || "supersecret",
    },
  },
  admin: {
    disable: adminDisabled,
    vite: () => {
      const aliasTarget = reactStatelyAlias()
      if (!aliasTarget) return {}
      return {
        resolve: {
          alias: {
            "react-stately": aliasTarget,
          },
        },
      }
    },
  },
  modules: [
    {
      resolve: "@medusajs/medusa/payment",
      options: {
        providers: [
          {
            resolve: "./src/modules/wompi-payment",
            id: "wompi",
            options: {
              publicKey:
                process.env.WOMPI_PUBLIC_KEY ||
                process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY ||
                "",
              privateKey: process.env.WOMPI_PRIVATE_KEY || "",
              // Widget integrity (also used by Next.js). Events secret is read
              // by /hooks/wompi from WOMPI_EVENTS_SECRET.
              integritySecret: process.env.WOMPI_INTEGRITY_SECRET || "",
              eventsSecret: process.env.WOMPI_EVENTS_SECRET || "",
            },
          },
        ],
      },
    },
  ],
})
