import twilio from "twilio"

import {
  getTwilioAccountSid,
  getTwilioAuthToken,
  getTwilioVerifyServiceSid,
} from "./operationalSecrets"

let twilioClient: ReturnType<typeof twilio> | null = null

const getTwilioVerifyClient = () => {
  if (!twilioClient) {
    twilioClient = twilio(getTwilioAccountSid(), getTwilioAuthToken())
  }

  return twilioClient
}

export const sendPhoneOtp = async (phone: string) => {
  await getTwilioVerifyClient().verify.v2
    .services(getTwilioVerifyServiceSid())
    .verifications.create({ channel: "sms", to: phone })
}

export const verifyPhoneOtp = async (input: {
  otpCode: string
  phone: string
}) => {
  return getTwilioVerifyClient().verify.v2
    .services(getTwilioVerifyServiceSid())
    .verificationChecks.create({
      code: input.otpCode,
      to: input.phone,
    })
}
