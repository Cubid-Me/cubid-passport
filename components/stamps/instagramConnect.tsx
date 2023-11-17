import React, { useEffect } from "react"
import { useSearchParams } from "next/navigation"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { Button } from "../ui/button"

const InstagramAuth = () => {
  const handleLogin = () => {
    const clientId = "876014740903400"
    const redirectUri = "https://cubid-passport.vercel.app"
    console.log(
      `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`
    )
    window.location.href = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user_profile,user_media&response_type=code`
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

  useEffect(() => {
    const code = searchParams?.get("code")
    if (code) {
      onOpen()
    }
  }, [onOpen, searchParams])
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
