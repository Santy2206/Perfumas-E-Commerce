import {
  defineMiddlewares,
  authenticate,
} from "@medusajs/framework/http"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/auth/customer/ensure",
      method: "POST",
      middlewares: [
        authenticate("customer", ["bearer", "session"], {
          allowUnregistered: true,
        }),
      ],
    },
  ],
})
