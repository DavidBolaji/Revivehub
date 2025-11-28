import { DefaultSession } from "next-auth"

// Module augmentation for NextAuth to add custom fields to Session, User, and JWT
declare module "next-auth" {
  /**
   * Extended Session interface with GitHub-specific fields
   * Requirements: 4.1, 4.2, 4.3, 4.4
   */
  interface Session {
    user: {
      id: string
      githubId?: string
    } & DefaultSession["user"]
    accessToken?: string
    expiresAt?: number
  }

  /**
   * Extended User interface with GitHub-specific fields
   * Requirements: 4.1, 4.2, 4.5
   */
  interface User {
    githubId?: string
    linkedRepositoriesCount?: number
  }

    /**
   * Extended JWT interface to persist GitHub OAuth data
   * Requirements: 4.3, 4.4
   */
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
    githubId?: string
  }
}

/**
 * Application-specific user interface for type-safe user data access
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export interface AuthUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
  githubId: string
  accessToken: string
  linkedRepositoriesCount: number
}
