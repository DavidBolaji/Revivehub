"use client"

import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Github } from "lucide-react"

interface LoginButtonProps {
  callbackUrl?: string
}

export function LoginButton({ callbackUrl }: LoginButtonProps) {
  const handleSignIn = () => {
    signIn("github", { callbackUrl: callbackUrl || "/dashboard" })
  }

  return (
    <Button
      onClick={handleSignIn}
      className="w-full"
      size="lg"
    >
      <Github className="mr-2 h-5 w-5" />
      Sign in with GitHub
    </Button>
  )
}
