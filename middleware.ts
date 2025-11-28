/**
 * Next.js Middleware for Authentication
 * Protects routes by verifying user session before allowing access
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export { auth as middleware } from "@/auth"

/**
 * Matcher configuration to specify which routes require authentication
 * Requirements: 3.5
 * 
 * Protected routes:
 * - /dashboard and all sub-routes
 * - API routes for repositories and analysis
 */
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/api/repositories/:path*",
    "/api/analysis/:path*"
  ]
}
