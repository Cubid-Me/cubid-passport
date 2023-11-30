import React, { useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import axios from "axios"

import { encode_data } from "@/lib/encode_data"
import useAuth from "@/hooks/useAuth"
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
}: {
  open: boolean
  onClose: () => void
  onOpen: () => void
  fetchStamps: () => void
}) => {
  const searchParams = useSearchParams()
  const authData = useAuth()
  const router = useRouter()

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
        if (user_id) {
          const stampId = (stampsWithId as any)["instagram"]
          const dbUser = await authData.getUser()
          const dataToSet = {
            created_by_user_id: dbUser.id,
            unique_data: btoa(
              JSON.stringify({ ...data, created_at: Date.now() })
            ),
            status: "Whitelisted",
            user_id_and_uniquevalue: `${dbUser.id}-${btoa(
              JSON.stringify({ ...data, created_at: Date.now() })
            )}`,
            type: stampId,
          }
          const {
            data: { error, data:stampData },
          } = await axios.post("/api/supabase/insert", {
            table: "stamps",
            body: dataToSet,
          })
          if (stampData?.[0]?.id) {
            await axios.post("/api/supabase/insert", {
              table: "authorized_dapps",
              body: {
                dapp_id: 22,
                dapp_and_stamp_id: `22 ${stampData?.[0]?.id}`,
                stamp_id: stampData?.[0]?.id,
              },
            })
          }
          if (!error) {
            const {
              data: { data: uniqueStampData },
            } = await axios.post("/api/supabase/select", {
              table: "stamps",
              match: {
                unique_data: btoa(
                  JSON.stringify({ ...data, created_at: Date.now() })
                ),
              },
            })
            const uniqueStampDataPayload = {
              stamptype: stampId,
              uniquedata: await encode_data(
                btoa(JSON.stringify({ ...data, created_at: Date.now() }))
              ),
              created_by_user_id: dbUser.id,
              blacklisted: uniqueStampData.length !== 1,
              unencrypted_unique_data: { ...data, created_at: Date.now() },
            }
            if (uniqueStampData.length !== 1) {
              uniqueStampData.map(async (item: any) => {
                await axios.post(`/api/supabase/update`, {
                  table: "uniquestamps",
                  match: {
                    stamptype: item.stamptype,
                    created_by_user_id: item.created_by_user_id,
                  },
                  body: {
                    blacklisted: true,
                  },
                })
              })
            }
            await axios.post("/api/supabase/insert", {
              body: uniqueStampDataPayload,
              table: "uniquestamps",
            })
          }
          router.push("/")
          fetchStamps()
        }
      }
    },
    [authData, fetchStamps, router]
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
