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
          const stampId = (stampsWithId as any)["instagram"]

          const database = {
            uniquehash: await encode_data(allData.id),
            stamptype: stampId,
            created_by_user_id: dbUser?.id,
            unencrypted_unique_data: allData.id,
            type_and_hash: `${stampId} ${await encode_data(allData.id)}`,
          }
          const dataToSet: any = {
            created_by_user_id: dbUser?.id,
            created_by_app: await getIdForApp(),
            stamptype: stampId,
            uniquevalue: allData.id,
            user_id_and_uniqueval: `${dbUser?.id} ${stampId} ${allData.id}`,
            unique_hash: await encode_data(allData.id),
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
          await insertStampPerm(data?.[0]?.id, uid)
          if (data?.[0]?.id) {
            await axios.post("/api/supabase/insert", {
              table: "authorized_dapps",
              body: {
                dapp_id: process.env.NEXT_PUBLIC_DAPP_ID,
                dapp_and_stamp_id: `${process.env.NEXT_PUBLIC_DAPP_ID} ${data?.[0]?.id}`,
                stamp_id: data?.[0]?.id,
                can_read: true,
                can_update: true,
                can_delete: true,
              },
            })
            router.push(
              `${window.location.origin}/allow?uid=${localStorage.getItem(
                "allow-uuid"
              )}`
            )
            window.location.reload()
          }
        } else {
          router.push(
            `${window.location.origin}/allow?uid=${localStorage.getItem(
              "allow-uuid"
            )}&page_id=${localStorage.getItem(
              "page_id"
            )}`
          )
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
