'use client'
import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation';
import { useAuth } from "hooks/useAuth"
import PropTypes from "prop-types"

export const Guest = (props:any) => {
  const { children } = props
  const router = useRouter()
  const { user, loading } = useAuth();
  const [unverified, setUnverified] = useState(false)

  useEffect(() => {
    if (loading === true) {
      return
    }

    if (user) {
      router.push('/app')
    } else {
      setUnverified(true)
    }
  }, [loading, router, user])

  if (!unverified) {
    return null
  }

  return <>{children}</>
}

Guest.propTypes = {
  children: PropTypes.node,
}
