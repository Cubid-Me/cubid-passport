import React from "react"
import axios from "axios"
import { toast } from "react-toastify"

import { encode_data } from "@/lib/encode_data"
import { insertStampPerm } from "@/lib/insert_stamp_perm"
import { supabase } from "@/lib/supabase"
import useAuth from "@/hooks/useAuth"
import { useCreatedByAppId } from "@/hooks/useCreatedByApp"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { stampsWithId } from "."
import { insertStamp } from "@/lib/stampInsertion"

export const EmailConnect = ({
  open,
  fetchStamps,
  onClose,
  appId,
  dbUser,
  uid,
}: {
  open: boolean
  fetchStamps: () => void
  onClose: () => void
  appId?: any
  dbUser: any
  uid: any
}) => {
  const [emailInput, setEmailInput] = React.useState("")
  const [otpSent, setOtpSent] = React.useState(false)
  const [otpCode, setOtpCode] = React.useState("")
  const sendOtp = async () => {
    await supabase.auth.signInWithOtp({
      email: emailInput,
    })
    setOtpSent(true)
  }

  const { getIdForApp } = useCreatedByAppId()

  const verifyOtp = async () => {
    const { error } = await supabase.auth.verifyOtp({
      email: emailInput,
      token: otpCode,
      type: "email",
    })
    if (!error) {
      toast.success("Otp Verified")
      setOtpSent(true)

      await insertStamp({
        stamp_type: 'email',
        user_data: { user_id: dbUser?.id, uuid: uid },
        stampData: {
          identity: emailInput,
          uniquevalue: emailInput
        },
        app_id: await getIdForApp()
      })
      onClose()
      fetchStamps()
      // fetchSocial()
    }
  }

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
            <SheetTitle>Email Connect</SheetTitle>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (otpSent) {
                  verifyOtp()
                } else {
                  sendOtp()
                }
              }}
            >
              {otpSent ? (
                <>
                  <Input
                    placeholder="OTP"
                    value={otpCode}
                    type="number"
                    onChange={(e) => {
                      setOtpCode(e.target.value)
                    }}
                  />
                  <Button type="submit" className="mt-3">
                    Verify OTP
                  </Button>
                </>
              ) : (
                <>
                  <Input
                    placeholder="Email"
                    value={emailInput}
                    type="email"
                    onChange={(e) => {
                      setEmailInput(e.target.value)
                    }}
                  />
                  <Button type="submit" className="mt-3">
                    Send Passcode
                  </Button>
                </>
              )}
            </form>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  )
}
