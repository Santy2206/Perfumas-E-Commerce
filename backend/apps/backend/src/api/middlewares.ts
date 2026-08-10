import {
  defineMiddlewares,
  authenticate,
} from "@medusajs/framework/http"

const customerAuth = authenticate("customer", ["bearer", "session"])
const customerAuthAllowUnregistered = authenticate("customer", ["bearer", "session"], {
  allowUnregistered: true,
})

export default defineMiddlewares({
  routes: [
    {
      matcher: "/auth/customer/ensure",
      method: "POST",
      middlewares: [customerAuthAllowUnregistered],
    },
    {
      matcher: "/auth/customer/providers",
      method: "GET",
      middlewares: [customerAuth],
    },
    {
      matcher: "/auth/customer/password",
      method: "POST",
      middlewares: [customerAuth],
    },
    {
      matcher: "/auth/customer/email/request",
      method: "POST",
      middlewares: [customerAuth],
    },
    {
      matcher: "/auth/customer/email/confirm",
      method: "POST",
      middlewares: [customerAuth],
    },
    {
      matcher: "/auth/customer/google/link",
      method: "POST",
      middlewares: [customerAuth],
    },
    {
      matcher: "/auth/customer/google/unlink",
      method: "DELETE",
      middlewares: [customerAuth],
    },
  ],
})
