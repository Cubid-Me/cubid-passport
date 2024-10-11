import React from "react"
import axios from "axios"
import { toast } from "react-toastify"
import PhoneInput from 'react-phone-input-2'

import { encode_data } from "@/lib/encode_data"
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

export const PhoneNumberConnect = ({
  open,
  fetchStamps,
  onClose,
  appId,
}: {
  open: boolean
  fetchStamps: () => void
  onClose: () => void
  appId?: any
}) => {
  const [phoneInput, setPhoneInput] = React.useState("")
  const [otpSent, setOtpSent] = React.useState(false)
  const [otpCode, setOtpCode] = React.useState("")
  const sendOtp = async () => {
    await axios.post("/api/twillio/send-otp", {
      phone: `+${phoneInput}`,
    })
    setOtpSent(true)
  }

  const { user, getUser } = useAuth({ appId })
  console.log({ appId }, "phone")
  const { email = "" } = user ?? {}
  const { getIdForApp } = useCreatedByAppId()

  const verifyOtp = async () => {
    const { data: verify_data } = await axios.post("/api/twillio/verify-otp", {
      phone: `+${phoneInput}`,
      otpCode,
    })
    if (verify_data.status === "approved") {
      toast.success("Otp Verified")
      setOtpSent(true)
      onClose()
      const stampId = stampsWithId.phone
      const dbUser = await getUser()
      console.log(dbUser)

      await insertStamp({
        stamp_type: 'phone',
        user_data: { user_id: dbUser?.id, uuid: "" },
        stampData: {
          identity: phoneInput,
          uniquevalue: phoneInput
        },
        app_id: await getIdForApp()
      })

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
            <SheetTitle>Phone Number Connect</SheetTitle>
            <div>
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
                  <Button
                    onClick={() => {
                      verifyOtp()
                    }}
                    className="mt-3"
                  >
                    Verify OTP
                  </Button>
                </>
              ) : (
                <>
                  <PhoneInput
                    placeholder="Phone Number"
                    value={phoneInput}
                    inputClass="!text-black dark:!text-black"
                    dropdownClass=""
                    country="us"
                    onChange={(e) => {
                      console.log(e)
                      setPhoneInput(e)
                    }}
                  />
                  <Button
                    onClick={() => {
                      sendOtp()
                    }}
                    className="mt-3"
                  >
                    Send Passcode
                  </Button>
                </>
              )}
            </div>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  )
}
