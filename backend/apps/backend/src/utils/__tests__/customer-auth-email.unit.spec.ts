import {
  resolveTrustedEnsureEmail,
} from "../customer-auth"

describe("resolveTrustedEnsureEmail", () => {
  it("prefers provider email over a differing client body email", () => {
    const result = resolveTrustedEnsureEmail({
      bodyEmail: "victim@example.com",
      providerEmail: "attacker@gmail.com",
      hasGoogleProvider: true,
    })
    expect(result).toEqual({
      email: "attacker@gmail.com",
      source: "provider",
      mismatch: true,
    })
  })

  it("uses provider email when body is omitted", () => {
    const result = resolveTrustedEnsureEmail({
      bodyEmail: "",
      providerEmail: "user@gmail.com",
      hasGoogleProvider: true,
    })
    expect(result).toEqual({
      email: "user@gmail.com",
      source: "provider",
      mismatch: false,
    })
  })

  it("refuses client email for Google flows without provider email", () => {
    const result = resolveTrustedEnsureEmail({
      bodyEmail: "victim@example.com",
      providerEmail: "",
      hasGoogleProvider: true,
    })
    expect(result).toEqual({
      email: "",
      source: "none",
      mismatch: true,
    })
  })

  it("allows body email only for non-Google identities", () => {
    const result = resolveTrustedEnsureEmail({
      bodyEmail: "shopper@example.com",
      providerEmail: "",
      hasGoogleProvider: false,
    })
    expect(result).toEqual({
      email: "shopper@example.com",
      source: "body",
      mismatch: false,
    })
  })

  it("normalizes casing and whitespace", () => {
    const result = resolveTrustedEnsureEmail({
      bodyEmail: "  User@Example.COM ",
      providerEmail: " user@example.com ",
      hasGoogleProvider: true,
    })
    expect(result.email).toBe("user@example.com")
    expect(result.mismatch).toBe(false)
  })
})
