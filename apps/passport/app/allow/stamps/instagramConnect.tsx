import React, { useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"

import { encode_data } from "@/lib/encode_data"
import { insertStampPerm } from "@/lib/insert_stamp_perm"
import useAuth from "@/hooks/useAuth"
import { useCreatedByAppId } from "@/hooks/useCreatedByApp"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { wallet } from "@/lib/wallet"

import { stampsWithId } from "."
import { insertStamp } from "@/lib/stampInsertion"

const redirectUri = process.env.NEXT_PUBLIC_INSTAGRAM_REDIRECT_URI ?? ""

const InstagramAuth = ({ allowPage }: any) => {
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_INSTAGRAM_CLIENT_ID ?? ""
    if (allowPage) {
      localStorage.setItem(
        "allow_url",
        window.location.href.replace(`${window.location.origin}/allow?`, "")
      )
    }
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
  appId,
  allowPage,
  uid,
  email,
  dbUser,
}: {
  open: boolean
  onClose: () => void
  onOpen: () => void
  fetchStamps: () => void
  appId?: any
  allowPage?: boolean
  uid: any
  email: string
  dbUser: any
}) => {
  const searchParams = useSearchParams()
  const { getUser } = useAuth({ appId })
  const router = useRouter()
  const { getIdForApp } = useCreatedByAppId()

  const fetchData = useCallback(
    async (code_fixes: string) => {
      if (typeof email === "string") {
        const {
          data: { user_id, data },
        } = await axios.post("/api/insta-data-fetch", {
          code: code_fixes,
          redirectUri: redirectUri,
          email: email,
        })
        const allData: any = data
        if (user_id) {
          const dbUser = await getUser()
          await insertStamp({
            stamp_type: 'instagram',
            user_data: { user_id: dbUser?.id, uuid: uid },
            stampData: {
              identity: allData.username,
              uniquevalue: allData.id,
            },
            app_id: await getIdForApp()
          })

          fetchStamps()
        }
      }
    },
    [email, fetchStamps, getIdForApp, getUser, uid]
  )
  useEffect(() => {
    const code = searchParams?.get("code")

    if (code) {
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
              <InstagramAuth allowPage={allowPage as any} />
            </div>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  )
}
