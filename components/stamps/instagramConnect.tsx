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

const redirectUri = encodeURIComponent("https://cubid-passport.vercel.app/app/")

const InstagramAuth = () => {
  const handleLogin = () => {
    const clientId = "876014740903400"
    console.log(
      `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=id,username&response_type=code`
    )
    window.location.href = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=id,username&response_type=code`
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
        const form = new FormData()
        form.append("client_id", "876014740903400")
        form.append("client_secret", "6125fa4a200efebf0d64a0cfdbae6eb3")
        form.append("grant_type", "authorization_code")
        form.append("redirect_uri", redirectUri)
        form.append("code", code_fixes)
        const {
          data: { access_token, user_id },
        } = await axios.post(
          "https://api.instagram.com/oauth/access_token",
          form,
          {
            headers: { "Content-Type": "multipart/form-data" },
          }
        )
        axios
          .get(
            `https://graph.instagram.com/${user_id}?fields=id,username&access_token=${access_token}`
          )
          .then(async (data) => {
            await axios.post("/api/supabase/update", {
              match: {
                email: authData?.user?.email,
              },
              body: { instagram_data: data },
              table: "users",
            })
          })
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
