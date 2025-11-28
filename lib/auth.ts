import { auth } from "@/auth"
import { redirect } from "next/navigation"

/**
 * Authentication Helper Functions
 * Provides utility functions for session management and authentication checks
 * Requirements: 4.3, 5.1, 5.2, 5.3, 10.3
 */

/**
 * Retrieves the current user session
 * Requirements: 5.1
 * 
 * @returns The current session object or null if not authenticated
 */
export async function getSession() {
  return await auth()
}

/**
 * Retrieves the current authenticated user data
 * Requirements: 5.2
 * 
 * @returns The current user object or undefined if not authenticated
 */
export async function getCurrentUser() {
  const session = await getSession()
  return session?.user
}

/**
 * Enforces authentication by redirecting to login if not authenticated
 * Requirements: 3.1, 5.3
 * 
 * @returns The current session if authenticated
 * @throws Redirects to /login if not authenticated
 */
export async function requireAuth() {
  const session = await getSession()
  if (!session?.user) {
    redirect("/login")
  }
  return session
}

/**
 * Retrieves the GitHub access token from the current session
 * Requirements: 4.3, 10.3
 * 
 * @returns The GitHub access token
 * @throws Error if no access token is available
 */
export async function getGitHubToken() {
  const session = await getSession()
  if (!session?.accessToken) {
    throw new Error("No GitHub access token available")
  }
  return session.accessToken
}

/**
 * Checks if the GitHub access token is expiring within 24 hours
 * Requirements: 5.1
 * 
 * @param expiresAt - Token expiration timestamp in seconds
 * @returns true if token expires within 24 hours, false otherwise
 */
export function isTokenExpiringSoon(expiresAt: number): boolean {
  const oneDayInSeconds = 24 * 60 * 60
  const currentTime = Math.floor(Date.now() / 1000)
  return expiresAt - currentTime < oneDayInSeconds
}
