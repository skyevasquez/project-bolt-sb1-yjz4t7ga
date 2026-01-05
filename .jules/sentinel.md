# Sentinel's Journal

## 2025-02-18 - Supabase Error Detail Leakage
**Vulnerability:** The `fetchProfile` function in `AuthContext.tsx` was logging `error.details` from Supabase responses directly to the console.
**Learning:** Supabase error objects often contain internal database schema information or other sensitive details in the `details` property, which should not be exposed to the client-side console.
**Prevention:** Always sanitize error objects from external services before logging them. Log only the generic `message` or a custom error code, and avoid dumping full objects like `error` or `error.details` to `console.error`.
