"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"
import { useAuth } from "hooks/useAuth"

type AuthenticatedProps = {
  children: React.ReactNode
}

export const Authenticated = ({ children }: AuthenticatedProps) => {
  const router = useRouter()
  const { user, loading } = useAuth({})
  const [verified, setVerified] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (loading === true) {
      return
    }
    ;(async () => {
      const {
        data: { isAllow },
      } = await axios.post("/api/isallowtoken")
      if (!isAllow) {
        if (localStorage.getItem("allow_url")) {
          const code = searchParams?.get("code") ?? ""
          if (code) {
            router.push(
              `/allow?code=${code}&${localStorage.getItem("allow_url")}`
            )
          } else {
            router.push(`/allow?${localStorage.getItem("allow_url")}`)
          }

          localStorage.removeItem("allow_url")
        } else if (!user) {
          router.push("/login")
        } else {
          setVerified(true)
        }
      }
    })()
  }, [loading, router, searchParams, user])

  if (!verified) {
    return null
  }

  return <>{children}</>
}
