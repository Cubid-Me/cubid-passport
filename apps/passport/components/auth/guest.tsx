'use client'
import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation';
import { useAuth } from "hooks/useAuth"

type GuestProps = {
  children: React.ReactNode
  allowAuthenticated?: boolean
}

export const Guest = ({ children, allowAuthenticated = false }: GuestProps) => {
  const router = useRouter()
  const { user, loading } = useAuth({});
  const [unverified, setUnverified] = useState(false)

  useEffect(() => {
    if (loading === true) {
      return
    }

    if (user && !allowAuthenticated) {
      const postLoginRedirect = localStorage.getItem(
        "passport_post_login_redirect"
      )

      if (postLoginRedirect?.startsWith("/")) {
        localStorage.removeItem("passport_post_login_redirect")
        router.push(postLoginRedirect)
        return
      }

      router.push("/app")
    } else {
      setUnverified(true)
    }
  }, [allowAuthenticated, loading, router, user])

  if (!unverified) {
    return null
  }

  return <>{children}</>
}
