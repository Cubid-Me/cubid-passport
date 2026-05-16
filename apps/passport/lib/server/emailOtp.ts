import { timingSafeEqual } from "node:crypto"

import { getOptionalNumericEnv, getRequiredEnv } from "@cubid/config"
import type { SupabaseClient } from "@supabase/supabase-js"

const nodemailer = require("nodemailer")

let sendOtpEmailForTests:
  | ((toEmail: string, verificationCode: number) => Promise<void>)
  | null = null
let sendNotificationEmailForTests:
  | ((input: {
      body: string
      category: string
      fromAppName: string
      priority: string
      title: string
      toEmail: string
    }) => Promise<void>)
  | null = null

export const EMAIL_OTP_EXPIRY_MS = 10 * 60 * 1000
export const EMAIL_OTP_MAX_ATTEMPTS = 3
export const EMAIL_OTP_HASH_ALGORITHM = "hmac-sha256"
export const EMAIL_OTP_HASH_VERSION = 1

const getTransporter = () => {
  const host = getRequiredEnv("SMTP_HOST")
  const port = getOptionalNumericEnv("SMTP_PORT") ?? 587
  const user = getRequiredEnv("SMTP_USERNAME")
  const pass = getRequiredEnv("SMTP_PASSWORD")

  return nodemailer.createTransport({
    auth: {
      pass,
      user,
    },
    host,
    port,
    secure: port === 465,
  })
}

export const generateOtp = () => {
  return Math.floor(1000 + Math.random() * 9000)
}

export const normalizeOtpEmail = (email: string) => email.trim().toLowerCase()

export const normalizeOtpCode = (otp: string | number) => String(otp).trim()

export const hashEmailOtp = async (
  supabase: SupabaseClient,
  email: string,
  otp: string | number
) => {
  const { data, error } = await supabase.rpc("hash_email_otp", {
    p_email: normalizeOtpEmail(email),
    p_otp: normalizeOtpCode(otp),
  })

  if (error) {
    throw error
  }

  return String(data)
}

export const verifyEmailOtpHash = async (
  supabase: SupabaseClient,
  email: string,
  otp: string | number,
  expectedHash: string | null | undefined
) => {
  if (!expectedHash) {
    return false
  }

  const actual = Buffer.from(await hashEmailOtp(supabase, email, otp), "hex")
  const expected = Buffer.from(expectedHash, "hex")

  if (actual.length !== expected.length) {
    return false
  }

  return timingSafeEqual(actual, expected)
}

export const createEmailOtpExpiry = () =>
  new Date(Date.now() + EMAIL_OTP_EXPIRY_MS).toISOString()

export const setSendOtpEmailForTests = (
  sender: ((toEmail: string, verificationCode: number) => Promise<void>) | null
) => {
  sendOtpEmailForTests = sender
}

export const setSendNotificationEmailForTests = (
  sender:
    | ((input: {
        body: string
        category: string
        fromAppName: string
        priority: string
        title: string
        toEmail: string
      }) => Promise<void>)
    | null
) => {
  sendNotificationEmailForTests = sender
}

export const sendOtpEmail = async (toEmail: string, verificationCode: number) => {
  if (sendOtpEmailForTests) {
    await sendOtpEmailForTests(toEmail, verificationCode)
    return
  }

  const transporter = getTransporter()

  await transporter.sendMail({
    from: getRequiredEnv("SMTP_FROM_EMAIL"),
    subject: "Email Verification Code",
    text: `Your verification code is: ${verificationCode}`,
    to: toEmail,
  })
}

export const sendNotificationEmail = async (input: {
  body: string
  category: string
  fromAppName: string
  priority: string
  title: string
  toEmail: string
}) => {
  if (sendNotificationEmailForTests) {
    await sendNotificationEmailForTests(input)
    return
  }

  const transporter = getTransporter()
  const fromEmail = getRequiredEnv("SMTP_FROM_EMAIL")
  const subjectAppName = input.fromAppName.replace(/[\r\n]+/g, " ").trim()
  const subjectTitle = input.title.replace(/[\r\n]+/g, " ").trim()
  const subject = `[${subjectAppName}] ${subjectTitle}`.slice(0, 180)

  await transporter.sendMail({
    from: fromEmail,
    subject,
    text: [
      `${input.title}`,
      "",
      input.body,
      "",
      `From: ${input.fromAppName}`,
      `Category: ${input.category}`,
      `Priority: ${input.priority}`,
      "",
      "This message was routed by Cubid using your notification preferences.",
    ].join("\n"),
    to: input.toEmail,
  })
}
