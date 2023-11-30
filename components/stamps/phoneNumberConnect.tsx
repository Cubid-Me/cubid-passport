import React from "react"
import axios from "axios"
import { toast } from "react-toastify"

import useAuth from "@/hooks/useAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

import { stampsWithId } from "."

export const PhoneNumberConnect = ({
  open,
  fetchStamps,
  onClose,
}: {
  open: boolean
  fetchStamps: () => void
  onClose: () => void
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

  const { user, getUser } = useAuth()
  const { email = "" } = user ?? {}

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
      const dataToSet = {
        created_by_user_id: dbUser.id,
        unique_data: btoa(phoneInput),
        status: "Whitelisted",
        user_id_and_uniquevalue: `${dbUser.id}-${btoa(phoneInput)}`,
        type: stampId,
      }
      const { data } = await axios.post("/api/supabase/insert", {
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
          },
        })
      }
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
                  <Input
                    placeholder="Phone Number"
                    value={phoneInput}
                    type="number"
                    onChange={(e) => {
                      setPhoneInput(e.target.value)
                    }}
                  />
                  <Button
                    onClick={() => {
                      sendOtp()
                    }}
                    className="mt-3"
                  >
                    Send OTP
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
