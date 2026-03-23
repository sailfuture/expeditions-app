import Image from "next/image"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await auth()
  const params = await searchParams
  
  // If already logged in, redirect to expeditions
  if (session?.user) {
    redirect("/expeditions")
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted p-6">
      {/* Logo Header */}
      <div className="mb-6">
        <Image
          src="/sailfuture-square (8).webp"
          alt="SailFuture Academy"
          width={72}
          height={72}
          className="rounded-full border-2 border-gray-300"
          priority
        />
      </div>
      
      <LoginForm error={params.error} />
      
      {/* Footer */}
      <p className="mt-6 text-center text-xs text-muted-foreground px-6">
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </p>
    </div>
  )
}
