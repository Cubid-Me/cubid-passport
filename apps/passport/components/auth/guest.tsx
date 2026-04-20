'use client'
import { useEffect, useState } from "react"
import { useRouter } from 'next/navigation';
import { useAuth } from "hooks/useAuth"

type GuestProps = {
  children: React.ReactNode
}

export const Guest = ({ children }: GuestProps) => {
  const router = useRouter()
  const { user, loading } = useAuth({});
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
