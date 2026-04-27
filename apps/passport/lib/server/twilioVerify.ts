import twilio from "twilio"

import { getRequiredEnv } from "@cubid/config"

let twilioClient: ReturnType<typeof twilio> | null = null

const getTwilioVerifyClient = () => {
  if (!twilioClient) {
    twilioClient = twilio(
      getRequiredEnv("twilio_sid"),
      getRequiredEnv("authToken")
    )
  }

  return twilioClient
}

const getVerifyServiceSid = () => getRequiredEnv("TWILIO_VERIFY_SERVICE_SID")

export const sendPhoneOtp = async (phone: string) => {
  await getTwilioVerifyClient().verify.v2
    .services(getVerifyServiceSid())
    .verifications.create({ channel: "sms", to: phone })
}

export const verifyPhoneOtp = async (input: {
  otpCode: string
  phone: string
}) => {
  return getTwilioVerifyClient().verify.v2
    .services(getVerifyServiceSid())
    .verificationChecks.create({
      code: input.otpCode,
      to: input.phone,
    })
}
