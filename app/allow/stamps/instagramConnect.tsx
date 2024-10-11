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
import { wallet } from "@/app/layout"

import { stampsWithId } from "."
import { insertStamp } from "@/lib/stampInsertion"

const redirectUri = "https://passport.cubid.me/app/"

const InstagramAuth = ({ allowPage }: any) => {
  const handleLogin = () => {
    const clientId = "328555189879651"
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
  const authData = useAuth({ appId })
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
          const dbUser = await authData.getUser()
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
    [dbUser, email, fetchStamps, getIdForApp, uid]
  )
  useEffect(() => {
    console.log({ code: searchParams?.get("code") })
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
