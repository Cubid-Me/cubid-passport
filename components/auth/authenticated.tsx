"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "hooks/useAuth"
import PropTypes from "prop-types"

export const Authenticated = (props: any) => {
  const { children } = props
  const router = useRouter()
  const { user, loading } = useAuth({})
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (loading === true) {
      return
    }

    if (!user) {
      if (window.location.href.includes("allow")) {
        localStorage.setItem(
          "allow_url",
          window.location.href.replace(`${window.location.origin}/allow?`, "")
        )
      }
      router.push("/login")
    } else {
      setVerified(true)
    }
  }, [loading, router, user])

  useEffect(() => {
    if (localStorage.getItem("allow_url")) {
      router.push(`/allow?=${localStorage.getItem("allow_url")}`);
      localStorage.removeItem("allow_url");
    }
  }, [router]);

  if (!verified) {
    return null
  }

  return <>{children}</>
}

Authenticated.propTypes = {
  children: PropTypes.node,
}
