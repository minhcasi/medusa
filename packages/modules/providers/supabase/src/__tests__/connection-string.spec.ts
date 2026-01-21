import {
  applyPoolModePort,
  isValidSupabaseConnectionString,
  extractProjectRef,
} from "../utils/connection-string"

describe("Supabase Connection String Utilities", () => {
  describe("applyPoolModePort", () => {
    const baseUrl = "postgresql://postgres:password@db.project.supabase.co:5432/postgres"

    it("should use port 5432 for session mode", () => {
      const result = applyPoolModePort(baseUrl, "session")
      expect(result).toContain(":5432/")
    })

    it("should use port 6543 for transaction mode", () => {
      const result = applyPoolModePort(baseUrl, "transaction")
      expect(result).toContain(":6543/")
    })

    it("should handle connection strings without explicit port", () => {
      const urlWithoutPort = "postgresql://postgres:password@db.project.supabase.co/postgres"
      const result = applyPoolModePort(urlWithoutPort, "transaction")
      expect(result).toContain(":6543")
    })

    it("should handle pooler URLs", () => {
      const poolerUrl = "postgresql://postgres:password@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
      const result = applyPoolModePort(poolerUrl, "transaction")
      expect(result).toContain(":6543/")
    })
  })

  describe("isValidSupabaseConnectionString", () => {
    it("should return true for valid Supabase URLs", () => {
      const validUrls = [
        "postgresql://postgres:pass@db.project.supabase.co:5432/postgres",
        "postgresql://postgres:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres",
      ]

      validUrls.forEach((url) => {
        expect(isValidSupabaseConnectionString(url)).toBe(true)
      })
    })

    it("should return false for non-Supabase URLs", () => {
      const invalidUrls = [
        "postgresql://localhost:5432/postgres",
        "postgresql://user:pass@my-server.com:5432/db",
        "mysql://user:pass@db.supabase.co:3306/db",
      ]

      invalidUrls.forEach((url) => {
        expect(isValidSupabaseConnectionString(url)).toBe(false)
      })
    })

    it("should return false for invalid URLs", () => {
      expect(isValidSupabaseConnectionString("not-a-url")).toBe(false)
      expect(isValidSupabaseConnectionString("")).toBe(false)
    })
  })

  describe("extractProjectRef", () => {
    it("should extract project reference from Supabase URL", () => {
      const url = "https://myproject.supabase.co"
      expect(extractProjectRef(url)).toBe("myproject")
    })

    it("should return null for invalid URLs", () => {
      expect(extractProjectRef("not-a-url")).toBeNull()
      expect(extractProjectRef("https://example.com")).toBeNull()
    })
  })
})
