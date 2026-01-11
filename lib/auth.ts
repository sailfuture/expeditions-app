import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

const XANO_BASE_URL = "https://xsc3-mvx7-r86m.n7e.xano.io/api:bXFdqx8y"

// Validate staff member by email using existing /teachers endpoint
async function validateStaffByEmail(email: string) {
  try {
    const res = await fetch(`${XANO_BASE_URL}/teachers`)
    if (!res.ok) {
      return null
    }
    const teachers = await res.json()
    
    // Find staff member by email (case-insensitive)
    const staff = teachers.find((t: any) => 
      t.email?.toLowerCase() === email.toLowerCase()
    )
    
    // Check if staff exists and is active
    if (staff && staff.isActive) {
      return staff
    }
    return null
  } catch (error) {
    console.error("Error validating staff:", error)
    return null
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) {
        return false
      }

      // Validate that this email belongs to an active staff member
      const staff = await validateStaffByEmail(user.email)
      if (!staff) {
        // User is not an approved staff member
        return "/login?error=unauthorized"
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        // Fetch staff data on initial sign in
        const staff = await validateStaffByEmail(user.email)
        if (staff) {
          token.staffId = staff.id
          token.role = staff.role
          token.staffName = staff.name
          token.isActive = staff.isActive
          token.expeditions_id = staff.expeditions_id
          token.photo_url = staff.photo_url
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.staffId = token.staffId as number
        session.user.role = token.role as "Admin" | "Staff" | "Instructor"
        session.user.staffName = token.staffName as string
        session.user.isActive = token.isActive as boolean
        session.user.expeditions_id = token.expeditions_id as number[]
        session.user.photo_url = token.photo_url as string | undefined
      }
      return session
    },
  },
})

// Type augmentation for NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      staffId?: number
      role?: "Admin" | "Staff" | "Instructor"
      staffName?: string
      isActive?: boolean
      expeditions_id?: number[]
      photo_url?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    staffId?: number
    role?: "Admin" | "Staff" | "Instructor"
    staffName?: string
    isActive?: boolean
    expeditions_id?: number[]
    photo_url?: string
  }
}
