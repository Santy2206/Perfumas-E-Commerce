import {
  loadEnv,
  defineConfig,
  Modules,
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"

loadEnv(process.env.NODE_ENV || "development", process.cwd())

const adminDisabled =
  process.env.DISABLE_MEDUSA_ADMIN === "true" ||
  process.env.ADMIN_DISABLED === "true"

const s3Configured = Boolean(
  process.env.S3_BUCKET?.trim() &&
    process.env.S3_ACCESS_KEY_ID?.trim() &&
    process.env.S3_SECRET_ACCESS_KEY?.trim() &&
    process.env.S3_FILE_URL?.trim()
)

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
  },
  modules: [
    {
      resolve: "@medusajs/medusa/auth",
      dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/auth-emailpass",
            id: "emailpass",
          },
          {
            resolve: "@medusajs/medusa/auth-google",
            id: "google",
            options: {
              clientId: process.env.GOOGLE_CLIENT_ID,
              clientSecret: process.env.GOOGLE_CLIENT_SECRET,
              callbackUrl:
                process.env.GOOGLE_CALLBACK_URL ||
                "http://localhost:3000/auth/google/callback",
            },
          },
        ],
      },
    },
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
    // Durable product images in production (Supabase Storage / AWS / R2).
    // When unset, Medusa keeps the default local `static/` provider.
    ...(s3Configured
      ? [
          {
            resolve: "@medusajs/medusa/file",
            options: {
              providers: [
                {
                  resolve: "@medusajs/medusa/file-s3",
                  id: "s3",
                  options: {
                    file_url: process.env.S3_FILE_URL,
                    access_key_id: process.env.S3_ACCESS_KEY_ID,
                    secret_access_key: process.env.S3_SECRET_ACCESS_KEY,
                    region: process.env.S3_REGION || "us-east-1",
                    bucket: process.env.S3_BUCKET,
                    endpoint: process.env.S3_ENDPOINT || undefined,
                    additional_client_config: process.env.S3_FORCE_PATH_STYLE
                      ? { forcePathStyle: true }
                      : undefined,
                  },
                },
              ],
            },
          },
        ]
      : []),
  ],
})
