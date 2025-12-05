# Implementation Plan

- [x] 1. Install dependencies and configure environment





  - Install next-auth@beta and @auth/core packages
  - Add NEXTAUTH_URL, NEXTAUTH_SECRET, GITHUB_ID, and GITHUB_SECRET to .env.example
  - Update .gitignore to ensure .env.local is excluded
  - _Requirements: 6.1, 6.5_

- [x] 2. Create authentication type definitions





  - Create types/auth.ts with NextAuth module augmentation
  - Define Session, User, and JWT interfaces with GitHub-specific fields
  - Define AuthUser interface for application use
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 3. Implement NextAuth configuration and API routes





  - Create auth.ts in project root with NextAuth configuration
  - Configure GitHub OAuth provider with required scopes (read:user, user:email, repo)
  - Implement JWT callback to persist access token and GitHub user data
  - Implement session callback to add custom fields to session object
  - Implement authorized callback for route protection logic
  - Configure session strategy as JWT with 30-day maxAge
  - Create app/api/auth/[...nextauth]/route.ts to export GET and POST handlers
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.2, 4.3, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4. Create authentication middleware for protected routes





  - Create middleware.ts in project root
  - Export auth function as middleware from auth.ts
  - Configure matcher to protect /dashboard/* and API routes
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 5. Implement authentication helper functions





  - Create lib/auth.ts with helper functions
  - Implement getSession() to retrieve current session
  - Implement getCurrentUser() to get current user data
  - Implement requireAuth() to enforce authentication with redirect
  - Implement getGitHubToken() to retrieve access token with error handling
  - Implement isTokenExpiringSoon() to check token expiration within 24 hours
  - _Requirements: 4.3, 5.1, 5.2, 5.3, 10.3_

- [x] 6. Create login page with error handling





  - Create app/login/page.tsx as server component
  - Implement redirect logic for already authenticated users
  - Create error message mapping function for OAuth errors
  - Display error messages from searchParams
  - Render LoginButton component with callback URL support
  - Style page with ReviveHub branding and description
  - _Requirements: 1.4, 8.1, 8.2, 8.3, 8.4, 8.5, 10.1, 10.2, 10.5_

- [x] 7. Create login button component





  - Create components/auth/LoginButton.tsx as client component
  - Implement signIn function call with GitHub provider
  - Add GitHub icon from lucide-react
  - Support callbackUrl prop for post-login redirect
  - Style button using existing UI components
  - _Requirements: 1.1, 8.2_

- [x] 8. Create session provider wrapper





  - Create components/auth/SessionProvider.tsx as client component
  - Wrap NextAuth SessionProvider for client-side session access
  - _Requirements: 2.2_

- [x] 9. Update root layout with session provider





  - Modify app/layout.tsx to wrap children with SessionProvider
  - Ensure session context is available throughout the application
  - _Requirements: 2.2_

- [x] 10. Create user navigation component with sign-out













  - Create components/auth/UserNav.tsx as client component
  - Implement dropdown menu with user avatar, name, and email
  - Add sign-out button that calls signOut with callback to /login
  - Use existing Radix UI dropdown menu components
  - Display user initials as avatar fallback
  - _Requirements: 2.4, 9.3_

- [x] 11. Create Avatar UI component (if not exists)




  - Create components/ui/avatar.tsx with Avatar, AvatarImage, and AvatarFallback
  - Use Radix UI Avatar primitive
  - Style with Tailwind CSS
  - _Requirements: 9.2_

- [x] 12. Create dashboard layout with authentication





  - Create app/dashboard/layout.tsx as server component
  - Call requireAuth() to enforce authentication
  - Render header with ReviveHub branding and UserNav component
  - Wrap children in main container with proper styling
  - _Requirements: 3.5, 9.1, 9.2, 9.3, 9.4_

- [x] 13. Create dashboard home page





  - Create app/dashboard/page.tsx as server component
  - Fetch current user session
  - Display welcome message with user name
  - Show placeholder for repository list (to be implemented later)
  - _Requirements: 9.1, 9.2, 9.5_

- [x] 14. Update GitHub service to use authenticated token





  - Modify services/github.ts to import getGitHubToken
  - Update all API methods to use authenticated token from session
  - Add error handling for missing or invalid tokens
  - Implement getAuthenticatedUser() method
  - Implement getUserRepositories() method with pagination
  - Implement getRepository(owner, repo) method
  - _Requirements: 4.3, 9.4, 10.3_

- [x] 15. Create error handling utilities





  - Create lib/errors.ts with custom error classes
  - Implement AuthError base class
  - Implement TokenExpiredError class
  - Implement InvalidTokenError class
  - Implement handleAuthError function for error message mapping
  - Add server-side error logging
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 16. Add token refresh logic to JWT callback





  - Update JWT callback in auth.ts to check token expiration
  - Implement token refresh when expiring within 24 hours
  - Handle refresh token errors by invalidating session
  - Update token and expiration in JWT on successful refresh
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 17. Update environment example file





  - Add all required NextAuth environment variables to .env.example
  - Add comments explaining how to obtain GitHub OAuth credentials
  - Add instructions for generating NEXTAUTH_SECRET
  - _Requirements: 6.5_

- [x] 18. Create authentication integration tests




















  - Write tests for complete OAuth flow simulation
  - Test session creation and persistence
  - Test protected route access with valid/invalid sessions
  - Test sign-out flow and session cleanup
  - _Requirements: All_

- [x] 19. Create unit tests for auth helpers





  - Test getSession with various session states
  - Test requireAuth redirect behavior
  - Test isTokenExpiringSoon with different timestamps
  - Test getGitHubToken error handling
  - Test error handling utilities
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 10.4_

- [x] 20. Add documentation for setup and usage





  - Document GitHub OAuth app creation process
  - Document environment variable configuration
  - Document authentication flow for developers
  - Add troubleshooting guide for common issues
  - _Requirements: All_
