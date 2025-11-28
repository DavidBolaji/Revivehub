import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { LoginButton } from "@/components/auth/LoginButton"

export default async function LoginPage({
  searchParams
}: {
  searchParams: { error?: string; callbackUrl?: string }
}) {
  const session = await getSession()
  
  // Redirect authenticated users to dashboard
  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-slate-900">ReviveHub</h1>
          <p className="mt-2 text-slate-600">
            AI-Powered Code Modernization
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Analyze and modernize your legacy codebases with intelligent AI assistance
          </p>
        </div>
        
        {searchParams.error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-800">
              {getErrorMessage(searchParams.error)}
            </p>
          </div>
        )}
        
        <LoginButton callbackUrl={searchParams.callbackUrl} />
      </div>
    </div>
  )
}

function getErrorMessage(error: string): string {
  switch (error) {
    case "OAuthAccountNotLinked":
      return "This email is already associated with another account."
    case "OAuthCallback":
      return "Authentication cancelled or failed. Please try again."
    case "AccessDenied":
      return "Access denied. Please authorize the application."
    case "Configuration":
      return "There is a problem with the server configuration."
    case "Verification":
      return "The verification token has expired or has already been used."
    default:
      return "An error occurred during authentication. Please try again."
  }
}
