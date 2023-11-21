import React, { useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
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
    const clientId = "328555189879651"
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
  fetchStamps,
}: {
  open: boolean
  onClose: () => void
  onOpen: () => void
  fetchStamps: () => Promise<void>
}) => {
  const searchParams = useSearchParams()
  const authData = useAuth()
  const router = useRouter()

  const fetchData = useCallback(
    async (code_fixes: string) => {
      if (typeof authData?.user?.email === "string") {
        console.log("api called")
        const {
          data: { user_id, data },
        } = await axios.post("/api/insta-data-fetch", {
          code: code_fixes,
          redirectUri: redirectUri,
          email: authData?.user?.email,
        })
        if (user_id) {
          await axios.post("/api/supabase/update", {
            match: { email: authData?.user?.email },
            body: { instagram_data: { ...data, created_at: Date.now() } },
            table: "users",
          })
          router.push("/")
          fetchStamps()
        }
      }
    },
    [authData?.user?.email, fetchStamps, router]
  )

  useEffect(() => {
    ;(async () => {
      const code = searchParams?.get("code")

      if (code) {
        await fetchData(code)
      }
    })()
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
