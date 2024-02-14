"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "hooks/useAuth"
import PropTypes from "prop-types"

export const Authenticated = (props: any) => {
  const { children } = props
  const router = useRouter()
  const { user, loading } = useAuth({})
  const [verified, setVerified] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    if (loading === true) {
      return
    }
    if (localStorage.getItem("allow_url")) {
      const code = searchParams?.get("code") ?? ""
      if (code) {
        router.push(`/allow?code=${code}?${localStorage.getItem("allow_url")}`)
      } else {
        router.push(`/allow?${localStorage.getItem("allow_url")}`)
      }

      localStorage.removeItem("allow_url")
    } else if (!user) {
      router.push("/login")
    } else {
      setVerified(true)
    }
  }, [loading, router, searchParams, user])

  if (!verified) {
    return null
  }

  return <>{children}</>
}

Authenticated.propTypes = {
  children: PropTypes.node,
}
