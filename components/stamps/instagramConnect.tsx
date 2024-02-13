import React, { useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"

import { encode_data } from "@/lib/encode_data"
import useAuth from "@/hooks/useAuth"
import { useCreatedByAppId } from "@/hooks/useCreatedByApp"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { wallet } from "@/app/layout"

import { stampsWithId } from "."
import { Button } from "../ui/button"

const redirectUri = "https://cubid-passport.vercel.app/app/"

const InstagramAuth = () => {
  const handleLogin = () => {
    const clientId = "328555189879651"
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
}: {
  open: boolean
  onClose: () => void
  onOpen: () => void
  fetchStamps: () => void
  appId?: any
}) => {
  const searchParams = useSearchParams()
  const authData = useAuth({ appId })
  const router = useRouter()
  const { getIdForApp } = useCreatedByAppId()

  const fetchData = useCallback(
    async (code_fixes: string) => {
      if (typeof authData?.user?.email === "string") {
        const {
          data: { user_id, data },
        } = await axios.post("/api/insta-data-fetch", {
          code: code_fixes,
          redirectUri: redirectUri,
          email: authData?.user?.email,
        })
        const allData: any = data
        if (user_id) {
          const stampId = (stampsWithId as any)["instagram"]
          const dbUser = await authData.getUser()

          const database = {
            uniquehash: await encode_data(allData.username),
            stamptype: stampId,
            created_by_user_id: dbUser?.id,
            unencrypted_unique_data: allData.username,
            type_and_hash: `${stampId} ${await encode_data(allData.username)}`,
          }
          const dataToSet: any = {
            created_by_user_id: dbUser?.id,
            created_by_app: await getIdForApp(),
            stamptype: stampId,
            uniquevalue: allData.username,
            user_id_and_uniqueval:`${dbUser?.id} ${stampId} ${allData.username}`,
            unique_hash: await encode_data(allData.username),
            stamp_json: allData as any,
            type_and_uniquehash: `${stampId} ${await encode_data(
              allData.username
            )}`,
          }
          await axios.post("/api/supabase/insert", {
            table: "uniquestamps",
            body: database,
          })
          const {
            data: { error, data },
          } = await axios.post("/api/supabase/insert", {
            table: "stamps",
            body: dataToSet,
          })
          if (data?.[0]?.id) {
            await axios.post("/api/supabase/insert", {
              table: "authorized_dapps",
              body: {
                dapp_id: 22,
                dapp_and_stamp_id: `22 ${data?.[0]?.id}`,
                stamp_id: data?.[0]?.id,
                can_read: true,
                can_update: true,
                can_delete: true,
              },
            })
          }
          router.push("/")
          fetchStamps()
        }
      }
    },
    [authData, fetchStamps, router, getIdForApp]
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
