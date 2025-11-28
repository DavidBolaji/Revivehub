import NextAuth, { NextAuthConfig } from "next-auth"
import GitHub from "next-auth/providers/github"

/**
 * NextAuth.js v5 Configuration
 * Implements GitHub OAuth authentication with JWT session strategy
 * Requirements: 1.1, 1.2, 1.3, 1.5, 2.2, 4.3, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5
 */
export const authConfig: NextAuthConfig = {
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: {
        params: {
          // Request necessary scopes for repository access and user data
          // Requirements: 1.2, 4.2
          scope: "read:user user:email repo"
        }
      }
    })
  ],
  pages: {
    // Custom login page
    // Requirements: 7.2, 8.1
    signIn: "/login",
    error: "/login"
  },
  callbacks: {
    /**
     * Authorization callback for route protection
     * Requirements: 3.1, 3.2, 3.3, 3.4
     */
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnDashboard = nextUrl.pathname.startsWith("/dashboard")
      
      if (isOnDashboard) {
        // Protect dashboard routes - require authentication
        if (isLoggedIn) return true
        return false // Redirect to login page
      } else if (isLoggedIn && nextUrl.pathname === "/login") {
        // Redirect authenticated users away from login page
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
    
    /**
     * JWT callback to persist access token and GitHub user data
     * Implements token refresh logic when token is expiring
     * Requirements: 1.3, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 6.2
     */
    async jwt({ token, account, profile }) {
      // On initial sign in, persist GitHub OAuth data to JWT
      if (account && profile) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
        token.githubId = profile.id?.toString()
        return token
      }

      // Check if token is expiring within 24 hours and needs refresh
      // Requirements: 5.1, 5.2
      if (token.expiresAt && token.refreshToken) {
        const oneDayInSeconds = 24 * 60 * 60
        const currentTime = Math.floor(Date.now() / 1000)
        const isExpiringSoon = (token.expiresAt as number) - currentTime < oneDayInSeconds

        if (isExpiringSoon) {
          try {
            // Attempt to refresh the access token
            // Requirements: 5.2, 5.3
            const response = await fetch("https://github.com/login/oauth/access_token", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Accept": "application/json"
              },
              body: JSON.stringify({
                client_id: process.env.GITHUB_ID!,
                client_secret: process.env.GITHUB_SECRET!,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken
              })
            })

            const refreshedTokens = await response.json()

            if (!response.ok || refreshedTokens.error) {
              // Token refresh failed - invalidate session
              // Requirements: 5.3, 5.4
              console.error("Token refresh failed:", refreshedTokens.error || response.statusText)
              return null // Returning null invalidates the session
            }

            // Update token and expiration in JWT on successful refresh
            // Requirements: 5.4, 5.5
            token.accessToken = refreshedTokens.access_token
            token.refreshToken = refreshedTokens.refresh_token ?? token.refreshToken
            token.expiresAt = refreshedTokens.expires_in 
              ? Math.floor(Date.now() / 1000) + refreshedTokens.expires_in
              : token.expiresAt

            console.log("Token successfully refreshed")
          } catch (error) {
            // Handle refresh token errors by invalidating session
            // Requirements: 5.3, 5.4
            console.error("Error refreshing token:", error)
            return null // Returning null invalidates the session
          }
        }
      }

      return token
    },
    
    /**
     * Session callback to add custom fields to session object
     * Requirements: 2.2, 4.1, 4.2, 4.3, 4.4
     */
    async session({ session, token }) {
      // Add custom fields from JWT to session for client access
      if (session.user) {
        session.user.id = token.githubId as string
        session.user.githubId = token.githubId as string
        session.accessToken = token.accessToken as string
        session.expiresAt = token.expiresAt as number
      }
      return session
    }
  },
  session: {
    // Use JWT strategy for stateless sessions
    // Requirements: 2.1, 2.2, 6.2
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60 // 30 days
  },
  // Secret for JWT encryption
  // Requirements: 6.2, 6.5
  secret: process.env.NEXTAUTH_SECRET
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
