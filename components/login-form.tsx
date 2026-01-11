"use client"

import { useState, useEffect } from "react"
import { signIn } from "next-auth/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "sonner"

export function LoginForm({
  className,
  error,
  ...props
}: React.ComponentProps<"div"> & { error?: string | null }) {
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (error) {
      const message = error === "unauthorized" 
        ? "Your account is not authorized to access this application."
        : "An error occurred. Please try again."
      toast.error(message)
    }
  }, [error])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn("google", { callbackUrl: "/expeditions" })
    } catch (error) {
      console.error("Sign in error:", error)
      toast.error("Failed to sign in. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className={cn("w-full max-w-sm", className)} {...props}>
      <Card>
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Expeditions Staff Access Portal</CardTitle>
          <CardDescription className="pb-4">
            Login with your Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            variant="outline" 
            type="button" 
            className="w-full cursor-pointer"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
          >
            {isLoading ? (
              <Spinner size="sm" className="mr-2" />
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
                <path
                  d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                  fill="currentColor"
                />
              </svg>
            )}
            {isLoading ? "Signing in..." : "Login with Google"}
          </Button>
          
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Only authorized staff members can sign in
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
