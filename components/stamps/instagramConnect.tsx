import React, { useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import axios from "axios"

import useAuth from "@/hooks/useAuth"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { Button } from "../ui/button"

const redirectUri = "https://cubid-passport.vercel.app/app/"

const InstagramAuth = () => {
  const handleLogin = () => {
    const clientId = "876014740903400"
    console.log(
      `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile&response_type=code`
    )
    window.location.href = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile&response_type=code`
  }

  return (
    <div className="py-2">
      <Button variant="default" onClick={handleLogin}>
        Login with Instagram
      </Button>
    </div>
  )
}

export const InstagramConnect = ({
  open,
  onClose,
  onOpen,
}: {
  open: boolean
  onClose: () => void
  onOpen: () => void
}) => {
  const searchParams = useSearchParams()
  const authData = useAuth()

  const fetchData = useCallback(
    async (code_fixes: string) => {
      if (authData?.user?.email) {
        console.log("api called")
        const { data } = await axios.post("/api/insta-data-fetch", {
          code: code_fixes,
          redirectUri: redirectUri,
        })
        console.log(data)
      }
    },
    [authData]
  )

  useEffect(() => {
    const code = searchParams?.get("code")
    if (code) {
      onOpen()
      fetchData(code)
    }
  }, [onOpen, searchParams, fetchData])
  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(value) => {
          if (value === false) {
            onClose()
          }
        }}
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Connect Instagram</SheetTitle>
            <div>
              <InstagramAuth />
            </div>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  )
}
