"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "hooks/useAuth"
import PropTypes from "prop-types"

export const Authenticated = (props: any) => {
  const { children } = props
  const router = useRouter()
  const { user, loading } = useAuth()
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (loading === true) {
      return
    }

    if (!user) {
      router.push("/login")
    } else {
      setVerified(true)
    }
  }, [loading, router, user])

  if (!verified) {
    return null
  }

  return <>{children}</>
}

Authenticated.propTypes = {
  children: PropTypes.node,
}
