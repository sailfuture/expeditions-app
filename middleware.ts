import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

// Routes that don't require authentication
const publicRoutes = ["/login", "/public", "/api/auth", "/tv"]

export default auth((req) => {
  const { pathname } = req.nextUrl
  
  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route) || pathname === route
  )
  
  // Allow public routes
  if (isPublicRoute) {
    return NextResponse.next()
  }
  
  // Check if user is authenticated
  if (!req.auth) {
    // Redirect to login page
    const loginUrl = new URL("/login", req.url)
    return NextResponse.redirect(loginUrl)
  }
  
  // User is authenticated, allow access
  return NextResponse.next()
})

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
